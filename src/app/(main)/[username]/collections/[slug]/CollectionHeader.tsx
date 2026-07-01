"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Lock, Globe, MoreHorizontal,
  Trash2, Pencil, Loader2, Check, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { formatCount } from "@/lib/utils"

interface CollectionData {
  id:            string
  name:          string
  slug:          string
  isDefault:     boolean
  isPublic:      boolean
  bookmarkCount: number
}

interface OwnerData {
  username:    string
  displayName: string
}

interface Props {
  collection: CollectionData
  owner:      OwnerData
  isOwner:    boolean
}

export function CollectionHeader({ collection, owner, isOwner }: Props) {
  const router = useRouter()

  const [name, setName]         = useState(collection.name)
  const [isPublic, setIsPublic] = useState(collection.isPublic)
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState(collection.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSaveEdit() {
    if (!editName.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bookmarks/collections/${collection.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error()
      setName(editName.trim())
      setEditing(false)
      toast.success("Nama koleksi diperbarui")
      router.refresh()
    } catch {
      toast.error("Gagal memperbarui nama")
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublic() {
    const next = !isPublic
    setIsPublic(next)
    try {
      const res = await fetch(`/api/bookmarks/collections/${collection.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isPublic: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next ? "Koleksi sekarang publik" : "Koleksi sekarang privat")
    } catch {
      setIsPublic(!next) // rollback
      toast.error("Gagal memperbarui visibilitas")
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus koleksi "${name}"? Semua bookmark di dalamnya akan dipindah ke "Semua Bookmark".`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bookmarks/collections/${collection.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Koleksi dihapus")
      router.push("/bookmarks")
    } catch {
      toast.error("Gagal menghapus koleksi")
      setDeleting(false)
    }
  }

  return (
    <div className="border-b border-ax-bg-border">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      px-4 py-3 flex items-center gap-3">
        <Link
          href="/bookmarks"
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all flex-shrink-0"
          aria-label="Kembali ke bookmark"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ax-text-muted">@{owner.username}</p>
        </div>

        {isOwner && !collection.isDefault && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                         hover:text-ax-text-primary transition-all"
              aria-label="Opsi koleksi"
              aria-expanded={menuOpen}
            >
              {deleting
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <MoreHorizontal size={16} aria-hidden="true" />
              }
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 top-9 z-20 ax-card shadow-xl py-1 w-52 animate-fade-in">
                  <button
                    role="menuitem" type="button"
                    onClick={() => { setMenuOpen(false); setEditing(true); setEditName(name) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                               text-ax-text-secondary hover:bg-ax-bg-subtle transition-colors"
                  >
                    <Pencil size={14} aria-hidden="true" /> Ubah Nama
                  </button>
                  <div className="h-px bg-ax-bg-border my-1" role="separator" />
                  <button
                    role="menuitem" type="button"
                    onClick={() => { setMenuOpen(false); void handleDelete() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                               text-red-400 hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Hapus Koleksi
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Collection info */}
      <div className="px-5 py-4">
        {editing ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter")  void handleSaveEdit()
                if (e.key === "Escape") setEditing(false)
              }}
              maxLength={50}
              autoFocus
              className="flex-1 text-xl font-bold bg-transparent border-b-2
                         border-ax-accent text-ax-text-primary outline-none pb-0.5"
              aria-label="Edit nama koleksi"
            />
            <button type="button" onClick={() => void handleSaveEdit()} disabled={saving}
              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Simpan">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="p-1 text-ax-text-muted hover:text-ax-text-primary transition-colors"
              aria-label="Batal">
              <X size={16} />
            </button>
          </div>
        ) : (
          <h1 className="text-xl font-bold text-ax-text-primary mb-1">{name}</h1>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-ax-text-muted">
            {formatCount(collection.bookmarkCount)} post tersimpan
          </span>

          {isOwner && (
            <button
              type="button"
              onClick={() => void handleTogglePublic()}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                "transition-all duration-150 border",
                isPublic
                  ? "border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/30"
                  : "border-ax-bg-border text-ax-text-muted hover:border-ax-accent-light hover:text-ax-accent-light"
              )}
              aria-pressed={isPublic}
              aria-label={isPublic ? "Jadikan privat" : "Jadikan publik"}
            >
              {isPublic
                ? <><Globe size={11} aria-hidden="true" /> Publik</>
                : <><Lock  size={11} aria-hidden="true" /> Privat</>
              }
            </button>
          )}

          {!isOwner && isPublic && (
            <span className="flex items-center gap-1 text-xs text-ax-text-muted">
              <Globe size={11} aria-hidden="true" /> Koleksi publik oleh {owner.displayName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
