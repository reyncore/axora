"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Check, X, Zap, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const PASSWORD_RULES = [
  { label: "Minimal 8 karakter", test: (v: string) => v.length >= 8 },
  { label: "Ada huruf kapital",  test: (v: string) => /[A-Z]/.test(v) },
  { label: "Ada angka",          test: (v: string) => /[0-9]/.test(v) },
] as const

function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get("token")

  const [password, setPassword]   = useState("")
  const [confirm, setConfirm]     = useState("")
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const rulesPassed = PASSWORD_RULES.every(r => r.test(password))
  const passMatch   = password === confirm && confirm.length > 0
  const canSubmit   = !!token && rulesPassed && passMatch && !loading

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/40 flex items-center
                        justify-center mx-auto">
          <AlertCircle size={22} className="text-red-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-ax-text-primary">Link tidak valid</h2>
        <p className="text-sm text-ax-text-muted">
          Link reset password tidak valid atau sudah kedaluwarsa.
        </p>
        <Link href="/login" className="ax-btn-primary inline-block px-6 py-2.5 text-sm">
          Kembali ke Login
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-950/40 flex items-center
                        justify-center mx-auto">
          <CheckCircle size={22} className="text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-ax-text-primary">Password berhasil direset</h2>
        <p className="text-sm text-ax-text-muted">
          Password kamu sudah diperbarui. Silakan login dengan password baru.
        </p>
        <Link href="/login" className="ax-btn-primary inline-block px-6 py-2.5 text-sm">
          Login Sekarang
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      })

      const body = await res.json() as { error?: { message?: string } }

      if (!res.ok) {
        setError(body.error?.message ?? "Terjadi kesalahan, coba lagi")
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("Koneksi gagal. Periksa koneksi internet kamu.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="bg-red-950/40 border border-red-800/50
                                     rounded-ax px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="new-pass" className="text-sm font-medium text-ax-text-secondary">
          Password Baru
        </label>
        <div className="relative">
          <input
            id="new-pass"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="ax-input pr-10"
            placeholder="Buat password baru"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-ax-text-muted hover:text-ax-text-secondary transition-colors"
            aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPass
              ? <EyeOff size={16} aria-hidden="true" />
              : <Eye    size={16} aria-hidden="true" />
            }
          </button>
        </div>

        {password && (
          <ul className="space-y-1 mt-2">
            {PASSWORD_RULES.map(rule => {
              const passed = rule.test(password)
              return (
                <li key={rule.label} className={cn(
                  "flex items-center gap-2 text-xs",
                  passed ? "text-emerald-400" : "text-ax-text-muted"
                )}>
                  {passed
                    ? <Check size={12} aria-hidden="true" />
                    : <X size={12} className="text-ax-text-hint" aria-hidden="true" />
                  }
                  {rule.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-pass" className="text-sm font-medium text-ax-text-secondary">
          Konfirmasi Password
        </label>
        <input
          id="confirm-pass"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={cn("ax-input", confirm && !passMatch && "border-red-600")}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
        />
        {confirm && !passMatch && (
          <p className="text-xs text-red-400" role="alert">Password tidak cocok</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="ax-btn-primary w-full py-2.5 flex items-center justify-center gap-2"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Menyimpan...</>
          : "Reset Password"
        }
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-ax-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-ax bg-ax-accent flex items-center justify-center">
            <Zap size={18} className="text-white" fill="white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-gradient-ax">Axora</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ax-text-primary mb-1">Reset Password</h1>
          <p className="text-ax-text-muted text-sm">Buat password baru untuk akun kamu</p>
        </div>

        <Suspense fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-ax-bg-elevated rounded-ax" />
            <div className="h-10 bg-ax-bg-elevated rounded-ax" />
            <div className="h-10 bg-ax-accent/30 rounded-full" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
