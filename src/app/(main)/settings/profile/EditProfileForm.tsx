"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Check } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { Input } from "@/components/ui/Input"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileUser {
  id:          string
  username:    string
  displayName: string
  bio:         string | null
  avatarUrl:   string | null
  bannerUrl:   string | null
}

interface FormState {
  displayName: string
  bio:         string
}

type FormErrors = Partial<Record<keyof FormState, string>>

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BIO          = 160
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.displayName.trim()) {
    errors.displayName = "Nama tidak boleh kosong"
  } else if (form.displayName.trim().length > 50) {
    errors.displayName = "Maksimal 50 karakter"
  }
  if (form.bio.length > MAX_BIO) {
    errors.bio = `Maksimal ${MAX_BIO} karakter`
  }
  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()

  const [form, setForm]               = useState<FormState>({
    displayName: user.displayName,
    bio:         user.bio ?? "",
  })
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [saved, setSaved]             = useState(false)
  const [errors, setErrors]           = useState<FormErrors>({})

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const savedTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer saat komponen unmount agar tidak setState setelah unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Foto profil maksimal 5MB")
      return
    }

    // Revoke URL lama jika ada
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function clearFieldError(key: keyof FormState) {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      let avatarUrl = user.avatarUrl

      // Upload avatar baru jika ada
      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (!uploadRes.ok) throw new Error("Gagal upload foto profil")
        const uploadJson = await uploadRes.json() as { data: { url: string } }
        avatarUrl = uploadJson.data.url
      }

      // Update profil
      const res = await fetch(`/api/users/${user.username}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          displayName: form.displayName.trim(),
          bio:         form.bio.trim(),
          avatarUrl,
        }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal menyimpan profil")
      }

      setSaved(true)
      toast.success("Profil berhasil disimpan!")
      router.refresh()

      // Reset saved state setelah 2 detik — tracked agar bisa di-cleanup saat unmount
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const bioRemaining  = MAX_BIO - form.bio.length
  const isBioOverLimit = bioRemaining < 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6" noValidate>
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar
            name={form.displayName || user.username}
            src={avatarPreview ?? user.avatarUrl}
            size="xl"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0
                       group-hover:opacity-100 transition-opacity
                       flex items-center justify-center"
            aria-label="Ganti foto profil"
          >
            <Camera size={20} className="text-white" aria-hidden="true" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarChange}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-ax-text-primary">Foto Profil</p>
          <p className="text-xs text-ax-text-muted mt-0.5">JPG, PNG, WEBP · Maks 5MB</p>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="text-xs text-ax-accent-light hover:underline mt-1"
          >
            Ganti foto
          </button>
        </div>
      </div>

      <div className="h-px bg-ax-bg-border" role="separator" />

      {/* Display Name */}
      <Input
        label="Nama Tampilan"
        value={form.displayName}
        onChange={e => {
          setForm(prev => ({ ...prev, displayName: e.target.value }))
          clearFieldError("displayName")
        }}
        error={errors.displayName}
        maxLength={50}
        placeholder="Nama lengkapmu"
        autoComplete="name"
      />

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="bio" className="text-sm font-medium text-ax-text-secondary">
            Bio
          </label>
          <span
            className={cn(
              "text-xs tabular-nums",
              isBioOverLimit    ? "text-red-400"
              : bioRemaining <= 20 ? "text-yellow-400"
              :                    "text-ax-text-muted"
            )}
            aria-live="polite"
            aria-label={`${bioRemaining} karakter tersisa untuk bio`}
          >
            {bioRemaining}
          </span>
        </div>
        <textarea
          id="bio"
          value={form.bio}
          onChange={e => {
            setForm(prev => ({ ...prev, bio: e.target.value }))
            clearFieldError("bio")
          }}
          placeholder="Ceritakan sedikit tentang dirimu..."
          rows={3}
          className={cn(
            "ax-input resize-none",
            errors.bio && "border-red-600 focus:border-red-500"
          )}
          aria-describedby={errors.bio ? "bio-error" : undefined}
          aria-invalid={!!errors.bio}
        />
        {errors.bio && (
          <p id="bio-error" role="alert" className="text-xs text-red-400">
            ⚠ {errors.bio}
          </p>
        )}
      </div>

      {/* Username — read-only */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ax-text-secondary">Username</p>
        <div className="ax-input flex items-center gap-2 opacity-60 pointer-events-none">
          <span className="text-ax-text-muted" aria-hidden="true">@</span>
          <span className="text-ax-text-secondary text-sm">{user.username}</span>
        </div>
        <p className="text-xs text-ax-text-hint">Username tidak dapat diubah saat ini</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="ax-btn-ghost px-5 py-2.5"
          disabled={loading}
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={loading || saved || isBioOverLimit}
          className={cn(
            "ax-btn-primary flex items-center gap-2 min-w-[120px] justify-center",
            saved && "bg-emerald-600 hover:bg-emerald-600"
          )}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Menyimpan...</>
          ) : saved ? (
            <><Check size={14} aria-hidden="true" /> Tersimpan!</>
          ) : (
            "Simpan Profil"
          )}
        </button>
      </div>
    </form>
  )
}
