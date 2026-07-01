/**
 * lib/storage.ts — Storage provider abstraction.
 *
 * Mendukung dua provider via env var STORAGE_PROVIDER:
 * - "r2" (default)  → Cloudflare R2, S3-compatible
 * - "supabase"      → Supabase Storage, REST API langsung (tanpa SDK tambahan)
 *
 * KENAPA ABSTRAKSI INI:
 * upload/route.ts tidak perlu tahu provider mana yang dipakai — hanya
 * panggil uploadFile() dan terima URL publik. Validasi (MIME sniffing,
 * size limit, rate limit) tetap di route.ts karena itu application-level
 * concern, bukan storage-level.
 *
 * SWITCH PROVIDER:
 * Ubah STORAGE_PROVIDER di environment variable lalu redeploy
 * (Vercel perlu redeploy untuk pickup env var baru).
 */

export interface UploadResult {
  url: string
}

export interface UploadParams {
  buffer:      Buffer
  filename:    string   // path relatif, contoh: "uploads/userId/uuid.jpg"
  contentType: string
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorageConfigError"
  }
}

// ── Provider: Cloudflare R2 (S3-compatible) ───────────────────────────────────

async function uploadToR2(params: UploadParams): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucket    = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const pubUrl    = process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (!accountId || !accessKey || !secretKey || !bucket || !pubUrl) {
    throw new StorageConfigError("Cloudflare R2 environment variables tidak lengkap")
  }

  const client = new S3Client({
    region:      "auto",
    endpoint:    `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  await client.send(new PutObjectCommand({
    Bucket:       bucket,
    Key:          params.filename,
    Body:         params.buffer,
    ContentType:  params.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }))

  return { url: `${pubUrl}/${params.filename}` }
}

// ── Provider: Supabase Storage ────────────────────────────────────────────────

/**
 * Upload via Supabase Storage REST API langsung (tanpa @supabase/supabase-js)
 * agar tidak menambah dependency — operasi upload cukup sederhana untuk
 * dilakukan dengan fetch biasa.
 *
 * Endpoint: POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}
 * Auth: service_role key (bypass RLS, hanya boleh dipakai di server)
 *
 * PENTING: gunakan SUPABASE_SERVICE_ROLE_KEY, BUKAN anon key.
 * Service role key punya akses penuh — jangan pernah expose ke client/browser.
 *
 * SETUP YANG DIPERLUKAN di Supabase Dashboard sebelum pakai provider ini:
 * 1. Storage → New bucket → nama "axora-uploads" (atau sesuai SUPABASE_STORAGE_BUCKET)
 * 2. Set bucket sebagai Public (agar URL hasil upload bisa diakses langsung)
 */
async function uploadToSupabase(params: UploadParams): Promise<UploadResult> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket      = process.env.SUPABASE_STORAGE_BUCKET ?? "axora-uploads"

  if (!supabaseUrl || !serviceKey) {
    throw new StorageConfigError("Supabase Storage environment variables tidak lengkap")
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${params.filename}`

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type":  params.contentType,
      "x-upsert":      "false", // tolak jika filename sudah ada — seharusnya tidak terjadi (UUID-based)
    },
    body: new Uint8Array(params.buffer),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage upload gagal (${res.status}): ${body.slice(0, 200)}`)
  }

  // Public URL Supabase Storage mengikuti pola tetap untuk bucket public
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${params.filename}`

  return { url: publicUrl }
}

// ── Dispatcher ─────────────────────────────────────────────────────────────────

type StorageProvider = "r2" | "supabase"

function getProvider(): StorageProvider {
  const raw = process.env.STORAGE_PROVIDER?.toLowerCase()
  return raw === "supabase" ? "supabase" : "r2" // default ke r2 untuk backward compatibility
}

/**
 * Upload file ke storage provider yang aktif (ditentukan via STORAGE_PROVIDER).
 * Caller (upload/route.ts) tidak perlu tahu detail provider.
 */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  const provider = getProvider()

  switch (provider) {
    case "supabase":
      return uploadToSupabase(params)
    case "r2":
      return uploadToR2(params)
  }
}

/** Untuk logging/debugging — provider mana yang sedang aktif */
export function getActiveProvider(): StorageProvider {
  return getProvider()
}
