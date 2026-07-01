"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Lock, Globe, BookmarkX, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { formatCount } from "@/lib/utils"

export interface CollectionCardData {
  id:            string
  name:          string
  slug:          string
  isDefault:     boolean
  isPublic:      boolean
  bookmarkCount: number
  previewImages: string[]
}

interface Props {
  initialData: CollectionCardData[]
  username:    string
}

export function CollectionGrid({ initialData, username }: Props) {
  const [collections, setCollections] = useState<CollectionCardData[]>(initialData)
  const [creating, setCreating]       = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || creating) return

    setCreating(true)
    try {
      const res = await fetch("/api/bookmarks/collections", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim() }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Gagal membuat koleksi")
      }

      const json = await res.json() as {
        data: { id: string; name: string; slug: string; isDefault: boolean; isPublic: boolean }
      }

      setCollections(prev => [...prev, {
        ...json.data,
        bookmarkCount: 0,
        previewImages: [],
      }])
      setNewName("")
      setShowForm(false)
      toast.success("Koleksi berhasil dibuat")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-5">
      {/* Create collection form */}
      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-ax-bg-elevated border border-ax-bg-border
                     rounded-2xl p-4 flex items-center gap-3"
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nama koleksi baru..."
            maxLength={50}
            autoFocus
            className="flex-1 bg-transparent text-sm text-ax-text-primary
                       placeholder:text-ax-text-muted outline-none"
            aria-label="Nama koleksi baru"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="ax-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            {creating
              ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              : "Buat"
            }
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setNewName("") }}
            className="text-ax-text-muted hover:text-ax-text-primary transition-colors"
            aria-label="Batal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-2xl
                     border-2 border-dashed border-ax-bg-border hover:border-ax-accent/50
                     text-ax-text-muted hover:text-ax-accent-light transition-all text-sm"
        >
          <Plus size={16} aria-hidden="true" />
          Buat Koleksi Baru
        </button>
      )}

      {/* Collection grid */}
      {collections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-ax-text-muted">
          <BookmarkX size={36} className="opacity-30" aria-hidden="true" />
          <p className="text-sm">Belum ada koleksi</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {collections.map(col => (
            <Link
              key={col.id}
              href={`/${username}/collections/${col.slug}`}
              className="group block"
            >
              {/* Preview mosaic */}
              <div className={cn(
                "w-full aspect-square rounded-xl overflow-hidden mb-2",
                "bg-ax-bg-elevated border border-ax-bg-border",
                "grid",
                col.previewImages.length === 0 ? "place-items-center" :
                col.previewImages.length === 1 ? "" : "grid-cols-2"
              )}>
                {col.previewImages.length === 0 ? (
                  <div className="text-ax-text-hint" aria-hidden="true">
                    <BookmarkX size={28} />
                  </div>
                ) : col.previewImages.length === 1 ? (
                  <img
                    src={col.previewImages[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  col.previewImages.slice(0, 4).map((url, i) => (
                    <div key={i} className="overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>

              {/* Meta */}
              <div className="px-0.5">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-medium text-ax-text-primary
                                   group-hover:text-ax-accent-light transition-colors truncate">
                    {col.name}
                  </span>
                  {col.isPublic
                    ? <Globe size={11} className="text-emerald-400 flex-shrink-0" aria-label="Publik" />
                    : <Lock  size={11} className="text-ax-text-hint flex-shrink-0" aria-label="Privat" />
                  }
                </div>
                <p className="text-xs text-ax-text-muted">
                  {formatCount(col.bookmarkCount)} post
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
