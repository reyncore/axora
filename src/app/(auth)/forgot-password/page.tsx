"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ArrowLeft, CheckCircle, Zap, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } }
        throw new Error(body.error?.message ?? "Terjadi kesalahan")
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Koneksi gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ax-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-ax bg-ax-accent flex items-center justify-center">
            <Zap size={18} className="text-white" fill="white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-gradient-ax">Axora</span>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-950/40 flex items-center
                            justify-center mx-auto">
              <CheckCircle size={26} className="text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-ax-text-primary">Cek email kamu</h1>
            <p className="text-sm text-ax-text-muted leading-relaxed">
              Jika <strong className="text-ax-text-secondary">{email}</strong> terdaftar
              di Axora, instruksi reset password sudah dikirim.
              Periksa folder spam jika tidak ada di inbox.
            </p>
            <p className="text-xs text-ax-text-hint">Link berlaku selama 1 jam.</p>
            <Link href="/login"
              className="ax-btn-ghost inline-flex items-center gap-2 px-5 py-2.5 text-sm mt-2">
              <ArrowLeft size={14} aria-hidden="true" /> Kembali ke Login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ax-text-primary mb-1">Lupa password?</h1>
              <p className="text-ax-text-muted text-sm">
                Masukkan email yang terdaftar. Kami akan kirimkan link untuk reset password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div role="alert" className="bg-red-950/40 border border-red-800/50
                                             rounded-ax px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="text-sm font-medium text-ax-text-secondary">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ax-text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="ax-input pl-10"
                    placeholder="kamu@email.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!email.trim() || loading}
                className="ax-btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Mengirim...</>
                  : "Kirim Link Reset"
                }
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ax-text-muted">
              <Link href="/login"
                className="inline-flex items-center gap-1.5 text-ax-accent-light hover:underline">
                <ArrowLeft size={13} aria-hidden="true" /> Kembali ke Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
