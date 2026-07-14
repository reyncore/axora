"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2 } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { FileUpload, type UploadedMedia } from "@/components/ui/upload"
import { toast } from "@/lib/toast"

interface Props {
  username:    string
  displayName: string
  avatarUrl:   string | null
}

export function QuickAvatarEdit({ username, displayName, avatarUrl }: Props) {
  const router = useRouter()
  const [preview, setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  async function handleUpload(media: UploadedMedia) {
    setUploading(true)
    setPreview(media.thumbUrl ?? media.fileUrl)
    try {
      const res = await fetch(`/api/users/${username}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ avatarUrl: media.fileUrl }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal menyimpan foto profil")
      }
      toast.success("Foto profil diperbarui!")
      setShowPicker(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setPreview(null)
    } finally {
      setUploading(false)
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

      {/* Overlay button */}
      <button
        type="button"
        onClick={() => setShowPicker(v => !v)}
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

      {/* FileUpload picker — muncul di bawah avatar */}
      {showPicker && !uploading && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 w-64
                        bg-ax-bg-elevated border border-ax-bg-border rounded-xl shadow-xl p-3">
          <FileUpload
            purpose="AVATAR"
            compact={false}
            onUpload={(media) => void handleUpload(media)}
          />
        </div>
      )}

      {/* Click outside to close */}
      {showPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} aria-hidden="true" />
      )}
    </div>
  )
}
