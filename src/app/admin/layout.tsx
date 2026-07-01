import { requireAdmin } from "@/lib/admin"
import Link from "next/link"
import { LayoutDashboard, Users, FileText, ArrowLeft, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"

/**
 * noindex di layout level — berlaku untuk SEMUA sub-route /admin/*
 * (dashboard, users, posts) tanpa perlu duplikasi di setiap page.tsx.
 * Defense-in-depth bersama robots.txt yang sudah disallow /admin/.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV_ITEMS = [
  { href: "/admin",       icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users,           label: "Pengguna"  },
  { href: "/admin/posts", icon: FileText,        label: "Post"      },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return (
    <div className="flex min-h-screen bg-ax-bg-primary">
      {/* Sidebar */}
      <aside
        className="w-[220px] flex-shrink-0 border-r border-ax-bg-border
                   flex flex-col h-screen sticky top-0 px-3 py-4"
        aria-label="Navigasi admin"
      >
        <div className="flex items-center gap-2 px-3 py-2 mb-4">
          <ShieldCheck size={18} className="text-ax-accent-light" aria-hidden="true" />
          <span className="text-sm font-semibold text-ax-text-primary">Admin Panel</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-ax text-sm
                         text-ax-text-secondary hover:text-ax-text-primary
                         hover:bg-ax-bg-subtle transition-colors"
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="px-3 py-2 border-t border-ax-bg-border pt-3">
          <p className="text-xs text-ax-text-muted mb-2">
            Masuk sebagai{" "}
            <span className="text-ax-text-secondary font-medium">
              @{session.user.username}
            </span>
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-ax-accent-light hover:underline"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Kembali ke Axora
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6">
        {children}
      </main>
    </div>
  )
}
