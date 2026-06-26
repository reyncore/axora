import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCommentSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"
import { notificationStore } from "@/lib/notification-store"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: postId }   = await params
  const { searchParams } = req.nextUrl

  const cursor     = searchParams.get("cursor")
  const limitParam = Number(searchParams.get("limit") ?? 20)
  const limit      = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 20

  const post = await prisma.post.findUnique({
    where:  { id: postId, isDeleted: false },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  const comments = await prisma.comment.findMany({
    where:   { postId },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
    },
  })

  const hasMore    = comments.length > limit
  const items      = hasMore ? comments.slice(0, -1) : comments
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  return NextResponse.json({
    data: items.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    meta: { cursor: nextCursor, hasMore },
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const { id: postId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const post = await prisma.post.findUnique({
    where:  { id: postId, isDeleted: false },
    select: { id: true, authorId: true },
  })

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  const isOwnPost = post.authorId === session.user.id

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content:  parsed.data.content,
        authorId: session.user.id,
        postId,
      },
      include: {
        author: {
          select: {
            id: true, username: true,
            displayName: true, avatarUrl: true, isVerified: true,
          },
        },
      },
    }),
    ...(!isOwnPost
      ? [prisma.notification.create({
          data: {
            receiverId: post.authorId,
            actorId:    session.user.id,
            type:       "COMMENT",
            postId,
          },
        })]
      : []
    ),
  ])

  if (!isOwnPost) notificationStore.push(post.authorId)

  return NextResponse.json({
    data: {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    },
  }, { status: 201 })
}
