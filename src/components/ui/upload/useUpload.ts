"use client"

import { useState, useRef, useCallback } from "react"
import type { MediaPurpose } from "@prisma/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadStatus =
  | "idle"
  | "presigning"
  | "uploading"
  | "processing"
  | "ready"
  | "error"
  | "cancelled"

export interface UploadedMedia {
  id:        string
  fileUrl:   string
  thumbUrl:  string | null
  mimeType:  string
  fileSize:  number
  fileName:  string
  type:      "IMAGE" | "VIDEO" | "GIF"
  width:     number | null
  height:    number | null
  duration:  number | null
}

export interface UploadState {
  status:   UploadStatus
  progress: number         // 0–100
  error:    string | null
  media:    UploadedMedia | null
}

interface UseUploadOptions {
  purpose:    MediaPurpose
  onSuccess?: (media: UploadedMedia) => void
  onError?:   (error: string) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUpload({ purpose, onSuccess, onError }: UseUploadOptions) {
  const [state, setState] = useState<UploadState>({
    status:   "idle",
    progress: 0,
    error:    null,
    media:    null,
  })

  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const upload = useCallback(async (file: File) => {
    setState({ status: "presigning", progress: 0, error: null, media: null })

    // ── Step 1: Get pre-signed URL ────────────────────────────────────────────

    let presignData: {
      mediaId:   string
      uploadUrl: string
      headers:   Record<string, string>
      expiresAt: number
    }

    try {
      const res = await fetch("/api/upload/presign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          purpose,
        }),
      })

      const body = await res.json() as {
        data?:  typeof presignData
        error?: { code?: string; message?: string }
      }

      if (!res.ok) {
        throw new Error(body.error?.message ?? `Presign gagal: HTTP ${res.status}`)
      }

      presignData = body.data!
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mempersiapkan upload"
      setState(s => ({ ...s, status: "error", error: msg }))
      onError?.(msg)
      return
    }

    // ── Step 2: Upload langsung ke storage via XHR (bukan fetch) ─────────────
    // XHR dipakai karena Fetch API tidak support upload progress events

    setState(s => ({ ...s, status: "uploading", progress: 0 }))

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setState(s => ({ ...s, progress: pct }))
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload gagal: HTTP ${xhr.status}`))
          }
        })

        xhr.addEventListener("error",  () => reject(new Error("Koneksi terputus saat upload")))
        xhr.addEventListener("abort",  () => reject(new Error("__CANCELLED__")))
        xhr.addEventListener("timeout", () => reject(new Error("Upload timeout")))

        xhr.open("PUT", presignData.uploadUrl)

        // Set headers yang diperlukan oleh storage provider
        Object.entries(presignData.headers ?? {}).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v)
        })

        xhr.timeout = 5 * 60 * 1000 // 5 menit timeout untuk large files
        xhr.send(file)
      })
    } catch (err) {
      xhrRef.current = null
      const msg = err instanceof Error ? err.message : "Upload gagal"

      if (msg === "__CANCELLED__") {
        setState(s => ({ ...s, status: "cancelled", progress: 0 }))
        return
      }

      setState(s => ({ ...s, status: "error", error: msg }))
      onError?.(msg)
      return
    }

    xhrRef.current = null

    // ── Step 3: Confirm upload ke server ──────────────────────────────────────

    setState(s => ({ ...s, status: "processing", progress: 100 }))

    try {
      const res = await fetch("/api/upload/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mediaId: presignData.mediaId }),
      })

      const body = await res.json() as {
        data?:  UploadedMedia
        error?: { code?: string; message?: string }
      }

      if (!res.ok) {
        throw new Error(body.error?.message ?? "Konfirmasi upload gagal")
      }

      const media = body.data!
      setState({ status: "ready", progress: 100, error: null, media })
      onSuccess?.(media)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Konfirmasi gagal"
      setState(s => ({ ...s, status: "error", error: msg }))
      onError?.(msg)
    }
  }, [purpose, onSuccess, onError])

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
    }
    setState({ status: "cancelled", progress: 0, error: null, media: null })
  }, [])

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0, error: null, media: null })
  }, [])

  return { state, upload, cancel, reset }
}
