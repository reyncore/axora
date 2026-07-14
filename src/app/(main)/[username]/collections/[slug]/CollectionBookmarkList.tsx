"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { BookmarkX, Loader2, Eye, EyeOff, Trash2 } from "lucide-react"
import { PostCard } from "@/components/feed/PostCard"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { PostData } from "@/types"

interface BookmarkItem {
  bookmarkId: string
  isVisible:  boolean
  post:       PostData
}

interface Props {
  initialData:        BookmarkItem[]
  initialCursor:      string | null
  initialHasMore:     boolean
  collectionId:       string
  isOwner:            boolean
  isPublicCollection: boolean
  currentUserId?:     string
}

export function CollectionBookmarkList({
  initialData, initialCursor, initialHasMore,
  collectionId, isOwner, isPublicCollection, currentUserId,
}: Props) {
  const [items, setItems]         = useState<BookmarkItem[]>(initialData)
  const [nextCursor, setNext]     = useState<string | null>(initialCursor)
  const [hasMore, setHasMore]     = useState(initialHasMore)
  const [loading, setLoading]     = useState(false)

  const isFetching  = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchMore = useCallback(async (cursor: string | null) => {
    if (isFetching.current) return
    isFetching.current = true
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "20" })
      if (cursor) params.set("cursor", cursor)
      const res  = await fetch(`/api/bookmarks/collections/${collectionId}/bookmarks?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json() as {
        data: Array<{ bookmarkId: string; isVisible: boolean; post: PostData }>
        meta: { cursor: string | null; hasMore: boolean }
      }
      setItems(prev => [...prev, ...json.data.map(d => ({
        bookmarkId: d.bookmarkId,
        isVisible:  d.isVisible,
        post:       d.post,
      }))])
      setNext(json.meta.cursor)
      setHasMore(json.meta.hasMore)
    } catch {
      toast.error("Gagal memuat lebih banyak")
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [collectionId])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setHasMore(prev => {
          if (prev && !loading) void fetchMore(nextCursor)
          return prev
        })
      },
      { rootMargin: "300px", threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore, nextCursor, loading])

  async function handleToggleVisibility(bookmarkId: string, current: boolean) {
    const next = !current
    setItems(prev => prev.map(i =>
      i.bookmarkId === bookmarkId ? { ...i, isVisible: next } : i
    ))
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/visibility`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isVisible: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // rollback
      setItems(prev => prev.map(i =>
        i.bookmarkId === bookmarkId ? { ...i, isVisible: current } : i
      ))
      toast.error("Gagal memperbarui visibilitas")
    }
  }

  async function handleRemove(bookmarkId: string, postId: string) {
    setItems(prev => prev.filter(i => i.bookmarkId !== bookmarkId))
    try {
      const res = await fetch(
        `/api/bookmarks/collections/${collectionId}/bookmarks?postId=${postId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      toast.success("Bookmark dihapus dari koleksi")
    } catch {
      toast.error("Gagal menghapus bookmark")
      // Re-fetch untuk restore state — tidak simpan semua data sebelumnya
      void fetchMore(null)
    }
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <BookmarkX size={36} className="opacity-30" aria-hidden="true" />
        <p className="text-sm">Koleksi ini masih kosong</p>
        {isOwner && (
          <p className="text-xs text-center max-w-xs text-ax-text-hint">
            Simpan post ke koleksi ini menggunakan tombol bookmark di setiap post.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {items.map(item => (
        <div key={item.bookmarkId} className="relative group/bookmark">
          <PostCard
            post={{ ...item.post, currentUserId }}
          />

          {/* Owner controls — muncul saat hover */}
          {isOwner && (
            <div className={cn(
              "absolute top-3 right-3 flex items-center gap-1.5",
              "opacity-0 group-hover/bookmark:opacity-100 transition-opacity",
            )}>
              {/* Visibility toggle — hanya relevan jika koleksi publik */}
              {isPublicCollection && (
                <button
                  type="button"
                  onClick={() => void handleToggleVisibility(item.bookmarkId, item.isVisible)}
                  className={cn(
                    "p-1.5 rounded-ax backdrop-blur-sm transition-colors text-xs",
                    item.isVisible
                      ? "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900/80"
                      : "bg-ax-bg-elevated/80 text-ax-text-muted hover:text-ax-text-secondary"
                  )}
                  aria-label={item.isVisible ? "Sembunyikan dari publik" : "Tampilkan ke publik"}
                  title={item.isVisible ? "Publik" : "Privat dalam koleksi"}
                >
                  {item.isVisible
                    ? <Eye    size={13} aria-hidden="true" />
                    : <EyeOff size={13} aria-hidden="true" />
                  }
                </button>
              )}

              {/* Remove from collection */}
              <button
                type="button"
                onClick={() => void handleRemove(item.bookmarkId, item.post.id)}
                className="p-1.5 rounded-ax bg-ax-bg-elevated/80 backdrop-blur-sm
                           text-ax-text-muted hover:text-red-400 hover:bg-red-950/40
                           transition-colors"
                aria-label="Hapus dari koleksi"
                title="Hapus dari koleksi"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ))}

      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin text-ax-accent-light" aria-hidden="true" />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-8 flex flex-col items-center gap-2">
          <div className="w-8 h-px bg-ax-bg-border" />
          <p className="text-xs text-ax-text-hint">Tidak ada lagi</p>
        </div>
      )}
    </div>
  )
}
