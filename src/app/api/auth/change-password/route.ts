import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword:     z.string()
    .min(8,  "Password baru minimal 8 karakter")
    .max(72, "Password baru maksimal 72 karakter") // bcrypt limit
    .regex(/[A-Z]/, "Password harus mengandung minimal satu huruf kapital")
    .regex(/[0-9]/, "Password harus mengandung minimal satu angka"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  // Rate limit ketat untuk operasi sensitif: 5 kali per 15 menit
  const rl = await rateLimits.login(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST" } },
      { status: 400 }
    )
  }

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, passwordHash: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND" } },
      { status: 404 }
    )
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json(
      { error: { code: "INVALID_PASSWORD", message: "Password saat ini tidak benar" } },
      { status: 400 }
    )
  }

  // Pastikan password baru berbeda dari yang lama
  const isSame = await bcrypt.compare(parsed.data.newPassword, user.passwordHash)
  if (isSame) {
    return NextResponse.json(
      { error: { code: "SAME_PASSWORD", message: "Password baru tidak boleh sama dengan yang lama" } },
      { status: 400 }
    )
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)

  // Update password DAN passwordChangedAt secara atomic
  // passwordChangedAt yang baru akan invalidate semua JWT lama
  await prisma.user.update({
    where: { id: user.id },
    data:  {
      passwordHash:      newHash,
      passwordChangedAt: new Date(),
    },
  })

  return NextResponse.json({ data: { success: true } })
}
