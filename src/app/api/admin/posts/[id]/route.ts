import { requireAdminApi } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const actionSchema = z.object({
  action: z.enum(["delete", "restore"]),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdminApi()
  if (denied) return denied

  const { id } = await params

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

  const post = await prisma.post.findUnique({
    where:  { id },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  await prisma.post.update({
    where: { id },
    data:  { isDeleted: parsed.data.action === "delete" },
  })

  return NextResponse.json({ data: { success: true } })
}
