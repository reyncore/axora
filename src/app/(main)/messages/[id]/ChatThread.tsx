"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Loader2, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { format, isToday, isYesterday } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { MessageData } from "@/types"

interface Props {
  conversationId: string
  initialMessages: MessageData[]
  currentUserId:   string
}

const MAX_CHARS = 2000

export function ChatThread({ conversationId, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const [content, setContent]   = useState("")
  const [sending, setSending]   = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore]   = useState(initialMessages.length >= 30)

  const scrollRef    = useRef<HTMLDivElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const isInitialRef = useRef(true)

  // Auto-scroll to bottom on initial load and new own messages
  useEffect(() => {
    if (isInitialRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" })
      isInitialRef.current = false
    }
  }, [])

  // SSE — listen untuk pesan baru di conversation ini
  useEffect(() => {
    const es = new EventSource("/api/conversations/stream")

    es.addEventListener("message", (e) => {
      try {
        const payload = JSON.parse(e.data) as { conversationId: string }
        if (payload.conversationId === conversationId) {
          void fetchLatest()
        }
      } catch {
        // ignore malformed event
      }
    })

    es.onerror = () => es.close()
    return () => es.close()
  }, [conversationId])

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?limit=30`)
      if (!res.ok) return
      const json = await res.json() as { data: MessageData[] }
      // Reverse karena API return terbaru dulu, kita tampilkan oldest-first
      const latest = [...json.data].reverse()

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newOnes = latest.filter(m => !existingIds.has(m.id))
        if (newOnes.length === 0) return prev
        return [...prev, ...newOnes]
      })

      // Scroll ke bawah jika ada pesan baru
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    } catch {
      // silent
    }
  }, [conversationId])

  async function loadOlder() {
    const oldest = messages[0]
    if (!oldest || loadingOlder) return

    setLoadingOlder(true)
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?cursor=${oldest.id}&limit=30`
      )
      if (!res.ok) throw new Error()
      const json = await res.json() as { data: MessageData[]; meta: { hasMore: boolean } }

      const older = [...json.data].reverse()
      setMessages(prev => [...older, ...prev])
      setHasMore(json.meta.hasMore)
    } catch {
      toast.error("Gagal memuat pesan lama")
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > MAX_CHARS || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: trimmed }),
      })

      const body = await res.json() as
        | { data: MessageData }
        | { error?: { message?: string } }

      if (!res.ok) {
        const err = body as { error?: { message?: string } }
        throw new Error(err.error?.message ?? "Gagal mengirim pesan")
      }

      const { data } = body as { data: MessageData }
      setMessages(prev => [...prev, data])
      setContent("")

      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setSending(false)
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const remaining   = MAX_CHARS - content.length
  const isOverLimit = remaining < 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {hasMore && (
          <div className="flex justify-center pb-3">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="text-xs text-ax-accent-light hover:underline
                         disabled:opacity-60 flex items-center gap-1.5"
            >
              {loadingOlder
                ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Memuat...</>
                : "Muat pesan lebih lama"
              }
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-ax-text-muted">
            <p className="text-sm">Belum ada pesan. Sapa dulu!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const showDateSeparator = !prev || !isSameDay(prev.createdAt, msg.createdAt)

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-ax-text-hint bg-ax-bg-elevated px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.createdAt)}
                  </span>
                </div>
              )}
              <div className={cn("flex", msg.isOwn ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2 mb-1",
                  msg.isOwn
                    ? "bg-ax-accent text-white rounded-br-md"
                    : "bg-ax-bg-elevated text-ax-text-primary rounded-bl-md"
                )}>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1",
                    msg.isOwn ? "justify-end text-white/70" : "justify-start text-ax-text-hint"
                  )}>
                    <time className="text-[10px]">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </time>
                    {msg.isOwn && (
                      msg.readAt
                        ? <CheckCheck size={12} aria-label="Dibaca" />
                        : <Check size={12} aria-label="Terkirim" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="border-t border-ax-bg-border p-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 bg-ax-bg-elevated border border-ax-bg-border rounded-2xl
                          px-4 py-2.5 focus-within:border-ax-accent transition-colors">
            <textarea
              value={content}
              onChange={handleTextareaChange}
              placeholder="Tulis pesan..."
              rows={1}
              aria-label="Tulis pesan"
              className="w-full bg-transparent text-sm text-ax-text-primary
                         placeholder:text-ax-text-muted outline-none resize-none
                         leading-relaxed max-h-[120px]"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!content.trim() || isOverLimit || sending}
            className="w-10 h-10 rounded-full bg-ax-accent hover:bg-ax-accent-hover
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Kirim pesan"
          >
            {sending
              ? <Loader2 size={16} className="animate-spin text-white" aria-hidden="true" />
              : <Send size={16} className="text-white" aria-hidden="true" />
            }
          </button>
        </form>
        {content.length > MAX_CHARS - 100 && (
          <p className={cn(
            "text-xs mt-1 text-right tabular-nums",
            isOverLimit ? "text-red-400" : "text-ax-text-muted"
          )}>
            {remaining}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a)
  const dateB = new Date(b)
  return dateA.toDateString() === dateB.toDateString()
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso)
  if (isToday(date))     return "Hari ini"
  if (isYesterday(date)) return "Kemarin"
  return format(date, "d MMMM yyyy", { locale: idLocale })
}
