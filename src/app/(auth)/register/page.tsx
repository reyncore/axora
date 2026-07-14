"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Check, X, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  displayName: string
  username:    string
  email:       string
  password:    string
}

type FormErrors = Partial<Record<keyof FormState, string>>

interface PasswordRule {
  label: string
  test:  (v: string) => boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PASSWORD_RULES: readonly PasswordRule[] = [
  { label: "Minimal 8 karakter", test: v => v.length >= 8   },
  { label: "Ada huruf kapital",  test: v => /[A-Z]/.test(v) },
  { label: "Ada angka",          test: v => /[0-9]/.test(v) },
] as const

const INITIAL_FORM: FormState = {
  displayName: "",
  username:    "",
  email:       "",
  password:    "",
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (form.displayName.trim().length < 2) errors.displayName = "Nama minimal 2 karakter"
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) errors.username = "3–30 karakter, hanya huruf/angka/underscore"
  if (!form.email.includes("@") || !form.email.includes(".")) errors.email = "Email tidak valid"
  if (!PASSWORD_RULES.every(r => r.test(form.password))) errors.password = "Password tidak memenuhi syarat"
  return errors
}

// ── Turnstile Widget ──────────────────────────────────────────────────────────

/**
 * Turnstile widget — load script sekali, render widget ke container div.
 *
 * LIFECYCLE:
 * - Script di-load via useEffect, tidak blocking render
 * - Widget di-render setelah script ready via window.onTurnstileLoad callback
 * - Token di-pass ke parent via onToken callback
 * - onExpire: token expire setelah 5 menit — widget auto-refresh, token di-clear
 * - onError: widget gagal (network issue) — token di-clear, user perlu reload
 *
 * DISABLED STATE:
 * Submit button disabled sampai token tersedia — mencegah submit sebelum
 * widget ready, terutama di mobile dengan koneksi lambat.
 */

declare global {
  interface Window {
    turnstile?: {
      render:  (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset:   (widgetId: string) => void
      remove:  (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileWidgetProps {
  onToken:  (token: string) => void
  onExpire: () => void
  onError:  () => void
}

function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef  = useRef<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return

    // Cleanup existing widget sebelum render ulang
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey:   SITE_KEY,
      theme:     "auto",
      callback:  (token: string) => {
        setStatus("ready")
        onToken(token)
      },
      "expired-callback": () => {
        onExpire()
        // Widget otomatis request token baru — tidak perlu manual reset
      },
      "error-callback": () => {
        setStatus("error")
        onError()
      },
    })

    setStatus("ready")
  }, [onToken, onExpire, onError])

  useEffect(() => {
    if (!SITE_KEY) return

    // Jika script sudah ada (misal HMR reload), langsung render
    if (window.turnstile) {
      renderWidget()
      return
    }

    // Load script dengan onload callback
    window.onTurnstileLoad = renderWidget

    const script    = document.createElement("script")
    script.src      = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
    script.async    = true
    script.defer    = true
    script.onerror  = () => {
      setStatus("error")
      onError()
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup widget saat unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget, onError])

  if (!SITE_KEY) return null

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-ax-text-muted">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          Memuat verifikasi...
        </div>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400" role="alert">
          Gagal memuat CAPTCHA. Periksa koneksi internet kamu.
        </p>
      )}
      {status === "ready" && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <ShieldCheck size={12} aria-hidden="true" />
          Verifikasi tersedia
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm]                   = useState<FormState>(INITIAL_FORM)
  const [showPass, setShowPass]           = useState(false)
  const [loading, setLoading]             = useState(false)
  const [fieldErrors, setFieldErrors]     = useState<FormErrors>({})
  const [globalError, setGlobalError]     = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaReady, setCaptchaReady]   = useState(!SITE_KEY) // skip jika SITE_KEY tidak ada

  function handleChange(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (fieldErrors[key]) {
        setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
      }
    }
  }

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token)
    setCaptchaReady(true)
    setGlobalError(null)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
    setCaptchaReady(false)
  }, [])

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null)
    setCaptchaReady(false)
    setGlobalError("Verifikasi CAPTCHA gagal. Periksa koneksi internet kamu.")
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setGlobalError(null)

    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    if (SITE_KEY && !turnstileToken) {
      setGlobalError("Selesaikan verifikasi CAPTCHA terlebih dahulu")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, turnstileToken: turnstileToken ?? "" }),
      })

      const body = await res.json() as {
        data?:  unknown
        error?: {
          code?:    string
          message?: string
          details?: { fieldErrors?: Record<string, string[] | undefined> }
        }
      }

      if (!res.ok) {
        // Kalau CAPTCHA gagal, reset token — token sudah tidak bisa dipakai lagi
        if (body.error?.code === "CAPTCHA_FAILED") {
          setTurnstileToken(null)
          setCaptchaReady(false)
        }

        if (body.error?.code === "CONFLICT") {
          setGlobalError(body.error.message ?? "Email atau username sudah digunakan")
        } else if (body.error?.details?.fieldErrors) {
          const serverErrors: FormErrors = {}
          for (const [key, msgs] of Object.entries(body.error.details.fieldErrors)) {
            const firstMsg = msgs?.[0]
            if (firstMsg && key in INITIAL_FORM) {
              serverErrors[key as keyof FormState] = firstMsg
            }
          }
          setFieldErrors(serverErrors)
        } else {
          setGlobalError(body.error?.message ?? "Terjadi kesalahan. Coba lagi.")
        }
        setLoading(false)
        return
      }

      // Auto-login setelah register berhasil
      const signInResult = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push("/")
      } else {
        router.push("/login?registered=1")
      }
    } catch {
      setGlobalError("Koneksi gagal. Periksa koneksi internet kamu.")
      setLoading(false)
    }
  }

  function fieldClass(key: keyof FormState) {
    return cn("ax-input", fieldErrors[key] && "border-red-600 focus:border-red-500")
  }

  return (
    <div className="min-h-screen bg-ax-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-ax bg-ax-accent flex items-center justify-center">
            <Zap size={18} className="text-white" fill="white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-gradient-ax">Axora</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ax-text-primary mb-1">Buat akun baru</h1>
          <p className="text-ax-text-muted text-sm">
            Bergabung dengan komunitas builder Indonesia
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {globalError && (
            <div
              role="alert"
              className="bg-red-950/40 border border-red-800/50 rounded-ax px-4 py-3
                         text-sm text-red-300 animate-fade-in"
            >
              {globalError}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-ax-text-secondary">
              Nama Tampilan
            </label>
            <input
              id="displayName" type="text" value={form.displayName}
              onChange={handleChange("displayName")} className={fieldClass("displayName")}
              placeholder="Nama lengkapmu" autoComplete="name"
              aria-describedby={fieldErrors.displayName ? "displayName-error" : undefined}
              aria-invalid={!!fieldErrors.displayName}
            />
            {fieldErrors.displayName && (
              <p id="displayName-error" role="alert" className="text-xs text-red-400">
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-ax-text-secondary">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ax-text-muted text-sm select-none">
                @
              </span>
              <input
                id="username" type="text" value={form.username}
                onChange={handleChange("username")}
                className={cn(fieldClass("username"), "pl-7")}
                placeholder="username_kamu" autoComplete="username"
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
                aria-invalid={!!fieldErrors.username}
              />
            </div>
            {fieldErrors.username && (
              <p id="username-error" role="alert" className="text-xs text-red-400">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium text-ax-text-secondary">
              Email
            </label>
            <input
              id="reg-email" type="email" value={form.email}
              onChange={handleChange("email")} className={fieldClass("email")}
              placeholder="kamu@email.com" autoComplete="email"
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="text-xs text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium text-ax-text-secondary">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPass ? "text" : "password"}
                value={form.password} onChange={handleChange("password")}
                className={cn(fieldClass("password"), "pr-10")}
                placeholder="Buat password yang kuat" autoComplete="new-password"
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button" onClick={() => setShowPass(v => !v)}
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

            {form.password && (
              <ul className="space-y-1 mt-2" aria-label="Syarat password">
                {PASSWORD_RULES.map(rule => {
                  const passed = rule.test(form.password)
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-2 text-xs",
                        passed ? "text-emerald-400" : "text-ax-text-muted"
                      )}
                    >
                      {passed
                        ? <Check size={12} className="flex-shrink-0" aria-hidden="true" />
                        : <X    size={12} className="flex-shrink-0 text-ax-text-hint" aria-hidden="true" />
                      }
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Turnstile CAPTCHA */}
          {SITE_KEY && (
            <TurnstileWidget
              onToken={handleTurnstileToken}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
            />
          )}

          <button
            type="submit"
            disabled={loading || (!!SITE_KEY && !captchaReady)}
            className="ax-btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Mendaftar...</>
              : "Buat Akun"
            }
          </button>

          <p className="text-xs text-center text-ax-text-hint leading-relaxed">
            Dengan mendaftar, kamu setuju dengan{" "}
            <Link href="/terms" className="text-ax-accent-light hover:underline">
              Ketentuan Layanan
            </Link>
            {" "}dan{" "}
            <Link href="/privacy" className="text-ax-accent-light hover:underline">
              Kebijakan Privasi
            </Link>{" "}
            Axora.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-ax-text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-ax-accent-light hover:underline font-medium">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
