import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { searchUsers, searchPosts, getTrendingHashtags } from "@/lib/search"
import { Avatar } from "@/components/ui/Avatar"
import { PostCard } from "@/components/feed/PostCard"
import { FollowButton } from "@/components/profile/FollowButton"
import { SearchInput } from "./SearchInput"
import { SearchTabs } from "./SearchTabs"
import Link from "next/link"
import { BadgeCheck, Users, FileText, Hash } from "lucide-react"
import { formatCount } from "@/lib/utils"

export const metadata: Metadata = { title: "Cari" }

interface Props {
  searchParams: Promise<{ q?: string; tab?: string }>
}

interface ResultProps {
  query:          string
  currentUserId?: string
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, tab } = await searchParams
  const session    = await auth()
  const query      = q?.trim()
  const activeTab  = tab === "posts" ? "posts" : "users"

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border">
        <div className="px-4 py-3">
          <SearchInput defaultValue={query ?? ""} />
        </div>
        {query && <SearchTabs query={query} activeTab={activeTab} />}
      </div>

      {!query ? (
        <SearchEmptyState />
      ) : activeTab === "users" ? (
        <UserResults query={query} currentUserId={session?.user?.id} />
      ) : (
        <PostResults query={query} currentUserId={session?.user?.id} />
      )}
    </div>
  )
}

async function SearchEmptyState() {
  const trending = await getTrendingHashtags(10)

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Hash size={16} className="text-ax-accent-light" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ax-text-secondary uppercase tracking-wider">
          Trending Minggu Ini
        </h2>
      </div>

      {trending.length === 0 ? (
        <p className="text-sm text-ax-text-muted py-8 text-center">
          Belum ada trending hashtag minggu ini.
        </p>
      ) : (
        <ol className="space-y-1">
          {trending.map(({ tag, post_count }, i) => (
            <li key={tag}>
              <Link
                href={`/search?q=${encodeURIComponent(`#${tag}`)}&tab=posts`}
                className="flex items-center justify-between py-3 px-3 rounded-ax
                           hover:bg-ax-bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ax-text-hint w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ax-text-primary
                                  group-hover:text-ax-accent-light transition-colors">
                      #{tag}
                    </p>
                    <p className="text-xs text-ax-text-muted mt-0.5">
                      {formatCount(post_count)} post
                    </p>
                  </div>
                </div>
                <Hash
                  size={14}
                  className="text-ax-text-hint group-hover:text-ax-accent-light transition-colors"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

async function UserResults({ query, currentUserId }: ResultProps) {
  const users = await searchUsers(query, { currentUserId, limit: 20 })

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <Users size={36} className="opacity-40" aria-hidden="true" />
        <p className="font-medium text-ax-text-secondary">Tidak ada pengguna ditemukan</p>
        <p className="text-sm">Coba cari dengan kata kunci lain</p>
      </div>
    )
  }

  return (
    <ul aria-label={`${users.length} pengguna ditemukan untuk "${query}"`}>
      {users.map(user => (
        <li
          key={user.id}
          className="flex items-center gap-3 px-5 py-4 border-b border-ax-bg-border
                     hover:bg-ax-bg-hover transition-colors"
        >
          <Link
            href={`/${user.username}`}
            className="flex-shrink-0"
            aria-label={`Profil ${user.displayName}`}
            tabIndex={-1}
          >
            <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/${user.username}`} className="group">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-ax-text-primary
                                 group-hover:underline truncate">
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
              <p className="text-xs text-ax-text-muted">@{user.username}</p>
            </Link>

            {user.bio && (
              <p className="text-xs text-ax-text-secondary mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-ax-text-muted">
                <span className="font-medium text-ax-text-secondary">
                  {formatCount(user.followersCount)}
                </span>
                {" "}follower
              </span>
              <span className="text-xs text-ax-text-muted">
                <span className="font-medium text-ax-text-secondary">
                  {formatCount(user.postsCount)}
                </span>
                {" "}post
              </span>
            </div>
          </div>

          {!user.isOwn && (
            <FollowButton
              username={user.username}
              displayName={user.displayName}
              initialFollowing={user.isFollowing}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

async function PostResults({ query, currentUserId }: ResultProps) {
  const posts = await searchPosts(query, { currentUserId, limit: 20 })

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ax-text-muted">
        <FileText size={36} className="opacity-40" aria-hidden="true" />
        <p className="font-medium text-ax-text-secondary">Tidak ada post ditemukan</p>
        <p className="text-sm">Coba cari dengan kata kunci lain</p>
      </div>
    )
  }

  return (
    <div aria-label={`${posts.length} post ditemukan untuk "${query}"`}>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
