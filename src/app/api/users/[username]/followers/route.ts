import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session          = await auth()
  const { username }     = await params
  const { searchParams } = req.nextUrl

  const cursor     = searchParams.get("cursor")
  const limitParam = Number(searchParams.get("limit") ?? 20)
  const limit      = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 20

  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true },
  })

  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } },
      { status: 404 }
    )
  }

  // Ambil daftar user yang follow target
  const follows = await prisma.follow.findMany({
    where:  { followingId: target.id },
    take:   limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id:        true,
      createdAt: true,
      follower: {
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, isVerified: true,
          _count: { select: { followers: true, posts: true } },
        },
      },
    },
  })

  const hasMore    = follows.length > limit
  const items      = hasMore ? follows.slice(0, -1) : follows
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  // Batch check follow status dari viewer ke setiap follower
  const viewerFollowingSet = new Set<string>()
  if (session?.user) {
    const viewerFollows = await prisma.follow.findMany({
      where: {
        followerId:  session.user.id,
        followingId: { in: items.map(f => f.follower.id) },
      },
      select: { followingId: true },
    })
    viewerFollows.forEach(f => viewerFollowingSet.add(f.followingId))
  }

  return NextResponse.json({
    data: items.map(f => ({
      followId:   f.id,
      followedAt: f.createdAt.toISOString(),
      user: {
        ...f.follower,
        followersCount: f.follower._count.followers,
        postsCount:     f.follower._count.posts,
        _count:         undefined,
        isFollowing:    viewerFollowingSet.has(f.follower.id),
        isOwn:          session?.user?.id === f.follower.id,
      },
    })),
    meta: { cursor: nextCursor, hasMore },
  })
}
