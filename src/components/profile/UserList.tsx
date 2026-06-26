"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, Users } from "lucide-react"
import { UserListItem, type UserListItemData } from "./UserListItem"
import { toast } from "@/lib/toast"

interface ApiResponse {
  data: Array<{
    followId:   string
    followedAt: string
    user:       UserListItemData
  }>
  meta: { cursor: string | null; hasMore: boolean }
}

interface ListState {
  users:      UserListItemData[]
  nextCursor: string | null
  hasMore:    boolean
  loading:    boolean
}

interface Props {
  initialData:    UserListItemData[]
  initialCursor:  string | null
  initialHasMore: boolean
  apiUrl:         string
  emptyMessage:   string
}

export function UserList({
  initialData, initialCursor, initialHasMore, apiUrl, emptyMessage,
}: Props) {
  const [state, setState] = useState<ListState>({
    users:      initialData,
    nextCursor: initialCursor,
    hasMore:    initialHasMore,
    loading:    false,
  })

  // Ref-based tracking — avoid stale closure in IntersectionObserver callback
  const isFetching  = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchMore = useCallback(async (pageCursor: string | null) => {
    if (isFetching.current) return
    isFetching.current = true
    setState(s => ({ ...s, loading: true }))

    try {
      const params = new URLSearchParams({ limit: "20" })
      if (pageCursor) params.set("cursor", pageCursor)

      const res = await fetch(`${apiUrl}?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(body.error?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json() as ApiResponse

      setState(s => ({
        users:      [...s.users, ...json.data.map(d => d.user)],
        nextCursor: json.meta.cursor,
        hasMore:    json.meta.hasMore,
        loading:    false,
      }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat lebih banyak")
      setState(s => ({ ...s, loading: false }))
    } finally {
      isFetching.current = false
    }
  }, [apiUrl])

  // IntersectionObserver — reads state via setState functional form
  // to avoid stale closure over nextCursor/hasMore values
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setState(s => {
          if (s.hasMore && !s.loading && !isFetching.current) {
            void fetchMore(s.nextCursor)
          }
          return s
        })
      },
      { rootMargin: "300px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore])

  if (state.users.length === 0 && !state.loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <Users size={36} className="opacity-30" aria-hidden="true" />
        <p className="text-sm text-ax-text-secondary font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <ul aria-label="Daftar pengguna">
        {state.users.map(user => (
          <li key={user.id}>
            <UserListItem user={user} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {state.loading && (
        <div className="flex justify-center py-6" aria-label="Memuat lebih banyak">
          <Loader2 size={18} className="animate-spin text-ax-accent-light" aria-hidden="true" />
        </div>
      )}

      {!state.hasMore && state.users.length > 0 && (
        <div className="py-8 flex flex-col items-center gap-2">
          <div className="w-8 h-px bg-ax-bg-border" />
          <p className="text-xs text-ax-text-hint">Tidak ada lagi</p>
        </div>
      )}
    </div>
  )
}
