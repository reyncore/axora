/**
 * GET /api/notifications/stream — Server-Sent Events endpoint.
 *
 * FLOW:
 * 1. Client buka koneksi SSE (EventSource)
 * 2. Server register controller ke notificationStore
 * 3. Saat ada notifikasi baru → notificationStore.push(userId) → enqueue event
 * 4. Client terima event → fetch unread count terbaru → update badge
 *
 * RUNTIME: nodejs (bukan edge) — butuh long-lived connection dan Map singleton.
 * Edge runtime tidak support persistent server state.
 *
 * KEEP-ALIVE:
 * Heartbeat setiap 25 detik mencegah proxy/Vercel timeout connection.
 * Vercel Hobby timeout: 10 detik untuk regular, tapi SSE dengan streaming
 * menggunakan chunked transfer — tetap aktif selama ada data.
 *
 * VERCEL HOBBY CAVEAT:
 * Function timeout 10s berlaku. Untuk SSE long-lived, gunakan Vercel Pro
 * atau tambahkan maxDuration config. Alternatif: polling hybrid (SSE + fallback).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Vercel Pro: set maxDuration lebih tinggi untuk SSE
// export const maxDuration = 60

import { auth } from "@/lib/auth"
import { notificationStore } from "@/lib/notification-store"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  const userId  = session.user.id
  const encoder = new TextEncoder()

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl

      // Register ke store agar bisa menerima push
      notificationStore.register(userId, ctrl)

      // Kirim initial "connected" event
      ctrl.enqueue(encoder.encode("event: connected\ndata: {}\n\n"))

      // Heartbeat setiap 25 detik untuk mencegah timeout
      heartbeatTimer = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          // Stream sudah close — cleanup
          if (heartbeatTimer) clearInterval(heartbeatTimer)
        }
      }, 25_000)
    },

    cancel() {
      // Client disconnect (navigasi, tutup tab, dll)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (controller) notificationStore.unregister(userId, controller)
    },
  })

  // Cleanup jika request di-abort oleh client
  req.signal.addEventListener("abort", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (controller) notificationStore.unregister(userId, controller)
  })

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection":    "keep-alive",
      // Mencegah buffering di Nginx/proxy
      "X-Accel-Buffering": "no",
    },
  })
}
