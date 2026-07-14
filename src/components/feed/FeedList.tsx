"use client"

import {
  useState, useEffect, useCallback,
  useRef, useImperativeHandle, forwardRef,
} from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { PostCard } from "./PostCard"
import { PostSkeleton } from "@/components/ui/Skeleton"
import type { PostData } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

type FeedType = "home" | "explore" | "following"

interface Props {
  userId:        string
  feedType?:     FeedType
  filterUserId?: string
}

export interface FeedListHandle {
  prependPost: (post: PostData) => void
}

interface FeedState {
  posts:       PostData[]
  /**
   * nextCursor serves double duty:
   * - cursor-based feeds (home/following): opaque cursor string or null
   * - page-based feed (explore):           next page number as string ("2","3"…)
   */
  nextCursor:  string | null
  hasMore:     boolean
  loading:     boolean
  error:       string | null
  initialLoad: boolean
}

interface FeedApiResponse {
  data: PostData[]
  meta: {
    cursor:  string | null   // cursor-based
    hasMore: boolean
    page?:   number          // page-based (explore scored)
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

function makeInitialState(): FeedState {
  return {
    posts:       [],
    nextCursor:  null,
    hasMore:     true,
    loading:     false,
    error:       null,
    initialLoad: true,
  }
}

const EMPTY_MESSAGES: Record<FeedType, string> = {
  home:      "Jadilah yang pertama posting sesuatu!",
  following: "Ikuti pengguna lain untuk melihat post mereka di sini.",
  explore:   "Belum ada post. Jadilah yang pertama!",
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FeedList = forwardRef<FeedListHandle, Props>(
  function FeedList({ userId, feedType = "home", filterUserId }, ref) {
    const [state, setState] = useState<FeedState>(makeInitialState)
    const isFetching        = useRef(false)
    const sentinelRef       = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      prependPost(post: PostData) {
        setState(s => ({
          ...s,
          posts: [{ ...post, currentUserId: userId }, ...s.posts],
        }))
      },
    }), [userId])

    const fetchPosts = useCallback(async (pageCursor: string | null) => {
      if (isFetching.current) return
      isFetching.current = true
      setState(s => ({ ...s, loading: true, error: null }))

      try {
        let url:        string
        let appendMode: boolean

        if (feedType === "explore" && !filterUserId) {
          // Explore: scored feed dengan page-based pagination
          // pageCursor di sini adalah next page number ("2", "3", …)
          const page = pageCursor ? parseInt(pageCursor, 10) : 1
          url        = `/api/posts/explore?limit=20&page=${page}`
          appendMode = page > 1
        } else {
          // Home / following / profile: cursor-based pagination
          const params = new URLSearchParams({ type: feedType, limit: "20" })
          if (pageCursor)   params.set("cursor", pageCursor)
          if (filterUserId) params.set("userId", filterUserId)
          url        = `/api/posts?${params}`
          appendMode = !!pageCursor
        }

        const res  = await fetch(url)
        const body = await res.json().catch(() => null) as FeedApiResponse & {
          error?: { message?: string }
        } | null

        if (!res.ok || !body?.data) {
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
        }

        const { data, meta } = body

        // Resolve nextCursor untuk kedua mode:
        // - Cursor mode:  pakai meta.cursor langsung
        // - Page mode:    simpan nextPage number sebagai string
        const nextCursor =
          feedType === "explore" && !filterUserId
            ? (meta.hasMore ? String((meta.page ?? 1) + 1) : null)
            : (meta.cursor ?? null)

        setState(s => ({
          ...s,
          posts:       appendMode ? [...s.posts, ...data] : data,
          nextCursor,
          hasMore:     meta.hasMore,
          loading:     false,
          initialLoad: false,
        }))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memuat feed"
        setState(s => ({ ...s, loading: false, error: message, initialLoad: false }))
      } finally {
        isFetching.current = false
      }
    }, [feedType, filterUserId])

    useEffect(() => {
      setState(makeInitialState())
      void fetchPosts(null)
    }, [feedType, filterUserId, fetchPosts])

    // IntersectionObserver — reads nextCursor via setState functional form
    useEffect(() => {
      const el = sentinelRef.current
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          setState(s => {
            if (s.hasMore && !s.loading) void fetchPosts(s.nextCursor)
            return s
          })
        },
        { rootMargin: "400px", threshold: 0 }
      )

      observer.observe(el)
      return () => observer.disconnect()
    }, [fetchPosts])

    function handleDelete(postId: string) {
      setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== postId) }))
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    if (state.initialLoad) {
      return (
        <div aria-busy="true" aria-label="Memuat feed">
          {Array.from({ length: 5 }, (_, i) => <PostSkeleton key={i} />)}
        </div>
      )
    }

    if (state.error && state.posts.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-ax-text-muted">
          <AlertCircle size={32} className="text-ax-danger" aria-hidden="true" />
          <p className="text-sm">{state.error}</p>
          <button
            type="button"
            onClick={() => void fetchPosts(null)}
            className="ax-btn-ghost flex items-center gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Coba Lagi
          </button>
        </div>
      )
    }

    if (state.posts.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
          <div
            className="w-16 h-16 rounded-full bg-ax-bg-elevated flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-2xl">✨</span>
          </div>
          <p className="font-medium text-ax-text-secondary">Belum ada post</p>
          <p className="text-sm text-center max-w-xs">
            {EMPTY_MESSAGES[feedType]}
          </p>
        </div>
      )
    }

    return (
      <div>
        {state.posts.map(post => (
          <PostCard
            key={post.id}
            post={{ ...post, currentUserId: userId }}
            onDelete={handleDelete}
          />
        ))}

        <div ref={sentinelRef} className="h-1" aria-hidden="true" />

        {state.loading && state.posts.length > 0 && (
          <div className="flex justify-center py-8" aria-label="Memuat lebih banyak">
            <Loader2 size={20} className="animate-spin text-ax-accent-light" aria-hidden="true" />
          </div>
        )}

        {!state.hasMore && state.posts.length > 0 && (
          <div className="py-10 flex flex-col items-center gap-2">
            <div className="w-8 h-px bg-ax-bg-border" />
            <p className="text-xs text-ax-text-hint">Kamu sudah melihat semua post</p>
          </div>
        )}
      </div>
    )
  }
)
