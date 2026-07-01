import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { notificationStore } from "@/lib/notification-store"

type Params = { params: Promise<{ username: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.follow(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const { username } = await params

  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true },
  })

  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User tidak ditemukan" } },
      { status: 404 }
    )
  }

  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Tidak bisa follow diri sendiri" } },
      { status: 400 }
    )
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId:  session.user.id,
        followingId: target.id,
      },
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
    return NextResponse.json({ data: { following: false } })
  }

  await prisma.$transaction([
    prisma.follow.create({
      data: {
        followerId:  session.user.id,
        followingId: target.id,
      },
    }),
    prisma.notification.create({
      data: {
        receiverId: target.id,
        actorId:    session.user.id,
        type:       "FOLLOW",
      },
    }),
  ])

  notificationStore.push(target.id)

  return NextResponse.json({ data: { following: true } }, { status: 201 })
}
