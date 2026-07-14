import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getTrendingHashtags } from "@/lib/search"
import { Avatar } from "@/components/ui/Avatar"
import { FollowButton } from "@/components/profile/FollowButton"
import { formatCount } from "@/lib/utils"
import Link from "next/link"
import { TrendingUp, Users, BadgeCheck, Search, Hash } from "lucide-react"

// ── Data fetchers ─────────────────────────────────────────────────────────────

// Pakai getTrendingHashtags() dari lib/search.ts yang sudah query
// materialized view TrendingHashtag (O(1)) dengan fallback JS counting.
// Menghilangkan duplikasi logic dan fetch 1000 posts di RightPanel.

async function getSuggestions(currentUserId: string) {
  const following = await prisma.follow.findMany({
    where:  { followerId: currentUserId },
    select: { followingId: true },
  })
  const excludeIds = [currentUserId, ...following.map(f => f.followingId)]

  return prisma.user.findMany({
    where:   { id: { notIn: excludeIds }, isBanned: false },
    select:  {
      id: true, username: true, displayName: true,
      avatarUrl: true, isVerified: true,
      _count: { select: { followers: true } },
    },
    orderBy: { followers: { _count: "desc" } },
    take:    4,
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function RightPanel() {
  const session = await auth()
  if (!session?.user) return null

  const [rawTrendingData, suggestions] = await Promise.all([
    getTrendingHashtags(5),
    getSuggestions(session.user.id),
  ])

  // Normalize shape: getTrendingHashtags() returns post_count, UI pakai count
  const trending = rawTrendingData.map(t => ({ tag: t.tag, count: t.post_count }))

  return (
    <div className="p-4 space-y-4">

      {/* Search */}
      <Link
        href="/search"
        className="flex items-center gap-2.5 bg-ax-bg-elevated border border-ax-bg-border
                   rounded-full px-4 py-2.5 hover:border-ax-accent transition-colors group
                   w-full"
        aria-label="Buka halaman pencarian"
      >
        <Search
          size={15}
          className="text-ax-text-muted group-hover:text-ax-accent-light flex-shrink-0
                     transition-colors"
          aria-hidden="true"
        />
        <span className="text-sm text-ax-text-muted group-hover:text-ax-text-secondary
                         transition-colors">
          Cari di Axora...
        </span>
      </Link>

      {/* Trending */}
      <section
        className="bg-ax-bg-secondary border border-ax-bg-border rounded-2xl overflow-hidden"
        aria-label="Trending sekarang"
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <TrendingUp size={15} className="text-ax-accent-light" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ax-text-primary">Trending</h2>
        </div>

        {trending.length === 0 ? (
          <div className="px-4 pb-4 flex flex-col items-center gap-2 py-6">
            <Hash size={24} className="text-ax-text-hint opacity-40" aria-hidden="true" />
            <p className="text-xs text-ax-text-muted text-center">
              Belum ada trending hashtag.<br />Buat post dengan #hashtag!
            </p>
          </div>
        ) : (
          <ol>
            {trending.map(({ tag, count }, i) => (
              <li key={tag}>
                <Link
                  href={`/search?q=${encodeURIComponent(`#${tag}`)}&tab=posts`}
                  className="flex items-center justify-between px-4 py-2.5
                             hover:bg-ax-bg-subtle transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-ax-text-hint">
                      #{i + 1} · Trending
                    </p>
                    <p className="text-sm font-semibold text-ax-text-primary
                                  group-hover:text-ax-accent-light transition-colors truncate">
                      #{tag}
                    </p>
                    <p className="text-[11px] text-ax-text-muted">
                      {formatCount(count)} post
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <Link
          href="/search"
          className="block px-4 py-3 text-sm text-ax-accent-light hover:text-ax-accent
                     border-t border-ax-bg-border transition-colors"
        >
          Lihat semua →
        </Link>
      </section>

      {/* Who to follow */}
      {suggestions.length > 0 && (
        <section
          className="bg-ax-bg-secondary border border-ax-bg-border rounded-2xl overflow-hidden"
          aria-label="Saran pengguna untuk diikuti"
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Users size={15} className="text-ax-accent-light" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ax-text-primary">Siapa yang Diikuti</h2>
          </div>

          <ul>
            {suggestions.map(user => (
              <li
                key={user.id}
                className="flex items-center gap-3 px-4 py-2.5
                           hover:bg-ax-bg-subtle transition-colors"
              >
                <Link
                  href={`/${user.username}`}
                  className="flex-shrink-0"
                  aria-label={`Profil ${user.displayName}`}
                  tabIndex={-1}
                >
                  <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                </Link>
                <Link href={`/${user.username}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-ax-text-primary truncate
                                     group-hover:underline">
                      {user.displayName}
                    </span>
                    {user.isVerified && (
                      <BadgeCheck
                        size={13}
                        className="text-ax-accent-light flex-shrink-0"
                        aria-label="Terverifikasi"
                      />
                    )}
                  </div>
                  <p className="text-xs text-ax-text-muted">@{user.username}</p>
                </Link>
                <FollowButton username={user.username} displayName={user.displayName} />
              </li>
            ))}
          </ul>

          <Link
            href="/search?tab=users"
            className="block px-4 py-3 text-sm text-ax-accent-light hover:text-ax-accent
                       border-t border-ax-bg-border transition-colors"
          >
            Lihat semua →
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="px-1 text-[11px] text-ax-text-hint leading-loose">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          <Link href="/about"   className="hover:underline hover:text-ax-text-muted">Tentang</Link>
          <Link href="/privacy" className="hover:underline hover:text-ax-text-muted">Privasi</Link>
          <Link href="/terms"   className="hover:underline hover:text-ax-text-muted">Ketentuan</Link>
        </div>
        <p className="mt-0.5">Axora © 2025 · Dibuat di Indonesia 🇮🇩</p>
      </footer>
    </div>
  )
}
