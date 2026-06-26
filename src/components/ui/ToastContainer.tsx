"use client"

import { useEffect, useState } from "react"
import { toast, type ToastItem } from "@/lib/toast"
import { cn } from "@/lib/utils"

// ── Constants ─────────────────────────────────────────────────────────────────

const ICONS: Record<ToastItem["type"], string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
}

const STYLES: Record<ToastItem["type"], string> = {
  success: "bg-emerald-950/90 border-emerald-800/60 text-emerald-300",
  error:   "bg-red-950/90    border-red-800/60    text-red-300",
  info:    "bg-ax-accent-muted border-ax-accent/40 text-ax-accent-light",
  warning: "bg-yellow-950/90 border-yellow-800/60  text-yellow-300",
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ToastContainer — subscriber tunggal untuk ToastManager.
 *
 * useEffect cleanup sekarang aman karena toast.subscribe() return () => void,
 * bukan () => boolean seperti sebelumnya.
 *
 * Pattern yang digunakan:
 *   useEffect(() => {
 *     return toast.subscribe(setToasts)  // () => void — valid EffectCallback
 *   }, [])
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([])

  useEffect(() => {
    // toast.subscribe() return Unsubscribe = () => void
    // Kompatibel dengan React EffectCallback cleanup contract
    return toast.subscribe(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifikasi"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-ax border shadow-lg backdrop-blur-sm",
            "text-sm font-medium min-w-[240px] max-w-[360px] pointer-events-auto",
            "animate-slide-up",
            STYLES[t.type]
          )}
        >
          <span className="flex-shrink-0 font-bold" aria-hidden="true">
            {ICONS[t.type]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
