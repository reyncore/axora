import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { sendEmail, buildVerificationEmail } from "@/lib/email"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"

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

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { email, username, displayName, password } = parsed.data

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

  const passwordHash       = await bcrypt.hash(password, 12)
  const verificationToken  = crypto.randomBytes(32).toString("hex")
  const tokenExpiresAt     = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 jam

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

  // Kirim email verifikasi — fire-and-forget agar register tidak block
  const appUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`
  const emailPayload = buildVerificationEmail({
    displayName: user.displayName,
    verifyUrl,
  })
  emailPayload.to = user.email

  // Non-blocking — jika email gagal, user masih bisa login
  void sendEmail(emailPayload).catch(err => {
    console.error("Failed to send verification email:", err)
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
