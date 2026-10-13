import type { RequestHandler, Request } from 'express';
import { FixedWindowThrottle } from './algorithms/fixedWindow';
import { SlidingWindowLogThrottle } from './algorithms/slidingWindowLog';
import { SlidingWindowCounterThrottle } from './algorithms/slidingWindowCounter';
import { TokenBucketThrottle } from './algorithms/tokenBucket';
import { LeakyBucketThrottle } from './algorithms/leakyBucket';
import { BaseAlgorithm } from './algorithms/base';

import type {
  FixedWindowOptions,
  SlidingWindowLogOptions,
  SlidingWindowCounterOptions,
  TokenBucketOptions,
  LeakyBucketOptions,
  GlobalThrottleOptions,
  ThrottleResult,
} from './types';

export * from './types';

/**
 * Throttle
 *
 * Comprehensive API Throttling & Rate Limiting Module for BingeBuddy.
 * Supports Fixed Window, Sliding Window Log, Sliding Window Counter,
 * Token Bucket, and Leaky Bucket with atomic Redis Lua execution.
 */
export class Throttle {
  /**
   * Fixed Window Counter Middleware
   *
   * Best for: Simple, coarse-grained rate limits with minimal overhead.
   * Caveat: Potential 2x burst traffic at window boundaries.
   */
  public static fixedWindow(options: FixedWindowOptions): RequestHandler {
    const engine = new FixedWindowThrottle(options);
    return engine.toMiddleware();
  }

  /**
   * Sliding Window Log Middleware
   *
   * Best for: High-precision limits where exact timestamp accuracy is critical
   * (e.g. payment endpoints, password reset).
   */
  public static slidingWindowLog(options: SlidingWindowLogOptions): RequestHandler {
    const engine = new SlidingWindowLogThrottle(options);
    return engine.toMiddleware();
  }

  /**
   * Sliding Window Counter Middleware
   *
   * Best for: General REST APIs. Blends previous and current window counts
   * to eliminate boundary spikes with ultra-low Redis memory footprint.
   */
  public static slidingWindowCounter(options: SlidingWindowCounterOptions): RequestHandler {
    const engine = new SlidingWindowCounterThrottle(options);
    return engine.toMiddleware();
  }

  /**
   * Token Bucket Middleware
   *
   * Best for: Interactive browsing APIs (menu, categories, user profiles).
   * Tolerates bursts up to `capacity` while enforcing steady refill rate.
   */
  public static tokenBucket(options: TokenBucketOptions): RequestHandler {
    const engine = new TokenBucketThrottle(options);
    return engine.toMiddleware();
  }

  /**
   * Leaky Bucket Middleware
   *
   * Best for: CPU-intensive operations (like bcrypt hashing on /login),
   * database writes, and external third-party integrations (SMS/Email).
   * Enforces a strictly smoothed, constant processing rate.
   */
  public static leakyBucket(options: LeakyBucketOptions): RequestHandler {
    const engine = new LeakyBucketThrottle(options);
    return engine.toMiddleware();
  }

  /**
   * Global Load Throttling Middleware
   *
   * Enforces global system capacity across ALL incoming requests
   * (protects cluster pods and Node.js event loops from CPU starvation).
   */
  public static global(options: GlobalThrottleOptions): RequestHandler {
    const { algorithm, ...rest } = options;
    const globalKeyGenerator = (req: Request) => 'cluster:global_load';

    switch (algorithm) {
      case 'leakyBucket':
        return Throttle.leakyBucket({
          capacity: rest.capacity || 50,
          leakRate: rest.leakRate || 60,
          keyPrefix: 'th:global:lb:',
          keyGenerator: rest.keyGenerator || globalKeyGenerator,
          ...rest,
        });

      case 'tokenBucket':
        return Throttle.tokenBucket({
          capacity: rest.capacity || 100,
          refillRate: rest.refillRate || 50,
          keyPrefix: 'th:global:tb:',
          keyGenerator: rest.keyGenerator || globalKeyGenerator,
          ...rest,
        });

      case 'slidingWindowCounter':
        return Throttle.slidingWindowCounter({
          windowMs: rest.windowMs || 1000,
          maxRequests: rest.maxRequests || 50,
          keyPrefix: 'th:global:swc:',
          keyGenerator: rest.keyGenerator || globalKeyGenerator,
          ...rest,
        });

      case 'fixedWindow':
      default:
        return Throttle.fixedWindow({
          windowMs: rest.windowMs || 1000,
          maxRequests: rest.maxRequests || 50,
          keyPrefix: 'th:global:fw:',
          keyGenerator: rest.keyGenerator || globalKeyGenerator,
          ...rest,
        });
    }
  }

  /**
   * Programmatic evaluation without Express middleware (useful in custom business logic).
   */
  public static async evaluateTokenBucket(
    key: string,
    options: TokenBucketOptions
  ): Promise<ThrottleResult> {
    const engine = new TokenBucketThrottle({
      ...options,
      keyGenerator: () => key,
    });
    return engine.evaluate({} as Request);
  }

  public static async evaluateLeakyBucket(
    key: string,
    options: LeakyBucketOptions
  ): Promise<ThrottleResult> {
    const engine = new LeakyBucketThrottle({
      ...options,
      keyGenerator: () => key,
    });
    return engine.evaluate({} as Request);
  }

  /**
   * Utility to safely extract client IP behind proxies.
   */
  public static getClientIp(req: Request): string {
    return BaseAlgorithm.getClientIp(req);
  }
}

export default Throttle;
