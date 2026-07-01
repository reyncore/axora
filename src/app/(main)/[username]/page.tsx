import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { FeedList } from "@/components/feed/FeedList"
import { Avatar } from "@/components/ui/Avatar"
import { QuickAvatarEdit } from "@/components/profile/QuickAvatarEdit"
import { BadgeCheck, CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { formatCount } from "@/lib/utils"
import Link from "next/link"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where:  { username },
    select: { displayName: true, bio: true },
  })
  if (!user) return { title: "User tidak ditemukan" }
  return {
    title:       `${user.displayName} (@${username})`,
    description: user.bio ?? `Profil @${username} di Axora`,
  }
}

export default async function ProfilePage({ params }: Props) {
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

  if (!user) notFound()

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

  const isOwner    = session?.user?.id === user.id
  const joinedDate = format(user.createdAt, "MMMM yyyy", { locale: idLocale })

  return (
    <div>
      {/* Banner — gradient lebih menarik saat tidak ada gambar */}
      <div className="h-36 sm:h-44 relative overflow-hidden" aria-hidden="true">
        {user.bannerUrl ? (
          <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg,
                rgba(124,58,237,0.6) 0%,
                rgba(109,40,217,0.4) 40%,
                rgba(15,15,17,0.95) 100%)`,
            }}
          >
            {/* Subtle pattern */}
            <div
              className="w-full h-full opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgb(167 139 250) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 20%, rgb(124 58 237) 0%, transparent 50%)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4">
        {/* Avatar + CTA row */}
        <div className="flex items-end justify-between -mt-12 mb-3">
          <div className="relative">
            {isOwner ? (
              <QuickAvatarEdit
                username={user.username}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
              />
            ) : (
              <Avatar
                name={user.displayName}
                src={user.avatarUrl}
                size="xl"
                className="border-4 border-ax-bg-primary shadow-lg"
              />
            )}
            {user.isVerified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full
                           bg-ax-bg-primary flex items-center justify-center"
                aria-hidden="true"
              >
                <BadgeCheck size={16} className="text-ax-accent-light" />
              </span>
            )}
          </div>

          <div className="pb-1">
            <ProfileHeader
              user={user}
              isOwner={isOwner}
              isFollowing={isFollowing}
              currentUserId={session?.user?.id}
            />
          </div>
        </div>

        {/* Name — verified badge sudah ada di avatar, tidak perlu duplikat */}
        <div className="mb-2">
          <h1 className="text-[19px] font-bold text-ax-text-primary leading-tight">
            {user.displayName}
          </h1>
          <p className="text-sm text-ax-text-muted">@{user.username}</p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-[14px] text-ax-text-primary leading-relaxed mb-3 whitespace-pre-wrap">
            {user.bio}
          </p>
        )}

        {/* Joined date */}
        <div className="flex items-center gap-1.5 mb-4 text-xs text-ax-text-muted">
          <CalendarDays size={13} aria-hidden="true" />
          <time dateTime={user.createdAt.toISOString()}>
            Bergabung {joinedDate}
          </time>
        </div>

        {/* Stats — clickable, dengan separator */}
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/${user.username}/following`}
            className="flex items-center gap-1 hover:underline"
            aria-label={`${user._count.following} following`}
          >
            <span className="font-bold text-ax-text-primary">
              {formatCount(user._count.following)}
            </span>
            <span className="text-ax-text-muted">Following</span>
          </Link>

          <span className="text-ax-bg-border" aria-hidden="true">·</span>

          <Link
            href={`/${user.username}/followers`}
            className="flex items-center gap-1 hover:underline"
            aria-label={`${user._count.followers} follower`}
          >
            <span className="font-bold text-ax-text-primary">
              {formatCount(user._count.followers)}
            </span>
            <span className="text-ax-text-muted">Follower</span>
          </Link>

          <span className="text-ax-bg-border" aria-hidden="true">·</span>

          <div className="flex items-center gap-1" aria-label={`${user._count.posts} post`}>
            <span className="font-bold text-ax-text-primary">
              {formatCount(user._count.posts)}
            </span>
            <span className="text-ax-text-muted">Post</span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-ax-bg-border">
        <div className="px-4 py-2.5 border-b border-ax-bg-border">
          <span className="text-sm font-semibold text-ax-text-primary pb-2.5
                           border-b-2 border-ax-accent inline-block">
            Post
          </span>
        </div>
        <FeedList
          userId={session?.user?.id ?? ""}
          feedType="home"
          filterUserId={user.id}
        />
      </div>
    </div>
  )
}
