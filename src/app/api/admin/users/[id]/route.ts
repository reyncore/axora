import { requireAdminApi } from "@/lib/admin"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const actionSchema = z.object({
  action: z.enum(["ban", "unban", "verify", "unverify", "promote", "demote"]),
  reason: z.string().max(200).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdminApi()
  if (denied) return denied

  const session = await auth()
  const { id }   = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { action, reason } = parsed.data

  // Admin tidak bisa ban/demote diri sendiri — mencegah lockout
  if (id === session?.user?.id && (action === "ban" || action === "demote")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Tidak bisa melakukan aksi ini pada akun sendiri" } },
      { status: 403 }
    )
  }

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, role: true },
  })

  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } },
      { status: 404 }
    )
  }

  switch (action) {
    case "ban":
      await prisma.user.update({
        where: { id },
        data:  { isBanned: true, bannedAt: new Date(), banReason: reason ?? null },
      })
      break

    case "unban":
      await prisma.user.update({
        where: { id },
        data:  { isBanned: false, bannedAt: null, banReason: null },
      })
      break

    case "verify":
      await prisma.user.update({ where: { id }, data: { isVerified: true } })
      break

    case "unverify":
      await prisma.user.update({ where: { id }, data: { isVerified: false } })
      break

    case "promote":
      await prisma.user.update({ where: { id }, data: { role: "ADMIN" } })
      break

    case "demote":
      await prisma.user.update({ where: { id }, data: { role: "USER" } })
      break
  }

  return NextResponse.json({ data: { success: true } })
}
