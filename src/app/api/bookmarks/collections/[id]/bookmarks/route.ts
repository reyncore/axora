import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addBookmark, removeBookmark } from "@/lib/bookmarks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { MediaType } from "@/types"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

// ── Authorization helper ──────────────────────────────────────────────────────

async function authorizeCollection(
  collectionId: string,
  userId:       string,
  requireOwner: boolean = true,
) {
  const collection = await prisma.bookmarkCollection.findFirst({
    where: {
      id: collectionId,
      ...(requireOwner
        ? { userId }
        : { OR: [{ userId }, { isPublic: true }] }
      ),
    },
  })
  return collection
}

// ── GET — list bookmarks dalam koleksi ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  const { id }  = await params

  // Public collections bisa dilihat siapapun (authenticated or not)
  // Private collections hanya owner
  const collection = await authorizeCollection(id, session?.user?.id ?? "", false)

  if (!collection) {
    // Kembalikan 404 bukan 403 — jangan bocorkan existence of private collections
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  // Non-owner pada public collection: filter hanya isVisible = true
  const isOwner = session?.user?.id === collection.userId

  const { searchParams } = req.nextUrl
  const cursor     = searchParams.get("cursor")
  const limit      = Math.min(Number(searchParams.get("limit") ?? 20), 50)

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      collectionId: id,
      ...(!isOwner ? { isVisible: true } : {}),
    },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true, username: true,
              displayName: true, avatarUrl: true, isVerified: true,
            },
          },
          media:  { select: { id: true, fileUrl: true, type: true, fileSize: true, mimeType: true } },
          _count: { select: { likes: true, comments: true } },
          likes:  session?.user
            ? { where: { userId: session.user.id }, select: { id: true } }
            : undefined,
        },
      },
    },
  })

  const hasMore    = bookmarks.length > limit
  const items      = hasMore ? bookmarks.slice(0, -1) : bookmarks
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  return NextResponse.json({
    data: items
      .filter(b => !b.post.isDeleted || isOwner) // owner lihat semua, publik filter deleted
      .map(b => ({
        bookmarkId:  b.id,
        isVisible:   b.isVisible,
        bookmarkedAt: b.createdAt.toISOString(),
        post: {
          ...b.post,
          createdAt:     b.post.createdAt.toISOString(),
          updatedAt:     b.post.updatedAt.toISOString(),
          media:         b.post.media.map(m => ({ ...m, type: m.type as MediaType })),
          isLiked:       (b.post.likes?.length ?? 0) > 0,
          likesCount:    b.post._count.likes,
          commentsCount: b.post._count.comments,
          currentUserId: session?.user?.id,
          _count:        undefined,
          likes:         undefined,
        },
      })),
    meta:       { cursor: nextCursor, hasMore },
    collection: {
      id:        collection.id,
      name:      collection.name,
      isPublic:  collection.isPublic,
      isDefault: collection.isDefault,
      isOwner,
    },
  })
}

// ── POST — tambah bookmark ke koleksi ────────────────────────────────────────

const addSchema = z.object({
  postId: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { id } = await params

  // Hanya owner yang bisa tambah bookmark ke koleksi
  const collection = await authorizeCollection(id, session.user.id, true)
  if (!collection) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Verify post exists
  const post = await prisma.post.findFirst({
    where:  { id: parsed.data.postId, isDeleted: false },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json({ error: { code: "POST_NOT_FOUND" } }, { status: 404 })
  }

  const result = await addBookmark({
    userId:       session.user.id,
    postId:       parsed.data.postId,
    collectionId: id,
  })

  return NextResponse.json(
    { data: { bookmark: result.bookmark, wasAlready: result.wasAlready } },
    { status: result.wasAlready ? 200 : 201 }
  )
}

// ── DELETE — hapus bookmark dari koleksi ─────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { id }   = await params
  const postId   = req.nextUrl.searchParams.get("postId")

  if (!postId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "postId diperlukan" } },
      { status: 400 }
    )
  }

  const removed = await removeBookmark(session.user.id, postId, id)

  return NextResponse.json({ data: { removed } })
}
