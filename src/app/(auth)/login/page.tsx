import { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "./LoginForm"
import Link from "next/link"
import { Zap } from "lucide-react"

export const metadata: Metadata = {
  title:       "Masuk ke Axora",
  description: "Login ke komunitas builder Axora",
}

/**
 * export dynamic = "force-dynamic" diperlukan karena:
 * 1. LoginForm menggunakan useSearchParams() untuk callbackUrl
 * 2. Next.js tidak bisa static-render halaman yang bergantung request params
 * 3. Tanpa ini build akan gagal dengan "Page changed from static to dynamic"
 */
export const dynamic = "force-dynamic"

const SOCIAL_PROOF = [
  { initials: "Rz", color: "#7c3aed" },
  { initials: "Sa", color: "#0f766e" },
  { initials: "Ad", color: "#b45309" },
  { initials: "Di", color: "#be185d" },
  { initials: "Fz", color: "#1d4ed8" },
] as const

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ax-bg-primary flex">
      {/* Left panel — branding (hanya desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-ax-bg-secondary
                      border-r border-ax-bg-border p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-ax bg-ax-accent flex items-center justify-center">
            <Zap size={18} className="text-white" fill="white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-gradient-ax">Axora</span>
        </div>

        <div>
          <blockquote className="text-3xl font-bold text-ax-text-primary leading-snug mb-6">
            &ldquo;Tempat terbaik untuk builder Indonesia berkumpul dan tumbuh bersama.&rdquo;
          </blockquote>

          <div className="flex -space-x-3 mb-4" aria-hidden="true">
            {SOCIAL_PROOF.map(({ initials, color }) => (
              <div
                key={initials}
                className="w-10 h-10 rounded-full border-2 border-ax-bg-secondary
                           flex items-center justify-center text-xs text-white font-medium"
                style={{ background: color }}
              >
                {initials}
              </div>
            ))}
          </div>
          <p className="text-sm text-ax-text-muted">
            Bergabung dengan 1.200+ builder aktif
          </p>
        </div>

        <p className="text-xs text-ax-text-hint">
          © 2025 Axora · Dibuat dengan ☕ di Indonesia
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-ax bg-ax-accent flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-gradient-ax">Axora</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ax-text-primary mb-1">
              Selamat datang kembali
            </h1>
            <p className="text-ax-text-muted text-sm">Masuk ke akun Axora kamu</p>
          </div>

          {/**
           * Suspense boundary WAJIB di sini karena LoginForm menggunakan
           * useSearchParams() untuk membaca callbackUrl.
           *
           * Tanpa Suspense: Next.js build error "useSearchParams() requires Suspense"
           * Fallback minimal agar tidak ada layout shift saat hydration.
           */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-ax-text-muted">
            Belum punya akun?{" "}
            <Link href="/register" className="text-ax-accent-light hover:underline font-medium">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton fallback untuk LoginForm — ditampilkan saat hydration.
 * Harus mirip layout form asli untuk menghindari layout shift (CLS).
 */
function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="space-y-1.5">
        <div className="h-4 w-10 bg-ax-bg-elevated rounded" />
        <div className="h-10 bg-ax-bg-elevated rounded-ax" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-16 bg-ax-bg-elevated rounded" />
        <div className="h-10 bg-ax-bg-elevated rounded-ax" />
      </div>
      <div className="h-10 bg-ax-accent/30 rounded-full" />
    </div>
  )
}
