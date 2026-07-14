/**
 * lib/upload/validation.ts — Server-side upload validation.
 *
 * TIDAK percaya data dari client:
 * - mimeType dari client hanya dipakai untuk pre-sign, lalu diverifikasi
 *   dari magic bytes saat confirm (setelah file ada di storage)
 * - fileSize dari client dipakai untuk pre-signed URL ContentLength,
 *   lalu diverifikasi dari storage metadata saat confirm
 *
 * Magic bytes detection mencegah MIME type spoofing:
 * attacker tidak bisa upload .exe dengan Content-Type: image/jpeg
 */

import type { MediaPurpose } from "@prisma/client"
import {
  UPLOAD_CONFIG,
  isAllowedForPurpose,
  formatBytes,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from "./config"

export type ValidationError =
  | { code: "MIME_NOT_ALLOWED";  message: string }
  | { code: "FILE_TOO_LARGE";    message: string; maxBytes: number }
  | { code: "INVALID_EXTENSION"; message: string }
  | { code: "MAGIC_BYTES_MISMATCH"; message: string }

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError }

// ── Extension whitelist ────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png":  [".png"],
  "image/webp": [".webp"],
  "image/gif":  [".gif"],
  "video/mp4":      [".mp4"],
  "video/quicktime": [".mov"],
  "video/webm":     [".webm"],
}

// ── Magic bytes map ────────────────────────────────────────────────────────────

const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
  { mime: "video/mp4",  bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
  { mime: "video/webm", bytes: [0x1A, 0x45, 0xDF, 0xA3] },
]

function detectMimeFromBuffer(buf: Buffer): string | null {
  for (const { mime, bytes, offset = 0 } of MAGIC_BYTES) {
    const match = bytes.every((b, i) => buf[offset + i] === b)
    if (match) {
      // WEBP special case: check bytes 8-11 = "WEBP"
      if (mime === "image/webp") {
        const webp = buf.subarray(8, 12).toString("ascii")
        if (webp !== "WEBP") continue
      }
      return mime
    }
  }
  // MOV/MP4 fallback: check for "qt  " or "ftyp" at various offsets
  if (buf.length >= 12) {
    const box = buf.subarray(4, 8).toString("ascii")
    if (box === "ftyp") {
      const brand = buf.subarray(8, 12).toString("ascii")
      return brand.startsWith("qt") ? "video/quicktime" : "video/mp4"
    }
  }
  return null
}

// ── Validation functions ───────────────────────────────────────────────────────

/**
 * Validate upload request SEBELUM generate pre-signed URL.
 * Hanya validasi metadata (mime, size, extension) — tidak ada file buffer.
 */
export function validateUploadRequest(params: {
  mimeType:  string
  fileSize:  number
  fileName:  string
  purpose:   MediaPurpose
}): ValidationResult {
  const { mimeType, fileSize, fileName, purpose } = params
  const config = UPLOAD_CONFIG[purpose]

  // 1. MIME type allowed for purpose
  if (!isAllowedForPurpose(mimeType, purpose)) {
    const allowed = config.allowedTypes.join(", ")
    return {
      valid: false,
      error: {
        code:    "MIME_NOT_ALLOWED",
        message: `Tipe file tidak didukung untuk ${purpose.toLowerCase()}. Diizinkan: ${allowed}`,
      },
    }
  }

  // 2. File size
  if (fileSize > config.maxBytes) {
    return {
      valid: false,
      error: {
        code:     "FILE_TOO_LARGE",
        message:  `Ukuran file melebihi batas ${formatBytes(config.maxBytes)}`,
        maxBytes: config.maxBytes,
      },
    }
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: {
        code:    "FILE_TOO_LARGE",
        message: "File tidak boleh kosong",
        maxBytes: 0,
      },
    }
  }

  // 3. Extension
  const ext       = fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
  const validExts = ALLOWED_EXTENSIONS[mimeType] ?? []
  if (validExts.length > 0 && !validExts.includes(ext)) {
    return {
      valid: false,
      error: {
        code:    "INVALID_EXTENSION",
        message: `Ekstensi file tidak sesuai dengan tipe ${mimeType}`,
      },
    }
  }

  return { valid: true }
}

/**
 * Validate file buffer (magic bytes) saat confirm upload.
 * Dipanggil setelah file ada di storage, sebelum mark as READY.
 *
 * Note: untuk large video, kita tidak download seluruh file untuk validasi.
 * HEAD request di storage memverifikasi file ada dan Content-Type-nya.
 * Magic bytes validation hanya dilakukan untuk image (via thumbnail generation).
 */
export function validateBufferMimeType(
  buffer:       Buffer,
  claimedMime:  string,
): ValidationResult {
  const allAllowed = [
    ...(IMAGE_MIME_TYPES as readonly string[]),
    ...(VIDEO_MIME_TYPES as readonly string[]),
  ]

  if (!allAllowed.includes(claimedMime)) {
    return {
      valid: false,
      error: { code: "MIME_NOT_ALLOWED", message: "Tipe file tidak diizinkan" },
    }
  }

  const detected = detectMimeFromBuffer(buffer)

  // Untuk video, magic bytes detection kurang reliable — skip strict check
  if (claimedMime.startsWith("video/")) {
    return { valid: true }
  }

  if (!detected) {
    return {
      valid: false,
      error: {
        code:    "MAGIC_BYTES_MISMATCH",
        message: "Format file tidak dapat dikenali",
      },
    }
  }

  // Allow JPEG/WebP mismatch (beberapa encoder tidak sempurna)
  // tapi tidak allow image → video spoofing
  if (claimedMime.startsWith("image/") && !detected.startsWith("image/")) {
    return {
      valid: false,
      error: {
        code:    "MAGIC_BYTES_MISMATCH",
        message: "Isi file tidak sesuai dengan tipe yang dideklarasikan",
      },
    }
  }

  return { valid: true }
}
