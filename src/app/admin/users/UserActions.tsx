"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Ban, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface Props {
  userId:     string
  username:   string
  isBanned:   boolean
  isVerified: boolean
  role:       "USER" | "ADMIN"
}

type Action = "ban" | "unban" | "verify" | "unverify" | "promote" | "demote"

export function UserActions({ userId, username, isBanned, isVerified, role }: Props) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState<Action | null>(null)

  async function performAction(action: Action) {
    if (action === "ban") {
      const confirmed = confirm(
        `Ban @${username}? Pengguna ini tidak akan bisa login.`
      )
      if (!confirmed) return
    }

    if (action === "promote") {
      const confirmed = confirm(
        `Jadikan @${username} sebagai admin? Mereka akan punya akses penuh ke admin panel.`
      )
      if (!confirmed) return
    }

    setLoading(action)
    setOpen(false)

    try {
      const reason = action === "ban"
        ? prompt("Alasan ban (opsional):") ?? undefined
        : undefined

      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, reason }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal melakukan aksi")
      }

      toast.success("Berhasil diperbarui")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-ax text-ax-text-muted hover:text-ax-text-primary
                   hover:bg-ax-bg-subtle transition-colors"
        aria-label="Aksi pengguna"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          : <MoreHorizontal size={15} aria-hidden="true" />
        }
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 top-8 z-20 ax-card shadow-xl py-1 w-48 animate-fade-in"
          >
            <button
              role="menuitem"
              type="button"
              onClick={() => void performAction(isVerified ? "unverify" : "verify")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                         text-ax-text-secondary hover:bg-ax-bg-subtle transition-colors"
            >
              <BadgeCheck size={14} aria-hidden="true" />
              {isVerified ? "Hapus verifikasi" : "Verifikasi pengguna"}
            </button>

            {role !== "ADMIN" && (
              <button
                role="menuitem"
                type="button"
                onClick={() => void performAction("promote")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                           text-ax-text-secondary hover:bg-ax-bg-subtle transition-colors"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                Jadikan admin
              </button>
            )}

            {role === "ADMIN" && (
              <button
                role="menuitem"
                type="button"
                onClick={() => void performAction("demote")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                           text-ax-text-secondary hover:bg-ax-bg-subtle transition-colors"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                Cabut akses admin
              </button>
            )}

            <div className="h-px bg-ax-bg-border my-1" role="separator" />

            <button
              role="menuitem"
              type="button"
              onClick={() => void performAction(isBanned ? "unban" : "ban")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors",
                isBanned
                  ? "text-emerald-400 hover:bg-emerald-950/30"
                  : "text-red-400 hover:bg-red-950/30"
              )}
            >
              <Ban size={14} aria-hidden="true" />
              {isBanned ? "Buka ban" : "Ban pengguna"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
