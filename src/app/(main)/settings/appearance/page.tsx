import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

export const metadata: Metadata = {
  title: "Tampilan",
  robots: { index: false, follow: false },
}

export default async function AppearancePage() {
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
        <h1 className="text-base font-bold text-ax-text-primary">Tampilan</h1>
      </div>

      <div className="divide-y divide-ax-bg-border">
        {/* Tema */}
        <section className="px-5 py-5">
          <h2 className="text-sm font-semibold text-ax-text-primary mb-1">Tema</h2>
          <p className="text-xs text-ax-text-muted mb-4">
            Pilih antara mode gelap, terang, atau ikuti preferensi sistem.
          </p>
          <ThemeToggle />
        </section>

        {/* Coming soon placeholders untuk fitur masa depan */}
        <section className="px-5 py-5 opacity-50">
          <h2 className="text-sm font-semibold text-ax-text-primary mb-1">
            Ukuran Teks
            <span className="ml-2 text-[10px] font-normal text-ax-text-hint
                             bg-ax-bg-elevated px-1.5 py-0.5 rounded-full">
              Segera hadir
            </span>
          </h2>
          <p className="text-xs text-ax-text-muted">
            Sesuaikan ukuran teks untuk kenyamanan membaca.
          </p>
        </section>

        <section className="px-5 py-5 opacity-50">
          <h2 className="text-sm font-semibold text-ax-text-primary mb-1">
            Bahasa
            <span className="ml-2 text-[10px] font-normal text-ax-text-hint
                             bg-ax-bg-elevated px-1.5 py-0.5 rounded-full">
              Segera hadir
            </span>
          </h2>
          <p className="text-xs text-ax-text-muted">
            Saat ini tersedia dalam Bahasa Indonesia.
          </p>
        </section>
      </div>
    </div>
  )
}
