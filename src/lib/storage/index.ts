/**
 * lib/storage/index.ts — Public API untuk storage layer.
 *
 * Cara pakai:
 *   import { storage } from "@/lib/storage"
 *   const result = await storage().presignUpload({ ... })
 *
 * storage() adalah alias untuk getProvider() yang return StorageProvider singleton.
 */

export { getProvider, getProvider as storage } from "./registry"
export type { StorageProvider, UploadResult, PresignResult, DeleteResult } from "./types"
