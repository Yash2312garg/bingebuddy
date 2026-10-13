import type { Request } from 'express';
import { BaseAlgorithm } from './base';
import { SLIDING_WINDOW_COUNTER_LUA } from '../scripts';
import type { SlidingWindowCounterOptions, ThrottleResult } from '../types';

export class SlidingWindowCounterThrottle extends BaseAlgorithm<SlidingWindowCounterOptions> {
  constructor(options: SlidingWindowCounterOptions) {
    super({
      keyPrefix: 'th:swc:',
      ...options,
    });
  }

  public async evaluate(req: Request): Promise<ThrottleResult> {
    const key = this.resolveKey(req);
    const windowSec = Math.max(1, Math.ceil(this.options.windowMs / 1000));
    const maxRequests = this.options.maxRequests;
    const nowSec = Math.floor(Date.now() / 1000);
    const cost = this.options.cost || 1;

    const [allowed, current, remaining, resetSec] = (await BaseAlgorithm.executeLua(
      SLIDING_WINDOW_COUNTER_LUA,
      [key],
      [windowSec, maxRequests, nowSec, cost]
    )) as [number, number, number, number];

    const resetTime = Date.now() + (resetSec * 1000);

    return {
      allowed: allowed === 1,
      limit: maxRequests,
      current,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfter: allowed === 1 ? undefined : Math.max(1, resetSec),
    };
  }
}
