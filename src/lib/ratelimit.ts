import { NextResponse } from "next/server"

export interface RateLimitResult {
  success:   boolean
  remaining: number
  resetAt:   number
}

// ── Upstash Redis implementation ──────────────────────────────────────────────

async function checkUpstash(
  key: string, limit: number, windowMs: number,
): Promise<RateLimitResult> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const now   = Date.now()
  const resetAt = now + windowMs

  const script = `
    local key   = KEYS[1]
    local now   = tonumber(ARGV[1])
    local win   = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now - win)
    local count = redis.call('ZCARD', key)
    if count >= limit then
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local reset  = now + win
      if oldest and oldest[2] then reset = tonumber(oldest[2]) + win end
      return {0, 0, reset}
    end
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('PEXPIRE', key, win)
    return {1, limit - count - 1, now + win}
  `

  try {
    const res = await fetch(`${url}/eval`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ script, keys: [key], args: [String(now), String(windowMs), String(limit)] }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json() as { result: [number, number, number] }
    const [ok, remaining, reset] = data.result
    return { success: ok === 1, remaining: remaining ?? 0, resetAt: reset ?? resetAt }
  } catch {
    // Fail open — jika Redis down, allow request
    return { success: true, remaining: limit - 1, resetAt }
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface RateRecord { count: number; resetAt: number }

class InMemoryRateLimiter {
  private store = new Map<string, RateRecord>()

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now    = Date.now()
    const record = this.store.get(key)
    if (!record || now > record.resetAt) {
      const resetAt = now + windowMs
      this.store.set(key, { count: 1, resetAt })
      return { success: true, remaining: limit - 1, resetAt }
    }
    if (record.count >= limit) return { success: false, remaining: 0, resetAt: record.resetAt }
    record.count++
    return { success: true, remaining: limit - record.count, resetAt: record.resetAt }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [k, r] of this.store) if (now > r.resetAt) this.store.delete(k)
  }
}

const memLimiter = new InMemoryRateLimiter()
if (typeof setInterval !== "undefined") {
  setInterval(() => memLimiter.cleanup(), 5 * 60 * 1000)
}

// ── Unified ───────────────────────────────────────────────────────────────────

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  return isRedisConfigured()
    ? checkUpstash(key, limit, windowMs)
    : Promise.resolve(memLimiter.check(key, limit, windowMs))
}

export const rateLimits = {
  createPost:  (userId: string) => check(`rl:post:${userId}`,    20,       60_000),
  like:        (userId: string) => check(`rl:like:${userId}`,   100,       60_000),
  follow:      (userId: string) => check(`rl:follow:${userId}`,  20,       60_000),
  upload:      (userId: string) => check(`rl:upload:${userId}`,  10,  5 * 60_000),
  register:    (ip: string)     => check(`rl:reg:${ip}`,          5, 60 * 60_000),
  resendEmail: (userId: string) => check(`rl:resend:${userId}`,  10, 60 * 60_000),
  login:       (ip: string)     => check(`rl:login:${ip}`,       30, 15 * 60_000),
  search:      (userId: string) => check(`rl:search:${userId}`,  60,       60_000),
} as const

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Terlalu banyak request, coba lagi sebentar" } },
    {
      status:  429,
      headers: {
        "Retry-After":       String(retryAfter),
        "X-RateLimit-Reset": String(resetAt),
        "X-RateLimit-Type":  isRedisConfigured() ? "redis" : "memory",
      },
    }
  )
}
