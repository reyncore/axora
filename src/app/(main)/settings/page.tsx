import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { User, Bell, Shield, Palette, ChevronRight } from "lucide-react"
import { LogoutButton } from "./LogoutButton"
import type { LucideIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Pengaturan",
  robots: { index: false, follow: false },
}

interface SettingsItem {
  href:  string
  icon:  LucideIcon
  label: string
  desc:  string
}

interface SettingsSection {
  section: string
  items:   SettingsItem[]
}

const SETTINGS_MENU: readonly SettingsSection[] = [
  {
    section: "Akun",
    items: [
      {
        href:  "/settings/profile",
        icon:  User,
        label: "Edit Profil",
        desc:  "Nama, foto, dan bio",
      },
      {
        href:  "/settings/account",
        icon:  Shield,
        label: "Keamanan Akun",
        desc:  "Password dan sesi aktif",
      },
    ],
  },
  {
    section: "Preferensi",
    items: [
      {
        href:  "/settings/notifications",
        icon:  Bell,
        label: "Notifikasi",
        desc:  "Atur apa yang kamu terima",
      },
      {
        href:  "/settings/appearance",
        icon:  Palette,
        label: "Tampilan",
        desc:  "Tema dan ukuran teks",
      },
    ],
  },
] as const

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-5 py-4">
        <h1 className="text-lg font-bold text-ax-text-primary">Pengaturan</h1>
      </div>

      <nav aria-label="Pengaturan akun">
        <div className="divide-y divide-ax-bg-border">
          {SETTINGS_MENU.map(({ section, items }) => (
            <div key={section} className="py-2">
              <p className="px-5 py-2 text-xs font-semibold text-ax-text-muted
                            uppercase tracking-wider">
                {section}
              </p>
              {items.map(({ href, icon: Icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-ax-bg-hover
                             transition-colors group"
                >
                  <div className="w-9 h-9 rounded-ax bg-ax-bg-elevated flex items-center
                                  justify-center flex-shrink-0 group-hover:bg-ax-accent-muted
                                  transition-colors">
                    <Icon
                      size={17}
                      className="text-ax-text-muted group-hover:text-ax-accent-light transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ax-text-primary">{label}</p>
                    <p className="text-xs text-ax-text-muted mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-ax-text-hint group-hover:text-ax-text-muted transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          ))}

          {/* Lainnya */}
          <div className="py-2">
            <p className="px-5 py-2 text-xs font-semibold text-ax-text-muted
                          uppercase tracking-wider">
              Lainnya
            </p>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <footer className="px-5 py-6 text-xs text-ax-text-hint">
        Axora v0.1.0
        {" · "}
        <Link href="/privacy" className="hover:underline">Privasi</Link>
        {" · "}
        <Link href="/terms" className="hover:underline">Ketentuan</Link>
      </footer>
    </div>
  )
}
