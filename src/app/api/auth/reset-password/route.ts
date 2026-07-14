import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const schema = z.object({
  token:    z.string().min(1),
  password: z.string()
    .min(8,  "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter")
    .regex(/[A-Z]/, "Password harus mengandung minimal satu huruf kapital")
    .regex(/[0-9]/, "Password harus mengandung minimal satu angka"),
})

export async function POST(req: NextRequest) {
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
      {
        error: {
          code:    "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken:  token,
      resetTokenExpiresAt: { gt: new Date() }, // token belum expire
    },
    select: { id: true, passwordHash: true },
  })

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code:    "INVALID_TOKEN",
          message: "Link reset password tidak valid atau sudah kedaluwarsa",
        },
      },
      { status: 400 }
    )
  }

  // Pastikan password baru berbeda dari yang lama
  const isSame = await bcrypt.compare(password, user.passwordHash)
  if (isSame) {
    return NextResponse.json(
      {
        error: {
          code:    "SAME_PASSWORD",
          message: "Password baru tidak boleh sama dengan yang lama",
        },
      },
      { status: 400 }
    )
  }

  const newHash = await bcrypt.hash(password, 12)

  // Atomic: update password + invalidate token + invalidate semua JWT lama
  await prisma.user.update({
    where: { id: user.id },
    data:  {
      passwordHash:        newHash,
      passwordChangedAt:   new Date(),  // invalidate semua JWT lama
      resetPasswordToken:  null,        // token single-use — langsung hapus
      resetTokenExpiresAt: null,
    },
  })

  return NextResponse.json({ data: { success: true } })
}
