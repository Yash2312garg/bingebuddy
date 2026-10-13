import type { Request } from 'express';
import { BaseAlgorithm } from './base';
import { SLIDING_WINDOW_LOG_LUA } from '../scripts';
import type { SlidingWindowLogOptions, ThrottleResult } from '../types';

export class SlidingWindowLogThrottle extends BaseAlgorithm<SlidingWindowLogOptions> {
  constructor(options: SlidingWindowLogOptions) {
    super({
      keyPrefix: 'th:swl:',
      ...options,
    });
  }

  public async evaluate(req: Request): Promise<ThrottleResult> {
    const key = this.resolveKey(req);
    const windowMs = this.options.windowMs;
    const maxRequests = this.options.maxRequests;
    const nowMs = Date.now();
    const cost = this.options.cost || 1;

    const [allowed, current, remaining, retryAfterSec] = (await BaseAlgorithm.executeLua(
      SLIDING_WINDOW_LOG_LUA,
      [key],
      [windowMs, maxRequests, nowMs, cost]
    )) as [number, number, number, number];

    const resetTime = nowMs + windowMs;

    return {
      allowed: allowed === 1,
      limit: maxRequests,
      current,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfter: allowed === 1 ? undefined : Math.max(1, retryAfterSec),
    };
  }
}
