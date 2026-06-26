"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  Heart, MessageCircle, UserPlus, AtSign,
  CheckCheck, Loader2, Bell,
} from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { LucideIcon } from "lucide-react"
import type { NotificationData, NotificationType, PaginatedResponse } from "@/types"

// ── Config ────────────────────────────────────────────────────────────────────

interface NotifIconConfig {
  Icon:  LucideIcon
  color: string
  bg:    string
}

const NOTIF_ICONS: Record<NotificationType, NotifIconConfig> = {
  LIKE:    { Icon: Heart,         color: "text-ax-like",   bg: "bg-pink-950/40"    },
  COMMENT: { Icon: MessageCircle, color: "text-blue-400",  bg: "bg-blue-950/40"    },
  FOLLOW:  { Icon: UserPlus,      color: "text-ax-repost", bg: "bg-emerald-950/40" },
  MENTION: { Icon: AtSign,        color: "text-yellow-400", bg: "bg-yellow-950/40" },
}

const NOTIF_TEXT: Record<NotificationType, string> = {
  LIKE:    "menyukai postmu",
  COMMENT: "mengomentari postmu",
  FOLLOW:  "mulai mengikutimu",
  MENTION: "menyebutmu dalam post",
}

const FALLBACK_ICON: NotifIconConfig = {
  Icon: Bell, color: "text-ax-text-muted", bg: "bg-ax-bg-subtle",
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialData:    NotificationData[]
  initialCursor:  string | null
  initialHasMore: boolean
}

interface ListState {
  items:      NotificationData[]
  nextCursor: string | null
  hasMore:    boolean
  loading:    boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationList({ initialData, initialCursor, initialHasMore }: Props) {
  const router = useRouter()
  const [state, setState] = useState<ListState>({
    items:      initialData,
    nextCursor: initialCursor,
    hasMore:    initialHasMore,
    loading:    false,
  })
  const [markingAll, setMarkingAll] = useState(false)

  const isFetching  = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Infinite scroll ──────────────────────────────────────────────────────────

  const fetchMore = useCallback(async (pageCursor: string | null) => {
    if (isFetching.current) return
    isFetching.current = true
    setState(s => ({ ...s, loading: true }))

    try {
      const params = new URLSearchParams({ limit: "25" })
      if (pageCursor) params.set("cursor", pageCursor)

      const res  = await fetch(`/api/notifications?${params}`)
      if (!res.ok) throw new Error()

      const json = await res.json() as PaginatedResponse<NotificationData> & {
        meta: { unreadCount: number }
      }

      setState(s => ({
        items:      [...s.items, ...json.data],
        nextCursor: json.meta.cursor,
        hasMore:    json.meta.hasMore,
        loading:    false,
      }))
    } catch {
      setState(s => ({ ...s, loading: false }))
      toast.error("Gagal memuat notifikasi")
    } finally {
      isFetching.current = false
    }
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setState(s => {
          if (s.hasMore && !s.loading) void fetchMore(s.nextCursor)
          return s
        })
      },
      { rootMargin: "300px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore])

  // ── SSE live update — prepend notifikasi baru tanpa refresh ──────────────────

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream")

    es.addEventListener("notification", () => {
      // Refetch halaman pertama untuk ambil notifikasi terbaru
      void refetchLatest()
    })

    es.onerror = () => es.close()
    return () => es.close()
  }, [])

  const refetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=25")
      if (!res.ok) return
      const json = await res.json() as PaginatedResponse<NotificationData> & {
        meta: { unreadCount: number }
      }

      setState(s => {
        const existingIds = new Set(s.items.map(n => n.id))
        const newOnes = json.data.filter(n => !existingIds.has(n.id))
        if (newOnes.length === 0) return s
        return { ...s, items: [...newOnes, ...s.items] }
      })
    } catch {
      // silent — SSE akan retry koneksi otomatis
    }
  }, [])

  // ── Mark all as read ──────────────────────────────────────────────────────────

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" })
      if (!res.ok) throw new Error()
      setState(s => ({ ...s, items: s.items.map(n => ({ ...n, isRead: true })) }))
      toast.success("Semua notifikasi ditandai dibaca")
    } catch {
      toast.error("Gagal menandai notifikasi")
    } finally {
      setMarkingAll(false)
    }
  }

  function handleRowClick(notif: NotificationData) {
    if (notif.type === "FOLLOW") {
      router.push(`/${notif.actor.username}`)
    } else if (notif.post) {
      router.push(`/posts/${notif.post.id}`)
    }
  }

  const hasUnread = state.items.some(n => !n.isRead)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      px-5 py-4 border-b border-ax-bg-border flex items-center justify-between">
        <h1 className="text-lg font-bold text-ax-text-primary">Notifikasi</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs text-ax-accent-light
                       hover:text-ax-accent transition-colors disabled:opacity-50"
          >
            {markingAll
              ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              : <CheckCheck size={13} aria-hidden="true" />
            }
            Tandai semua dibaca
          </button>
        )}
      </div>

      {state.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
          <div
            className="w-16 h-16 rounded-full bg-ax-bg-elevated flex items-center
                       justify-center text-2xl"
            aria-hidden="true"
          >
            🔔
          </div>
          <p className="font-medium text-ax-text-secondary">Tidak ada notifikasi</p>
          <p className="text-sm">Mulai berinteraksi untuk mendapat notifikasi!</p>
        </div>
      ) : (
        <>
          <ol aria-label="Daftar notifikasi">
            {state.items.map(notif => {
              const config    = NOTIF_ICONS[notif.type] ?? FALLBACK_ICON
              const { Icon }  = config
              const clickable = notif.type === "FOLLOW" || !!notif.post

              return (
                <li
                  key={notif.id}
                  onClick={clickable ? () => handleRowClick(notif) : undefined}
                  className={cn(
                    "flex gap-4 px-5 py-4 border-b border-ax-bg-border transition-colors",
                    clickable && "cursor-pointer hover:bg-ax-bg-hover",
                    !notif.isRead && "bg-ax-accent-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      config.bg
                    )}
                    aria-hidden="true"
                  >
                    <Icon size={18} className={config.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/${notif.actor.username}`}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Profil ${notif.actor.displayName}`}
                        className="flex-shrink-0"
                      >
                        <Avatar
                          name={notif.actor.displayName}
                          src={notif.actor.avatarUrl}
                          size="sm"
                        />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ax-text-primary leading-relaxed">
                          <Link
                            href={`/${notif.actor.username}`}
                            onClick={e => e.stopPropagation()}
                            className="font-semibold hover:underline"
                          >
                            {notif.actor.displayName}
                          </Link>
                          {" "}
                          <span className="text-ax-text-secondary">
                            {NOTIF_TEXT[notif.type] ?? "berinteraksi dengan kamu"}
                          </span>
                        </p>

                        {notif.post && (
                          <p className="mt-1 text-xs text-ax-text-muted truncate">
                            {notif.post.content}
                          </p>
                        )}

                        <time
                          dateTime={notif.createdAt}
                          className="mt-1 text-xs text-ax-text-hint block"
                        >
                          {formatDistanceToNowStrict(new Date(notif.createdAt), {
                            locale: idLocale, addSuffix: true,
                          })}
                        </time>
                      </div>

                      {!notif.isRead && (
                        <span
                          className="w-2 h-2 rounded-full bg-ax-accent flex-shrink-0 mt-1.5"
                          aria-label="Belum dibaca"
                        />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          {/* Sentinel untuk infinite scroll */}
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />

          {state.loading && (
            <div className="flex justify-center py-6" aria-label="Memuat lebih banyak">
              <Loader2 size={18} className="animate-spin text-ax-accent-light" aria-hidden="true" />
            </div>
          )}

          {!state.hasMore && state.items.length > 0 && (
            <div className="py-10 flex flex-col items-center gap-2">
              <div className="w-8 h-px bg-ax-bg-border" />
              <p className="text-xs text-ax-text-hint">Tidak ada notifikasi lagi</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
