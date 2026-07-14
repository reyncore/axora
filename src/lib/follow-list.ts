/**
 * lib/follow-list.ts — Shared data fetching untuk halaman following/followers.
 *
 * Dua halaman (following + followers) punya identik logic:
 * 1. Resolve target user dari username
 * 2. Fetch halaman pertama dari follow list (cursor pagination)
 * 3. Batch-check apakah viewer sudah follow masing-masing user
 *
 * Ekstrak ke sini untuk single source of truth — perubahan pagination
 * atau batch check logic cukup di satu tempat.
 *
 * Constraint:
 * - Server-only (pakai prisma langsung)
 * - Return shape sesuai UserListItemData agar konsisten dengan API route shape
 */

import { prisma } from "./prisma"
import type { UserListItemData } from "@/components/profile/UserListItem"

const PAGE_SIZE = 20

interface FollowPageResult {
  target:         { id: string; displayName: string }
  initialData:    UserListItemData[]
  initialCursor:  string | null
  initialHasMore: boolean
}

/**
 * Fetch first page of users that `username` is following.
 * Returns null if target user not found.
 */
export async function fetchFollowingPage(
  username:   string,
  viewerId?:  string,
): Promise<FollowPageResult | null> {
  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true, displayName: true },
  })
  if (!target) return null

  const follows = await prisma.follow.findMany({
    where:   { followerId: target.id },
    take:    PAGE_SIZE + 1,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      following: {
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, isVerified: true,
          _count: { select: { followers: true, posts: true } },
        },
      },
    },
  })

  return buildResult(target, follows.map(f => f.following), follows, viewerId)
}

/**
 * Fetch first page of users following `username`.
 * Returns null if target user not found.
 */
export async function fetchFollowersPage(
  username:  string,
  viewerId?: string,
): Promise<FollowPageResult | null> {
  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true, displayName: true },
  })
  if (!target) return null

  const follows = await prisma.follow.findMany({
    where:   { followingId: target.id },
    take:    PAGE_SIZE + 1,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      follower: {
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, isVerified: true,
          _count: { select: { followers: true, posts: true } },
        },
      },
    },
  })

  return buildResult(target, follows.map(f => f.follower), follows, viewerId)
}

// ── Internal ──────────────────────────────────────────────────────────────────

type RawUser = {
  id: string; username: string; displayName: string;
  avatarUrl: string | null; isVerified: boolean;
  _count: { followers: number; posts: number }
}

type RawFollow = { id: string }

async function buildResult(
  target:    { id: string; displayName: string },
  users:     RawUser[],
  rawItems:  RawFollow[],
  viewerId?: string,
): Promise<FollowPageResult> {
  const hasMore    = users.length > PAGE_SIZE
  const trimmed    = hasMore ? users.slice(0, -1) : users
  const rawTrimmed = hasMore ? rawItems.slice(0, -1) : rawItems
  const nextCursor = hasMore ? (rawTrimmed[rawTrimmed.length - 1]?.id ?? null) : null

  // Single batch query for viewer follow status — no N+1
  const viewerFollowingSet = new Set<string>()
  if (viewerId && trimmed.length > 0) {
    const vf = await prisma.follow.findMany({
      where: {
        followerId:  viewerId,
        followingId: { in: trimmed.map(u => u.id) },
      },
      select: { followingId: true },
    })
    vf.forEach(f => viewerFollowingSet.add(f.followingId))
  }

  return {
    target,
    initialData: trimmed.map(u => ({
      id:             u.id,
      username:       u.username,
      displayName:    u.displayName,
      avatarUrl:      u.avatarUrl,
      isVerified:     u.isVerified,
      followersCount: u._count.followers,
      postsCount:     u._count.posts,
      isFollowing:    viewerFollowingSet.has(u.id),
      isOwn:          u.id === viewerId,
    })),
    initialCursor:  nextCursor,
    initialHasMore: hasMore,
  }
}
