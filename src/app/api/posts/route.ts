import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPostSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { type Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { refreshTrendingHashtags } from "@/lib/search"
import type { MediaType } from "@/types"

type PostCursor = {
  createdAt: string
  id: string
}

function encodeCursor(cursor: PostCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function decodeCursor(value: string): PostCursor | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8")
    const parsed: unknown = JSON.parse(decoded)

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("createdAt" in parsed) ||
      !("id" in parsed) ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null
    }

    const date = new Date(parsed.createdAt)

    if (Number.isNaN(date.getTime()) || !parsed.id) {
      return null
    }

    return {
      createdAt: date.toISOString(),
      id: parsed.id,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Login diperlukan",
        },
      },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl

  const cursorParam = searchParams.get("cursor")
  const limitParam = Number(searchParams.get("limit") ?? 20)

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 50)
    : 20

  const type = searchParams.get("type") ?? "home"
  const filterUser = searchParams.get("userId")

  /*
   * Cursor menggunakan:
   *
   *   createdAt DESC
   *   id DESC
   *
   * Dengan predicate:
   *
   *   createdAt < cursor.createdAt
   *   OR
   *   (createdAt = cursor.createdAt AND id < cursor.id)
   *
   * Ini sesuai dengan Post_active_feed_cursor_idx.
   */
  const cursor = cursorParam
    ? decodeCursor(cursorParam)
    : null

  if (cursorParam && !cursor) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Cursor tidak valid",
        },
      },
      { status: 400 }
    )
  }

  const baseWhere = {
    isDeleted: false,
    parentId: null,
  } satisfies Prisma.PostWhereInput

  let where: Prisma.PostWhereInput = baseWhere

  /*
   * Profile feed
   */
  if (filterUser) {
    where = {
      ...baseWhere,
      authorId: filterUser,
    }
  }

  /*
   * Home / Following feed
   *
   * Untuk sementara tetap menggunakan mekanisme existing.
   * Optimasi subquery DB-level akan dilakukan setelah benchmark
   * following-feed dengan jumlah following besar.
   */
  else if (type === "home" || type === "following") {
    const following = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
      },
      select: {
        followingId: true,
      },
      take: 1000,
    })

    const authorIds = [
      session.user.id,
      ...following.map((f) => f.followingId),
    ]

    where = {
      ...baseWhere,
      authorId: {
        in: authorIds,
      },
    }
  }

  /*
   * Apply opaque cursor.
   */
  if (cursor) {
    where = {
      AND: [
        where,
        {
          OR: [
            {
              createdAt: {
                lt: new Date(cursor.createdAt),
              },
            },
            {
              createdAt: new Date(cursor.createdAt),
              id: {
                lt: cursor.id,
              },
            },
          ],
        },
      ],
    }
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },

      media: {
        select: {
          id: true,
          fileUrl: true,
          type: true,
          fileSize: true,
          mimeType: true,
        },
      },

      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },

      likes: {
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      },
    },
  })

  const hasMore = posts.length > limit

  const items = hasMore
    ? posts.slice(0, -1)
    : posts

  const lastItem = items[items.length - 1]

  const nextCursor =
    hasMore && lastItem
      ? encodeCursor({
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        })
      : null

  return NextResponse.json({
    data: items.map(({ likes, _count, media, ...post }) => ({
      ...post,

      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),

      media: media.map((m) => ({
        ...m,
        type: m.type as MediaType,
      })),

      isLiked: likes.length > 0,
      likesCount: _count.likes,
      commentsCount: _count.comments,
    })),

    meta: {
      cursor: nextCursor,
      hasMore,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Login diperlukan",
        },
      },
      { status: 401 }
    )
  }

  const rl = await rateLimits.createPost(session.user.id)

  if (!rl.success) {
    return rateLimitResponse(rl.resetAt)
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Request body tidak valid",
        },
      },
      { status: 400 }
    )
  }

  const parsed = createPostSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { content, mediaIds } = parsed.data

  if (mediaIds?.length) {
    const mediaCount = await prisma.media.count({
      where: {
        id: {
          in: mediaIds,
        },
        uploaderId: session.user.id,
        postId: null,
      },
    })

    if (mediaCount !== mediaIds.length) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Media tidak valid atau sudah digunakan",
          },
        },
        { status: 400 }
      )
    }
  }

  const post = await prisma.post.create({
    data: {
      content,
      authorId: session.user.id,

      ...(mediaIds?.length
        ? {
            media: {
              connect: mediaIds.map((id) => ({
                id,
              })),
            },
          }
        : {}),
    },

    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },

      media: {
        select: {
          id: true,
          fileUrl: true,
          type: true,
          fileSize: true,
          mimeType: true,
        },
      },

      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  })

  /*
   * TODO:
   * Jangan refresh materialized view pada setiap post
   * ketika traffic sudah tinggi.
   *
   * Untuk sekarang behavior existing dipertahankan.
   */
  void refreshTrendingHashtags()

  return NextResponse.json(
    {
      data: {
        ...post,

        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),

        media: post.media.map((m) => ({
          ...m,
          type: m.type as MediaType,
        })),

        isLiked: false,
        likesCount: 0,
        commentsCount: 0,

        _count: undefined,
      },
    },
    { status: 201 }
  )
}
