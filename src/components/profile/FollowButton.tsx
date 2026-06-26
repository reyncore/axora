"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

interface Props {
  targetId?:         string   // opsional — hanya untuk backward compat
  username:          string   // selalu pakai username untuk API call
  displayName?:      string   // untuk pesan konfirmasi yang lebih personal
  initialFollowing?: boolean
}

export function FollowButton({ username, displayName, initialFollowing = false }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading]     = useState(false)

  async function performToggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" })
      if (!res.ok) throw new Error()
      const json = await res.json() as { data: { following: boolean } }
      setFollowing(json.data.following)
    } catch {
      toast.error("Gagal memperbarui status follow")
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    // Konfirmasi hanya saat unfollow — follow tidak perlu friksi tambahan
    if (following) {
      const name = displayName ? `@${username} (${displayName})` : `@${username}`
      const confirmed = confirm(`Berhenti mengikuti ${name}?`)
      if (!confirmed) return
    }
    void performToggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={following ? `Berhenti mengikuti @${username}` : `Ikuti @${username}`}
      aria-pressed={following}
      className={cn(
        "border rounded-full px-3 py-1 text-xs font-medium",
        "transition-all duration-150 flex-shrink-0 min-w-[64px]",
        "flex items-center justify-center",
        "disabled:cursor-not-allowed disabled:opacity-60",
        following
          ? "border-ax-bg-border text-ax-text-muted hover:border-red-600/50 hover:text-red-400"
          : "border-ax-bg-border text-ax-text-secondary hover:border-ax-accent-light hover:text-ax-accent-light"
      )}
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        : following ? "Mengikuti" : "Ikuti"
      }
    </button>
  )
}
