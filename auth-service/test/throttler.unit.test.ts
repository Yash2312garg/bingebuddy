import { Throttle } from '../src/apiThrottler';
import type { Request, Response, NextFunction } from 'express';

// Mock redisClient to verify algorithm behavior without requiring a running Redis instance
jest.mock('../src/database/redis', () => ({
  redisClient: {
    eval: jest.fn(),
    sendCommand: jest.fn(),
  },
}));

import { redisClient } from '../src/database/redis';

describe('Throttle Module Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headers: Record<string, string>;
  let responseStatus: number | undefined;
  let responseBody: any;

  beforeEach(() => {
    headers = {};
    responseStatus = undefined;
    responseBody = undefined;

    mockReq = {
      ip: '192.168.1.100',
      path: '/auth/v1/restaurant/login',
      headers: {},
      socket: { remoteAddress: '192.168.1.100' } as any,
    };

    mockRes = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
        return mockRes as Response;
      }),
      status: jest.fn((code: number) => {
        responseStatus = code;
        return mockRes as Response;
      }),
      json: jest.fn((body: any) => {
        responseBody = body;
        return mockRes as Response;
      }),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('1. Fixed Window Throttler', () => {
    it('should allow request when under the limit and set RFC headers', async () => {
      // Mock Lua return: { allowed: 1, current: 3, remaining: 2, ttl: 45 }
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 3, 2, 45]);

      const middleware = Throttle.fixedWindow({
        windowMs: 60 * 1000,
        maxRequests: 5,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(headers['ratelimit-limit']).toBe('5');
      expect(headers['ratelimit-remaining']).toBe('2');
      expect(responseStatus).toBeUndefined();
    });

    it('should block request with HTTP 429 when limit is exceeded', async () => {
      // Mock Lua return: { allowed: 0, current: 6, remaining: 0, ttl: 30 }
      (redisClient.eval as jest.Mock).mockResolvedValue([0, 6, 0, 30]);

      const middleware = Throttle.fixedWindow({
        windowMs: 60 * 1000,
        maxRequests: 5,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(responseStatus).toBe(429);
      expect(responseBody.success).toBe(false);
      expect(headers['retry-after']).toBe('30');
    });
  });

  describe('2. Leaky Bucket Throttler (Smooth Rate Enforcement)', () => {
    it('should allow requests within bucket capacity', async () => {
      // Mock Lua return: { allowed: 1, water: 2, remaining: 8, retryAfter: 0 }
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 2, 8, 0]);

      const middleware = Throttle.leakyBucket({
        capacity: 10,
        leakRate: 5,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(headers['ratelimit-limit']).toBe('10');
      expect(headers['ratelimit-remaining']).toBe('8');
    });

    it('should drop excess requests when bucket overflows', async () => {
      // Mock Lua return: { allowed: 0, water: 10, remaining: 0, retryAfter: 2 }
      (redisClient.eval as jest.Mock).mockResolvedValue([0, 10, 0, 2]);

      const middleware = Throttle.leakyBucket({
        capacity: 10,
        leakRate: 5,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(responseStatus).toBe(429);
      expect(headers['retry-after']).toBe('2');
    });
  });

  describe('3. Token Bucket Throttler (Burst Tolerant)', () => {
    it('should consume tokens and allow request', async () => {
      // Mock Lua return: { allowed: 1, tokens: 15, remaining: 15, retryAfter: 0 }
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 15, 15, 0]);

      const middleware = Throttle.tokenBucket({
        capacity: 20,
        refillRate: 5,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(headers['ratelimit-remaining']).toBe('15');
    });
  });

  describe('4. Sliding Window Counter (Cloudflare Weighted)', () => {
    it('should calculate weighted count and permit request', async () => {
      // Mock Lua return: { allowed: 1, estimatedCount: 12, remaining: 8, resetSec: 25 }
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 12, 8, 25]);

      const middleware = Throttle.slidingWindowCounter({
        windowMs: 60 * 1000,
        maxRequests: 20,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(headers['ratelimit-remaining']).toBe('8');
    });
  });

  describe('5. Bypass / Whitelist & Health Check Protection', () => {
    it('should unconditionally skip health check endpoints to prevent Kubelet restarts', async () => {
      mockReq.path = '/auth/v1/health';

      const middleware = Throttle.fixedWindow({
        windowMs: 60 * 1000,
        maxRequests: 1,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(redisClient.eval).not.toHaveBeenCalled();
    });

    it('should respect custom skip predicate', async () => {
      const middleware = Throttle.tokenBucket({
        capacity: 10,
        refillRate: 2,
        skip: (req) => req.headers['x-admin-key'] === 'supersecret',
      });

      mockReq.headers = { 'x-admin-key': 'supersecret' };
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(redisClient.eval).not.toHaveBeenCalled();
    });
  });

  describe('6. Custom Key Generation', () => {
    it('should use custom key generator (e.g. email or user ID) when provided', async () => {
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 1, 4, 60]);

      mockReq.body = { email: 'chef@restaurant.com' };

      const middleware = Throttle.fixedWindow({
        windowMs: 60 * 1000,
        maxRequests: 5,
        keyGenerator: (req) => `email:${req.body.email}`,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          keys: ['th:fw:email:chef@restaurant.com'],
        })
      );
    });
  });

  describe('7. Global Load Shedding', () => {
    it('should use cluster global key when Throttle.global is used', async () => {
      (redisClient.eval as jest.Mock).mockResolvedValue([1, 10, 40, 0]);

      const middleware = Throttle.global({
        algorithm: 'leakyBucket',
        capacity: 50,
        leakRate: 60,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          keys: ['th:global:lb:cluster:global_load'],
        })
      );
    });
  });
});
