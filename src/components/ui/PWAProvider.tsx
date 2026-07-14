"use client"

import { useEffect, useState } from "react"
import { WifiOff, X, RefreshCw } from "lucide-react"

/**
 * PWAProvider — dua tanggung jawab:
 * 1. Register service worker saat app load
 * 2. Tampilkan banner saat koneksi offline / kembali online
 *
 * Diletakkan di root layout (client component).
 * Service worker path: /sw.js (di-serve dari public/)
 */
export function PWAProvider() {
  const [isOffline, setIsOffline] = useState(false)
  const [showBack, setShowBack]   = useState(false)  // "kembali online" toast

  // Register SW
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(reg => {
          // Cek update SW secara periodik
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Ada SW baru — bisa tampilkan "Update tersedia" tapi skip untuk MVP
              }
            })
          })
        })
        .catch(err => {
          console.warn("SW registration failed:", err)
        })
    }
  }, [])

  // Online/offline detection
  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true)
      setShowBack(false)
    }

    const goOnline = () => {
      setIsOffline(false)
      setShowBack(true)
      // Sembunyikan "kembali online" setelah 3 detik
      const t = setTimeout(() => setShowBack(false), 3000)
      return () => clearTimeout(t)
    }

    // Initial state
    setIsOffline(!navigator.onLine)

    window.addEventListener("offline", goOffline)
    window.addEventListener("online",  goOnline)

    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online",  goOnline)
    }
  }, [])

  // Tidak ada yang perlu ditampilkan
  if (!isOffline && !showBack) return null

  // Banner "kembali online"
  if (showBack) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50
                   bg-emerald-900/90 border border-emerald-700/50
                   text-emerald-300 text-sm font-medium
                   px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm
                   flex items-center gap-2 animate-fade-in"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Koneksi kembali tersedia
      </div>
    )
  }

  // Banner offline
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-50 px-4
                 flex justify-center pointer-events-none"
    >
      <div
        className="bg-ax-bg-elevated border border-ax-bg-border shadow-xl
                   text-ax-text-primary text-sm font-medium
                   px-4 py-3 rounded-2xl backdrop-blur-sm
                   flex items-center gap-3 pointer-events-auto
                   max-w-sm w-full animate-slide-up"
      >
        <WifiOff
          size={17}
          className="text-ax-text-muted flex-shrink-0"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ax-text-primary text-[13px]">
            Kamu sedang offline
          </p>
          <p className="text-ax-text-muted text-[12px] mt-0.5">
            Konten yang sudah dimuat masih bisa dibaca
          </p>
        </div>
      </div>
    </div>
  )
}
