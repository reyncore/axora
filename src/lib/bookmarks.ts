/**
 * lib/bookmarks.ts — Bookmark domain logic.
 *
 * Memisahkan business logic dari API route handlers agar:
 * 1. Testable tanpa HTTP layer
 * 2. Reusable di multiple API endpoints
 * 3. Single source of truth untuk constraint enforcement
 *
 * INVARIANTS yang selalu harus terpenuhi:
 * - Setiap user hanya boleh punya SATU default collection (enforced DB + application)
 * - Default collection tidak bisa dihapus
 * - Default collection slug = "semua-bookmark" (reserved)
 * - isVisible pada Bookmark hanya berefek jika collection.isPublic = true
 * - Saat koleksi dihapus, bookmark pindah ke default SEBELUM delete (atomic transaction)
 */

import { prisma } from "./prisma"
import type { BookmarkCollection, Bookmark } from "@prisma/client"

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEFAULT_COLLECTION_SLUG = "semua-bookmark"
export const DEFAULT_COLLECTION_NAME = "Semua Bookmark"
export const MAX_COLLECTIONS_PER_USER = 50
export const MAX_COLLECTION_NAME_LENGTH = 50

// ── Slug utilities ────────────────────────────────────────────────────────────

/**
 * Generate URL-safe slug dari nama koleksi.
 * Hanya karakter a-z, 0-9, dan hypen yang diizinkan.
 * Leading/trailing hyphen dihapus.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")    // strip accent marks
    .replace(/[^a-z0-9\s-]/g, "")       // remove non-alphanumeric (except space/hyphen)
    .replace(/\s+/g, "-")               // spaces → hyphens
    .replace(/-+/g, "-")                // collapse consecutive hyphens
    .replace(/^-|-$/g, "")             // trim leading/trailing hyphens
    .slice(0, 60)                        // enforce max length
    || "koleksi"                         // fallback if result is empty
}

/**
 * Cari slug yang tersedia untuk user ini.
 * Jika "inspirasi" sudah dipakai, coba "inspirasi-2", "inspirasi-3", dst.
 * MAX 10 iterasi — mencegah infinite loop pada edge case.
 */
export async function findAvailableSlug(
  userId:    string,
  baseSlug:  string,
  excludeId?: string,  // untuk update: exclude collection itu sendiri
): Promise<string> {
  for (let attempt = 0; attempt <= 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`

    const existing = await prisma.bookmarkCollection.findFirst({
      where: {
        userId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })

    if (!existing) return slug
  }

  // Fallback: append timestamp suffix — unik secara praktis
  return `${baseSlug}-${Date.now().toString(36)}`
}

// ── Default collection ────────────────────────────────────────────────────────

/**
 * Dapatkan default collection milik user.
 * Jika belum ada, create atomically via upsert.
 *
 * RACE CONDITION HANDLING:
 * Dua request bersamaan yang keduanya tidak menemukan default collection
 * akan keduanya mencoba create. DB partial unique index
 * ("one_default_collection_per_user") memastikan hanya satu yang sukses.
 * Yang kedua akan throw unique constraint error → kita catch dan retry findFirst.
 *
 * MAX 2 iterasi: 1 attempt create, 1 fallback findFirst.
 */
export async function getOrCreateDefaultCollection(
  userId: string,
): Promise<BookmarkCollection> {
  // Fast path: most of the time, default collection sudah ada
  const existing = await prisma.bookmarkCollection.findFirst({
    where: { userId, isDefault: true },
  })
  if (existing) return existing

  // Slow path: buat default collection
  try {
    return await prisma.bookmarkCollection.create({
      data: {
        userId,
        name:      DEFAULT_COLLECTION_NAME,
        slug:      DEFAULT_COLLECTION_SLUG,
        isDefault: true,
        isPublic:  false,
        // updatedAt tidak perlu di-set manual — Prisma @updatedAt handle ini
      },
    })
  } catch (err) {
    // Unique constraint violation: race condition — koleksi sudah dibuat concurrently
    // Retry findFirst untuk dapatkan yang baru saja dibuat
    if (isUniqueConstraintError(err)) {
      const created = await prisma.bookmarkCollection.findFirst({
        where: { userId, isDefault: true },
      })
      if (created) return created
    }
    throw err
  }
}

// ── Bookmark operations ───────────────────────────────────────────────────────

export interface AddBookmarkParams {
  userId:       string
  postId:       string
  collectionId: string
}

export interface AddBookmarkResult {
  bookmark:   Bookmark
  wasAlready: boolean  // true jika sudah di-bookmark sebelumnya di koleksi ini
}

/**
 * Tambah bookmark ke koleksi tertentu.
 * Idempotent: jika sudah ada, return existing tanpa error.
 *
 * Authorization: HARUS diverifikasi di caller bahwa userId === session.user.id
 * dan collectionId memang milik userId. Fungsi ini tidak re-check authorization
 * untuk menghindari N+1 query — caller yang bertanggung jawab.
 */
export async function addBookmark(
  params: AddBookmarkParams,
): Promise<AddBookmarkResult> {
  const { userId, postId, collectionId } = params

  // Check apakah sudah ada di koleksi ini
  const existing = await prisma.bookmark.findFirst({
    where: { userId, postId, collectionId },
  })

  if (existing) {
    return { bookmark: existing, wasAlready: true }
  }

  const bookmark = await prisma.bookmark.create({
    data: { userId, postId, collectionId, isVisible: false },
  })

  // Touch collection.updatedAt untuk sorting
  await prisma.bookmarkCollection.update({
    where: { id: collectionId },
    data:  { updatedAt: new Date() },
  })

  return { bookmark, wasAlready: false }
}

/**
 * Hapus bookmark dari koleksi tertentu.
 * Return true jika berhasil dihapus, false jika tidak ditemukan.
 */
export async function removeBookmark(
  userId:       string,
  postId:       string,
  collectionId: string,
): Promise<boolean> {
  const deleted = await prisma.bookmark.deleteMany({
    where: { userId, postId, collectionId },
  })
  return deleted.count > 0
}

/**
 * Cek apakah post sudah di-bookmark oleh user, di koleksi manapun.
 * Dipakai untuk render bookmark icon state di PostCard.
 *
 * Return: array collectionId yang mengandung bookmark ini.
 * Empty array = belum di-bookmark sama sekali.
 */
export async function getPostBookmarkStatus(
  userId: string,
  postId: string,
): Promise<{ collectionIds: string[]; isBookmarked: boolean }> {
  const bookmarks = await prisma.bookmark.findMany({
    where:  { userId, postId },
    select: { collectionId: true },
  })

  const collectionIds = bookmarks
    .map(b => b.collectionId)
    .filter((id): id is string => id !== null)

  return { collectionIds, isBookmarked: collectionIds.length > 0 }
}

/**
 * Batch version dari getPostBookmarkStatus untuk feed rendering.
 * Menghindari N+1 saat render banyak PostCard sekaligus.
 *
 * Return: Map<postId, isBookmarked>
 */
export async function getBatchBookmarkStatus(
  userId:  string,
  postIds: string[],
): Promise<Map<string, boolean>> {
  if (postIds.length === 0) return new Map()

  const bookmarks = await prisma.bookmark.findMany({
    where:  { userId, postId: { in: postIds } },
    select: { postId: true },
    distinct: ["postId"],
  })

  const bookmarkedSet = new Set(bookmarks.map(b => b.postId))
  return new Map(postIds.map(id => [id, bookmarkedSet.has(id)]))
}

// ── Collection operations ─────────────────────────────────────────────────────

export interface CreateCollectionParams {
  userId: string
  name:   string
}

export type CreateCollectionError =
  | { code: "NAME_EMPTY" }
  | { code: "NAME_TOO_LONG" }
  | { code: "LIMIT_REACHED" }
  | { code: "SLUG_RESERVED" }

export type CreateCollectionResult =
  | { ok: true;  collection: BookmarkCollection }
  | { ok: false; error: CreateCollectionError }

/**
 * Buat koleksi bookmark baru.
 * Validate semua constraint sebelum DB operation.
 */
export async function createCollection(
  params: CreateCollectionParams,
): Promise<CreateCollectionResult> {
  const { userId, name } = params
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return { ok: false, error: { code: "NAME_EMPTY" } }
  }
  if (trimmed.length > MAX_COLLECTION_NAME_LENGTH) {
    return { ok: false, error: { code: "NAME_TOO_LONG" } }
  }

  // Check collection limit
  const count = await prisma.bookmarkCollection.count({ where: { userId } })
  if (count >= MAX_COLLECTIONS_PER_USER) {
    return { ok: false, error: { code: "LIMIT_REACHED" } }
  }

  const baseSlug = generateSlug(trimmed)

  // Slug "semua-bookmark" reserved untuk default collection
  if (baseSlug === DEFAULT_COLLECTION_SLUG) {
    return { ok: false, error: { code: "SLUG_RESERVED" } }
  }

  const slug = await findAvailableSlug(userId, baseSlug)

  const collection = await prisma.bookmarkCollection.create({
    data: { userId, name: trimmed, slug, isDefault: false, isPublic: false },
  })

  return { ok: true, collection }
}

/**
 * Hapus koleksi.
 * ATOMIC: pindahkan semua bookmark ke default SEBELUM hapus koleksi.
 * Default collection tidak bisa dihapus.
 *
 * CONFLICT HANDLING:
 * User mungkin sudah punya bookmark post yang sama di default collection.
 * Strategi: hapus bookmark yang akan conflict (duplikat di default),
 * lalu update sisanya ke default, lalu hapus koleksi — dalam satu transaction.
 */
export async function deleteCollection(
  userId:       string,
  collectionId: string,
): Promise<{ movedCount: number }> {
  const collection = await prisma.bookmarkCollection.findFirst({
    where:  { id: collectionId, userId },
    select: { isDefault: true },
  })

  if (!collection) throw new CollectionNotFoundError()
  if (collection.isDefault) throw new CannotDeleteDefaultError()

  const defaultCollection = await getOrCreateDefaultCollection(userId)

  // Cari postId yang sudah ada di default collection (akan conflict jika dipindah)
  const bookmarksToMove = await prisma.bookmark.findMany({
    where:  { collectionId, userId },
    select: { id: true, postId: true },
  })

  if (bookmarksToMove.length === 0) {
    await prisma.bookmarkCollection.delete({ where: { id: collectionId } })
    return { movedCount: 0 }
  }

  const existingInDefault = await prisma.bookmark.findMany({
    where: {
      userId,
      collectionId: defaultCollection.id,
      postId: { in: bookmarksToMove.map(b => b.postId) },
    },
    select: { postId: true },
  })

  const conflictPostIds  = new Set(existingInDefault.map(b => b.postId))
  const conflictIds      = bookmarksToMove.filter(b => conflictPostIds.has(b.postId)).map(b => b.id)
  const moveIds          = bookmarksToMove.filter(b => !conflictPostIds.has(b.postId)).map(b => b.id)

  await prisma.$transaction([
    // Hapus bookmark yang akan conflict (duplikat sudah ada di default)
    ...(conflictIds.length > 0
      ? [prisma.bookmark.deleteMany({ where: { id: { in: conflictIds } } })]
      : []
    ),
    // Pindahkan sisanya ke default
    ...(moveIds.length > 0
      ? [prisma.bookmark.updateMany({
          where: { id: { in: moveIds } },
          data:  { collectionId: defaultCollection.id },
        })]
      : []
    ),
    // Hapus koleksi
    prisma.bookmarkCollection.delete({ where: { id: collectionId } }),
  ])

  return { movedCount: moveIds.length }
}

// ── Custom errors ─────────────────────────────────────────────────────────────

export class CollectionNotFoundError extends Error {
  constructor() { super("Collection not found or access denied"); this.name = "CollectionNotFoundError" }
}

export class CannotDeleteDefaultError extends Error {
  constructor() { super("Default collection cannot be deleted"); this.name = "CannotDeleteDefaultError" }
}

// ── Internal utilities ────────────────────────────────────────────────────────

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  )
}
