import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params
  const session      = await auth()

  const user = await prisma.user.findUnique({
    where:  { username },
    select: {
      id: true, username: true, displayName: true,
      bio: true, avatarUrl: true, bannerUrl: true,
      isVerified: true, createdAt: true,
      _count: {
        select: {
          posts:     { where: { isDeleted: false, parentId: null } },
          followers: true,
          following: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User tidak ditemukan" } },
      { status: 404 }
    )
  }

  let isFollowing = false
  if (session?.user && session.user.id !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId:  session.user.id,
          followingId: user.id,
        },
      },
      select: { id: true },
    })
    isFollowing = !!follow
  }

  return NextResponse.json({
    data: {
      ...user,
      createdAt:      user.createdAt.toISOString(),
      postsCount:     user._count.posts,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      _count:         undefined,
      isFollowing,
      isOwner:        session?.user?.id === user.id,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const { username } = await params

  if (session.user.username !== username) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Tidak bisa mengedit profil orang lain" } },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request body tidak valid" } },
      { status: 400 }
    )
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const updated = await prisma.user.update({
    where:  { id: session.user.id },
    data:   parsed.data,
    select: {
      id: true, username: true, displayName: true,
      bio: true, avatarUrl: true, bannerUrl: true,
    },
  })

  return NextResponse.json({ data: updated })
}
