import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PostCard } from "@/components/feed/PostCard"
import { ReplySection } from "@/components/feed/ReplySection"
import { Avatar } from "@/components/ui/Avatar"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { PostData, MediaType } from "@/types"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post   = await prisma.post.findUnique({
    where:  { id, isDeleted: false },
    select: {
      content:  true,
      createdAt: true,
      author:   { select: { displayName: true, username: true, avatarUrl: true } },
      media:    { select: { url: true, type: true }, take: 1 },
    },
  })

  if (!post) return { title: "Post tidak ditemukan" }

  const appUrl     = process.env.NEXTAUTH_URL ?? "https://axora.app"
  const preview    = post.content.slice(0, 100)
  const title      = `${post.author.displayName} di Axora`
  const description = post.content.slice(0, 160)
  const postUrl    = `${appUrl}/posts/${id}`
  const firstImage = post.media[0]

  return {
    title,
    description,
    openGraph: {
      type:         "article",
      url:          postUrl,
      title,
      description,
      siteName:     "Axora",
      publishedTime: post.createdAt.toISOString(),
      authors:      [`${appUrl}/${post.author.username}`],
      images: firstImage
        ? [{ url: firstImage.url, width: 1200, height: 630, alt: description }]
        : [{ url: `${appUrl}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        firstImage ? "summary_large_image" : "summary",
      title,
      description,
      images:      firstImage ? [firstImage.url] : [`${appUrl}/og-default.png`],
      creator:     `@${post.author.username}`,
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id }  = await params
  const session = await auth()

  const post = await prisma.post.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true, username: true,
          displayName: true, avatarUrl: true, isVerified: true,
        },
      },
      media:  { select: { id: true, url: true, type: true, size: true } },
      _count: { select: { likes: true, comments: true, replies: true } },
      likes:  session?.user
        ? { where: { userId: session.user.id }, select: { id: true } }
        : undefined,
      // Jika ini adalah reply, ambil parent context
      parent: {
        select: {
          id:      true,
          content: true,
          author:  { select: { username: true, displayName: true } },
        },
      },
    },
  })

  if (!post) notFound()

  const { likes = [], _count, media, parent, ...postRest } = post

  const postData: PostData = {
    ...postRest,
    createdAt:     post.createdAt.toISOString(),
    updatedAt:     post.updatedAt.toISOString(),
    media:         media.map(m => ({ ...m, type: m.type as MediaType })),
    isLiked:       likes.length > 0,
    likesCount:    _count.likes,
    commentsCount: _count.comments,
    repliesCount:  _count.replies,
    parent:        parent ?? null,
    currentUserId: session?.user?.id,
  }

  return (
    <div>
      {/* Back header */}
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-4 py-3 flex items-center gap-4">
        <Link
          href={parent ? `/posts/${parent.id}` : "/"}
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all"
          aria-label={parent ? "Kembali ke post asli" : "Kembali ke beranda"}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-base font-bold text-ax-text-primary">
          {parent ? "Balasan" : "Post"}
        </h1>
      </div>

      {/* Parent context — jika ini adalah reply */}
      {parent && (
        <div className="px-4 pt-3 pb-2 border-b border-ax-bg-border">
          <Link
            href={`/posts/${parent.id}`}
            className="flex gap-3 group"
          >
            <div className="flex flex-col items-center w-10 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-ax-bg-elevated flex-shrink-0" aria-hidden="true" />
              <div className="w-0.5 flex-1 bg-ax-bg-border mt-1.5 min-h-[16px]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-xs text-ax-text-muted mb-0.5">
                Membalas{" "}
                <span className="text-ax-accent-light font-medium">
                  @{parent.author.username}
                </span>
              </p>
              <p className="text-sm text-ax-text-muted truncate group-hover:text-ax-text-secondary transition-colors">
                {parent.content}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Main post */}
      <div className="border-b border-ax-bg-border">
        <PostCard post={postData} expandedView />
      </div>

      {/* Replies */}
      <ReplySection
        postId={id}
        currentUser={session?.user ?? null}
      />
    </div>
  )
}
