"use client"

/**
 * Register page — force dynamic karena:
 * 1. Menggunakan signIn() yang bergantung pada request context
 * 2. router.push() setelah register — membutuhkan client-side navigation
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Check, X, Zap } from "lucide-react"
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

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}

  if (form.displayName.trim().length < 2) {
    errors.displayName = "Nama minimal 2 karakter"
  }
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) {
    errors.username = "3–30 karakter, hanya huruf/angka/underscore"
  }
  if (!form.email.includes("@") || !form.email.includes(".")) {
    errors.email = "Email tidak valid"
  }
  if (!PASSWORD_RULES.every(r => r.test(form.password))) {
    errors.password = "Password tidak memenuhi syarat"
  }

  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm]               = useState<FormState>(INITIAL_FORM)
  const [showPass, setShowPass]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleChange(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (fieldErrors[key]) {
        setFieldErrors(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    }
  }

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

    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })

      const body = await res.json() as {
        data?:  unknown
        error?: {
          code?:    string
          message?: string
          details?: {
            fieldErrors?: Record<string, string[] | undefined>
          }
        }
      }

      if (!res.ok) {
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
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={handleChange("displayName")}
              className={fieldClass("displayName")}
              placeholder="Nama lengkapmu"
              autoComplete="name"
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
                id="username"
                type="text"
                value={form.username}
                onChange={handleChange("username")}
                className={cn(fieldClass("username"), "pl-7")}
                placeholder="username_kamu"
                autoComplete="username"
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
              id="reg-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              className={fieldClass("email")}
              placeholder="kamu@email.com"
              autoComplete="email"
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
                value={form.password}
                onChange={handleChange("password")}
                className={cn(fieldClass("password"), "pr-10")}
                placeholder="Buat password yang kuat"
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.password}
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

          <button
            type="submit"
            disabled={loading}
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
