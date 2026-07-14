"use client"

import { useState } from "react"
import { X, Play, ImageOff, FileVideo } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBytes } from "@/lib/upload/config"
import type { UploadedMedia } from "./useUpload"

// ── Pending preview (sebelum upload selesai) ──────────────────────────────────

interface PendingPreviewProps {
  file:     File
  onRemove: () => void
}

export function PendingPreview({ file, onRemove }: PendingPreviewProps) {
  const [objectUrl] = useState(() => URL.createObjectURL(file))
  const isVideo     = file.type.startsWith("video/")

  return (
    <div className="relative group rounded-xl overflow-hidden bg-ax-bg-elevated
                    border border-ax-bg-border">
      {isVideo ? (
        <div className="aspect-video flex items-center justify-center bg-ax-bg-subtle">
          <FileVideo size={32} className="text-ax-text-muted" aria-hidden="true" />
        </div>
      ) : (
        <img
          src={objectUrl}
          alt="Preview"
          className="w-full aspect-video object-cover"
          onLoad={() => URL.revokeObjectURL(objectUrl)}
        />
      )}

      {/* Overlay dengan info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70
                      to-transparent p-2">
        <p className="text-xs text-white/90 truncate">{file.name}</p>
        <p className="text-xs text-white/60">{formatBytes(file.size)}</p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80
                   rounded-full flex items-center justify-center transition-colors
                   opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Hapus ${file.name}`}
      >
        <X size={12} className="text-white" aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Ready preview (setelah upload selesai) ────────────────────────────────────

interface ReadyPreviewProps {
  media:    UploadedMedia
  onRemove: () => void
  /** Tambah tombol visibility toggle untuk koleksi publik */
  isVisible?:        boolean
  onToggleVisible?:  () => void
}

export function ReadyPreview({ media, onRemove }: ReadyPreviewProps) {
  const [imgError, setImgError] = useState(false)
  const isVideo = media.type === "VIDEO"
  const src     = media.thumbUrl ?? media.fileUrl

  return (
    <div className="relative group rounded-xl overflow-hidden bg-ax-bg-elevated
                    border border-ax-bg-border">
      {isVideo ? (
        <div className="aspect-video bg-ax-bg-subtle flex items-center justify-center relative">
          {media.thumbUrl ? (
            <img src={media.thumbUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
          ) : null}
          <div className="relative z-10 w-10 h-10 rounded-full bg-black/50
                          flex items-center justify-center">
            <Play size={18} className="text-white" fill="white" aria-hidden="true" />
          </div>
        </div>
      ) : imgError ? (
        <div className="aspect-video flex items-center justify-center bg-ax-bg-subtle">
          <ImageOff size={24} className="text-ax-text-hint" aria-hidden="true" />
        </div>
      ) : (
        <img
          src={src}
          alt={media.fileName}
          className="w-full aspect-video object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {/* Bottom info bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70
                      to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white/90 truncate">{media.fileName}</p>
        <p className="text-xs text-white/60">{formatBytes(media.fileSize)}</p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80
                   rounded-full flex items-center justify-center transition-colors
                   opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Hapus ${media.fileName}`}
      >
        <X size={12} className="text-white" aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Media grid preview ────────────────────────────────────────────────────────

interface MediaGridProps {
  items:   UploadedMedia[]
  onRemove: (index: number) => void
}

export function MediaGrid({ items, onRemove }: MediaGridProps) {
  if (items.length === 0) return null

  return (
    <div className={cn(
      "grid gap-1.5 rounded-xl overflow-hidden",
      items.length === 1 ? "grid-cols-1" :
      items.length === 2 ? "grid-cols-2" :
      items.length === 3 ? "grid-cols-2" :
                           "grid-cols-2"
    )}>
      {items.map((media, i) => (
        <div key={media.id} className={cn(items.length === 3 && i === 0 && "row-span-2")}>
          <ReadyPreview media={media} onRemove={() => onRemove(i)} />
        </div>
      ))}
    </div>
  )
}
