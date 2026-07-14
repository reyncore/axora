/**
 * lib/storage.ts — Re-export dari lib/storage/index.ts
 * File ini dipertahankan untuk backward compatibility dengan import lama.
 * Semua implementasi ada di lib/storage/
 */
export { storage, getProvider } from "./storage/index"
export type { StorageProvider, UploadResult, PresignResult, DeleteResult } from "./storage/types"
