"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2, X, ArrowLeft, ImageOff } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComposeUser {
  id:       string
  name?:    string | null
  username: string
  image?:   string | null
}

interface Props {
  user: ComposeUser
}

interface PendingImage {
  file:    File
  preview: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHARS         = 500
const MAX_IMAGES        = 4
const MAX_FILE_BYTES    = 5 * 1024 * 1024 // 5MB — selaras dengan limit di /api/upload
const ALLOWED_MIME      = ["image/jpeg", "image/png", "image/webp", "image/gif"]

// ── Component ─────────────────────────────────────────────────────────────────

export function ComposeForm({ user }: Props) {
  const router = useRouter()

  const [content, setContent] = useState("")
  const [images, setImages]   = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(false)
  const textareaRef           = useRef<HTMLTextAreaElement>(null)
  const fileInputRef          = useRef<HTMLInputElement>(null)

  const remaining   = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const isEmpty     = content.trim().length === 0 && images.length === 0
  const hasDraft    = content.trim().length > 0 || images.length > 0

  // ── Cleanup object URLs saat unmount — mencegah memory leak ──────────────────

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Konfirmasi keluar jika ada draft belum terkirim ───────────────────────────
  // Mobile user sering tidak sengaja navigasi (back gesture, tap link lain).
  // beforeunload menangani refresh/close tab; back navigation in-app
  // ditangani lewat tombol back custom di header (lihat handleBack).

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasDraft) return
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasDraft])

  function handleBack() {
    if (hasDraft) {
      const confirmed = confirm("Buang draft post ini? Tulisan yang belum dikirim akan hilang.")
      if (!confirmed) return
    }
    router.back()
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const available = MAX_IMAGES - images.length
    const selected  = Array.from(e.target.files ?? []).slice(0, available)
    if (selected.length === 0) return

    const accepted: PendingImage[] = []
    for (const file of selected) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`${file.name}: format tidak didukung (JPEG/PNG/WEBP/GIF saja)`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: ukuran melebihi 5MB`)
        continue
      }
      accepted.push({ file, preview: URL.createObjectURL(file) })
    }

    if (accepted.length > 0) {
      setImages(prev => [...prev, ...accepted])
    }
    e.target.value = ""
  }

  function removeImage(index: number) {
    setImages(prev => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = useCallback(async () => {
    if (isEmpty || isOverLimit || loading) return
    setLoading(true)

    try {
      let mediaIds: string[] = []
      if (images.length > 0) {
        mediaIds = await Promise.all(
          images.map(async ({ file }) => {
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

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal membuat post")
      }

      images.forEach(img => URL.revokeObjectURL(img.preview))

      toast.success("Post berhasil dipublikasikan!")
      router.push("/")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      setLoading(false)
    }
  }, [isEmpty, isOverLimit, loading, images, content, router])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen lg:min-h-0">
      {/* Header — submit button selalu accessible tanpa scroll */}
      <div className="sticky top-0 z-10 bg-ax-bg-primary/95 backdrop-blur-md
                      border-b border-ax-bg-border px-3 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 rounded-full hover:bg-ax-bg-subtle text-ax-text-primary transition-colors"
          aria-label="Batal dan kembali"
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isEmpty || isOverLimit || loading}
          className="ax-btn-primary min-w-[92px] py-1.5 flex items-center justify-center gap-2 text-sm"
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            : "Posting"
          }
        </button>
      </div>

      {/* Form body */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          <Avatar
            name={user.name ?? user.username}
            src={user.image}
            size="md"
            className="flex-shrink-0 mt-0.5"
          />

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              placeholder="Apa yang sedang kamu pikirkan?"
              rows={5}
              aria-label="Tulis post baru"
              // autoFocus sengaja dihilangkan — di mobile ini memicu keyboard
              // muncul paksa segera setelah navigasi, terasa agresif terutama
              // saat user datang dari notification link atau back navigation
              className={cn(
                "w-full bg-transparent resize-none text-[16px] text-ax-text-primary",
                "placeholder:text-ax-text-muted focus:outline-none leading-relaxed"
              )}
            />

            {images.length > 0 && (
              <div className={cn(
                "mt-3 grid gap-1.5 rounded-xl overflow-hidden",
                images.length === 1 ? "grid-cols-1" : "grid-cols-2"
              )}>
                {images.map((img, i) => (
                  <ImagePreviewTile
                    key={img.preview}
                    src={img.preview}
                    isSingle={images.length === 1}
                    onRemove={() => removeImage(i)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action bar — sticky di mobile, safe-area aware */}
      <div className="sticky bottom-0 border-t border-ax-bg-border bg-ax-bg-primary
                      px-4 py-3 pb-safe flex items-center justify-between">
        <label
          className={cn(
            "p-2 rounded-ax cursor-pointer transition-colors",
            images.length >= MAX_IMAGES
              ? "opacity-40 cursor-not-allowed pointer-events-none text-ax-text-hint"
              : "text-ax-accent-light hover:bg-ax-accent-muted"
          )}
          aria-label="Tambah gambar"
        >
          <ImageIcon size={20} aria-hidden="true" />
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            multiple
            className="sr-only"
            onChange={handleImageSelect}
            disabled={images.length >= MAX_IMAGES}
          />
        </label>

        {content.length > 0 && (
          <span
            className={cn(
              "text-xs tabular-nums",
              isOverLimit
                ? "text-red-400 font-medium"
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
      </div>
    </div>
  )
}

// ── Image preview tile dengan broken-image fallback ───────────────────────────

function ImagePreviewTile({
  src, isSingle, onRemove, index,
}: {
  src:      string
  isSingle: boolean
  onRemove: () => void
  index:    number
}) {
  const [broken, setBroken] = useState(false)

  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden bg-ax-bg-elevated",
      isSingle ? "aspect-[16/9]" : "aspect-square"
    )}>
      {broken ? (
        <div className="w-full h-full flex flex-col items-center justify-center
                        gap-1.5 text-ax-text-hint">
          <ImageOff size={18} aria-hidden="true" />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80
                   rounded-full flex items-center justify-center transition-colors"
        aria-label={`Hapus gambar ${index + 1}`}
      >
        <X size={12} className="text-white" aria-hidden="true" />
      </button>
    </div>
  )
}
