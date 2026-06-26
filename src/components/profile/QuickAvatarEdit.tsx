"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2 } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { toast } from "@/lib/toast"

interface Props {
  username:    string
  displayName: string
  avatarUrl:   string | null
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

/**
 * QuickAvatarEdit — overlay edit langsung di avatar halaman profile.
 * Hanya dirender untuk profile owner (isOwner check dilakukan di parent).
 *
 * Reuse endpoint yang sama dengan EditProfileForm di /settings/profile:
 * POST /api/upload (upload file) lalu PATCH /api/users/[username] (update avatarUrl).
 * Tidak ada duplikasi logic backend — hanya UI alternatif yang lebih cepat diakses.
 */
export function QuickAvatarEdit({ username, displayName, avatarUrl }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Foto profil maksimal 5MB")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append("file", file)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
      if (!uploadRes.ok) throw new Error("Gagal mengupload foto")
      const uploadJson = await uploadRes.json() as { data: { url: string } }

      const patchRes = await fetch(`/api/users/${username}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ avatarUrl: uploadJson.data.url }),
      })

      if (!patchRes.ok) {
        const json = await patchRes.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal menyimpan foto profil")
      }

      toast.success("Foto profil diperbarui!")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setPreview(null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="relative group">
      <Avatar
        name={displayName}
        src={preview ?? avatarUrl}
        size="xl"
        className="border-4 border-ax-bg-primary shadow-lg"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/55
                   opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                   transition-opacity flex items-center justify-center
                   disabled:cursor-wait"
        aria-label="Ganti foto profil"
      >
        {uploading
          ? <Loader2 size={20} className="text-white animate-spin" aria-hidden="true" />
          : <Camera  size={20} className="text-white" aria-hidden="true" />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={e => void handleFileChange(e)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
