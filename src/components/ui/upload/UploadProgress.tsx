"use client"

import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadStatus } from "./useUpload"

interface Props {
  status:    UploadStatus
  progress:  number
  fileName:  string
  onCancel?: () => void
  onRetry?:  () => void
  error?:    string | null
}

const STATUS_LABEL: Record<UploadStatus, string> = {
  idle:        "",
  presigning:  "Menyiapkan upload...",
  uploading:   "Mengupload...",
  processing:  "Memproses file...",
  ready:       "Selesai",
  error:       "Gagal",
  cancelled:   "Dibatalkan",
}

export function UploadProgress({ status, progress, fileName, onCancel, onRetry, error }: Props) {
  if (status === "idle") return null

  const isActive   = status === "uploading" || status === "presigning"
  const isFinished = status === "ready"
  const isError    = status === "error" || status === "cancelled"

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-2 text-sm",
      isFinished ? "border-emerald-700/40 bg-emerald-950/20" :
      isError    ? "border-red-700/40 bg-red-950/20" :
                   "border-ax-bg-border bg-ax-bg-elevated"
    )}>
      <div className="flex items-center gap-2.5">
        {/* Status icon */}
        {status === "processing" || status === "presigning"
          ? <Loader2 size={14} className="animate-spin text-ax-accent-light flex-shrink-0" aria-hidden="true" />
          : isFinished
            ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" aria-hidden="true" />
            : isError
              ? <AlertCircle size={14} className="text-red-400 flex-shrink-0" aria-hidden="true" />
              : null
        }

        <span className="flex-1 text-ax-text-secondary text-xs truncate" title={fileName}>
          {fileName}
        </span>

        <span className={cn(
          "text-xs flex-shrink-0",
          isFinished ? "text-emerald-400" : isError ? "text-red-400" : "text-ax-text-muted"
        )}>
          {STATUS_LABEL[status]}
          {status === "uploading" && ` ${progress}%`}
        </span>

        {isActive && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-ax-text-muted hover:text-red-400 transition-colors flex-shrink-0"
            aria-label="Batalkan upload"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {(isActive || status === "processing") && (
        <div
          className="h-1 bg-ax-bg-subtle rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={status === "processing" ? 100 : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${progress}%`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              status === "processing"
                ? "bg-ax-accent animate-pulse w-full"
                : "bg-ax-accent"
            )}
            style={{ width: status === "processing" ? "100%" : `${progress}%` }}
          />
        </div>
      )}

      {/* Error dengan retry */}
      {isError && error && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-400">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-ax-accent-light hover:underline flex-shrink-0"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}
    </div>
  )
}
