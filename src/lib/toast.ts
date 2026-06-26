/**
 * Toast manager — pure TypeScript, tidak ada React dependency.
 *
 * ARSITEKTUR:
 * - ToastManager adalah singleton observable (publish-subscribe pattern)
 * - subscribe() wajib return () => void agar kompatibel dengan React EffectCallback
 * - Listeners disimpan di Set untuk O(1) add/delete dan mencegah duplikat
 * - Auto-dismiss timeout di-track per toast agar bisa di-cancel saat manual dismiss
 *
 * KENAPA subscribe() harus return () => void, bukan () => boolean:
 * - React useEffect cleanup contract: type Destructor = () => void
 * - Set.prototype.delete() return boolean — jika arrow cleanup return langsung
 *   hasil delete, TypeScript strict mode menolak: () => boolean ≠ () => void
 * - Solusi: gunakan block body { } pada arrow cleanup agar return type void
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning"

interface ToastOptions {
  duration?: number
}

export interface ToastItem {
  id:       string
  type:     ToastType
  message:  string
  duration: number
}

// Fungsi yang dipanggil setiap kali daftar toast berubah
type ToastListener = (toasts: readonly ToastItem[]) => void

/**
 * Tipe eksplisit untuk fungsi unsubscribe.
 *
 * Harus () => void — bukan () => boolean — agar dapat dikembalikan
 * langsung dari React useEffect sebagai cleanup:
 *
 *   useEffect(() => toast.subscribe(fn), [])
 *                                      ↑ valid hanya jika return () => void
 */
type Unsubscribe = () => void

// ── ToastManager ──────────────────────────────────────────────────────────────

class ToastManager {
  private toasts:    readonly ToastItem[]           = []
  private listeners: Set<ToastListener>             = new Set()
  // Track timeout ID per toast untuk bisa cancel saat dismiss manual
  private timers:    Map<string, ReturnType<typeof setTimeout>> = new Map()

  private emit(): void {
    // Snapshot immutable — listener tidak bisa mutasi array internal
    const snapshot = this.toasts
    this.listeners.forEach(fn => fn(snapshot))
  }

  /**
   * Subscribe ke perubahan toast list.
   *
   * Return type eksplisit `Unsubscribe` (alias () => void) memastikan
   * kompatibilitas dengan React EffectCallback.
   *
   * Block body `{ }` pada arrow mencegah TypeScript me-infer () => boolean
   * dari Set.delete() yang return boolean.
   */
  subscribe(fn: ToastListener): Unsubscribe {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
      // Tidak ada return — TypeScript infer void secara eksplisit
    }
  }

  show(message: string, type: ToastType, options: ToastOptions = {}): string {
    const id       = crypto.randomUUID()
    const duration = options.duration ?? (type === "error" ? 5000 : 3000)
    const item: ToastItem = { id, type, message, duration }

    this.toasts = [...this.toasts, item]
    this.emit()

    // Simpan timer ID agar bisa dibatalkan saat dismiss manual
    const timerId = setTimeout(() => {
      this.timers.delete(id)
      this.dismiss(id)
    }, duration)
    this.timers.set(id, timerId)

    return id
  }

  dismiss(id: string): void {
    // Cancel auto-dismiss timer jika toast di-dismiss manual sebelum waktunya
    const timerId = this.timers.get(id)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      this.timers.delete(id)
    }

    const prev = this.toasts
    this.toasts = prev.filter(t => t.id !== id)

    // Hanya emit jika ada perubahan nyata
    if (this.toasts.length !== prev.length) {
      this.emit()
    }
  }

  success(message: string, options?: ToastOptions): string {
    return this.show(message, "success", options)
  }

  error(message: string, options?: ToastOptions): string {
    return this.show(message, "error", options)
  }

  info(message: string, options?: ToastOptions): string {
    return this.show(message, "info", options)
  }

  warning(message: string, options?: ToastOptions): string {
    return this.show(message, "warning", options)
  }
}

// Singleton — satu instance untuk seluruh aplikasi
export const toast = new ToastManager()
