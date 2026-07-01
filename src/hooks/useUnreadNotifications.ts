import { useState, useEffect, useCallback } from "react"

interface UnreadResult {
  count:     number
  hasUnread: boolean
}

interface NotificationsApiResponse {
  data: unknown[]
  meta: { unreadCount: number }
}

/**
 * Hook untuk real-time unread notification count.
 *
 * STRATEGY:
 * 1. Buka SSE connection ke /api/notifications/stream
 * 2. Saat dapat event "notification" → fetch count terbaru
 * 3. Jika SSE gagal (network error, timeout) → fallback ke polling 60 detik
 * 4. Tab tidak aktif → tidak fetch (hemat resource)
 *
 * FALLBACK LOGIC:
 * SSE connection yang gagal setelah MAX_SSE_RETRIES kali
 * otomatis switch ke polling mode tanpa crash.
 */

const MAX_SSE_RETRIES = 3
const SSE_RETRY_DELAY = 3_000   // 3 detik
const POLL_INTERVAL   = 60_000  // 60 detik (fallback)

export function useUnreadNotifications(): UnreadResult {
  const [count, setCount]       = useState(0)
  const [usePolling, setUsePolling] = useState(false)

  const fetchCount = useCallback(async (signal?: AbortSignal) => {
    if (document.hidden) return
    try {
      const res = await fetch("/api/notifications?limit=1", { signal })
      if (!res.ok || signal?.aborted) return
      const json = await res.json() as NotificationsApiResponse
      if (!signal?.aborted) setCount(json.meta.unreadCount)
    } catch {
      // Network error — silently ignored
    }
  }, [])

  // SSE connection
  useEffect(() => {
    if (usePolling) return

    let retries  = 0
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let aborted = false

    function connect() {
      if (aborted) return

      es = new EventSource("/api/notifications/stream")

      es.addEventListener("connected", () => {
        retries = 0
        void fetchCount()
      })

      es.addEventListener("notification", () => {
        void fetchCount()
      })

      es.onerror = () => {
        es?.close()
        es = null

        if (aborted) return

        retries++
        if (retries >= MAX_SSE_RETRIES) {
          // Switch ke polling setelah terlalu banyak retry
          setUsePolling(true)
          return
        }

        // Exponential backoff: 3s, 6s, 12s
        const delay = SSE_RETRY_DELAY * 2 ** (retries - 1)
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    // Resume saat tab aktif
    function handleVisibility() {
      if (!document.hidden && !es) connect()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      aborted = true
      if (retryTimer) clearTimeout(retryTimer)
      if (es) { es.close(); es = null }
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [usePolling, fetchCount])

  // Polling fallback
  useEffect(() => {
    if (!usePolling) return

    let aborted = false
    const ac    = new AbortController()

    void fetchCount(ac.signal)

    const interval = setInterval(() => {
      if (!document.hidden) void fetchCount(ac.signal)
    }, POLL_INTERVAL)

    function handleVisibility() {
      if (!document.hidden && !aborted) void fetchCount(ac.signal)
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      aborted = true
      ac.abort()
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [usePolling, fetchCount])

  return { count, hasUnread: count > 0 }
}
