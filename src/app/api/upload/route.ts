/**
 * POST /api/upload — server-side upload untuk file kecil (avatar, cover).
 *
 * Untuk large files (post media, DM attachments), gunakan pre-signed flow:
 *   POST /api/upload/presign → PUT {uploadUrl} → POST /api/upload/confirm
 *
 * Endpoint ini tetap dipertahankan untuk komponen yang upload image kecil
 * secara server-side (avatar <5MB, cover <8MB) karena lebih simple
 * dan tidak memerlukan 3-step flow.
 */

import { auth }          from "@/lib/auth"
import { prisma }        from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { storage }       from "@/lib/storage"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID }    from "crypto"

const MAX_SIZE_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
}

function detectMime(buf: Buffer): string | null {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg"
  if (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47)
    return "image/png"
  if (buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp"
  if (buf.length >= 6) {
    const h = buf.subarray(0, 6).toString("ascii")
    if (h === "GIF87a" || h === "GIF89a") return "image/gif"
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.upload(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "File diperlukan" } }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Ukuran file maksimal 5MB" } },
      { status: 413 }
    )
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const mimeType = detectMime(buffer)
  if (!mimeType || !ALLOWED_MIME[mimeType]) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE_TYPE", message: "Hanya JPEG, PNG, WEBP, GIF yang diizinkan" } },
      { status: 415 }
    )
  }

  const ext      = ALLOWED_MIME[mimeType]!
  const filePath = `uploads/${session.user.id}/${randomUUID()}.${ext}`

  let fileUrl: string
  try {
    const result = await storage().upload({ buffer, filePath, contentType: mimeType })
    fileUrl = result.fileUrl
  } catch (err) {
    console.error("[Upload] Storage error:", err)
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Gagal mengupload file" } },
      { status: 500 }
    )
  }

  const media = await prisma.media.create({
    data: {
      uploaderId: session.user.id,
      fileUrl,
      filePath,
      fileName:   file.name,
      mimeType,
      fileSize:   file.size,
      type:       "IMAGE",
      status:     "READY",
      purpose:    "AVATAR",
    },
    select: { id: true, fileUrl: true, type: true, fileSize: true },
  })

  // Kembalikan { data: { id, url } } untuk kompatibilitas dengan komponen lama
  return NextResponse.json({ data: { ...media, url: media.fileUrl } }, { status: 201 })
}
