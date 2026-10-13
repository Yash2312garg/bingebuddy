import type { Request } from 'express';
import { BaseAlgorithm } from './base';
import { TOKEN_BUCKET_LUA } from '../scripts';
import type { TokenBucketOptions, ThrottleResult } from '../types';

export class TokenBucketThrottle extends BaseAlgorithm<TokenBucketOptions> {
  constructor(options: TokenBucketOptions) {
    super({
      keyPrefix: 'th:tb:',
      ...options,
    });
  }

  public async evaluate(req: Request): Promise<ThrottleResult> {
    const key = this.resolveKey(req);
    const capacity = this.options.capacity;
    const refillRate = this.options.refillRate;
    const nowSec = Math.floor(Date.now() / 1000);
    const cost = this.options.cost || 1;
    // Keep bucket key alive in Redis as long as it takes to refill to capacity, plus 60s margin
    const ttlSec = Math.max(60, Math.ceil(capacity / Math.max(0.1, refillRate)) + 60);

    const [allowed, currentTokens, remaining, retryAfterSec] = (await BaseAlgorithm.executeLua(
      TOKEN_BUCKET_LUA,
      [key],
      [capacity, refillRate, nowSec, cost, ttlSec]
    )) as [number, number, number, number];

    const resetTime = Date.now() + (retryAfterSec * 1000);

    return {
      allowed: allowed === 1,
      limit: capacity,
      current: currentTokens,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfter: allowed === 1 ? undefined : Math.max(1, retryAfterSec),
    };
  }
}
