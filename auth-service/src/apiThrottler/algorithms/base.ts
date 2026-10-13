import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../../database/redis';
import type { BaseThrottleOptions, ThrottleResult } from '../types';

export abstract class BaseAlgorithm<T extends BaseThrottleOptions> {
  protected options: T;

  constructor(options: T) {
    this.options = {
      cost: 1,
      keyPrefix: 'th:',
      sendHeaders: true,
      statusCode: 429,
      ...options,
    };
  }

  /**
   * Safely resolves client IP even behind proxies/ingress controllers.
   */
  public static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const parts = forwarded.split(',');
      const firstIp = parts[0]?.trim();
      if (firstIp) return firstIp;
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  /**
   * Resolves the Redis key for the incoming request.
   */
  protected resolveKey(req: Request): string {
    const prefix = this.options.keyPrefix || 'th:';
    if (this.options.keyGenerator) {
      return `${prefix}${this.options.keyGenerator(req)}`;
    }
    return `${prefix}${BaseAlgorithm.getClientIp(req)}`;
  }

  /**
   * Executes a Lua script using the underlying Redis client with compatibility fallback.
   */
  protected static async executeLua(
    script: string,
    keys: string[],
    args: (string | number)[]
  ): Promise<any> {
    const stringArgs = args.map((a) => a.toString());
    try {
      // Node Redis v4/v5 eval syntax
      if (typeof redisClient.eval === 'function') {
        return await redisClient.eval(script, {
          keys,
          arguments: stringArgs,
        });
      }
      // Fallback via sendCommand
      return await redisClient.sendCommand([
        'EVAL',
        script,
        keys.length.toString(),
        ...keys,
        ...stringArgs,
      ]);
    } catch (err) {
      console.error('[apiThrottler] Redis Lua evaluation error:', err);
      throw err;
    }
  }

  /**
   * Abstract check method to be implemented by each algorithm.
   */
  public abstract evaluate(req: Request): Promise<ThrottleResult>;

  /**
   * Builds an Express middleware from this algorithm instance.
   */
  public toMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      // 1. Check bypass/skip conditions
      if (this.options.skip && this.options.skip(req)) {
        return next();
      }

      // Default skip rule: Never throttle health endpoints
      if (!this.options.skip && req.path.includes('/health')) {
        return next();
      }

      try {
        const result = await this.evaluate(req);

        // 2. Attach standard RFC RateLimit headers
        if (this.options.sendHeaders !== false) {
          res.setHeader('RateLimit-Limit', result.limit.toString());
          res.setHeader('RateLimit-Remaining', Math.max(0, result.remaining).toString());
          res.setHeader('RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

          // Legacy headers for backward compatibility
          res.setHeader('X-RateLimit-Limit', result.limit.toString());
          res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
          res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

          if (!result.allowed && result.retryAfter) {
            res.setHeader('Retry-After', result.retryAfter.toString());
          }
        }

        // 3. Allow or reject
        if (result.allowed) {
          return next();
        }

        // 4. Rate limit exceeded
        if (this.options.handler) {
          return this.options.handler(req, res, next, result);
        }

        const statusCode = this.options.statusCode || 429;
        const defaultMessage = {
          success: false,
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.',
          retryAfterSeconds: result.retryAfter || 1,
        };

        const payload =
          typeof this.options.message === 'string'
            ? { success: false, message: this.options.message, retryAfterSeconds: result.retryAfter || 1 }
            : this.options.message || defaultMessage;

        return res.status(statusCode).json(payload);
      } catch (error) {
        // Fail-open strategy: If Redis fails, log and let the request proceed so the service doesn't hard-crash
        console.error('[apiThrottler] Throttling execution failed, failing open:', error);
        return next();
      }
    };
  }
}
