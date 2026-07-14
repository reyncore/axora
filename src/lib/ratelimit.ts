/**
 * lib/ratelimit.ts — Rate limiting menggunakan Upstash official SDK.
 *
 * Referensi: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 *
 * Sliding window algorithm dipakai untuk semua limit karena:
 * - Tidak ada burst di awal window (vs fixed window)
 * - Lebih smooth dan adil untuk legitimate users
 * - Upstash atomic Lua script — tidak ada race condition
 *
 * Fallback: jika Redis tidak terkonfigurasi, in-memory limiter dipakai.
 * In-memory tidak persistent antar serverless invocations — hanya sebagai
 * safety net untuk development environment, bukan production fallback.
 * Di production, UPSTASH_REDIS_REST_URL wajib dikonfigurasi.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis }     from "@upstash/redis"
import { NextResponse } from "next/server"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success:   boolean
  remaining: number
  resetAt:   number   // Unix timestamp ms
}

// ── Redis client ──────────────────────────────────────────────────────────────

function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

/**
 * Redis client dari env vars.
 * @upstash/redis otomatis baca UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * tanpa konfigurasi tambahan.
 */
const redis = isRedisConfigured()
  ? new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// ── Ratelimit instances — dibuat sekali, reuse di setiap request ─────────────

/**
 * Factory function untuk buat Ratelimit instance dengan sliding window.
 * Setiap config berbeda butuh instance sendiri karena limit/window di-embed
 * ke dalam instance saat konstruksi.
 *
 * ephemeralCache: Map in-memory untuk deduplicate request dalam window pendek
 * (default 60s). Mengurangi round-trip ke Redis untuk traffic burst ke key
 * yang sama. Safe untuk serverless karena hanya cache negatif (blocked requests).
 */
function makeLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`): Ratelimit | null {
  if (!redis) return null

  return new Ratelimit({
    redis,
    limiter:        Ratelimit.slidingWindow(requests, window),
    ephemeralCache: new Map(),
    analytics:      false, // Disable Upstash Analytics — tidak perlu untuk MVP
    prefix:         "axora:rl",
  })
}

// Satu instance per rate limit config — tidak dibuat ulang per request
const limiters = {
  createPost:  makeLimiter(20,  "1 m"),
  like:        makeLimiter(100, "1 m"),
  follow:      makeLimiter(20,  "1 m"),
  upload:      makeLimiter(10,  "5 m"),
  register:    makeLimiter(5,   "1 h"),
  resendEmail: makeLimiter(10,  "1 h"),
  login:       makeLimiter(30,  "15 m"),
  search:      makeLimiter(60,  "1 m"),
  resetPassword: makeLimiter(3, "1 h"),
} as const

// ── In-memory fallback ─────────────────────────────────────────────────────────

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

    if (record.count >= limit) {
      return { success: false, remaining: 0, resetAt: record.resetAt }
    }

    record.count++
    return {
      success:   true,
      remaining: limit - record.count,
      resetAt:   record.resetAt,
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [k, r] of this.store) {
      if (now > r.resetAt) this.store.delete(k)
    }
  }
}

const memLimiter = new InMemoryRateLimiter()
if (typeof setInterval !== "undefined") {
  setInterval(() => memLimiter.cleanup(), 5 * 60 * 1000)
}

// Limits untuk in-memory fallback (ms)
const MEM_LIMITS: Record<keyof typeof limiters, [number, number]> = {
  createPost:    [20,   60_000],
  like:          [100,  60_000],
  follow:        [20,   60_000],
  upload:        [10,   5  * 60_000],
  register:      [5,    60 * 60_000],
  resendEmail:   [10,   60 * 60_000],
  login:         [30,   15 * 60_000],
  search:        [60,   60_000],
  resetPassword: [3,    60 * 60_000],
}

// ── Unified rate check ─────────────────────────────────────────────────────────

async function check(
  type: keyof typeof limiters,
  key:  string,
): Promise<RateLimitResult> {
  const limiter = limiters[type]

  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return {
        success:   result.success,
        remaining: result.remaining,
        resetAt:   result.reset,
      }
    } catch (err) {
      // Redis error — fail open dengan log (bukan silent)
      console.warn(`[RateLimit] Redis error for ${type}:`, err instanceof Error ? err.message : err)
      return { success: true, remaining: 0, resetAt: Date.now() + 60_000 }
    }
  }

  // In-memory fallback (development / Redis not configured)
  const [limit, windowMs] = MEM_LIMITS[type]
  return memLimiter.check(`${type}:${key}`, limit, windowMs)
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const rateLimits = {
  createPost:    (userId: string) => check("createPost",    `post:${userId}`),
  like:          (userId: string) => check("like",          `like:${userId}`),
  follow:        (userId: string) => check("follow",        `follow:${userId}`),
  upload:        (userId: string) => check("upload",        `upload:${userId}`),
  register:      (ip: string)     => check("register",      `reg:${ip}`),
  resendEmail:   (userId: string) => check("resendEmail",   `resend:${userId}`),
  login:         (ip: string)     => check("login",         `login:${ip}`),
  search:        (userId: string) => check("search",        `search:${userId}`),
  resetPassword: (ip: string)     => check("resetPassword", `reset:${ip}`),
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
