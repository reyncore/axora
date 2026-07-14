import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ChangePasswordForm } from "./ChangePasswordForm"

export const metadata: Metadata = {
  title: "Keamanan Akun",
  robots: { index: false, follow: false },
}

export default async function AccountSecurityPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

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
        <h1 className="text-base font-bold text-ax-text-primary">Keamanan Akun</h1>
      </div>

      <div className="divide-y divide-ax-bg-border">
        {/* Ganti password */}
        <section className="px-5 py-5" aria-label="Ganti password">
          <h2 className="text-sm font-semibold text-ax-text-primary mb-1">
            Ganti Password
          </h2>
          <p className="text-xs text-ax-text-muted mb-4">
            Setelah ganti password, semua sesi di perangkat lain akan otomatis keluar.
          </p>
          <ChangePasswordForm />
        </section>

        {/* Info sesi */}
        <section className="px-5 py-5" aria-label="Informasi sesi">
          <h2 className="text-sm font-semibold text-ax-text-primary mb-1">
            Sesi Aktif
          </h2>
          <p className="text-xs text-ax-text-muted mb-3">
            Kamu sedang login di perangkat ini. Untuk logout dari semua perangkat,
            ganti password — semua sesi lama akan otomatis tidak valid.
          </p>
          <div className="bg-ax-bg-elevated border border-ax-bg-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
                   aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-ax-text-primary">
                  Perangkat ini
                </p>
                <p className="text-xs text-ax-text-muted">Sesi aktif sekarang</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
