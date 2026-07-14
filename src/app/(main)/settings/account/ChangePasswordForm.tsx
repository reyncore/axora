"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

interface FieldState {
  value:   string
  visible: boolean
}

export function ChangePasswordForm() {
  const [current, setCurrent] = useState<FieldState>({ value: "", visible: false })
  const [newPass, setNewPass] = useState<FieldState>({ value: "", visible: false })
  const [confirm, setConfirm] = useState<FieldState>({ value: "", visible: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Password strength rules
  const rules = [
    { label: "Minimal 8 karakter", pass: newPass.value.length >= 8 },
    { label: "Mengandung huruf kapital", pass: /[A-Z]/.test(newPass.value) },
    { label: "Mengandung angka", pass: /[0-9]/.test(newPass.value) },
  ]
  const allRulesPassed = rules.every(r => r.pass)
  const passwordMatch  = newPass.value === confirm.value && confirm.value.length > 0
  const canSubmit      = current.value.length > 0 && allRulesPassed && passwordMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)

    try {
      const res = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          currentPassword: current.value,
          newPassword:     newPass.value,
        }),
      })

      const body = await res.json() as { error?: { message?: string } }

      if (!res.ok) {
        throw new Error(body.error?.message ?? "Gagal mengubah password")
      }

      setSuccess(true)
      toast.success("Password berhasil diubah. Silakan login ulang.")

      // Logout setelah 2 detik — JWT lama sudah invalid
      setTimeout(() => {
        void signOut({ callbackUrl: "/login" })
      }, 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-950/30 border
                      border-emerald-700/40 rounded-xl text-emerald-300">
        <CheckCircle size={18} aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Password berhasil diubah</p>
          <p className="text-xs opacity-80">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Current password */}
      <PasswordField
        id="current-password"
        label="Password saat ini"
        state={current}
        onChange={v => setCurrent(s => ({ ...s, value: v }))}
        onToggle={() => setCurrent(s => ({ ...s, visible: !s.visible }))}
        autoComplete="current-password"
      />

      {/* New password */}
      <div>
        <PasswordField
          id="new-password"
          label="Password baru"
          state={newPass}
          onChange={v => setNewPass(s => ({ ...s, value: v }))}
          onToggle={() => setNewPass(s => ({ ...s, visible: !s.visible }))}
          autoComplete="new-password"
        />
        {/* Strength indicator */}
        {newPass.value.length > 0 && (
          <ul className="mt-2 space-y-1" aria-label="Persyaratan password">
            {rules.map(r => (
              <li key={r.label} className={cn(
                "flex items-center gap-1.5 text-xs",
                r.pass ? "text-emerald-400" : "text-ax-text-muted"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  r.pass ? "bg-emerald-400" : "bg-ax-bg-border"
                )} aria-hidden="true" />
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <PasswordField
          id="confirm-password"
          label="Konfirmasi password baru"
          state={confirm}
          onChange={v => setConfirm(s => ({ ...s, value: v }))}
          onToggle={() => setConfirm(s => ({ ...s, visible: !s.visible }))}
          autoComplete="new-password"
        />
        {confirm.value.length > 0 && !passwordMatch && (
          <p className="mt-1 text-xs text-red-400" role="alert">
            Password tidak cocok
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full ax-btn-primary py-2.5 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {loading ? "Menyimpan..." : "Ubah Password"}
      </button>
    </form>
  )
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function PasswordField({
  id, label, state, onChange, onToggle, autoComplete,
}: {
  id:           string
  label:        string
  state:        FieldState
  onChange:     (v: string) => void
  onToggle:     () => void
  autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-ax-text-secondary mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2 ax-input pr-2">
        <input
          id={id}
          type={state.visible ? "text" : "password"}
          value={state.value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-ax-text-primary outline-none
                     placeholder:text-ax-text-muted"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-ax-text-muted hover:text-ax-text-secondary transition-colors p-1"
          aria-label={state.visible ? "Sembunyikan password" : "Tampilkan password"}
        >
          {state.visible
            ? <EyeOff size={15} aria-hidden="true" />
            : <Eye    size={15} aria-hidden="true" />
          }
        </button>
      </div>
    </div>
  )
}
