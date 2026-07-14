import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { notificationStore } from "@/lib/notification-store"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.like(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const { id: postId } = await params

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

  const existing = await prisma.like.findUnique({
    where:  { userId_postId: { userId: session.user.id, postId } },
    select: { id: true },
  })

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } })
    return NextResponse.json({ data: { liked: false } })
  }

  // Buat like + notifikasi dalam satu transaksi
  // Tidak buat notifikasi jika like post sendiri
  const isOwnPost = post.authorId === session.user.id

  await prisma.$transaction([
    prisma.like.create({
      data: { userId: session.user.id, postId },
    }),
    ...(!isOwnPost
      ? [prisma.notification.create({
          data: {
            receiverId: post.authorId,
            actorId:    session.user.id,
            type:       "LIKE",
            postId,
          },
        })]
      : []
    ),
  ])

  if (!isOwnPost) notificationStore.push(post.authorId)

  return NextResponse.json({ data: { liked: true } }, { status: 201 })
}
