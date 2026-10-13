import type { Request, Response, NextFunction } from 'express';

export type ThrottleAlgorithmType =
  | 'fixedWindow'
  | 'slidingWindowLog'
  | 'slidingWindowCounter'
  | 'tokenBucket'
  | 'leakyBucket';

export interface ThrottleResult {
  /** Whether the request is allowed through or blocked */
  allowed: boolean;
  /** Configured maximum capacity or limit */
  limit: number;
  /** Remaining requests or tokens in the current period */
  remaining: number;
  /** Unix timestamp (in ms) when the window/limit resets */
  resetTime: number;
  /** Seconds the client must wait before retrying (present when allowed === false) */
  retryAfter?: number | undefined;
  /** Current count, water level, or tokens consumed */
  current: number;
}

export type KeyGeneratorFn = (req: Request) => string;
export type SkipFn = (req: Request) => boolean;
export type ThrottleHandlerFn = (
  req: Request,
  res: Response,
  next: NextFunction,
  result: ThrottleResult
) => void | Response;

export interface BaseThrottleOptions {
  /**
   * Function to extract a unique throttling key.
   * Default: client IP address (respects req.ip / X-Forwarded-For).
   */
  keyGenerator?: KeyGeneratorFn;

  /**
   * Function to skip throttling conditionally (e.g. for health checks, internal IPs).
   * Default: skips requests containing '/health'.
   */
  skip?: SkipFn;

  /**
   * Custom handler executed when the rate limit is exceeded.
   * Default: returns HTTP 429 with RFC headers and JSON body.
   */
  handler?: ThrottleHandlerFn;

  /**
   * Custom namespace prefix for Redis keys.
   * Default: 'th:'
   */
  keyPrefix?: string;

  /**
   * Cost or weight of this request (default: 1).
   */
  cost?: number;

  /**
   * Whether to inject standard RFC RateLimit headers (default: true).
   */
  sendHeaders?: boolean;

  /**
   * Custom response message or payload when rejected.
   */
  message?: string | Record<string, any>;

  /**
   * Custom HTTP status code when rejected (default: 429).
   */
  statusCode?: number;
}

export interface FixedWindowOptions extends BaseThrottleOptions {
  /** Duration of the fixed time window in milliseconds (e.g. 60000 for 1 minute) */
  windowMs: number;
  /** Maximum number of allowed requests in the window */
  maxRequests: number;
}

export interface SlidingWindowLogOptions extends BaseThrottleOptions {
  /** Duration of the sliding window in milliseconds */
  windowMs: number;
  /** Maximum number of allowed requests in the sliding window */
  maxRequests: number;
}

export interface SlidingWindowCounterOptions extends BaseThrottleOptions {
  /** Duration of the window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed across the weighted sliding window */
  maxRequests: number;
}

export interface TokenBucketOptions extends BaseThrottleOptions {
  /** Maximum burst capacity (maximum tokens the bucket can hold) */
  capacity: number;
  /** Number of tokens added to the bucket per second */
  refillRate: number;
}

export interface LeakyBucketOptions extends BaseThrottleOptions {
  /** Maximum buffer depth (queue size) before excess requests leak/drop */
  capacity: number;
  /** Constant leak rate (requests processed per second) */
  leakRate: number;
}

export interface GlobalThrottleOptions extends BaseThrottleOptions {
  /** Chosen algorithm for cluster/global load shedding */
  algorithm: ThrottleAlgorithmType;
  /** Algorithm-specific settings */
  windowMs?: number;
  maxRequests?: number;
  capacity?: number;
  refillRate?: number;
  leakRate?: number;
}
