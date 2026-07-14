import { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchFollowersPage } from "@/lib/follow-list"
import { UserList } from "@/components/profile/UserList"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where:  { username },
    select: { displayName: true },
  })
  if (!user) return { title: "Tidak ditemukan" }
  return {
    title:  `Follower — ${user.displayName} (@${username})`,
    robots: { index: false, follow: false },
  }
}

export default async function FollowersPage({ params }: Props) {
  const { username } = await params
  const session      = await auth()

  const result = await fetchFollowersPage(username, session?.user?.id)
  if (!result) notFound()

  const { target, initialData, initialCursor, initialHasMore } = result

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-4 py-3 flex items-center gap-4">
        <Link
          href={`/${username}`}
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all flex-shrink-0"
          aria-label="Kembali ke profil"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-ax-text-primary leading-tight truncate">
            {target.displayName}
          </h1>
          <p className="text-xs text-ax-text-muted">@{username}</p>
        </div>
      </div>

      {/* Tab navigation — aktif di followers */}
      <div className="flex border-b border-ax-bg-border" role="tablist">
        <div
          role="tab"
          aria-selected={true}
          className="flex-1 py-3.5 text-sm font-semibold text-ax-text-primary
                     text-center relative cursor-default"
        >
          Follower
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5
                       bg-ax-accent rounded-full"
            aria-hidden="true"
          />
        </div>
        <Link
          href={`/${username}/following`}
          role="tab"
          aria-selected={false}
          className="flex-1 py-3.5 text-sm font-medium text-ax-text-muted
                     hover:bg-ax-bg-hover text-center transition-colors"
        >
          Following
        </Link>
      </div>

      <UserList
        initialData={initialData}
        initialCursor={initialCursor}
        initialHasMore={initialHasMore}
        apiUrl={`/api/users/${username}/followers`}
        emptyMessage={`@${username} belum punya follower`}
      />
    </div>
  )
}
