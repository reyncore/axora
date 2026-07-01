"use client"

import { useEffect, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  images:       string[]
  initialIndex?: number
  onClose:      () => void
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const [loaded, setLoaded]   = useState(false)

  const hasPrev = current > 0
  const hasNext = current < images.length - 1

  const prev = useCallback(() => {
    if (hasPrev) { setLoaded(false); setCurrent(i => i - 1) }
  }, [hasPrev])

  const next = useCallback(() => {
    if (hasNext) { setLoaded(false); setCurrent(i => i + 1) }
  }, [hasNext])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose()
      if (e.key === "ArrowLeft")   prev()
      if (e.key === "ArrowRight")  next()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [onClose, prev, next])

  const currentSrc = images[current]
  if (!currentSrc) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Tampilan gambar penuh"
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70
                   text-white transition-colors z-10"
        aria-label="Tutup"
      >
        <X size={20} aria-hidden="true" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full
                        bg-black/50 text-white text-xs tabular-nums">
          {current + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 p-2 rounded-full bg-black/50 hover:bg-black/70
                     text-white transition-colors z-10"
          aria-label="Gambar sebelumnya"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white
                            rounded-full animate-spin" />
          </div>
        )}
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          onLoad={() => setLoaded(true)}
          className={cn(
            "max-w-[90vw] max-h-[90vh] object-contain rounded-lg transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 p-2 rounded-full bg-black/50 hover:bg-black/70
                     text-white transition-colors z-10"
          aria-label="Gambar berikutnya"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={e => { e.stopPropagation(); setLoaded(false); setCurrent(i) }}
              className={cn(
                "w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                i === current
                  ? "border-white scale-110"
                  : "border-white/30 hover:border-white/60 opacity-60 hover:opacity-100"
              )}
              aria-label={`Gambar ${i + 1}`}
              aria-current={i === current}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
