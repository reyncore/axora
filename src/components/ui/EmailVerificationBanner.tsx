"use client"

import { useState } from "react"
import { Mail, X, Loader2, CheckCircle } from "lucide-react"
import { toast } from "@/lib/toast"

interface Props {
  email: string
}

export function EmailVerificationBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)

  if (dismissed) return null

  async function handleResend() {
    setSending(true)
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" })
      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal mengirim email")
      }
      setSent(true)
      toast.success("Email verifikasi terkirim!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="alert"
      className="bg-amber-950/40 border-b border-amber-800/50 px-4 py-2.5
                 flex items-center gap-3 text-sm"
    >
      <Mail size={15} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 text-amber-200 text-xs leading-relaxed">
        Verifikasi email kamu{" "}
        <span className="font-medium text-amber-100">{email}</span>
        {" "}untuk mengamankan akun.{" "}
        {!sent ? (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={sending}
            className="underline hover:no-underline font-medium text-amber-100
                       disabled:opacity-60 inline-flex items-center gap-1"
          >
            {sending
              ? <><Loader2 size={11} className="animate-spin" /> Mengirim...</>
              : "Kirim ulang email"
            }
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle size={11} aria-hidden="true" />
            Email terkirim!
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-400 transition-colors flex-shrink-0"
        aria-label="Tutup notifikasi"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
