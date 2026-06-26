"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  User, Settings, ShieldCheck,
  LogOut, X, BadgeCheck,
} from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

interface DrawerUser {
  id:          string
  name?:       string | null
  username:    string
  image?:      string | null
  role?:       "USER" | "ADMIN"
  isVerified?: boolean
}

interface Props {
  user:    DrawerUser
  open:    boolean
  onClose: () => void
}

export function MobileUserDrawer({ user, open, onClose }: Props) {
  const drawerRef  = useRef<HTMLDivElement>(null)
  const displayName = user.name ?? user.username

  // Tutup saat tekan Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  // Lock scroll saat drawer terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — slide up dari bawah */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu pengguna"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-ax-bg-secondary border-t border-ax-bg-border rounded-t-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-ax-bg-border" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 p-1.5 rounded-full text-ax-text-muted
                     hover:text-ax-text-primary hover:bg-ax-bg-subtle transition-colors"
          aria-label="Tutup menu"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* User info */}
        <div className="px-5 py-4 flex items-center gap-3">
          <Avatar
            name={displayName}
            src={user.image}
            size="lg"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ax-text-primary text-base truncate">
                {displayName}
              </span>
              {user.isVerified && (
                <BadgeCheck
                  size={15}
                  className="text-ax-accent-light flex-shrink-0"
                  aria-label="Terverifikasi"
                />
              )}
            </div>
            <p className="text-sm text-ax-text-muted">@{user.username}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-ax-bg-border mx-4" role="separator" />

        {/* Menu items */}
        <nav className="px-3 py-2" aria-label="Menu pengguna">
          <Link
            href={`/${user.username}`}
            onClick={onClose}
            className="flex items-center gap-3.5 px-3 py-3 rounded-xl
                       text-ax-text-secondary hover:bg-ax-bg-subtle
                       hover:text-ax-text-primary transition-colors"
          >
            <User size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[15px] font-medium">Lihat Profil</span>
          </Link>

          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3.5 px-3 py-3 rounded-xl
                       text-ax-text-secondary hover:bg-ax-bg-subtle
                       hover:text-ax-text-primary transition-colors"
          >
            <Settings size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[15px] font-medium">Pengaturan</span>
          </Link>

          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3.5 px-3 py-3 rounded-xl
                         text-ax-accent-light hover:bg-ax-accent-muted
                         transition-colors"
            >
              <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[15px] font-medium">Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Divider */}
        <div className="h-px bg-ax-bg-border mx-4" role="separator" />

        {/* Logout */}
        <div className="px-3 py-2 pb-safe">
          <button
            type="button"
            onClick={() => {
              onClose()
              void signOut({ callbackUrl: "/login" })
            }}
            className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl
                       text-red-400 hover:bg-red-950/25 transition-colors"
            aria-label="Keluar dari akun"
          >
            <LogOut size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[15px] font-medium">Keluar</span>
          </button>
        </div>

        {/* Safe area untuk iPhone gesture bar */}
        <div className="h-safe-bottom pb-5" aria-hidden="true" />
      </div>
    </>
  )
}
