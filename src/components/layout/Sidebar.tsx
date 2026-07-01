"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Home, Compass, Bell, Search, Plus, LogOut,
  Settings, Zap, ShieldCheck, MessageSquare, Sun, Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/Avatar"
import { NotificationBadge } from "@/components/ui/NotificationBadge"
import { useTheme } from "@/components/ui/ThemeProvider"
import type { LucideIcon } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarUser {
  id:       string
  name?:    string | null
  username: string
  image?:   string | null
  role?:    "USER" | "ADMIN"
}

interface NavItem {
  href:    string
  icon:    LucideIcon
  label:   string
  badge?:  boolean
  exact?:  boolean
}

interface Props {
  user: SidebarUser
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAIN_NAV: readonly NavItem[] = [
  { href: "/",              icon: Home,          label: "Beranda",    exact: true },
  { href: "/explore",       icon: Compass,       label: "Eksplor"               },
  { href: "/notifications", icon: Bell,          label: "Notifikasi", badge: true },
  { href: "/messages",      icon: MessageSquare, label: "Pesan"                  },
  { href: "/search",        icon: Search,        label: "Cari"                   },
  { href: "/bookmarks",    icon: Bookmark,      label: "Bookmark"               },
] as const

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({ user }: Props) {
  const pathname    = usePathname()
  const displayName = user.name ?? user.username
  const { theme, setTheme } = useTheme()

  const isDark = theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" &&
     window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <nav
      className="flex flex-col h-full px-3 py-5 gap-0.5"
      aria-label="Navigasi utama"
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl
                   hover:bg-ax-bg-subtle transition-colors group"
        aria-label="Axora — Beranda"
      >
        <div className="w-9 h-9 rounded-xl bg-ax-accent flex items-center
                        justify-center flex-shrink-0 shadow-md shadow-ax-accent/30">
          <Zap size={18} className="text-white" fill="white" aria-hidden="true" />
        </div>
        <span className="hidden xl:block text-xl font-bold text-ax-text-primary tracking-tight">
          Axora
        </span>
      </Link>

      {/* Main nav */}
      {MAIN_NAV.map(({ href, icon: Icon, label, badge, exact }) => {
        const active = isActive(pathname, href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "transition-all duration-150 cursor-pointer w-full group",
              active
                ? "text-ax-accent-light bg-ax-accent/10 font-semibold"
                : "text-ax-text-secondary hover:bg-ax-bg-subtle hover:text-ax-text-primary"
            )}
          >
            <div className="relative flex-shrink-0">
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                aria-hidden="true"
              />
              {badge && <NotificationBadge variant="dot" />}
            </div>
            <span className="hidden xl:block text-[15px]">{label}</span>
          </Link>
        )
      })}

      {/* Compose button */}
      <Link
        href="/compose"
        className="flex items-center justify-center gap-2.5 mt-3 mb-1
                   bg-ax-accent hover:bg-ax-accent-hover text-white font-semibold
                   rounded-xl px-4 py-3 text-sm transition-all duration-150
                   shadow-md shadow-ax-accent/25"
        aria-label="Buat post baru"
      >
        <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
        <span className="hidden xl:block text-[15px]">Buat Post</span>
      </Link>

      <div className="flex-1" aria-hidden="true" />

      {/* Divider sebelum user section */}
      <div className="h-px bg-ax-bg-border mx-1 mb-2" role="separator" aria-hidden="true" />

      {/* User profile link */}
      <Link
        href={`/${user.username}`}
        aria-label={`Profil ${displayName}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                   text-ax-text-secondary hover:bg-ax-bg-subtle hover:text-ax-text-primary
                   transition-all duration-150"
      >
        <Avatar name={displayName} src={user.image} size="sm" className="flex-shrink-0" />
        <div className="hidden xl:block min-w-0">
          <p className="text-[14px] font-semibold text-ax-text-primary truncate leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-ax-text-muted truncate">@{user.username}</p>
        </div>
      </Link>

      {/* Secondary nav */}
      <div className="space-y-0.5">
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                       text-ax-accent-light hover:bg-ax-accent/10 transition-colors"
          >
            <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden xl:block">Admin Panel</span>
          </Link>
        )}

        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                     text-ax-text-muted hover:bg-ax-bg-subtle hover:text-ax-text-primary
                     transition-colors"
        >
          <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="hidden xl:block">Pengaturan</span>
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm w-full text-left
                     text-ax-text-muted hover:bg-ax-bg-subtle hover:text-ax-text-primary
                     transition-colors"
          aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
        >
          {isDark
            ? <Sun  size={18} strokeWidth={1.8} aria-hidden="true" />
            : <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
          }
          <span className="hidden xl:block">{isDark ? "Mode Terang" : "Mode Gelap"}</span>
        </button>

        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm w-full text-left
                     text-ax-text-muted hover:bg-red-950/30 hover:text-red-400
                     transition-colors"
          aria-label="Keluar dari akun"
        >
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="hidden xl:block">Keluar</span>
        </button>
      </div>
    </nav>
  )
}
