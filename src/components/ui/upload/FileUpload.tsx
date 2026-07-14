"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, ImageIcon, Film, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpload } from "./useUpload"
import { UploadProgress } from "./UploadProgress"
import { PendingPreview } from "./UploadPreview"
import {
  UPLOAD_CONFIG,
  formatBytes,
  isAllowedForPurpose,
} from "@/lib/upload/config"
import type { MediaPurpose } from "@prisma/client"
import type { UploadedMedia } from "./useUpload"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  purpose:      MediaPurpose
  maxFiles?:    number
  onUpload:     (media: UploadedMedia) => void
  onRemove?:    (mediaId: string) => void
  className?:   string
  /** Tampilkan sebagai tombol inline, bukan zona drop besar */
  compact?:     boolean
  disabled?:    boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FileUpload({
  purpose, maxFiles = 1, onUpload, className, compact = false, disabled = false,
}: Props) {
  const [isDragging, setIsDragging]     = useState(false)
  const [pendingFile, setPendingFile]   = useState<File | null>(null)
  const [clientError, setClientError]   = useState<string | null>(null)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const config = UPLOAD_CONFIG[purpose]

  const { state, upload, cancel, reset } = useUpload({
    purpose,
    onSuccess: (media) => {
      setPendingFile(null)
      onUpload(media)
    },
    onError: () => {
      // error ditampilkan via state.error — tidak perlu set state lagi
    },
  })

  // ── Validation + start upload ──────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setClientError(null)

    if (!isAllowedForPurpose(file.type, purpose)) {
      setClientError(`Tipe file tidak didukung. Diizinkan: ${config.allowedTypes.join(", ")}`)
      return
    }

    if (file.size > config.maxBytes) {
      setClientError(`Ukuran file melebihi batas ${formatBytes(config.maxBytes)}`)
      return
    }

    if (file.size === 0) {
      setClientError("File tidak boleh kosong")
      return
    }

    setPendingFile(file)
    void upload(file)
  }, [purpose, config, upload])

  // ── Drag & Drop handlers ───────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [disabled, handleFile])

  // ── Input handler ──────────────────────────────────────────────────────────

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }, [handleFile])

  // ── Retry ──────────────────────────────────────────────────────────────────

  function handleRetry() {
    if (pendingFile) {
      reset()
      void upload(pendingFile)
    }
  }

  function handleCancel() {
    cancel()
    setPendingFile(null)
    reset()
  }

  const isUploading = state.status !== "idle" && state.status !== "ready"
                   && state.status !== "error" && state.status !== "cancelled"
  const accept      = config.allowedTypes.join(",")
  const hasActivity = state.status !== "idle"

  // ── Compact mode (tombol kecil) ────────────────────────────────────────────

  if (compact) {
    return (
      <div className={className}>
        <label
          className={cn(
            "flex items-center gap-1.5 text-xs cursor-pointer",
            "text-ax-accent-light hover:text-ax-accent transition-colors",
            (disabled || isUploading) && "opacity-50 pointer-events-none"
          )}
        >
          <ImageIcon size={16} aria-hidden="true" />
          <span>Tambah media</span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
          />
        </label>

        {hasActivity && (
          <div className="mt-2">
            <UploadProgress
              status={state.status}
              progress={state.progress}
              fileName={pendingFile?.name ?? ""}
              error={clientError ?? state.error}
              onCancel={isUploading ? handleCancel : undefined}
              onRetry={state.status === "error" ? handleRetry : undefined}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Full drag & drop zone ──────────────────────────────────────────────────

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-150",
          "flex flex-col items-center justify-center gap-3 text-center",
          isDragging
            ? "border-ax-accent bg-ax-accent-muted/20 scale-[1.01]"
            : "border-ax-bg-border hover:border-ax-accent/50",
          (disabled || isUploading) && "opacity-60 pointer-events-none"
        )}
      >
        {/* Upload icon */}
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isDragging ? "bg-ax-accent-muted text-ax-accent-light" : "bg-ax-bg-elevated text-ax-text-muted"
        )}>
          {purpose === "POST" || purpose === "MESSAGE"
            ? <Film size={22} aria-hidden="true" />
            : <Upload size={22} aria-hidden="true" />
          }
        </div>

        <div>
          <p className="text-sm font-medium text-ax-text-secondary">
            {isDragging ? "Lepas file di sini" : "Drag & drop file di sini"}
          </p>
          <p className="text-xs text-ax-text-muted mt-0.5">
            atau{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-ax-accent-light hover:underline font-medium"
              disabled={disabled || isUploading}
            >
              pilih dari perangkat
            </button>
          </p>
          <p className="text-xs text-ax-text-hint mt-2">
            Maks. {formatBytes(config.maxBytes)}
            {" · "}
            {config.allowedTypes.map(t => t.split("/")[1]?.toUpperCase()).join(", ")}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          aria-label="Pilih file untuk diupload"
        />
      </div>

      {/* Client-side error (sebelum upload mulai) */}
      {clientError && !hasActivity && (
        <div role="alert" className="flex items-center gap-2 text-xs text-red-400 px-1">
          <X size={12} aria-hidden="true" />
          {clientError}
        </div>
      )}

      {/* Pending preview (selama upload) */}
      {pendingFile && state.status !== "ready" && (
        <PendingPreview
          file={pendingFile}
          onRemove={handleCancel}
        />
      )}

      {/* Upload progress */}
      {hasActivity && (
        <UploadProgress
          status={state.status}
          progress={state.progress}
          fileName={pendingFile?.name ?? ""}
          error={clientError ?? state.error}
          onCancel={isUploading ? handleCancel : undefined}
          onRetry={state.status === "error" ? handleRetry : undefined}
        />
      )}
    </div>
  )
}
