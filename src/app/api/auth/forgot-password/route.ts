import { prisma } from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { sendEmail, buildResetPasswordEmail } from "@/lib/email"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"

const schema = z.object({
  email: z.string().email(),
})

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 jam

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"

  const rl = await rateLimits.resetPassword(ip)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST" } },
      { status: 400 }
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR" } },
      { status: 400 }
    )
  }

  // SELALU return 200 meski email tidak ditemukan — mencegah user enumeration.
  // Attacker tidak bisa tahu apakah email terdaftar atau tidak.
  const user = await prisma.user.findUnique({
    where:  { email: parsed.data.email },
    select: { id: true, displayName: true, email: true },
  })

  if (user) {
    const token      = crypto.randomBytes(32).toString("hex")
    const expiresAt  = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await prisma.user.update({
      where: { id: user.id },
      data:  {
        resetPasswordToken:  token,
        resetTokenExpiresAt: expiresAt,
      },
    })

    const appUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const resetUrl = `${appUrl}/reset-password?token=${token}`
    const payload  = buildResetPasswordEmail({ displayName: user.displayName, resetUrl })
    payload.to     = user.email

    void sendEmail(payload).catch(err => {
      console.error("[ForgotPassword] Failed to send email:", err)
    })
  }

  // Response identik untuk email found / not found
  return NextResponse.json({
    data: {
      message: "Jika email terdaftar, instruksi reset password sudah dikirim",
    },
  })
}
