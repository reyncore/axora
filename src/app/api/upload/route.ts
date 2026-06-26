import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { uploadFile, StorageConfigError } from "@/lib/storage"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
}

/**
 * Deteksi MIME type dari magic bytes — jangan percaya Content-Type header.
 * Client bisa mengirim file berbahaya dengan Content-Type yang dipalsukan.
 */
function detectMimeType(buf: Buffer): AllowedMimeType | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    return "image/jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) {
    return "image/png"
  }
  // WEBP: RIFF????WEBP
  if (buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp"
  }
  // GIF87a or GIF89a
  if (buf.length >= 6) {
    const header = buf.subarray(0, 6).toString("ascii")
    if (header === "GIF87a" || header === "GIF89a") return "image/gif"
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const rl = await rateLimits.upload(session.user.id)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Form data tidak valid" } },
      { status: 400 }
    )
  }

  const file = formData.get("file")

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "File diperlukan" } },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "File tidak boleh kosong" } },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Ukuran file maksimal 5MB" } },
      { status: 413 }
    )
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const mimeType = detectMimeType(buffer)

  if (!mimeType) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE_TYPE", message: "Hanya JPEG, PNG, WEBP, dan GIF yang diizinkan" } },
      { status: 415 }
    )
  }

  const ext      = MIME_TO_EXT[mimeType]
  const filename = `uploads/${session.user.id}/${randomUUID()}.${ext}`

  let uploadResult: { url: string }
  try {
    uploadResult = await uploadFile({
      buffer,
      filename,
      contentType: mimeType,
    })
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("Storage configuration error:", err.message)
      return NextResponse.json(
        { error: { code: "SERVER_ERROR", message: "File storage belum dikonfigurasi" } },
        { status: 503 }
      )
    }
    console.error("Upload error:", err)
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Gagal mengupload file, coba lagi" } },
      { status: 500 }
    )
  }

  const media = await prisma.media.create({
    data: {
      url:        uploadResult.url,
      type:       "IMAGE",
      size:       file.size,
      uploaderId: session.user.id,
    },
    select: { id: true, url: true, type: true, size: true },
  })

  return NextResponse.json({ data: media }, { status: 201 })
}
