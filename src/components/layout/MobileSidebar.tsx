"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Compass, Bell, MessageSquare, PenSquare } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { MobileUserDrawer } from "@/components/ui/MobileUserDrawer"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MobileUser {
  id:          string
  name?:       string | null
  username:    string
  image?:      string | null
  role?:       "USER" | "ADMIN"
  isVerified?: boolean
}

interface Props {
  user: MobileUser
}

interface NavItem {
  href:   string
  icon:   LucideIcon
  label:  string
  exact?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOBILE_NAV: readonly NavItem[] = [
  { href: "/",              icon: Home,          label: "Beranda",   exact: true },
  { href: "/explore",       icon: Compass,       label: "Eksplor"              },
  { href: "/compose",       icon: PenSquare,     label: "Post"                 },
  { href: "/notifications", icon: Bell,          label: "Notifikasi"           },
  { href: "/messages",      icon: MessageSquare, label: "Pesan"                },
] as const

function isActiveRoute(path: string, href: string, exact: boolean): boolean {
  if (exact) return path === href
  return path === href || path.startsWith(`${href}/`)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileSidebar({ user }: Props) {
  const pathname     = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                   bg-ax-bg-primary/95 backdrop-blur-md
                   border-t border-ax-bg-border"
        aria-label="Navigasi mobile"
      >
        <div className="flex items-center h-14">
          {/* Nav items */}
          {MOBILE_NAV.map(({ href, icon: Icon, label, exact = false }) => {
            const isActive  = isActiveRoute(pathname, href, exact)
            const isCompose = href === "/compose"

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 h-full",
                  "transition-all duration-150",
                  isCompose
                    ? "text-white"
                    : isActive
                      ? "text-ax-accent-light"
                      : "text-ax-text-muted hover:text-ax-text-secondary"
                )}
              >
                {isCompose ? (
                  <div className="w-9 h-9 rounded-xl bg-ax-accent flex items-center
                                  justify-center shadow-md shadow-ax-accent/25">
                    <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      aria-hidden="true"
                    />
                    <span className={cn(
                      "text-[10px] font-medium leading-none",
                      isActive ? "text-ax-accent-light" : "text-ax-text-hint"
                    )}>
                      {label}
                    </span>
                  </>
                )}
              </Link>
            )
          })}

          {/* Avatar — trigger drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu profil"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full
                       transition-opacity hover:opacity-75"
          >
            <Avatar
              name={user.name ?? user.username}
              src={user.image}
              size="xs"
              className="ring-2 ring-transparent hover:ring-ax-accent-light
                         transition-all duration-150"
            />
            <span className="text-[10px] font-medium leading-none text-ax-text-hint">
              Akun
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer */}
      <MobileUserDrawer
        user={user}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
