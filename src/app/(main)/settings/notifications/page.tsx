import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NotificationPrefsForm } from "./NotificationPrefsForm"
import { DEFAULT_NOTIF_PREFS } from "@/app/api/settings/notifications/route"
import type { NotificationPrefs } from "@/app/api/settings/notifications/route"

export const metadata: Metadata = {
  title: "Preferensi Notifikasi",
  robots: { index: false, follow: false },
}

export default async function NotificationSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { notificationPrefs: true },
  })

  // Parse dengan fallback ke default jika field belum ada atau malformed
  let prefs: NotificationPrefs = DEFAULT_NOTIF_PREFS
  if (user?.notificationPrefs && typeof user.notificationPrefs === "object") {
    const raw = user.notificationPrefs as Record<string, unknown>
    prefs = {
      like:    typeof raw.like    === "boolean" ? raw.like    : true,
      follow:  typeof raw.follow  === "boolean" ? raw.follow  : true,
      comment: typeof raw.comment === "boolean" ? raw.comment : true,
      mention: typeof raw.mention === "boolean" ? raw.mention : true,
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-4 py-3 flex items-center gap-4">
        <Link
          href="/settings"
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all flex-shrink-0"
          aria-label="Kembali ke pengaturan"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-base font-bold text-ax-text-primary">Notifikasi</h1>
      </div>

      <div className="px-5 py-5">
        <p className="text-sm text-ax-text-muted mb-6">
          Pilih jenis notifikasi yang ingin kamu terima.
        </p>
        <NotificationPrefsForm initialPrefs={prefs} />
      </div>
    </div>
  )
}
