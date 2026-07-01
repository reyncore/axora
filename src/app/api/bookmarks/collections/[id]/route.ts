import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  deleteCollection,
  generateSlug,
  findAvailableSlug,
  CollectionNotFoundError,
  CannotDeleteDefaultError,
  MAX_COLLECTION_NAME_LENGTH,
} from "@/lib/bookmarks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name:     z.string().trim().min(1).max(MAX_COLLECTION_NAME_LENGTH).optional(),
  isPublic: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Authorization: koleksi harus milik session user
  const collection = await prisma.bookmarkCollection.findFirst({
    where:  { id, userId: session.user.id },
    select: { id: true, isDefault: true, name: true, slug: true },
  })

  if (!collection) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  const updateData: {
    name?:     string
    slug?:     string
    isPublic?: boolean
  } = {}

  if (parsed.data.name !== undefined) {
    const newSlug = await findAvailableSlug(
      session.user.id,
      generateSlug(parsed.data.name),
      id,
    )
    updateData.name = parsed.data.name
    updateData.slug = newSlug
  }

  if (parsed.data.isPublic !== undefined) {
    updateData.isPublic = parsed.data.isPublic
  }

  const updated = await prisma.bookmarkCollection.update({
    where: { id },
    data:  updateData,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { id } = await params

  try {
    const { movedCount } = await deleteCollection(session.user.id, id)
    return NextResponse.json({ data: { success: true, movedCount } })
  } catch (err) {
    if (err instanceof CollectionNotFoundError) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
    }
    if (err instanceof CannotDeleteDefaultError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Koleksi default tidak bisa dihapus" } },
        { status: 403 }
      )
    }
    throw err
  }
}
