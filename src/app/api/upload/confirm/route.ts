/**
 * POST /api/upload/confirm
 *
 * Step 3 dari 3-step upload flow.
 * Client panggil ini setelah PUT ke uploadUrl berhasil.
 *
 * Server:
 * 1. Verify file benar-benar ada di storage (fileExists check)
 * 2. Update Media record: status PENDING → READY
 * 3. Untuk IMAGE: download, process (compress/thumbnail), re-upload hasil
 * 4. Return MediaData lengkap
 *
 * Request body:
 *   { mediaId }
 *
 * Timeout concern: image processing bisa lama untuk gambar besar.
 * Mitigasi: limit download size (max 10MB untuk processing),
 * skip processing untuk file > limit → tetap simpan as-is.
 */

import { auth }                   from "@/lib/auth"
import { prisma }                 from "@/lib/prisma"
import { storage }                from "@/lib/storage"
import { getScanner }             from "@/lib/upload/virus-scan"
import { processImage }           from "@/lib/upload/image-processor"
import { isImageType, isVideoType } from "@/lib/upload/config"
import { NextRequest, NextResponse } from "next/server"
import { z }                        from "zod"

const confirmSchema = z.object({
  mediaId: z.string().min(1),
})

// Max bytes yang didownload untuk image processing
// File di atas ini: simpan as-is tanpa processing
const MAX_PROCESS_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST" } },
      { status: 400 }
    )
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Fetch media record — harus milik session user dan masih PENDING
  const media = await prisma.media.findFirst({
    where: {
      id:         parsed.data.mediaId,
      uploaderId: session.user.id,
      status:     "PENDING",
    },
  })

  if (!media) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Upload tidak ditemukan atau sudah dikonfirmasi" } },
      { status: 404 }
    )
  }

  // Verify file ada di storage
  const exists = await storage().fileExists(media.filePath)
  if (!exists) {
    // Upload gagal dari client — mark as FAILED
    await prisma.media.update({
      where: { id: media.id },
      data:  { status: "FAILED" },
    })

    return NextResponse.json(
      { error: { code: "FILE_NOT_FOUND", message: "File tidak ditemukan di storage" } },
      { status: 422 }
    )
  }

  let updateData: Parameters<typeof prisma.media.update>[0]["data"] = {
    status: "READY",
  }

  // Image processing — hanya untuk image, bukan video/gif besar
  if (isImageType(media.mimeType) && media.fileSize <= MAX_PROCESS_BYTES) {
    try {
      // Download file dari storage untuk processing
      const fileRes = await fetch(media.fileUrl)
      if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`)

      const buffer    = Buffer.from(await fileRes.arrayBuffer())
      const scanner   = getScanner()
      const scanResult = await scanner.scan(buffer, media.fileName)

      if (!scanResult.clean) {
        // File terinfeksi — hapus dari storage dan mark FAILED
        void storage().delete(media.filePath)
        await prisma.media.update({
          where: { id: media.id },
          data:  { status: "FAILED" },
        })

        return NextResponse.json(
          { error: { code: "VIRUS_DETECTED", message: "File terdeteksi berbahaya" } },
          { status: 422 }
        )
      }

      const processed = await processImage(buffer, media.mimeType)

      // Upload hasil processing (menggantikan file asli)
      const mainResult = await storage().upload({
        buffer:      processed.buffer,
        filePath:    media.filePath,
        contentType: processed.mimeType,
      })

      // Upload thumbnail jika ada
      let thumbUrl:  string | null = null
      let thumbPath: string | null = null

      if (processed.thumbBuf) {
        const thumbFilePath = media.filePath.replace(/(\.[^.]+)$/, "_thumb.webp")
        try {
          const thumbResult = await storage().upload({
            buffer:      processed.thumbBuf,
            filePath:    thumbFilePath,
            contentType: "image/webp",
          })
          thumbUrl  = thumbResult.fileUrl
          thumbPath = thumbResult.filePath
        } catch {
          // Thumbnail gagal tidak block confirm
        }
      }

      updateData = {
        status:    "READY",
        fileUrl:   mainResult.fileUrl,
        mimeType:  processed.mimeType,
        width:     processed.width,
        height:    processed.height,
        ...(thumbUrl  ? { thumbUrl  } : {}),
        ...(thumbPath ? { thumbPath } : {}),
      }
    } catch (err) {
      console.error("[Upload/Confirm] Image processing failed:", err)
      // Processing gagal — tetap mark READY dengan file asli (tidak block user)
      updateData = { status: "READY" }
    }
  } else if (isVideoType(media.mimeType)) {
    // Video: tidak download untuk processing
    // Simpan as-is, metadata (duration) diisi oleh client
    updateData = { status: "READY" }
  } else {
    updateData = { status: "READY" }
  }

  const updated = await prisma.media.update({
    where:  { id: media.id },
    data:   updateData,
    select: {
      id: true, fileUrl: true, thumbUrl: true, mimeType: true,
      fileSize: true, fileName: true, type: true, purpose: true,
      width: true, height: true, duration: true, status: true,
    },
  })

  return NextResponse.json({ data: updated }, { status: 200 })
}
