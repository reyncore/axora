import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isParticipant, getOtherUserId } from "@/lib/conversations"
import { ChatThread } from "./ChatThread"
import { Avatar } from "@/components/ui/Avatar"
import { ArrowLeft, BadgeCheck } from "lucide-react"
import Link from "next/link"
import type { MessageData } from "@/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

const NOINDEX = { index: false, follow: false } as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }  = await params
  const session = await auth()
  if (!session?.user) return { title: "Pesan", robots: NOINDEX }

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      user1: { select: { displayName: true } },
      user2: { select: { displayName: true } },
    },
  })

  if (!conv) return { title: "Pesan", robots: NOINDEX }

  const otherUserId = getOtherUserId(conv, session.user.id)
  const otherName   = conv.user1Id === otherUserId ? conv.user1.displayName : conv.user2.displayName

  return { title: `${otherName}`, robots: NOINDEX }
}

export default async function ConversationPage({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
    },
  })

  if (!conversation) notFound()
  if (!isParticipant(conversation, session.user.id)) notFound()

  const otherUserId = getOtherUserId(conversation, session.user.id)
  const otherUser   = conversation.user1Id === otherUserId ? conversation.user1 : conversation.user2

  // Ambil 30 pesan terakhir untuk initial render
  const rawMessages = await prisma.message.findMany({
    where:   { conversationId: id },
    take:    30,
    orderBy: { createdAt: "desc" },
    select:  { id: true, content: true, senderId: true, readAt: true, createdAt: true },
  })

  // Mark as read
  void prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: session.user.id }, readAt: null },
    data:  { readAt: new Date() },
  })

  const initialMessages: MessageData[] = rawMessages
    .map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      readAt:    m.readAt?.toISOString() ?? null,
      isOwn:     m.senderId === session.user.id,
    }))
    .reverse() // oldest first untuk display

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/messages"
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all flex-shrink-0"
          aria-label="Kembali ke daftar pesan"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <Link href={`/${otherUser.username}`} className="flex items-center gap-2.5 min-w-0">
          <Avatar name={otherUser.displayName} src={otherUser.avatarUrl} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-ax-text-primary truncate">
                {otherUser.displayName}
              </span>
              {otherUser.isVerified && (
                <BadgeCheck size={13} className="text-ax-accent-light flex-shrink-0" aria-label="Terverifikasi" />
              )}
            </div>
            <p className="text-xs text-ax-text-muted">@{otherUser.username}</p>
          </div>
        </Link>
      </div>

      <ChatThread
        conversationId={id}
        initialMessages={initialMessages}
        currentUserId={session.user.id}
      />
    </div>
  )
}
