import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPostSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { type Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { refreshTrendingHashtags } from "@/lib/search"
import type { MediaType } from "@/types"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const cursor     = searchParams.get("cursor")
  const limitParam = Number(searchParams.get("limit") ?? 20)
  const limit      = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 20
  const type       = searchParams.get("type") ?? "home"
  const filterUser = searchParams.get("userId")

  // Build type-safe where clause
  const baseWhere = { isDeleted: false, parentId: null } satisfies Prisma.PostWhereInput

  let where: Prisma.PostWhereInput = baseWhere

  if (filterUser) {
    where = { ...baseWhere, authorId: filterUser }
  } else if (type === "home" || type === "following") {
    // Cap di 1000 untuk mencegah IN clause yang terlalu besar di PostgreSQL.
    // Social platform mayoritas user follow < 500 orang — limit ini sangat aman.
    // Untuk skala > 10K following: gunakan subquery JOIN di DB level.
    const following = await prisma.follow.findMany({
      where:  { followerId: session.user.id },
      select: { followingId: true },
      take:   1000,
    })
    const authorIds = [session.user.id, ...following.map(f => f.followingId)]
    where = { ...baseWhere, authorId: { in: authorIds } }
  }

  const posts = await prisma.post.findMany({
    where,
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, fileUrl: true, type: true, fileSize: true, mimeType: true } },
      _count: { select: { likes: true, comments: true } },
      likes:  { where: { userId: session.user.id }, select: { id: true } },
    },
  })

  const hasMore    = posts.length > limit
  const items      = hasMore ? posts.slice(0, -1) : posts
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  return NextResponse.json({
    data: items.map(({ likes, _count, media, ...post }) => ({
      ...post,
      createdAt:     post.createdAt.toISOString(),
      updatedAt:     post.updatedAt.toISOString(),
      media:         media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       likes.length > 0,
      likesCount:    _count.likes,
      commentsCount: _count.comments,
    })),
    meta: { cursor: nextCursor, hasMore },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.createPost(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

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

  const { content, mediaIds } = parsed.data

  if (mediaIds?.length) {
    const mediaCount = await prisma.media.count({
      where: {
        id:         { in: mediaIds },
        uploaderId: session.user.id,
        postId:     null,
      },
    })
    if (mediaCount !== mediaIds.length) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Media tidak valid atau sudah digunakan" } },
        { status: 400 }
      )
    }
  }

  const post = await prisma.post.create({
    data: {
      content,
      authorId: session.user.id,
      ...(mediaIds?.length ? { media: { connect: mediaIds.map(id => ({ id })) } } : {}),
    },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, fileUrl: true, type: true, fileSize: true, mimeType: true } },
      _count: { select: { likes: true, comments: true } },
    },
  })

  // Refresh trending hashtags after new post — fire-and-forget
  void refreshTrendingHashtags()

  return NextResponse.json({
    data: {
      ...post,
      createdAt:     post.createdAt.toISOString(),
      updatedAt:     post.updatedAt.toISOString(),
      media:         post.media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       false,
      likesCount:    0,
      commentsCount: 0,
      _count:        undefined,
    },
  }, { status: 201 })
}
