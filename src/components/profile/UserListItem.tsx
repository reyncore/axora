"use client"

import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { FollowButton } from "./FollowButton"
import { formatCount } from "@/lib/utils"

export interface UserListItemData {
  id:             string
  username:       string
  displayName:    string
  avatarUrl:      string | null
  isVerified:     boolean
  followersCount: number
  postsCount:     number
  isFollowing:    boolean
  isOwn:          boolean
}

interface Props {
  user: UserListItemData
}

export function UserListItem({ user }: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ax-bg-border
                    hover:bg-ax-bg-hover transition-colors">
      <Link
        href={`/${user.username}`}
        className="flex-shrink-0"
        tabIndex={-1}
        aria-label={`Profil ${user.displayName}`}
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/${user.username}`} className="group block min-w-0">
          <div className="flex items-center gap-1 min-w-0">
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

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-ax-text-muted">
            <span className="font-medium text-ax-text-secondary">
              {formatCount(user.followersCount)}
            </span>
            {" "}follower
          </span>
          {user.postsCount > 0 && (
            <>
              <span className="text-ax-text-hint" aria-hidden="true">·</span>
              <span className="text-xs text-ax-text-muted">
                <span className="font-medium text-ax-text-secondary">
                  {formatCount(user.postsCount)}
                </span>
                {" "}post
              </span>
            </>
          )}
        </div>
      </div>

      {!user.isOwn && (
        <FollowButton
          username={user.username}
          displayName={user.displayName}
          initialFollowing={user.isFollowing}
        />
      )}
    </div>
  )
}
