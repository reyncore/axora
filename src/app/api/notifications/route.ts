import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
  const limitParam = Number(searchParams.get("limit") ?? 30)
  const limit      = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 30

  const notifications = await prisma.notification.findMany({
    where:   { receiverId: session.user.id },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true,
        },
      },
      post: { select: { id: true, content: true } },
    },
  })

  const hasMore    = notifications.length > limit
  const items      = hasMore ? notifications.slice(0, -1) : notifications
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  const unreadCount = await prisma.notification.count({
    where: { receiverId: session.user.id, isRead: false },
  })

  return NextResponse.json({
    data: items.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    meta: { cursor: nextCursor, hasMore, unreadCount },
  })
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  await prisma.notification.updateMany({
    where: { receiverId: session.user.id, isRead: false },
    data:  { isRead: true },
  })

  return NextResponse.json({ data: { success: true } })
}
