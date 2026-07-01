"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"

interface Props {
  username: string
}

export function MessageButton({ username }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal membuka percakapan")
      }

      const json = await res.json() as { data: { conversationId: string } }
      router.push(`/messages/${json.data.conversationId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="ax-btn-ghost flex items-center gap-1.5 px-4 py-1.5"
      aria-label={`Kirim pesan ke @${username}`}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        : <MessageCircle size={14} aria-hidden="true" />
      }
      Pesan
    </button>
  )
}
