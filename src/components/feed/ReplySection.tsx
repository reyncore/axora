"use client"

import { useState, useCallback, useEffect } from "react"
import { Loader2, MessageCircle } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { PostCard } from "./PostCard"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { PostData } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id:       string
  name?:    string | null
  username: string
  image?:   string | null
}

interface Props {
  postId:      string
  currentUser: CurrentUser | null
}

interface RepliesState {
  items:      PostData[]
  nextCursor: string | null  // konsisten dengan FeedList — bukan `cursor`
  hasMore:    boolean
  loading:    boolean
}

interface RepliesApiResponse {
  data: PostData[]
  meta: {
    cursor:  string | null
    hasMore: boolean
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

function makeInitialReplies(): RepliesState {
  return { items: [], nextCursor: null, hasMore: true, loading: false }
}

const MAX_REPLY_CHARS = 500

// ── Component ─────────────────────────────────────────────────────────────────

export function ReplySection({ postId, currentUser }: Props) {
  const [state, setState]           = useState<RepliesState>(makeInitialReplies)
  const [content, setContent]       = useState("")
  const [submitting, setSubmitting] = useState(false)

  const remaining   = MAX_REPLY_CHARS - content.length
  const isOverLimit = remaining < 0

  /**
   * pageCursor — nama konsisten dengan FeedList untuk menghindari shadowing
   * dengan state field `nextCursor`.
   */
  const fetchReplies = useCallback(async (pageCursor: string | null) => {
    setState(s => ({ ...s, loading: true }))
    try {
      const params = new URLSearchParams({ limit: "20" })
      if (pageCursor) params.set("cursor", pageCursor)

      const res = await fetch(`/api/posts/${postId}/replies?${params}`)
      if (!res.ok) throw new Error("Gagal memuat balasan")

      const { data, meta } = await res.json() as RepliesApiResponse

      setState(s => ({
        items:      pageCursor ? [...s.items, ...data] : data,
        nextCursor: meta.cursor,
        hasMore:    meta.hasMore,
        loading:    false,
      }))
    } catch (err) {
      setState(s => ({ ...s, loading: false }))
      toast.error(err instanceof Error ? err.message : "Gagal memuat balasan")
    }
  }, [postId])

  // Fetch awal saat mount atau postId berubah
  useEffect(() => {
    setState(makeInitialReplies())
    void fetchReplies(null)
  }, [postId, fetchReplies])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || isOverLimit || submitting || !currentUser) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/posts/${postId}/replies`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: trimmed }),
      })

      // Baca body sekali, branch berdasarkan res.ok
      const body = await res.json() as
        | { data: PostData }
        | { error?: { message?: string } }

      if (!res.ok) {
        const err = body as { error?: { message?: string } }
        throw new Error(err.error?.message ?? "Gagal mengirim balasan")
      }

      const { data: newReplyData } = body as { data: PostData }
      const newReply: PostData     = { ...newReplyData, currentUserId: currentUser.id }

      setState(s => ({ ...s, items: [...s.items, newReply] }))
      setContent("")
      toast.success("Balasan terkirim!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }, [content, isOverLimit, submitting, currentUser, postId])

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Balasan">
      {/* Compose reply */}
      {currentUser && (
        <div className="px-4 py-4 border-b border-ax-bg-border">
          <form onSubmit={handleSubmit} className="flex gap-3 items-start">
            <Avatar
              name={currentUser.name ?? currentUser.username}
              src={currentUser.image}
              size="sm"
              className="flex-shrink-0 mt-1"
            />

            <div className="flex-1 min-w-0">
              <div className="bg-ax-bg-elevated border border-ax-bg-border rounded-ax
                              px-4 py-3 focus-within:border-ax-accent transition-colors">
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Balas post ini..."
                  rows={2}
                  aria-label="Tulis balasan"
                  className="w-full bg-transparent text-sm text-ax-text-primary
                             placeholder:text-ax-text-muted outline-none resize-none
                             leading-relaxed"
                  style={{ minHeight: "48px" }}
                />
              </div>

              {content.length > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isOverLimit       ? "text-red-400"
                      : remaining <= 20 ? "text-yellow-400"
                      :                  "text-ax-text-muted"
                    )}
                    aria-live="polite"
                    aria-label={`${remaining} karakter tersisa`}
                  >
                    {remaining}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setContent("")}
                      className="ax-btn-ghost px-3 py-1.5 text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={!content.trim() || isOverLimit || submitting}
                      className="ax-btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs
                                 min-w-[80px] justify-center"
                    >
                      {submitting
                        ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Mengirim...</>
                        : "Balas"
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Reply list */}
      <div>
        {state.loading && state.items.length === 0 ? (
          <ReplySkeleton count={3} />
        ) : state.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-ax-text-muted">
            <MessageCircle size={32} className="opacity-30" aria-hidden="true" />
            <p className="text-sm">Belum ada balasan</p>
            {currentUser && (
              <p className="text-xs text-ax-text-hint">Jadilah yang pertama membalas!</p>
            )}
          </div>
        ) : (
          <>
            {state.items.map(reply => (
              <div key={reply.id} className="border-l-2 border-ax-bg-border ml-7">
                <PostCard post={{ ...reply, currentUserId: currentUser?.id }} />
              </div>
            ))}

            {state.hasMore && (
              <button
                type="button"
                onClick={() => void fetchReplies(state.nextCursor)}
                disabled={state.loading}
                className="w-full py-3 text-sm text-ax-accent-light hover:text-ax-accent
                           transition-colors border-t border-ax-bg-border
                           flex items-center justify-center gap-2
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.loading
                  ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Memuat...</>
                  : "Lihat balasan lainnya"
                }
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReplySkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex gap-3 pl-10 pr-4 py-3 border-b border-ax-bg-border animate-pulse"
          aria-hidden="true"
        >
          <div className="w-8 h-8 rounded-full bg-ax-bg-subtle flex-shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="flex gap-2">
              <div className="h-3 w-24 bg-ax-bg-subtle rounded" />
              <div className="h-3 w-16 bg-ax-bg-subtle rounded" />
            </div>
            <div className="h-3 w-4/5 bg-ax-bg-subtle rounded" />
            <div className="h-3 w-2/3 bg-ax-bg-subtle rounded" />
          </div>
        </div>
      ))}
    </>
  )
}
