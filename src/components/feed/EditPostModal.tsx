"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  postId:      string
  initialContent: string
  onSave:      (newContent: string) => void
  onClose:     () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHARS = 500

// ── Component ─────────────────────────────────────────────────────────────────

export function EditPostModal({ postId, initialContent, onSave, onClose }: Props) {
  const [content, setContent] = useState(initialContent)
  const [loading, setLoading] = useState(false)
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  const remaining   = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const isUnchanged = content.trim() === initialContent.trim()

  // Auto-focus dan resize textarea saat modal buka
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
    // Pindahkan cursor ke akhir teks
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Tutup dengan Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  async function handleSave() {
    const trimmed = content.trim()
    if (!trimmed || isOverLimit || isUnchanged || loading) return
    setLoading(true)

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal menyimpan")
      }

      onSave(trimmed)
      toast.success("Post berhasil diperbarui")
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label="Edit post"
    >
      <div className="w-full max-w-lg ax-card shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ax-bg-border">
          <h2 className="text-base font-semibold text-ax-text-primary">Edit Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-ax text-ax-text-muted hover:text-ax-text-primary
                       hover:bg-ax-bg-subtle transition-all"
            aria-label="Tutup"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            className={cn(
              "w-full bg-ax-bg-elevated border rounded-ax px-4 py-3 resize-none",
              "text-[15px] text-ax-text-primary leading-relaxed",
              "focus:outline-none focus:border-ax-accent transition-colors",
              isOverLimit ? "border-red-600" : "border-ax-bg-border"
            )}
            rows={4}
            aria-label="Isi post"
            aria-describedby="char-count"
          />

          <div className="flex items-center justify-between mt-3">
            <span
              id="char-count"
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
              {remaining} karakter tersisa
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="ax-btn-ghost px-4 py-2"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!content.trim() || isOverLimit || isUnchanged || loading}
                className="ax-btn-primary flex items-center gap-2 min-w-[90px] justify-center"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Menyimpan...</>
                  : "Simpan"
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
