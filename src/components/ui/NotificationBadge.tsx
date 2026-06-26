"use client"

import { useUnreadNotifications } from "@/hooks/useUnreadNotifications"
import { cn } from "@/lib/utils"

interface Props {
  /** Gaya badge: dot (titik merah kecil) atau count (angka) */
  variant?:   "dot" | "count"
  className?: string
}

/**
 * Badge notifikasi yang polling jumlah unread setiap menit.
 * Gunakan variant="dot" di sidebar, variant="count" di header.
 */
export function NotificationBadge({ variant = "dot", className }: Props) {
  const { count, hasUnread } = useUnreadNotifications()

  if (!hasUnread) return null

  if (variant === "dot") {
    return (
      <span
        className={cn(
          "absolute -top-1 -right-1 w-2 h-2 bg-ax-danger rounded-full",
          "ring-2 ring-ax-bg-primary animate-pulse-dot",
          className
        )}
        aria-label={`${count} notifikasi belum dibaca`}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px]",
        "bg-ax-danger text-white text-[10px] font-bold rounded-full px-1",
        className
      )}
      aria-label={`${count} notifikasi belum dibaca`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
