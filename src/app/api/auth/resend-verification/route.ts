import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendEmail, buildVerificationEmail } from "@/lib/email"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  // Rate limit: 3 resend per jam per user
  const rl = await rateLimits.register(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:            true,
      email:         true,
      displayName:   true,
      emailVerified: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND" } },
      { status: 404 }
    )
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: { code: "ALREADY_VERIFIED", message: "Email sudah terverifikasi" } },
      { status: 400 }
    )
  }

  const verificationToken = crypto.randomBytes(32).toString("hex")
  const tokenExpiresAt    = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data:  { verificationToken, tokenExpiresAt },
  })

  const appUrl    = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`
  const payload   = buildVerificationEmail({ displayName: user.displayName, verifyUrl })
  payload.to      = user.email

  try {
    await sendEmail(payload)
  } catch (err) {
    console.error("Resend verification email failed:", err)
    return NextResponse.json(
      { error: { code: "EMAIL_FAILED", message: "Gagal mengirim email, coba lagi" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { sent: true } })
}
