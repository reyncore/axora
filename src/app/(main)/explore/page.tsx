import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { searchUsers, searchPosts } from "@/lib/search"
import { FeedList } from "@/components/feed/FeedList"
import { PostCard } from "@/components/feed/PostCard"
import { Avatar } from "@/components/ui/Avatar"
import { ExploreSearch } from "./ExploreSearch"
import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { formatCount } from "@/lib/utils"

export const metadata: Metadata = { title: "Eksplor" }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { q }   = await searchParams
  const session = await auth()
  const query   = q?.trim()

  if (query) {
    return (
      <div>
        <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                        border-b border-ax-bg-border px-5 py-4">
          <ExploreSearch defaultValue={query} />
        </div>
        <ExploreSearchResults query={query} currentUserId={session?.user?.id} />
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-5 py-4">
        <h1 className="text-lg font-bold text-ax-text-primary mb-3">Eksplor</h1>
        <ExploreSearch />
      </div>
      <FeedList userId={session?.user?.id ?? ""} feedType="explore" />
    </div>
  )
}

interface ResultProps {
  query:          string
  currentUserId?: string
}

async function ExploreSearchResults({ query, currentUserId }: ResultProps) {
  const [users, posts] = await Promise.all([
    searchUsers(query, { currentUserId, limit: 5  }),
    searchPosts(query, { currentUserId, limit: 10 }),
  ])

  if (users.length === 0 && posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <span className="text-4xl" aria-hidden="true">🔍</span>
        <p className="font-medium text-ax-text-secondary">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm">Coba kata kunci yang berbeda</p>
      </div>
    )
  }

  return (
    <div>
      {users.length > 0 && (
        <section aria-label="Hasil pengguna">
          <div className="px-5 py-3 border-b border-ax-bg-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ax-text-secondary">
              Pengguna ({users.length})
            </h2>
            {users.length >= 5 && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=users`}
                className="text-xs text-ax-accent-light hover:underline"
              >
                Lihat semua →
              </Link>
            )}
          </div>
          {users.map(user => (
            <Link
              key={user.id}
              href={`/${user.username}`}
              className="flex items-center gap-3 px-5 py-3 border-b border-ax-bg-border
                         hover:bg-ax-bg-hover transition-colors"
            >
              <Avatar
                name={user.displayName}
                src={user.avatarUrl}
                size="md"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-ax-text-primary truncate">
                    {user.displayName}
                  </span>
                  {user.isVerified && (
                    <BadgeCheck
                      size={14}
                      className="text-ax-accent-light flex-shrink-0"
                      aria-label="Terverifikasi"
                    />
                  )}
                </div>
                <p className="text-xs text-ax-text-muted">
                  @{user.username} · {formatCount(user.followersCount)} follower
                </p>
                {user.bio && (
                  <p className="text-xs text-ax-text-secondary mt-0.5 truncate">
                    {user.bio}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}

      {posts.length > 0 && (
        <section aria-label="Hasil post">
          <div className="px-5 py-3 border-b border-ax-bg-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ax-text-secondary">
              Post ({posts.length})
            </h2>
            {posts.length >= 10 && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=posts`}
                className="text-xs text-ax-accent-light hover:underline"
              >
                Lihat semua →
              </Link>
            )}
          </div>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      )}
    </div>
  )
}
