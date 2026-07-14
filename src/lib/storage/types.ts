/**
 * Storage provider contract.
 * Semua provider harus implement interface ini — business logic
 * tidak perlu tahu provider mana yang aktif.
 */

export interface UploadResult {
  fileUrl:  string  // public URL untuk akses file
  filePath: string  // path di bucket (untuk delete/reference)
}

export interface PresignResult {
  uploadUrl: string             // URL untuk PUT request langsung dari client
  filePath:  string             // path yang akan dipakai di bucket
  headers?:  Record<string, string>  // required headers untuk PUT (e.g. Content-Type)
  expiresAt: number             // Unix timestamp ms — kapan pre-signed URL expire
}

export interface DeleteResult {
  success: boolean
  error?:  string
}

export interface StorageProvider {
  /**
   * Upload file dari server (untuk thumbnail, avatar processing).
   * Untuk large file gunakan presignUpload() agar tidak melalui server.
   */
  upload(params: {
    buffer:      Buffer
    filePath:    string
    contentType: string
  }): Promise<UploadResult>

  /**
   * Generate pre-signed URL — client upload langsung ke storage.
   * Server tidak touch file sama sekali.
   */
  presignUpload(params: {
    filePath:    string
    contentType: string
    fileSize:    number
    expiresIn?:  number  // detik, default 900 (15 menit)
  }): Promise<PresignResult>

  /**
   * Hapus file dari storage.
   * Selalu return DeleteResult (tidak throw) — caller decide error handling.
   */
  delete(filePath: string): Promise<DeleteResult>

  /**
   * Public URL untuk file yang bisa diakses siapapun.
   * Gunakan untuk avatar, post media (public content).
   */
  getPublicUrl(filePath: string): string

  /**
   * Signed URL dengan expiry untuk private content.
   * Gunakan untuk DM attachments yang seharusnya tidak public.
   */
  getSignedUrl(params: {
    filePath:  string
    expiresIn: number  // detik
  }): Promise<string>

  /**
   * Verifikasi file ada di storage (HEAD request).
   * Dipakai saat confirm upload untuk validasi server-side.
   */
  fileExists(filePath: string): Promise<boolean>
}
