/**
 * Production-grade Redis Lua scripts for atomic rate limiting and load throttling.
 *
 * Why Lua?
 * 1. 100% Atomic: Executed within Redis in a single event cycle without concurrency race conditions.
 * 2. High Performance: Zero TCP round-trips back and forth between Node.js and Redis.
 * 3. Type Safe: Embedded as TypeScript constants to guarantee compile-time inclusion in dist/.
 */

/**
 * Algorithm 1: Fixed Window Counter
 * KEYS[1] = key
 * ARGV[1] = windowSeconds
 * ARGV[2] = maxRequests
 * ARGV[3] = cost
 *
 * Returns: { allowed (0|1), currentCount, remaining, ttlSeconds }
 */
export const FIXED_WINDOW_LUA = `
local key = KEYS[1]
local windowSec = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local cost = tonumber(ARGV[3]) or 1

local current = redis.call('INCRBY', key, cost)
if current == cost then
    redis.call('EXPIRE', key, windowSec)
end

local ttl = redis.call('TTL', key)
if ttl < 0 then
    ttl = windowSec
    redis.call('EXPIRE', key, windowSec)
end

if current <= maxRequests then
    local remaining = maxRequests - current
    return { 1, current, remaining, ttl }
else
    return { 0, current, 0, ttl }
end
`;

/**
 * Algorithm 2: Sliding Window Log (High Precision Sorted Set)
 * KEYS[1] = key
 * ARGV[1] = windowMs
 * ARGV[2] = maxRequests
 * ARGV[3] = nowMs
 * ARGV[4] = cost
 *
 * Returns: { allowed (0|1), currentCount, remaining, retryAfterSeconds }
 */
export const SLIDING_WINDOW_LOG_LUA = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1

local clearBefore = nowMs - windowMs
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentCount = redis.call('ZCARD', key)

if (currentCount + cost) <= maxRequests then
    for i = 1, cost do
        local member = tostring(nowMs) .. ':' .. tostring(i) .. ':' .. tostring(math.random(1000, 9999))
        redis.call('ZADD', key, nowMs, member)
    end
    redis.call('PEXPIRE', key, windowMs)
    local remaining = maxRequests - (currentCount + cost)
    local resetSec = math.ceil(windowMs / 1000)
    return { 1, currentCount + cost, remaining, resetSec }
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfterSec = math.ceil(windowMs / 1000)
    if #oldest > 1 then
        local oldestScore = tonumber(oldest[2])
        local retryAfterMs = (oldestScore + windowMs) - nowMs
        if retryAfterMs > 0 then
            retryAfterSec = math.ceil(retryAfterMs / 1000)
        end
    end
    return { 0, currentCount, 0, retryAfterSec }
end
`;

/**
 * Algorithm 3: Sliding Window Counter (Cloudflare Weighted Interpolation)
 * KEYS[1] = keyPrefix
 * ARGV[1] = windowSec
 * ARGV[2] = maxRequests
 * ARGV[3] = nowSec
 * ARGV[4] = cost
 *
 * Returns: { allowed (0|1), estimatedCount, remaining, retryAfterSeconds }
 */
export const SLIDING_WINDOW_COUNTER_LUA = `
local keyPrefix = KEYS[1]
local windowSec = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local nowSec = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1

local currWindow = math.floor(nowSec / windowSec)
local prevWindow = currWindow - 1

local currKey = keyPrefix .. ':' .. currWindow
local prevKey = keyPrefix .. ':' .. prevWindow

local currCount = tonumber(redis.call('GET', currKey) or 0)
local prevCount = tonumber(redis.call('GET', prevKey) or 0)

local timeIntoCurrWindow = nowSec - (currWindow * windowSec)
local prevWeight = 1 - (timeIntoCurrWindow / windowSec)

local estimatedCount = math.floor(prevCount * prevWeight) + currCount

if (estimatedCount + cost) <= maxRequests then
    local newCount = redis.call('INCRBY', currKey, cost)
    if newCount == cost then
        redis.call('EXPIRE', currKey, windowSec * 2)
    end
    local remaining = maxRequests - (estimatedCount + cost)
    local resetSec = windowSec - timeIntoCurrWindow
    return { 1, estimatedCount + cost, remaining, resetSec }
else
    local resetSec = windowSec - timeIntoCurrWindow
    return { 0, estimatedCount, 0, resetSec }
end
`;

/**
 * Algorithm 4: Token Bucket (Burst-Tolerant Consumption)
 * KEYS[1] = key
 * ARGV[1] = capacity
 * ARGV[2] = refillRatePerSec
 * ARGV[3] = nowSec
 * ARGV[4] = cost
 * ARGV[5] = ttlSec
 *
 * Returns: { allowed (0|1), currentTokens, remaining, retryAfterSeconds }
 */
export const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local nowSec = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1
local ttl = tonumber(ARGV[5]) or 3600

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if not tokens then
    tokens = capacity
    lastRefill = nowSec
else
    local delta = math.max(0, nowSec - lastRefill)
    local generated = delta * refillRate
    tokens = math.min(capacity, tokens + generated)
    lastRefill = nowSec
end

if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
    redis.call('EXPIRE', key, ttl)
    return { 1, math.floor(tokens), math.floor(tokens), 0 }
else
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
    redis.call('EXPIRE', key, ttl)
    local needed = cost - tokens
    local retryAfter = math.ceil(needed / refillRate)
    if retryAfter < 1 then retryAfter = 1 end
    return { 0, math.floor(tokens), 0, retryAfter }
end
`;

/**
 * Algorithm 5: Leaky Bucket (Steady-Rate Traffic Smoothing)
 * KEYS[1] = key
 * ARGV[1] = capacity
 * ARGV[2] = leakRatePerSec
 * ARGV[3] = nowSec
 * ARGV[4] = cost
 * ARGV[5] = ttlSec
 *
 * Returns: { allowed (0|1), currentWaterLevel, remainingCapacity, retryAfterSeconds }
 */
export const LEAKY_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local leakRate = tonumber(ARGV[2])
local nowSec = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1
local ttl = tonumber(ARGV[5]) or 3600

local data = redis.call('HMGET', key, 'water', 'lastLeak')
local water = tonumber(data[1])
local lastLeak = tonumber(data[2])

if not water then
    water = 0
    lastLeak = nowSec
else
    local delta = math.max(0, nowSec - lastLeak)
    local leaked = delta * leakRate
    water = math.max(0, water - leaked)
    lastLeak = nowSec
end

if (water + cost) <= capacity then
    water = water + cost
    redis.call('HMSET', key, 'water', water, 'lastLeak', lastLeak)
    redis.call('EXPIRE', key, ttl)
    local remaining = math.max(0, capacity - water)
    return { 1, math.floor(water), remaining, 0 }
else
    redis.call('HMSET', key, 'water', water, 'lastLeak', lastLeak)
    redis.call('EXPIRE', key, ttl)
    local excess = (water + cost) - capacity
    local retryAfter = math.ceil(excess / leakRate)
    if retryAfter < 1 then retryAfter = 1 end
    return { 0, math.floor(water), 0, retryAfter }
end
`;
