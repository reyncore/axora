import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { sendEmail, buildVerificationEmail } from "@/lib/email"
import { verifyTurnstile } from "@/lib/turnstile"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  // IP extraction — Vercel sets x-forwarded-for, not spoofable at edge
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"

  // Rate limit SEBELUM semua processing — fail fast untuk flood attack
  const rl = await rateLimits.register(ip)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  // ── Turnstile verification ──────────────────────────────────────────────────
  // Dilakukan SEBELUM validasi input dan DB query untuk fail fast.
  // Token ada di body yang sama dengan data register.

  const token   = typeof body === "object" && body !== null && "turnstileToken" in body
    ? String((body as Record<string, unknown>).turnstileToken ?? "")
    : ""

  const captcha = await verifyTurnstile(token, ip)

  if (!captcha.success) {
    const messages: Record<string, string> = {
      "missing-token":       "Verifikasi CAPTCHA diperlukan",
      "invalid-token":       "CAPTCHA tidak valid atau sudah kedaluwarsa, coba lagi",
      "service-unavailable": "Layanan verifikasi tidak tersedia, coba beberapa saat lagi",
      "misconfigured":       "Konfigurasi server tidak lengkap",
    }

    return NextResponse.json(
      {
        error: {
          code:    "CAPTCHA_FAILED",
          message: messages[captcha.reason] ?? "Verifikasi CAPTCHA gagal",
        },
      },
      // 503 untuk service-unavailable (attacker tidak bisa exploit ini)
      // 400 untuk semua kasus lain (invalid/missing token)
      { status: captcha.reason === "service-unavailable" ? 503 : 400 }
    )
  }

  // ── Input validation ────────────────────────────────────────────────────────

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code:    "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { email, username, displayName, password } = parsed.data

  // ── Duplicate check ─────────────────────────────────────────────────────────

  const existing = await prisma.user.findFirst({
    where:  { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  })

  if (existing) {
    const field = existing.email === email ? "email" : "username"
    return NextResponse.json(
      { error: { code: "CONFLICT", message: `${field} ini sudah digunakan` } },
      { status: 409 }
    )
  }

  // ── Create user ─────────────────────────────────────────────────────────────

  const passwordHash      = await bcrypt.hash(password, 12)
  const verificationToken = crypto.randomBytes(32).toString("hex")
  const tokenExpiresAt    = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      verificationToken,
      tokenExpiresAt,
    },
    select: { id: true, email: true, username: true, displayName: true },
  })

  // ── Send verification email ─────────────────────────────────────────────────

  const appUrl    = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`
  const payload   = buildVerificationEmail({ displayName: user.displayName, verifyUrl })
  payload.to      = user.email

  void sendEmail(payload).catch(err => {
    console.error("Failed to send verification email:", err)
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
