"use client"

import { useState } from "react"
import { Bookmark, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

interface Props {
  postId:            string
  initialBookmarked: boolean
  /** compact = icon only (PostCard), false = icon + label */
  compact?: boolean
}

export function BookmarkButton({ postId, initialBookmarked, compact = true }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading]       = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    const prevState = bookmarked
    setBookmarked(b => !b)

    try {
      if (prevState) {
        // Unbookmark dari semua collections
        const res = await fetch(`/api/bookmarks?postId=${postId}`, { method: "DELETE" })
        if (!res.ok) throw new Error()
        toast.success("Bookmark dihapus")
      } else {
        // Quick bookmark ke default collection
        const res = await fetch("/api/bookmarks", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ postId }),
        })
        if (!res.ok) throw new Error()
        toast.success("Disimpan ke Semua Bookmark")
      }
    } catch {
      setBookmarked(prevState) // rollback
      toast.error("Gagal memperbarui bookmark")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={bookmarked ? "Hapus bookmark" : "Simpan ke bookmark"}
      aria-pressed={bookmarked}
      className={cn(
        "ax-action-btn transition-all duration-150",
        compact ? "justify-center flex-1" : "gap-1.5 px-3 py-1.5",
        bookmarked
          ? "text-ax-accent-light"
          : "text-ax-text-muted hover:text-ax-accent-light"
      )}
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        : (
          <Bookmark
            size={15}
            strokeWidth={1.8}
            fill={bookmarked ? "currentColor" : "none"}
            aria-hidden="true"
          />
        )
      }
      {!compact && (
        <span className="text-xs">{bookmarked ? "Disimpan" : "Simpan"}</span>
      )}
    </button>
  )
}
