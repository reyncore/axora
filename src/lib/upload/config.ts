/**
 * lib/upload/config.ts — Upload configuration.
 *
 * Single source of truth untuk:
 * - File size limits per purpose
 * - Allowed MIME types per purpose
 * - Storage path prefixes
 *
 * Dipakai di server (validation) DAN client (pre-submit check).
 * Tidak import server-only modules agar bisa dipakai di browser.
 */

import type { MediaPurpose } from "@prisma/client"

// ── MIME types ─────────────────────────────────────────────────────────────────

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",  // .mov
  "video/webm",
] as const

export type ImageMimeType = typeof IMAGE_MIME_TYPES[number]
export type VideoMimeType = typeof VIDEO_MIME_TYPES[number]
export type AllowedMimeType = ImageMimeType | VideoMimeType

// ── Per-purpose configuration ─────────────────────────────────────────────────

interface PurposeConfig {
  maxBytes:     number
  allowedTypes: readonly string[]
  pathPrefix:   string
}

export const UPLOAD_CONFIG: Record<MediaPurpose, PurposeConfig> = {
  AVATAR: {
    maxBytes:     5  * 1024 * 1024,   // 5 MB
    allowedTypes: IMAGE_MIME_TYPES,
    pathPrefix:   "avatars",
  },
  COVER: {
    maxBytes:     8  * 1024 * 1024,   // 8 MB
    allowedTypes: IMAGE_MIME_TYPES,
    pathPrefix:   "covers",
  },
  POST: {
    maxBytes:     50 * 1024 * 1024,   // 50 MB
    allowedTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
    pathPrefix:   "posts",
  },
  MESSAGE: {
    maxBytes:     25 * 1024 * 1024,   // 25 MB
    allowedTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
    pathPrefix:   "messages",
  },
  COMMENT: {
    maxBytes:     10 * 1024 * 1024,   // 10 MB
    allowedTypes: IMAGE_MIME_TYPES,
    pathPrefix:   "comments",
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function isImageType(mimeType: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function isVideoType(mimeType: string): boolean {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function isAllowedForPurpose(
  mimeType: string,
  purpose:  MediaPurpose,
): boolean {
  return (UPLOAD_CONFIG[purpose].allowedTypes as readonly string[]).includes(mimeType)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getMediaTypeFromMime(mimeType: string): "IMAGE" | "VIDEO" | "GIF" {
  if (mimeType === "image/gif") return "GIF"
  if (isVideoType(mimeType))   return "VIDEO"
  return "IMAGE"
}

/** Pre-signed URL expire time (detik) */
export const PRESIGN_EXPIRES_IN = 900 // 15 menit
