/**
 * notification-store.ts — In-memory SSE connection registry.
 *
 * ARCHITECTURE:
 * Singleton Map yang menyimpan semua active SSE connections per userId.
 * Saat notifikasi baru dibuat (like/follow/comment), panggil
 * notificationStore.push(receiverId) untuk trigger update ke client.
 *
 * SCALABILITY NOTE:
 * In-memory store hanya bekerja untuk single-instance deployment (Vercel Hobby/Pro).
 * Untuk multi-instance (enterprise), ganti dengan Redis pub/sub.
 * Interface sengaja dibuat agar mudah swap implementasi.
 *
 * MEMORY SAFETY:
 * Controller di-remove otomatis saat connection close (client disconnect/navigate).
 * Set<ReadableStreamDefaultController> di-cleanup saat kosong.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>

class NotificationStore {
  // Map<userId, Set<controller>>
  // Satu user bisa punya banyak tab/window terbuka
  private connections = new Map<string, Set<SSEController>>()

  register(userId: string, controller: SSEController): void {
    const existing = this.connections.get(userId) ?? new Set()
    existing.add(controller)
    this.connections.set(userId, existing)
  }

  unregister(userId: string, controller: SSEController): void {
    const set = this.connections.get(userId)
    if (!set) return
    set.delete(controller)
    if (set.size === 0) this.connections.delete(userId)
  }

  /**
   * Push "new notification" event ke semua active connections milik userId.
   * Fire-and-forget — tidak perlu await.
   * Encoding ke UTF-8 Uint8Array diperlukan untuk ReadableStream.
   */
  push(userId: string): void {
    const set = this.connections.get(userId)
    if (!set || set.size === 0) return

    const encoder = new TextEncoder()
    // SSE format: "event: notification\ndata: {}\n\n"
    const payload = encoder.encode("event: notification\ndata: {}\n\n")

    for (const ctrl of set) {
      try {
        ctrl.enqueue(payload)
      } catch {
        // Controller sudah closed — hapus dari set
        set.delete(ctrl)
      }
    }

    if (set.size === 0) this.connections.delete(userId)
  }

  /** Jumlah total active connections — untuk monitoring */
  get activeConnections(): number {
    let total = 0
    for (const set of this.connections.values()) total += set.size
    return total
  }
}

// Singleton — satu instance per server process
export const notificationStore = new NotificationStore()
