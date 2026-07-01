import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOtherUserId } from "@/lib/conversations"
import { ConversationList } from "./ConversationList"
import type { ConversationData } from "@/types"

export const metadata: Metadata = {
  title: "Pesan",
  robots: { index: false, follow: false },
}
export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = session.user.id

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, senderId: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

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

  const initialData: ConversationData[] = conversations.map(conv => {
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

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-5 py-4">
        <h1 className="text-lg font-bold text-ax-text-primary">Pesan</h1>
      </div>
      <ConversationList initialData={initialData} currentUserId={userId} />
    </div>
  )
}
