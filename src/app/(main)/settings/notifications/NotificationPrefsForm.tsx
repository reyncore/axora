"use client"

import { useState, useCallback } from "react"
import { Heart, MessageCircle, UserPlus, AtSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { NotificationPrefs } from "@/lib/notification-prefs"
import type { LucideIcon } from "lucide-react"

interface Props {
  initialPrefs: NotificationPrefs
}

interface PrefItem {
  key:   keyof NotificationPrefs
  icon:  LucideIcon
  color: string
  label: string
  desc:  string
}

const PREF_ITEMS: readonly PrefItem[] = [
  {
    key:   "like",
    icon:  Heart,
    color: "text-ax-like",
    label: "Like",
    desc:  "Saat seseorang menyukai postmu",
  },
  {
    key:   "follow",
    icon:  UserPlus,
    color: "text-ax-repost",
    label: "Follow",
    desc:  "Saat seseorang mulai mengikutimu",
  },
  {
    key:   "comment",
    icon:  MessageCircle,
    color: "text-blue-400",
    label: "Komentar",
    desc:  "Saat seseorang mengomentari postmu",
  },
  {
    key:   "mention",
    icon:  AtSign,
    color: "text-yellow-400",
    label: "Sebutan",
    desc:  "Saat seseorang menyebutmu dalam post",
  },
] as const

export function NotificationPrefsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null)

  const handleToggle = useCallback(async (key: keyof NotificationPrefs) => {
    const prev = prefs[key]
    const next = !prev

    // Optimistic update
    setPrefs(p => ({ ...p, [key]: next }))
    setSaving(key)

    try {
      const res = await fetch("/api/settings/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [key]: next }),
      })

      if (!res.ok) throw new Error()
      toast.success(next ? "Notifikasi diaktifkan" : "Notifikasi dinonaktifkan")
    } catch {
      // Rollback
      setPrefs(p => ({ ...p, [key]: prev }))
      toast.error("Gagal menyimpan preferensi")
    } finally {
      setSaving(null)
    }
  }, [prefs])

  return (
    <div className="space-y-2">
      {PREF_ITEMS.map(({ key, icon: Icon, color, label, desc }) => (
        <div
          key={key}
          className="flex items-center gap-4 p-4 rounded-xl bg-ax-bg-secondary
                     border border-ax-bg-border"
        >
          <div className={cn(
            "w-9 h-9 rounded-ax bg-ax-bg-elevated flex items-center",
            "justify-center flex-shrink-0"
          )}>
            <Icon size={17} className={color} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ax-text-primary">{label}</p>
            <p className="text-xs text-ax-text-muted">{desc}</p>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            aria-label={`${label} notifikasi ${prefs[key] ? "aktif" : "nonaktif"}`}
            onClick={() => void handleToggle(key)}
            disabled={saving === key}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ax-accent",
              "disabled:opacity-60 disabled:cursor-wait",
              prefs[key] ? "bg-ax-accent" : "bg-ax-bg-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm",
                "transition-transform duration-200",
                prefs[key] ? "translate-x-5" : "translate-x-0"
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      ))}
    </div>
  )
}
