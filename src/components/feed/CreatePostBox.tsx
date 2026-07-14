"use client"

import { useState, useRef, useCallback } from "react"
import { ImageIcon, Smile, Hash, X, Loader2 } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { PostData } from "@/types"

interface SessionUser {
  id:       string
  name?:    string | null
  username: string
  image?:   string | null
}

interface Props {
  user:           SessionUser
  onPostCreated?: (post: PostData) => void
}

const MAX_CHARS  = 500
const MAX_IMAGES = 4

export function CreatePostBox({ user, onPostCreated }: Props) {
  const [content, setContent]   = useState("")
  const [images, setImages]     = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading]   = useState(false)
  const [focused, setFocused]   = useState(false)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)
  const fileInputRef            = useRef<HTMLInputElement>(null)

  const remaining   = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const isEmpty     = content.trim().length === 0 && images.length === 0

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const slots    = MAX_IMAGES - images.length
    const selected = Array.from(e.target.files ?? []).slice(0, slots)

    setImages(prev => [...prev, ...selected])
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
    e.target.value = ""
  }

  function removeImage(index: number) {
    const url = previews[index]
    if (url) URL.revokeObjectURL(url)
    setImages(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = useCallback(async () => {
    if (isEmpty || isOverLimit || loading) return
    setLoading(true)

    try {
      let mediaIds: string[] = []

      if (images.length > 0) {
        mediaIds = await Promise.all(
          images.map(async file => {
            const form = new FormData()
            form.append("file", file)
            const res = await fetch("/api/upload", { method: "POST", body: form })
            if (!res.ok) throw new Error("Gagal upload gambar")
            const json = await res.json() as { data: { id: string } }
            return json.data.id
          })
        )
      }

      const res = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: content.trim(), mediaIds }),
      })

      const postBody = await res.json() as
        | { data: PostData }
        | { error?: { message?: string } }

      if (!res.ok) {
        const errBody = postBody as { error?: { message?: string } }
        throw new Error(errBody.error?.message ?? "Gagal membuat post")
      }

      const json = postBody as { data: PostData }
      onPostCreated?.(json.data)

      setContent("")
      setImages([])
      previews.forEach(url => URL.revokeObjectURL(url))
      setPreviews([])
      if (textareaRef.current) textareaRef.current.style.height = "auto"

      toast.success("Post berhasil dipublikasikan!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }, [content, images, previews, isEmpty, isOverLimit, loading, onPostCreated])

  return (
    <div className="border-b border-ax-bg-border bg-ax-bg-primary">
      <div className="px-4 pt-3 pb-2 flex gap-3">
        <Avatar
          name={user.name ?? user.username}
          src={user.image}
          size="md"
          className="flex-shrink-0 mt-1"
        />

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Apa yang sedang kamu pikirkan?"
            rows={focused || content.length > 0 ? 3 : 1}
            aria-label="Tulis post baru"
            className={cn(
              "w-full bg-transparent resize-none text-[15px] text-ax-text-primary",
              "placeholder:text-ax-text-muted focus:outline-none leading-relaxed",
              "transition-all duration-200"
            )}
            style={{ minHeight: "40px" }}
          />

          {previews.length > 0 && (
            <div className={cn(
              "mt-3 grid gap-2 rounded-ax overflow-hidden",
              previews.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {previews.map((url, i) => (
                <div key={url} className="relative rounded-ax overflow-hidden aspect-video bg-ax-bg-elevated">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60
                               hover:bg-black/80 flex items-center justify-center transition-colors"
                    aria-label={`Hapus gambar ${i + 1}`}
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(focused || content.length > 0 || images.length > 0) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ax-bg-subtle">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_IMAGES}
                  className={cn(
                    "p-2 rounded-ax transition-colors",
                    images.length >= MAX_IMAGES
                      ? "text-ax-text-hint cursor-not-allowed"
                      : "text-ax-accent-light hover:bg-ax-accent-muted"
                  )}
                  aria-label="Tambah gambar"
                >
                  <ImageIcon size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-ax text-ax-accent-light hover:bg-ax-accent-muted transition-colors"
                  aria-label="Tambah emoji"
                >
                  <Smile size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-ax text-ax-accent-light hover:bg-ax-accent-muted transition-colors"
                  aria-label="Tambah hashtag"
                >
                  <Hash size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {content.length > 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isOverLimit
                        ? "text-red-400"
                        : remaining <= 20
                          ? "text-yellow-400"
                          : "text-ax-text-muted"
                    )}
                    aria-live="polite"
                    aria-label={`${remaining} karakter tersisa`}
                  >
                    {remaining}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isEmpty || isOverLimit || loading}
                  className="ax-btn-primary min-w-[80px] flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Posting...</>
                    : "Post"
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={handleImageSelect}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
