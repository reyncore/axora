/**
 * lib/upload/image-processor.ts — Image processing menggunakan sharp.
 *
 * Operasi yang dilakukan:
 * 1. Auto-compress JPEG/WebP dengan quality 85 (sweet spot: quality vs size)
 * 2. Resize jika terlalu besar (max 2048px di sisi terpanjang)
 * 3. Strip EXIF metadata (privacy: lokasi GPS, device info)
 * 4. Generate thumbnail 400x400 (cover fit, untuk grid preview)
 * 5. Extract width + height untuk metadata DB
 *
 * GIF: tidak diproses (animated GIF butuh special handling) — pass through
 * Video: tidak diproses di sini (lihat video-metadata.ts)
 */

const MAX_DIMENSION  = 2048
const THUMB_SIZE     = 400
const JPEG_QUALITY   = 85
const WEBP_QUALITY   = 85

export interface ProcessedImage {
  buffer:    Buffer
  thumbBuf:  Buffer | null
  width:     number
  height:    number
  mimeType:  string  // bisa berubah jika di-convert (JPEG → WebP)
}

export async function processImage(
  inputBuffer: Buffer,
  inputMime:   string,
): Promise<ProcessedImage> {
  // Dynamic import — sharp adalah heavy native module
  // Lazy load hanya saat diperlukan, tidak mempengaruhi cold start untuk request non-upload
  const sharp = (await import("sharp")).default

  const image    = sharp(inputBuffer, { failOn: "error" })
  const metadata = await image.metadata()

  const origWidth  = metadata.width  ?? 0
  const origHeight = metadata.height ?? 0

  // GIF pass-through — animated GIF tidak bisa diproses dengan sharp biasa
  if (inputMime === "image/gif") {
    return {
      buffer:   inputBuffer,
      thumbBuf: null,
      width:    origWidth,
      height:   origHeight,
      mimeType: inputMime,
    }
  }

  // Calculate resize dimensions
  let targetWidth  = origWidth
  let targetHeight = origHeight

  if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / origWidth, MAX_DIMENSION / origHeight)
    targetWidth  = Math.round(origWidth  * ratio)
    targetHeight = Math.round(origHeight * ratio)
  }

  // Process main image
  // Output format: JPEG untuk JPEG, WebP untuk PNG/WebP (better compression)
  const isJpeg   = inputMime === "image/jpeg"
  const pipeline = image
    .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
    .rotate()          // auto-rotate berdasarkan EXIF orientation
    .withMetadata({})  // strip semua EXIF kecuali orientation (privacy)

  let buffer: Buffer
  let outputMime: string

  if (isJpeg) {
    buffer     = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
    outputMime = "image/jpeg"
  } else {
    buffer     = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer()
    outputMime = "image/webp"
  }

  // Generate thumbnail
  let thumbBuf: Buffer | null = null
  try {
    thumbBuf = await sharp(inputBuffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "centre" })
      .rotate()
      .withMetadata({})
      .webp({ quality: 70 })
      .toBuffer()
  } catch {
    // Thumbnail gagal tidak boleh block main upload
    thumbBuf = null
  }

  return {
    buffer,
    thumbBuf,
    width:    targetWidth,
    height:   targetHeight,
    mimeType: outputMime,
  }
}

/** Extract dimensions tanpa processing — untuk konfirmasi image yang sudah ada di storage */
export async function extractImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const sharp    = (await import("sharp")).default
    const metadata = await sharp(buffer).metadata()
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height }
    }
    return null
  } catch {
    return null
  }
}
