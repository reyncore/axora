"use client"

import { useState } from "react"
import Link from "next/link"
import { UserPlus, UserCheck, Settings, Loader2 } from "lucide-react"
import { MessageButton } from "./MessageButton"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface ProfileUser {
  id:          string
  username:    string
  displayName?: string
}

interface Props {
  user:           ProfileUser
  isOwner:        boolean
  isFollowing:    boolean
  currentUserId?: string
}

export function ProfileHeader({ user, isOwner, isFollowing: initialFollowing, currentUserId }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading]     = useState(false)

  async function performToggle() {
    if (!currentUserId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, { method: "POST" })
      if (!res.ok) throw new Error()
      const json = await res.json() as { data: { following: boolean } }
      setFollowing(json.data.following)
    } catch {
      toast.error("Gagal memperbarui status follow")
    } finally {
      setLoading(false)
    }
  }

  function handleToggleClick() {
    // Konfirmasi hanya saat unfollow — mencegah tap tidak sengaja
    // kehilangan koneksi follow yang mungkin sudah dibangun lama
    if (following) {
      const name = user.displayName ? `@${user.username} (${user.displayName})` : `@${user.username}`
      const confirmed = confirm(`Berhenti mengikuti ${name}?`)
      if (!confirmed) return
    }
    void performToggle()
  }

  if (isOwner) {
    return (
      <Link
        href="/settings/profile"
        className="ax-btn-ghost flex items-center gap-2 text-sm"
      >
        <Settings size={14} aria-hidden="true" />
        Edit Profil
      </Link>
    )
  }

  if (!currentUserId) {
    return (
      <Link href="/login" className="ax-btn-primary text-sm">
        Ikuti
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <MessageButton username={user.username} />

      <button
        type="button"
        onClick={handleToggleClick}
        disabled={loading}
        aria-label={following ? `Berhenti mengikuti @${user.username}` : `Ikuti @${user.username}`}
        aria-pressed={following}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full",
          "transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
          following
            ? "border border-ax-bg-border text-ax-text-secondary hover:border-red-500/50 hover:text-red-400 hover:bg-red-950/10"
            : "bg-ax-text-primary text-ax-bg-primary hover:opacity-90"
        )}
      >
        {loading
          ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          : following
            ? <><UserCheck size={13} aria-hidden="true" /> Mengikuti</>
            : <><UserPlus size={13} aria-hidden="true" /> Ikuti</>
        }
      </button>
    </div>
  )
}
