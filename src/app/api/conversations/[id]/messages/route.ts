/**
 * GET  /api/conversations/:id/messages — Ambil pesan (cursor pagination, terbaru dulu)
 * POST /api/conversations/:id/messages — Kirim pesan baru
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isParticipant, getOtherUserId } from "@/lib/conversations"
import { sendMessageSchema } from "@/lib/validations"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { dmStore } from "@/lib/dm-store"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

async function getAuthorizedConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) return { error: "NOT_FOUND" as const }
  if (!isParticipant(conversation, userId)) return { error: "FORBIDDEN" as const }

  return { conversation }
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { id } = await params
  const result  = await getAuthorizedConversation(id, session.user.id)

  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403
    return NextResponse.json({ error: { code: result.error } }, { status })
  }

  const { searchParams } = req.nextUrl
  const cursor = searchParams.get("cursor")
  const limit  = Math.min(Number(searchParams.get("limit") ?? 30), 50)

  const messages = await prisma.message.findMany({
    where:   { conversationId: id },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true, content: true, senderId: true,
      readAt: true, createdAt: true,
    },
  })

  const hasMore    = messages.length > limit
  const items      = hasMore ? messages.slice(0, -1) : messages
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  // Mark messages dari lawan bicara sebagai read — fire-and-forget
  void prisma.message.updateMany({
    where: {
      conversationId: id,
      senderId:       { not: session.user.id },
      readAt:         null,
    },
    data: { readAt: new Date() },
  })

  return NextResponse.json({
    data: items.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      readAt:    m.readAt?.toISOString() ?? null,
      isOwn:     m.senderId === session.user.id,
    })),
    meta: { cursor: nextCursor, hasMore },
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const rl = await rateLimits.createPost(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const { id } = await params
  const result  = await getAuthorizedConversation(id, session.user.id)

  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403
    return NextResponse.json({ error: { code: result.error } }, { status })
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

  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: id,
        senderId:       session.user.id,
        content:        parsed.data.content,
      },
    }),
    prisma.conversation.update({
      where: { id },
      data:  { updatedAt: new Date() },
    }),
  ])

  if (!message) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Gagal mengirim pesan" } },
      { status: 500 }
    )
  }

  // Push realtime ke lawan bicara
  const otherUserId = getOtherUserId(result.conversation, session.user.id)
  dmStore.push(otherUserId, id)

  return NextResponse.json({
    data: {
      id:        message.id,
      content:   message.content,
      senderId:  message.senderId,
      createdAt: message.createdAt.toISOString(),
      readAt:    null,
      isOwn:     true,
    },
  }, { status: 201 })
}
