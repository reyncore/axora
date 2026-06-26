"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormState {
  email:    string
  password: string
}

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/"

  const [form, setForm]         = useState<FormState>({ email: "", password: "" })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function setField(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      if (error) setError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn("credentials", {
      email:    form.email,
      password: form.password,
      redirect: false,
    })

    if (!result?.ok || result.error) {
      setError("Email atau password salah. Silakan coba lagi.")
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  const isDisabled = loading || !form.email || !form.password

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="bg-red-950/40 border border-red-800/50 rounded-ax px-4 py-3 text-sm text-red-300 animate-fade-in"
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ax-text-secondary">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={setField("email")}
          className="ax-input"
          placeholder="kamu@email.com"
          aria-invalid={!!error}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-ax-text-secondary">
            Password
          </label>
          <button type="button" className="text-xs text-ax-accent-light hover:underline">
            Lupa password?
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={setField("password")}
            className="ax-input pr-10"
            placeholder="Masukkan password"
            aria-invalid={!!error}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ax-text-muted hover:text-ax-text-secondary"
            aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPass
              ? <EyeOff size={16} aria-hidden="true" />
              : <Eye size={16} aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className={cn("ax-btn-primary w-full py-2.5 flex items-center justify-center gap-2")}
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Memuat...</>
          : "Masuk"
        }
      </button>
    </form>
  )
}
