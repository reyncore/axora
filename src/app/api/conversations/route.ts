/**
 * GET /api/conversations — List percakapan user, sorted by last activity.
 *
 * Setiap conversation include:
 * - Lawan bicara (other user)
 * - Pesan terakhir (preview)
 * - Unread count (pesan dari lawan bicara yang belum dibaca)
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOtherUserId, findOrCreateConversation } from "@/lib/conversations"
import { z } from "zod"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  const userId = session.user.id

  // Cap di 50 — user aktif biasanya tidak butuh lebih dari ini visible sekaligus.
  // Untuk skala besar: tambah cursor pagination dan infinite scroll di ConversationList.
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, senderId: true, createdAt: true, readAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take:    50,
  })

  // Hitung unread count per conversation — query terpisah untuk efisiensi
  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map(c => c.id) },
      senderId:        { not: userId },
      readAt:          null,
    },
    _count: { id: true },
  })

  const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u._count.id]))

  const data = conversations.map(conv => {
    const otherUserId = getOtherUserId(conv, userId)
    const otherUser   = conv.user1Id === otherUserId ? conv.user1 : conv.user2
    const lastMessage = conv.messages[0]

    return {
      id:        conv.id,
      updatedAt: conv.updatedAt.toISOString(),
      otherUser,
      lastMessage: lastMessage
        ? {
            id:        lastMessage.id,
            content:   lastMessage.content,
            senderId:  lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString(),
            isOwn:     lastMessage.senderId === userId,
          }
        : null,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }
  })

  return NextResponse.json({ data })
}


/**
 * POST /api/conversations — Mulai conversation baru dengan user lain.
 * Idempotent — jika conversation sudah ada, return yang existing.
 *
 * Body: { username: string }
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
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

  const parsed = z.object({ username: z.string().min(1) }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const target = await prisma.user.findUnique({
    where:  { username: parsed.data.username },
    select: { id: true },
  })

  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } },
      { status: 404 }
    )
  }

  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Tidak bisa mengirim pesan ke diri sendiri" } },
      { status: 400 }
    )
  }

  const conversation = await findOrCreateConversation(session.user.id, target.id)

  return NextResponse.json({ data: { conversationId: conversation.id } })
}
