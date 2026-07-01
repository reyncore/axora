import { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PostCard } from "@/components/feed/PostCard"
import { CollectionHeader } from "./CollectionHeader"
import { CollectionBookmarkList } from "./CollectionBookmarkList"
import type { PostData } from "@/types"
import type { MediaType } from "@/types"

interface Props {
  params: Promise<{ username: string; slug: string }>
}

const PAGE_SIZE = 20

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params
  const col = await prisma.bookmarkCollection.findFirst({
    where: {
      slug,
      user: { username },
    },
    select: { name: true, isPublic: true },
  })
  if (!col) return { title: "Koleksi tidak ditemukan" }

  return {
    title: `${col.name} — Koleksi @${username}`,
    robots: col.isPublic
      ? { index: true, follow: true }
      : { index: false, follow: false },
  }
}

export const dynamic = "force-dynamic"

export default async function CollectionPage({ params }: Props) {
  const { username, slug } = await params
  const session            = await auth()

  const collection = await prisma.bookmarkCollection.findFirst({
    where: { slug, user: { username } },
    include: {
      user:     { select: { id: true, username: true, displayName: true } },
      _count:   { select: { bookmarks: true } },
    },
  })

  if (!collection) notFound()

  const isOwner = session?.user?.id === collection.userId

  // Non-owner hanya bisa lihat koleksi publik
  if (!isOwner && !collection.isPublic) notFound()

  // Fetch initial bookmarks
  const rawBookmarks = await prisma.bookmark.findMany({
    where: {
      collectionId: collection.id,
      ...(!isOwner ? { isVisible: true } : {}),
    },
    take:    PAGE_SIZE + 1,
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true, username: true,
              displayName: true, avatarUrl: true, isVerified: true,
            },
          },
          media:  { select: { id: true, url: true, type: true, size: true } },
          _count: { select: { likes: true, comments: true } },
          likes:  session?.user
            ? { where: { userId: session.user.id }, select: { id: true } }
            : undefined,
        },
      },
    },
  })

  const hasMore    = rawBookmarks.length > PAGE_SIZE
  const items      = hasMore ? rawBookmarks.slice(0, -1) : rawBookmarks
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  const initialPosts: Array<{
    bookmarkId: string
    isVisible:  boolean
    post:       PostData
  }> = items
    .filter(b => !b.post.isDeleted || isOwner)
    .map(b => ({
      bookmarkId: b.id,
      isVisible:  b.isVisible,
      post: {
        id:           b.post.id,
        content:      b.post.content,
        createdAt:    b.post.createdAt.toISOString(),
        updatedAt:    b.post.updatedAt.toISOString(),
        parentId:     b.post.parentId,
        isDeleted:    b.post.isDeleted,
        author:       b.post.author,
        media:        b.post.media.map(m => ({ ...m, type: m.type as MediaType })),
        isLiked:      (b.post.likes?.length ?? 0) > 0,
        isBookmarked: true, // kalau di koleksi ini, pasti sudah di-bookmark
        likesCount:   b.post._count.likes,
        commentsCount: b.post._count.comments,
        currentUserId: session?.user?.id,
      },
    }))

  return (
    <div>
      <CollectionHeader
        collection={{
          id:           collection.id,
          name:         collection.name,
          slug:         collection.slug,
          isDefault:    collection.isDefault,
          isPublic:     collection.isPublic,
          bookmarkCount: collection._count.bookmarks,
        }}
        owner={{
          username:     collection.user.username,
          displayName:  collection.user.displayName,
        }}
        isOwner={isOwner}
      />

      <CollectionBookmarkList
        initialData={initialPosts}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
        collectionId={collection.id}
        isOwner={isOwner}
        isPublicCollection={collection.isPublic}
        currentUserId={session?.user?.id}
      />
    </div>
  )
}
