"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Avatar } from "@/components/ui/Avatar"
import { BadgeCheck, MessageCircle } from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { ConversationData } from "@/types"

interface Props {
  initialData:   ConversationData[]
  currentUserId: string
}

export function ConversationList({ initialData, currentUserId }: Props) {
  const [conversations, setConversations] = useState(initialData)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations")
      if (!res.ok) return
      const json = await res.json() as { data: ConversationData[] }
      setConversations(json.data)
    } catch {
      // Silent — list tetap tampilkan data sebelumnya
    }
  }, [])

  // SSE — refresh list saat ada message baru
  useEffect(() => {
    const es = new EventSource("/api/conversations/stream")
    es.addEventListener("message", () => void refetch())
    es.onerror = () => es.close()
    return () => es.close()
  }, [refetch])

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <MessageCircle size={36} className="opacity-30" aria-hidden="true" />
        <p className="font-medium text-ax-text-secondary">Belum ada percakapan</p>
        <p className="text-sm text-center max-w-xs">
          Kirim pesan ke pengguna lain dari halaman profil mereka.
        </p>
      </div>
    )
  }

  return (
    <ul aria-label="Daftar percakapan">
      {conversations.map(conv => (
        <li key={conv.id}>
          <Link
            href={`/messages/${conv.id}`}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-ax-bg-border
                       hover:bg-ax-bg-hover transition-colors"
          >
            <Avatar
              name={conv.otherUser.displayName}
              src={conv.otherUser.avatarUrl}
              size="md"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={cn(
                    "text-sm truncate",
                    conv.unreadCount > 0
                      ? "font-semibold text-ax-text-primary"
                      : "font-medium text-ax-text-primary"
                  )}>
                    {conv.otherUser.displayName}
                  </span>
                  {conv.otherUser.isVerified && (
                    <BadgeCheck size={13} className="text-ax-accent-light flex-shrink-0" aria-label="Terverifikasi" />
                  )}
                </div>
                {conv.lastMessage && (
                  <time className="text-xs text-ax-text-hint flex-shrink-0">
                    {formatDistanceToNowStrict(new Date(conv.lastMessage.createdAt), {
                      locale: idLocale, addSuffix: false,
                    })}
                  </time>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className={cn(
                  "text-xs truncate",
                  conv.unreadCount > 0 ? "text-ax-text-secondary font-medium" : "text-ax-text-muted"
                )}>
                  {conv.lastMessage
                    ? `${conv.lastMessage.isOwn ? "Kamu: " : ""}${conv.lastMessage.content}`
                    : "Belum ada pesan"
                  }
                </p>
                {conv.unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center
                                   justify-center rounded-full bg-ax-accent text-white
                                   text-[10px] font-bold px-1">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
