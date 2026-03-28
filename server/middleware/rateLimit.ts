import redis from '../redis'

/**
 * Redis-backed sliding window rate limiter.
 * Returns true if the action is allowed, false if rate limit exceeded.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const key = `ratelimit:${userId}:${action}`
  const windowSec = Math.ceil(windowMs / 1000)

  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.expire(key, windowSec)
  const results = await pipeline.exec()

  if (!results) return false

  const [incrResult] = results
  const count = incrResult?.[1] as number | null

  if (count === null || count === undefined) return false

  return count <= maxRequests
}

/**
 * Convenience wrapper: rate limit with a standard error throw.
 * Throws if limit exceeded.
 */
export async function enforceRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number
): Promise<void> {
  const allowed = await checkRateLimit(userId, action, maxRequests, windowMs)
  if (!allowed) {
    throw new Error(`Rate limit exceeded for action: ${action}`)
  }
}
