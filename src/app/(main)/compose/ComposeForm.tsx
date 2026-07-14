"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, ImageOff } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { FileUpload, type UploadedMedia } from "@/components/ui/upload"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

interface ComposeUser {
  id:       string
  name?:    string | null
  username: string
  image?:   string | null
}

interface Props { user: ComposeUser }

const MAX_CHARS = 500

export function ComposeForm({ user }: Props) {
  const router = useRouter()

  const [content, setContent] = useState("")
  const [media, setMedia]     = useState<UploadedMedia[]>([])
  const [loading, setLoading] = useState(false)

  const hasDraft    = content.trim().length > 0 || media.length > 0
  const remaining   = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const canPost     = hasDraft && !isOverLimit && !loading

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasDraft) return
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasDraft])

  function handleBack() {
    if (hasDraft && !confirm("Buang draft post ini?")) return
    router.back()
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handleSubmit = useCallback(async () => {
    if (!canPost) return
    setLoading(true)
    try {
      const res = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: content.trim(), mediaIds: media.map(m => m.id) }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal membuat post")
      }
      toast.success("Post berhasil dipublikasikan!")
      router.push("/")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setLoading(false)
    }
  }, [canPost, content, media, router])

  return (
    <div className="flex flex-col min-h-screen lg:min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ax-bg-primary/95 backdrop-blur-md
                      border-b border-ax-bg-border px-3 py-2.5
                      flex items-center justify-between">
        <button type="button" onClick={handleBack}
          className="p-2 rounded-full hover:bg-ax-bg-subtle text-ax-text-primary transition-colors"
          aria-label="Batal dan kembali">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void handleSubmit()} disabled={!canPost}
          className="ax-btn-primary min-w-[92px] py-1.5 flex items-center justify-center gap-2 text-sm">
          {loading
            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            : "Posting"}
        </button>
      </div>

      {/* Form body */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          <Avatar name={user.name ?? user.username} src={user.image} size="md"
            className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-3">
            <textarea
              value={content}
              onChange={handleTextareaChange}
              placeholder="Apa yang sedang kamu pikirkan?"
              rows={5}
              aria-label="Tulis post baru"
              className="w-full bg-transparent resize-none text-[16px] text-ax-text-primary
                         placeholder:text-ax-text-muted focus:outline-none leading-relaxed"
            />

            {/* Media preview grid */}
            {media.length > 0 && (
              <div className={cn("grid gap-1.5 rounded-xl overflow-hidden",
                media.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {media.map((m, i) => (
                  <MediaPreviewTile
                    key={m.id} media={m} isSingle={media.length === 1}
                    onRemove={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-ax-bg-border bg-ax-bg-primary
                      px-4 py-3 pb-safe flex items-center justify-between gap-3">
        <FileUpload
          purpose="POST"
          compact={true}
          disabled={media.length >= 4 || loading}
          onUpload={(uploaded) => {
            if (media.length < 4) setMedia(prev => [...prev, uploaded])
          }}
        />
        {content.length > 0 && (
          <span className={cn("text-xs tabular-nums flex-shrink-0",
            isOverLimit ? "text-red-400 font-medium"
            : remaining <= 20 ? "text-yellow-400" : "text-ax-text-muted")}
            aria-live="polite">
            {remaining}
          </span>
        )}
      </div>
    </div>
  )
}

function MediaPreviewTile({ media, isSingle, onRemove }: {
  media: UploadedMedia; isSingle: boolean; onRemove: () => void
}) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={cn("relative rounded-xl overflow-hidden bg-ax-bg-elevated group",
      isSingle ? "aspect-[16/9]" : "aspect-square")}>
      {broken ? (
        <div className="w-full h-full flex items-center justify-center text-ax-text-hint">
          <ImageOff size={18} aria-hidden="true" />
        </div>
      ) : media.type === "VIDEO" ? (
        <div className="w-full h-full flex items-center justify-center bg-ax-bg-subtle text-2xl">
          🎬
        </div>
      ) : (
        <img src={media.thumbUrl ?? media.fileUrl} alt=""
          className="w-full h-full object-cover" onError={() => setBroken(true)} />
      )}
      <button type="button" onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80
                   rounded-full flex items-center justify-center text-white text-xs
                   opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors"
        aria-label="Hapus media">×</button>
    </div>
  )
}
