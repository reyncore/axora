/**
 * dm-store.ts — In-memory SSE connection registry untuk Direct Messages.
 *
 * Pattern identik dengan notification-store.ts, dibuat sebagai instance
 * terpisah agar:
 * 1. Tidak ada breaking change pada notification SSE yang sudah live
 * 2. Event DM dan notification bisa dibedakan tanpa payload parsing tambahan
 *
 * push(userId, conversationId) mengirim event "message" berisi conversationId
 * agar client tahu conversation mana yang perlu di-refresh tanpa fetch semua.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>

class DMStore {
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
   * Push "new message" event ke semua koneksi aktif milik userId.
   * data: { conversationId } agar client tahu thread mana yang baru.
   */
  push(userId: string, conversationId: string): void {
    const set = this.connections.get(userId)
    if (!set || set.size === 0) return

    const encoder = new TextEncoder()
    const payload = encoder.encode(
      `event: message\ndata: ${JSON.stringify({ conversationId })}\n\n`
    )

    for (const ctrl of set) {
      try {
        ctrl.enqueue(payload)
      } catch {
        set.delete(ctrl)
      }
    }

    if (set.size === 0) this.connections.delete(userId)
  }

  get activeConnections(): number {
    let total = 0
    for (const set of this.connections.values()) total += set.size
    return total
  }
}

export const dmStore = new DMStore()
