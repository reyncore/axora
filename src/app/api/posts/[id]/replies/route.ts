import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPostSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import type { MediaType } from "@/types"
import { notificationStore } from "@/lib/notification-store"

type Params = { params: Promise<{ id: string }> }

// GET /api/posts/:id/replies — ambil replies dengan cursor pagination
export async function GET(req: NextRequest, { params }: Params) {
  const session        = await auth()
  const { id: postId } = await params
  const { searchParams } = req.nextUrl

  const cursor     = searchParams.get("cursor")
  const limitParam = Number(searchParams.get("limit") ?? 20)
  const limit      = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 20

  // Verifikasi parent post ada
  const parent = await prisma.post.findUnique({
    where:  { id: postId, isDeleted: false },
    select: { id: true },
  })

  if (!parent) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  const replies = await prisma.post.findMany({
    where: { parentId: postId, isDeleted: false },
    take:  limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, url: true, type: true, size: true } },
      _count: { select: { likes: true, comments: true, replies: true } },
      likes:  session?.user
        ? { where: { userId: session.user.id }, select: { id: true } }
        : undefined,
    },
  })

  const hasMore    = replies.length > limit
  const items      = hasMore ? replies.slice(0, -1) : replies
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  return NextResponse.json({
    data: items.map(({ likes = [], _count, media, ...r }) => ({
      ...r,
      parentId:      postId,
      createdAt:     r.createdAt.toISOString(),
      updatedAt:     r.updatedAt.toISOString(),
      media:         media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       likes.length > 0,
      likesCount:    _count.likes,
      commentsCount: _count.comments,
      repliesCount:  _count.replies,
    })),
    meta: { cursor: nextCursor, hasMore },
  })
}

// POST /api/posts/:id/replies — buat reply
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.createPost(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const { id: parentId } = await params

  const parent = await prisma.post.findUnique({
    where:  { id: parentId, isDeleted: false },
    select: { id: true, authorId: true },
  })

  if (!parent) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const isOwnPost = parent.authorId === session.user.id

  // Buat reply dan notifikasi dalam satu transaksi.
  // Pisahkan create dari notifikasi agar TypeScript bisa infer tipe reply dengan benar.
  const reply = await prisma.post.create({
    data: {
      content:  parsed.data.content,
      authorId: session.user.id,
      parentId,
    },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, url: true, type: true, size: true } },
      _count: { select: { likes: true, comments: true, replies: true } },
    },
  })

  if (!isOwnPost) {
    notificationStore.push(parent.authorId)
    // Fire-and-forget — notifikasi tidak boleh gagalkan reply
    void prisma.notification.create({
      data: {
        receiverId: parent.authorId,
        actorId:    session.user.id,
        type:       "COMMENT",
        postId:     parentId,
      },
    })
  }

  return NextResponse.json({
    data: {
      ...reply,
      parentId,
      createdAt:     reply.createdAt.toISOString(),
      updatedAt:     reply.updatedAt.toISOString(),
      media:         reply.media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       false,
      likesCount:    0,
      commentsCount: reply._count.comments,
      repliesCount:  reply._count.replies,
      _count:        undefined,
    },
  }, { status: 201 })
}
