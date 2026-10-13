import type { Request } from 'express';
import { BaseAlgorithm } from './base';
import { LEAKY_BUCKET_LUA } from '../scripts';
import type { LeakyBucketOptions, ThrottleResult } from '../types';

export class LeakyBucketThrottle extends BaseAlgorithm<LeakyBucketOptions> {
  constructor(options: LeakyBucketOptions) {
    super({
      keyPrefix: 'th:lb:',
      ...options,
    });
  }

  public async evaluate(req: Request): Promise<ThrottleResult> {
    const key = this.resolveKey(req);
    const capacity = this.options.capacity;
    const leakRate = this.options.leakRate;
    const nowSec = Math.floor(Date.now() / 1000);
    const cost = this.options.cost || 1;
    // TTL: enough time for full capacity to drain to 0, plus 60s
    const ttlSec = Math.max(60, Math.ceil(capacity / Math.max(0.1, leakRate)) + 60);

    const [allowed, currentWater, remaining, retryAfterSec] = (await BaseAlgorithm.executeLua(
      LEAKY_BUCKET_LUA,
      [key],
      [capacity, leakRate, nowSec, cost, ttlSec]
    )) as [number, number, number, number];

    const resetTime = Date.now() + (retryAfterSec * 1000);

    return {
      allowed: allowed === 1,
      limit: capacity,
      current: currentWater,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfter: allowed === 1 ? undefined : Math.max(1, retryAfterSec),
    };
  }
}
