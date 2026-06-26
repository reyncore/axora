import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Avatar } from "@/components/ui/Avatar"
import { PostModerationActions } from "./PostModerationActions"
import { formatDistanceToNowStrict } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import Link from "next/link"

export const metadata: Metadata = { title: "Moderasi Post" }
export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ page?: string; filter?: string }>
}

const PAGE_SIZE = 20

export default async function AdminPostsPage({ searchParams }: Props) {
  const { page: pageParam, filter } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))

  const where = filter === "deleted" ? { isDeleted: true } : { isDeleted: false }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h1 className="text-xl font-bold text-ax-text-primary mb-1">Moderasi Post</h1>
      <p className="text-sm text-ax-text-muted mb-6">
        {total.toLocaleString("id-ID")} post {filter === "deleted" ? "terhapus" : "aktif"}
      </p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <Link
          href="/admin/posts"
          className={`px-3 py-1.5 rounded-ax text-sm transition-colors ${
            filter !== "deleted"
              ? "bg-ax-accent text-white"
              : "text-ax-text-muted hover:bg-ax-bg-subtle"
          }`}
        >
          Aktif
        </Link>
        <Link
          href="/admin/posts?filter=deleted"
          className={`px-3 py-1.5 rounded-ax text-sm transition-colors ${
            filter === "deleted"
              ? "bg-ax-accent text-white"
              : "text-ax-text-muted hover:bg-ax-bg-subtle"
          }`}
        >
          Terhapus
        </Link>
      </div>

      <div className="ax-card divide-y divide-ax-bg-border">
        {posts.map(post => (
          <div key={post.id} className="p-4 flex items-start gap-3">
            <Avatar
              name={post.author.displayName}
              src={post.author.avatarUrl}
              size="sm"
              className="flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-ax-text-primary">
                  {post.author.displayName}
                </span>
                <span className="text-xs text-ax-text-muted">@{post.author.username}</span>
                <span className="text-xs text-ax-text-hint" aria-hidden="true">·</span>
                <time className="text-xs text-ax-text-muted">
                  {formatDistanceToNowStrict(post.createdAt, { locale: idLocale, addSuffix: true })}
                </time>
              </div>
              <p className="text-sm text-ax-text-secondary line-clamp-2 mb-2">
                {post.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-ax-text-muted">
                <span>{post._count.likes} like</span>
                <span>{post._count.comments} komentar</span>
                <Link href={`/posts/${post.id}`} className="text-ax-accent-light hover:underline">
                  Lihat post →
                </Link>
              </div>
            </div>
            <PostModerationActions postId={post.id} isDeleted={post.isDeleted} />
          </div>
        ))}

        {posts.length === 0 && (
          <div className="py-12 text-center text-sm text-ax-text-muted">
            Tidak ada post
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/posts?page=${p}${filter ? `&filter=${filter}` : ""}`}
              className={`px-3 py-1.5 rounded-ax text-sm transition-colors ${
                p === page
                  ? "bg-ax-accent text-white"
                  : "text-ax-text-muted hover:bg-ax-bg-subtle"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
