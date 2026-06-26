/**
 * GET /api/conversations/stream — SSE endpoint untuk realtime DM.
 * Pattern identik dengan /api/notifications/stream — lihat file tersebut
 * untuk dokumentasi lengkap mengenai heartbeat dan cleanup.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { dmStore } from "@/lib/dm-store"
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
      dmStore.register(userId, ctrl)
      ctrl.enqueue(encoder.encode("event: connected\ndata: {}\n\n"))

      heartbeatTimer = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer)
        }
      }, 25_000)
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (controller) dmStore.unregister(userId, controller)
    },
  })

  req.signal.addEventListener("abort", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (controller) dmStore.unregister(userId, controller)
  })

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-store",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
