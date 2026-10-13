import type { Request } from 'express';
import { BaseAlgorithm } from './base';
import { FIXED_WINDOW_LUA } from '../scripts';
import type { FixedWindowOptions, ThrottleResult } from '../types';

export class FixedWindowThrottle extends BaseAlgorithm<FixedWindowOptions> {
  constructor(options: FixedWindowOptions) {
    super({
      keyPrefix: 'th:fw:',
      ...options,
    });
  }

  public async evaluate(req: Request): Promise<ThrottleResult> {
    const key = this.resolveKey(req);
    const windowSec = Math.max(1, Math.ceil(this.options.windowMs / 1000));
    const maxRequests = this.options.maxRequests;
    const cost = this.options.cost || 1;

    const [allowed, current, remaining, ttl] = (await BaseAlgorithm.executeLua(
      FIXED_WINDOW_LUA,
      [key],
      [windowSec, maxRequests, cost]
    )) as [number, number, number, number];

    const now = Date.now();
    const resetTime = now + (ttl * 1000);

    return {
      allowed: allowed === 1,
      limit: maxRequests,
      current,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfter: allowed === 1 ? undefined : Math.max(1, ttl),
    };
  }
}
