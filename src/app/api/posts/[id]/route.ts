import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { MediaType } from "@/types"

type Params = { params: Promise<{ id: string }> }

const editPostSchema = z.object({
  content: z
    .string()
    .min(1, "Post tidak boleh kosong")
    .max(500, "Maksimal 500 karakter")
    .trim(),
})

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  const { id }  = await params

  const post = await prisma.post.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, fileUrl: true, type: true, fileSize: true, mimeType: true } },
      _count: { select: { likes: true, comments: true } },
      likes:  session?.user
        ? { where: { userId: session.user.id }, select: { id: true } }
        : undefined,
    },
  })

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  const { likes = [], _count, media, ...rest } = post

  return NextResponse.json({
    data: {
      ...rest,
      createdAt:     post.createdAt.toISOString(),
      updatedAt:     post.updatedAt.toISOString(),
      media:         media.map(m => ({ ...m, type: m.type as MediaType })),
      isLiked:       likes.length > 0,
      likesCount:    _count.likes,
      commentsCount: _count.comments,
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

  const { id } = await params

  const post = await prisma.post.findUnique({
    where:  { id, isDeleted: false },
    select: { authorId: true },
  })

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  if (post.authorId !== session.user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Kamu bukan pemilik post ini" } },
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

  const parsed = editPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const updated = await prisma.post.update({
    where: { id },
    data:  { content: parsed.data.content },
    select: { id: true, content: true, updatedAt: true },
  })

  return NextResponse.json({
    data: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  const { id } = await params

  const post = await prisma.post.findUnique({
    where:  { id },
    select: { authorId: true, isDeleted: true },
  })

  if (!post || post.isDeleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Post tidak ditemukan" } },
      { status: 404 }
    )
  }

  if (post.authorId !== session.user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Kamu bukan pemilik post ini" } },
      { status: 403 }
    )
  }

  await prisma.post.update({
    where: { id },
    data:  { isDeleted: true },
  })

  return NextResponse.json({ data: { deleted: true } })
}
