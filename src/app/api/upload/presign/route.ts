/**
 * POST /api/upload/presign
 *
 * Step 1 dari 3-step upload flow.
 * Server generate pre-signed URL → client upload langsung ke storage.
 * File tidak melalui server Vercel sama sekali.
 *
 * Request body:
 *   { fileName, mimeType, fileSize, purpose }
 *
 * Response:
 *   { mediaId, uploadUrl, headers, filePath, expiresAt }
 */

import { auth }                    from "@/lib/auth"
import { prisma }                  from "@/lib/prisma"
import { rateLimits, rateLimitResponse } from "@/lib/ratelimit"
import { storage }                 from "@/lib/storage"
import type { PresignResult }       from "@/lib/storage"
import { validateUploadRequest }   from "@/lib/upload/validation"
import {
  UPLOAD_CONFIG,
  getMediaTypeFromMime,
  PRESIGN_EXPIRES_IN,
} from "@/lib/upload/config"
import { NextRequest, NextResponse }     from "next/server"
import { z }                             from "zod"
import { randomUUID }                    from "crypto"
import type { MediaPurpose }             from "@prisma/client"

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  purpose:  z.enum(["AVATAR", "COVER", "POST", "MESSAGE", "COMMENT"]),
})

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

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  const parsed = presignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { fileName, mimeType, fileSize, purpose } = parsed.data

  // Validasi request
  const validation = validateUploadRequest({ fileName, mimeType, fileSize, purpose })
  if (!validation.valid) {
    return NextResponse.json(
      { error: { code: validation.error.code, message: validation.error.message } },
      { status: 422 }
    )
  }

  // Generate unique file path — tidak pakai nama asli user (security)
  const ext      = fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
  const uuid     = randomUUID()
  const prefix   = UPLOAD_CONFIG[purpose as MediaPurpose].pathPrefix
  const filePath = `${prefix}/${session.user.id}/${uuid}${ext}`

  // Generate pre-signed URL dari storage provider
  let presign: PresignResult
  try {
    presign = await storage().presignUpload({
      filePath,
      contentType: mimeType,
      fileSize,
      expiresIn:   PRESIGN_EXPIRES_IN,
    })
  } catch (err) {
    console.error("[Upload/Presign] Storage error:", err)
    return NextResponse.json(
      { error: { code: "STORAGE_ERROR", message: "Gagal menyiapkan upload" } },
      { status: 503 }
    )
  }

  // Buat Media record dengan status PENDING
  const media = await prisma.media.create({
    data: {
      uploaderId: session.user.id,
      fileUrl:    storage().getPublicUrl(filePath),
      filePath,
      fileName,
      mimeType,
      fileSize,
      type:       getMediaTypeFromMime(mimeType),
      status:     "PENDING",
      purpose:    purpose as MediaPurpose,
    },
    select: { id: true },
  })

  return NextResponse.json({
    data: {
      mediaId:   media.id,
      uploadUrl: presign.uploadUrl,
      headers:   presign.headers,
      filePath:  presign.filePath,
      expiresAt: presign.expiresAt,
    },
  })
}
