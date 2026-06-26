/**
 * lib/search.ts — Centralized full-text search.
 *
 * STRATEGY: FTS dengan tsvector + GIN index (O log n).
 * FALLBACK: ILIKE jika migration belum diapply — zero-downtime rollout.
 * SAFETY: $queryRaw dengan parameterized queries — no SQL injection.
 * TYPES: Semua strict — tidak ada any.
 */

import { prisma } from "./prisma"
import type { PostData, MediaType } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchUser {
  id:             string
  username:       string
  displayName:    string
  bio:            string | null
  avatarUrl:      string | null
  isVerified:     boolean
  isFollowing:    boolean
  isOwn:          boolean
  followersCount: number
  postsCount:     number
}

export interface SearchOptions {
  currentUserId?: string
  limit?:         number
}

export interface TrendingHashtag {
  tag:        string
  post_count: number
}

// Raw result shapes — PostgreSQL COUNT() returns bigint, needs Number() conversion
interface RawUserResult {
  id:             string
  username:       string
  displayName:    string
  bio:            string | null
  avatarUrl:      string | null
  isVerified:     boolean
  followersCount: bigint
  postsCount:     bigint
  rank:           number
}

interface RawPostResult {
  id:        string
  content:   string
  authorId:  string
  parentId:  string | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  rank:      number
}

// ── FTS availability cache ────────────────────────────────────────────────────

/**
 * Cache apakah FTS column sudah tersedia di database.
 * Null = belum dicek, true/false = hasil cek.
 * Re-check tidak terjadi setelah pertama kali — aman untuk lifetime server process.
 */
let ftsAvailable: boolean | null = null

async function isFtsAvailable(): Promise<boolean> {
  if (ftsAvailable !== null) return ftsAvailable

  let result: boolean
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'Post'
          AND  column_name  = 'searchVector'
      ) AS exists
    `
    result = rows[0]?.exists ?? false
  } catch {
    result = false
  }

  // Assign ke cache module-level setelah narrowing lokal selesai
  ftsAvailable = result
  return result
}

// ── Query sanitization ────────────────────────────────────────────────────────

/**
 * Sanitasi query sebelum masuk ke websearch_to_tsquery / to_tsquery.
 * websearch_to_tsquery sudah handle karakter khusus dengan aman,
 * tapi kita tetap limit panjang dan strip karakter HTML untuk defense-in-depth.
 */
function sanitizeQuery(raw: string): string {
  return raw
    .trim()
    .slice(0, 100)
    .replace(/[<>"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// ── User search ───────────────────────────────────────────────────────────────

export async function searchUsers(
  rawQuery: string,
  options:  SearchOptions = {},
): Promise<SearchUser[]> {
  const { currentUserId, limit = 20 } = options

  const term = rawQuery.startsWith("#") ? rawQuery.slice(1) : rawQuery
  const q    = sanitizeQuery(term)
  if (!q) return []

  const useFts   = await isFtsAvailable()
  const rawUsers = useFts
    ? await searchUsersFts(q, limit)
    : await searchUsersLike(q, limit)

  if (rawUsers.length === 0) return []

  // Resolve follow status dalam satu query — menghindari N+1
  const followingSet = new Set<string>()
  if (currentUserId) {
    const rows = await prisma.follow.findMany({
      where: {
        followerId:  currentUserId,
        followingId: { in: rawUsers.map(u => u.id) },
      },
      select: { followingId: true },
    })
    rows.forEach(r => followingSet.add(r.followingId))
  }

  return rawUsers.map(u => ({
    id:             u.id,
    username:       u.username,
    displayName:    u.displayName,
    bio:            u.bio,
    avatarUrl:      u.avatarUrl,
    isVerified:     u.isVerified,
    followersCount: Number(u.followersCount),
    postsCount:     Number(u.postsCount),
    isFollowing:    followingSet.has(u.id),
    isOwn:          u.id === currentUserId,
  }))
}

async function searchUsersFts(term: string, limit: number): Promise<RawUserResult[]> {
  // prefix match: "reza" → matches "reza", "rezanur", "rezaputra"
  const q = `${term}:*`

  return prisma.$queryRaw<RawUserResult[]>`
    SELECT
      u.id,
      u.username,
      u."displayName",
      u.bio,
      u."avatarUrl",
      u."isVerified",
      COUNT(DISTINCT f.id)                                            AS "followersCount",
      COUNT(DISTINCT p.id)                                            AS "postsCount",
      ts_rank(u."searchVector", to_tsquery('simple', ${q}))          AS rank
    FROM      "User"   u
    LEFT JOIN "Follow" f ON f."followingId" = u.id
    LEFT JOIN "Post"   p ON p."authorId"    = u.id
                        AND p."isDeleted"   = false
    WHERE u."searchVector" @@ to_tsquery('simple', ${q})
    GROUP BY
      u.id, u.username, u."displayName", u.bio,
      u."avatarUrl", u."isVerified", u."searchVector"
    ORDER BY
      rank DESC,
      COUNT(DISTINCT f.id) DESC
    LIMIT ${limit}
  `
}

async function searchUsersLike(term: string, limit: number): Promise<RawUserResult[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username:    { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { bio:         { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, username: true, displayName: true,
      bio: true, avatarUrl: true, isVerified: true,
      _count: { select: { followers: true, posts: true } },
    },
    orderBy: { followers: { _count: "desc" } },
    take: limit,
  })

  return users.map(u => ({
    id:             u.id,
    username:       u.username,
    displayName:    u.displayName,
    bio:            u.bio,
    avatarUrl:      u.avatarUrl,
    isVerified:     u.isVerified,
    followersCount: BigInt(u._count.followers),
    postsCount:     BigInt(u._count.posts),
    rank:           0,
  }))
}

// ── Post search ───────────────────────────────────────────────────────────────

export async function searchPosts(
  rawQuery: string,
  options:  SearchOptions = {},
): Promise<PostData[]> {
  const { currentUserId, limit = 20 } = options

  const term = rawQuery.startsWith("#") ? rawQuery.slice(1) : rawQuery
  const q    = sanitizeQuery(term)
  if (!q) return []

  const useFts    = await isFtsAvailable()
  const rawPosts  = useFts
    ? await searchPostsFts(q, limit)
    : await searchPostsLike(q, limit)

  if (rawPosts.length === 0) return []

  // Pertahankan urutan rank dari FTS — ambil data lengkap via Prisma
  const postIds = rawPosts.map(p => p.id)
  const rankMap = new Map(rawPosts.map((p, i) => [p.id, i]))

  const full = await prisma.post.findMany({
    where: { id: { in: postIds } },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, url: true, type: true, size: true } },
      _count: { select: { likes: true, comments: true } },
      likes:  currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : undefined,
    },
  })

  // Sort sesuai FTS rank — findMany tidak menjamin urutan WHERE id IN (...)
  return full
    .sort((a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999))
    .map(({ likes = [], _count, media, ...p }) => ({
      ...p,
      createdAt:     p.createdAt.toISOString(),
      updatedAt:     p.updatedAt.toISOString(),
      media:         media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       likes.length > 0,
      likesCount:    _count.likes,
      commentsCount: _count.comments,
      currentUserId,
    }))
}

async function searchPostsFts(term: string, limit: number): Promise<RawPostResult[]> {
  const q = `${term}:*`

  return prisma.$queryRaw<RawPostResult[]>`
    SELECT
      id,
      content,
      "authorId",
      "parentId",
      "isDeleted",
      "createdAt",
      "updatedAt",
      ts_rank("searchVector", to_tsquery('simple', ${q})) AS rank
    FROM  "Post"
    WHERE "searchVector" @@ to_tsquery('simple', ${q})
      AND "isDeleted" = false
      AND "parentId"  IS NULL
    ORDER BY
      rank DESC,
      "createdAt" DESC
    LIMIT ${limit}
  `
}

async function searchPostsLike(term: string, limit: number): Promise<RawPostResult[]> {
  const posts = await prisma.post.findMany({
    where: {
      isDeleted: false,
      parentId:  null,
      content:   { contains: term, mode: "insensitive" },
    },
    select: {
      id: true, content: true, authorId: true,
      parentId: true, isDeleted: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return posts.map(p => ({ ...p, rank: 0 }))
}

// ── Trending hashtags ─────────────────────────────────────────────────────────

export async function getTrendingHashtags(limit = 10): Promise<TrendingHashtag[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tag: string; post_count: bigint }>>`
      SELECT tag, post_count
      FROM   "TrendingHashtag"
      ORDER  BY post_count DESC
      LIMIT  ${limit}
    `
    return rows.map(r => ({ tag: r.tag, post_count: Number(r.post_count) }))
  } catch {
    return getTrendingFallback(limit)
  }
}

async function getTrendingFallback(limit: number): Promise<TrendingHashtag[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const posts  = await prisma.post.findMany({
    where:  { createdAt: { gte: cutoff }, isDeleted: false },
    select: { content: true },
    take:   1000,
  })

  const tagCount = new Map<string, number>()
  for (const { content } of posts) {
    for (const match of content.matchAll(/#(\w{2,30})/g)) {
      const tag = match[1]?.toLowerCase()
      if (!tag) continue
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    }
  }

  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, post_count]) => ({ tag, post_count }))
}

/**
 * Refresh materialized view trending hashtags.
 * Fire-and-forget — panggil setelah post dibuat.
 * Gagal tidak crash app — view masih tampilkan data sebelumnya.
 */
export async function refreshTrendingHashtags(): Promise<void> {
  try {
    await prisma.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY "TrendingHashtag"
    `
  } catch {
    // Intentionally silent — jika view belum ada, tidak perlu error
  }
}
