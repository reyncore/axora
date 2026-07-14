/**
 * GET  /api/bookmarks?postId=xxx — cek apakah post sudah di-bookmark
 * POST /api/bookmarks — bookmark ke default collection (quick save)
 * DELETE /api/bookmarks?postId=xxx — hapus dari SEMUA collections (unbookmark total)
 *
 * Endpoint ini dipakai oleh PostCard bookmark button — operasi cepat
 * tanpa perlu tahu collection ID. Untuk operasi per-collection,
 * gunakan /api/bookmarks/collections/[id]/bookmarks.
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getOrCreateDefaultCollection,
  addBookmark,
  getPostBookmarkStatus,
} from "@/lib/bookmarks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ── GET — cek bookmark status untuk satu post ─────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const postId = req.nextUrl.searchParams.get("postId")
  if (!postId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "postId diperlukan" } },
      { status: 400 }
    )
  }

  const status = await getPostBookmarkStatus(session.user.id, postId)
  return NextResponse.json({ data: status })
}

// ── POST — quick bookmark ke default collection ───────────────────────────────

const bookmarkSchema = z.object({
  postId: z.string().min(1),
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

  const parsed = bookmarkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const post = await prisma.post.findFirst({
    where:  { id: parsed.data.postId, isDeleted: false },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  const defaultCollection = await getOrCreateDefaultCollection(session.user.id)

  const result = await addBookmark({
    userId:       session.user.id,
    postId:       parsed.data.postId,
    collectionId: defaultCollection.id,
  })

  return NextResponse.json(
    { data: { isBookmarked: true, wasAlready: result.wasAlready } },
    { status: result.wasAlready ? 200 : 201 }
  )
}

// ── DELETE — unbookmark dari semua collections ────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const postId = req.nextUrl.searchParams.get("postId")
  if (!postId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "postId diperlukan" } },
      { status: 400 }
    )
  }

  const { count } = await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, postId },
  })

  return NextResponse.json({ data: { isBookmarked: false, removedCount: count } })
}
