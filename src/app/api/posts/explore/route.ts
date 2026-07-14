/**
 * GET /api/posts/explore — Scored explore feed.
 *
 * ALGORITHM: score = (likes × 3) + (comments × 5) + recency_bonus
 *
 * Recency bonus:
 *   < 1h  → +100  |  < 6h  → +60
 *   < 24h → +30   |  < 72h → +10  |  older → +0
 *
 * PAGINATION: page-based, bukan cursor.
 * Score berubah seiring waktu — cursor tidak stabil untuk scored feed.
 * Page 1 → top 20, Page 2 → next 20, dst.
 */

export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import type { MediaType } from "@/types"

// ── Scoring ───────────────────────────────────────────────────────────────────

const RECENCY_TIERS = [
  { maxAgeMs:  1 * 3_600_000, bonus: 100 },
  { maxAgeMs:  6 * 3_600_000, bonus:  60 },
  { maxAgeMs: 24 * 3_600_000, bonus:  30 },
  { maxAgeMs: 72 * 3_600_000, bonus:  10 },
] as const

function recencyBonus(createdAt: Date): number {
  const age = Date.now() - createdAt.getTime()
  return RECENCY_TIERS.find(t => age < t.maxAgeMs)?.bonus ?? 0
}

function computeScore(likes: number, comments: number, createdAt: Date): number {
  return (likes * 3) + (comments * 5) + recencyBonus(createdAt)
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const limit  = Math.min(Number(searchParams.get("limit") ?? 20), 50)
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1))
  const cutoff = new Date(Date.now() - 7 * 24 * 3_600_000)

  // Ambil pool 10× untuk scoring — capped agar tidak OOM
  const pool = await prisma.post.findMany({
    where: {
      isDeleted: false,
      parentId:  null,
      createdAt: { gte: cutoff },
    },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, fileUrl: true, type: true, fileSize: true, mimeType: true } },
      _count: { select: { likes: true, comments: true } },
      likes:  { where: { userId: session.user.id }, select: { id: true } },
    },
    take:    Math.min(limit * 10, 500),
    orderBy: { createdAt: "desc" },
  })

  const start  = (page - 1) * limit
  const scored = pool
    .map(({ likes, _count, media, ...p }) => ({
      score: computeScore(_count.likes, _count.comments, p.createdAt),
      data: {
        ...p,
        createdAt:     p.createdAt.toISOString(),
        updatedAt:     p.updatedAt.toISOString(),
        media:         media.map(m => ({ ...m, type: m.type as MediaType })),
        isLiked:       likes.length > 0,
        likesCount:    _count.likes,
        commentsCount: _count.comments,
        currentUserId: session.user.id,
      },
    }))
    .sort((a, b) => b.score - a.score)

  const pageItems = scored.slice(start, start + limit)
  const hasMore   = scored.length > start + limit

  return NextResponse.json({
    data: pageItems.map(s => s.data),
    meta: {
      page,
      hasMore,
      cursor: null,   // null untuk kompatibilitas dengan FeedApiResponse
    },
  })
}
