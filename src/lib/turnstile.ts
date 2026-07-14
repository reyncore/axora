/**
 * lib/turnstile.ts — Cloudflare Turnstile server-side verification.
 *
 * Fail behavior: CLOSED (explicit product decision — security > availability).
 * Any verification failure, timeout, or misconfiguration returns success=false.
 * Callers must not silently degrade to "allow all" on failure.
 *
 * Token idempotency: Cloudflare rejects replayed tokens automatically.
 * No server-side token storage needed.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const TIMEOUT_MS     = 5_000

export type TurnstileResult =
  | { success: true }
  | { success: false; reason: TurnstileFailReason }

/**
 * Reason granularity is intentionally coarse on the public API —
 * callers should not need to branch on every failure variant.
 * Granularity exists for logging/debugging only.
 */
export type TurnstileFailReason =
  | "missing-token"       // Client did not send a token
  | "invalid-token"       // Token rejected by Cloudflare (expired, replayed, invalid)
  | "service-unavailable" // Network error, timeout, or unexpected HTTP status
  | "misconfigured"       // TURNSTILE_SECRET_KEY env var absent

interface SiteverifyResponse {
  success:       boolean
  "error-codes": string[]
}

export async function verifyTurnstile(
  token:    string | null | undefined,
  clientIp: string | null,
): Promise<TurnstileResult> {
  if (!token?.trim()) {
    return { success: false, reason: "missing-token" }
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured")
    return { success: false, reason: "misconfigured" }
  }

  const params = new URLSearchParams({ secret, response: token })
  if (clientIp) params.set("remoteip", clientIp)

  let res: Response
  try {
    res = await fetch(SITEVERIFY_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    params.toString(),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    // Network failure or timeout — fail closed, log for ops visibility
    console.warn(
      "[Turnstile] siteverify unreachable:",
      err instanceof Error ? err.message : String(err)
    )
    return { success: false, reason: "service-unavailable" }
  }

  if (!res.ok) {
    console.warn(`[Turnstile] siteverify returned HTTP ${res.status}`)
    return { success: false, reason: "service-unavailable" }
  }

  let data: SiteverifyResponse
  try {
    data = await res.json() as SiteverifyResponse
  } catch {
    console.warn("[Turnstile] siteverify response was not valid JSON")
    return { success: false, reason: "service-unavailable" }
  }

  if (!data.success) {
    // Bot attempts are expected — do not log individually, would flood in attack scenarios.
    // Structured logging at aggregation layer (Vercel/Datadog) handles anomaly detection.
    return { success: false, reason: "invalid-token" }
  }

  return { success: true }
}
