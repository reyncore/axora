/**
 * Storage provider registry.
 * Pilih provider berdasarkan STORAGE_PROVIDER env var.
 * Default: r2
 *
 * Tambah provider baru:
 * 1. Buat class di providers/
 * 2. Implement StorageProvider interface
 * 3. Tambah case di getProvider()
 */

import type { StorageProvider } from "./types"

type ProviderName = "r2" | "supabase"

let _instance: StorageProvider | null = null

export function getProvider(): StorageProvider {
  if (_instance) return _instance

  const name = (process.env.STORAGE_PROVIDER?.toLowerCase() ?? "r2") as ProviderName

  switch (name) {
    case "r2": {
      const { R2StorageProvider } = require("./providers/r2") as {
        R2StorageProvider: new () => StorageProvider
      }
      _instance = new R2StorageProvider()
      break
    }
    case "supabase": {
      // Supabase tidak support pre-signed PUT — hanya untuk download
      // Redirect ke R2 untuk upload
      console.warn(
        "[Storage] Supabase Storage tidak support pre-signed PUT upload. " +
        "Menggunakan R2 untuk upload. Set STORAGE_PROVIDER=r2 untuk menghilangkan warning ini."
      )
      const { R2StorageProvider } = require("./providers/r2") as {
        R2StorageProvider: new () => StorageProvider
      }
      _instance = new R2StorageProvider()
      break
    }
    default:
      throw new Error(`[Storage] Unknown provider: "${name}". Valid: r2, supabase`)
  }

  return _instance
}

/** Reset singleton — untuk testing */
export function resetProvider(): void {
  _instance = null
}
