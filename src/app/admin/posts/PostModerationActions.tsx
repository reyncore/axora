"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"

interface Props {
  postId:    string
  isDeleted: boolean
}

export function PostModerationActions({ postId, isDeleted }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const action = isDeleted ? "restore" : "delete"

    if (action === "delete") {
      const confirmed = confirm("Hapus post ini? Post akan disembunyikan dari feed.")
      if (!confirmed) return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal memperbarui post")
      }

      toast.success(action === "delete" ? "Post dihapus" : "Post dipulihkan")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={loading}
      className={`p-2 rounded-ax transition-colors flex-shrink-0 ${
        isDeleted
          ? "text-emerald-400 hover:bg-emerald-950/30"
          : "text-red-400 hover:bg-red-950/30"
      }`}
      aria-label={isDeleted ? "Pulihkan post" : "Hapus post"}
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        : isDeleted
          ? <RotateCcw size={15} aria-hidden="true" />
          : <Trash2 size={15} aria-hidden="true" />
      }
    </button>
  )
}
