import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createCollection,
  getOrCreateDefaultCollection,
  MAX_COLLECTION_NAME_LENGTH,
} from "@/lib/bookmarks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const collections = await prisma.bookmarkCollection.findMany({
    where:   { userId: session.user.id },
    orderBy: [
      { isDefault: "desc" },   // default collection selalu pertama
      { updatedAt: "desc" },
    ],
    select: {
      id: true, name: true, slug: true,
      isDefault: true, isPublic: true,
      createdAt: true, updatedAt: true,
      _count: { select: { bookmarks: true } },
    },
  })

  return NextResponse.json({
    data: collections.map(c => ({
      ...c,
      bookmarkCount: c._count.bookmarks,
      _count: undefined,
    })),
  })
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(MAX_COLLECTION_NAME_LENGTH),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const result = await createCollection({ userId: session.user.id, name: parsed.data.name })

  if (!result.ok) {
    const statusMap = {
      NAME_EMPTY:    400,
      NAME_TOO_LONG: 400,
      LIMIT_REACHED: 422,
      SLUG_RESERVED: 400,
    } as const
    const messages = {
      NAME_EMPTY:    "Nama koleksi tidak boleh kosong",
      NAME_TOO_LONG: `Nama maksimal ${MAX_COLLECTION_NAME_LENGTH} karakter`,
      LIMIT_REACHED: "Kamu sudah mencapai batas maksimal koleksi",
      SLUG_RESERVED: "Nama koleksi ini tidak tersedia",
    } as const

    return NextResponse.json(
      { error: { code: result.error.code, message: messages[result.error.code] } },
      { status: statusMap[result.error.code] }
    )
  }

  return NextResponse.json({ data: result.collection }, { status: 201 })
}
