"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict, format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  Heart, MessageCircle, Share2,
  MoreHorizontal, Trash2, BadgeCheck, Pencil, ImageOff, Link as LinkIcon,
} from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { EditPostModal } from "./EditPostModal"
import { BookmarkButton } from "@/components/ui/BookmarkButton"
import { ImageLightbox } from "@/components/ui/ImageLightbox"
import { cn, formatCount } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { PostData } from "@/types"

interface Props {
  post:          PostData
  onDelete?:     (id: string) => void
  expandedView?: boolean
}

// ── Content renderer — TIDAK mengeksekusi HTML, hanya plain text + links ──────

function renderContent(text: string): React.ReactNode[] {
  const parts = text.split(/(#\w+|@\w+)/g)

  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <Link
          key={i}
          href={`/search?q=${encodeURIComponent(part)}&tab=posts`}
          className="text-ax-accent-light hover:underline"
          onClick={e => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    if (part.startsWith("@")) {
      const username = part.slice(1).replace(/[^a-zA-Z0-9_]/g, "")
      if (!username) return part
      return (
        <Link
          key={i}
          href={`/${username}`}
          className="text-ax-accent-light hover:underline"
          onClick={e => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}

// ── Media tile dengan broken-image fallback ───────────────────────────────────

function MediaTile({
  url, isSingle, spanTwoRows, onClick,
}: {
  url:         string
  isSingle:    boolean
  spanTwoRows: boolean
  onClick:     (e: React.MouseEvent) => void
}) {
  const [broken, setBroken] = useState(false)

  return (
    <div
      className={cn(
        "bg-ax-bg-elevated overflow-hidden",
        isSingle ? "aspect-[16/9]" : "aspect-square",
        spanTwoRows && "row-span-2"
      )}
    >
      {broken ? (
        <div className="w-full h-full flex flex-col items-center justify-center
                        gap-1.5 text-ax-text-hint">
          <ImageOff size={20} aria-hidden="true" />
          <span className="text-[10px]">Gambar tidak tersedia</span>
        </div>
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover hover:opacity-95 transition-opacity cursor-zoom-in"
          loading="lazy"
          onClick={onClick}
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PostCard({ post, onDelete, expandedView = false }: Props) {
  const [liked, setLiked]             = useState(post.isLiked)
  const [likeCount, setLikeCount]     = useState(post.likesCount)
  const [content, setContent]         = useState(post.content)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleting, setDeleting]       = useState(false)

  const isOwner = post.currentUserId === post.author.id

  const toggleLike = useCallback(async () => {
    const prevLiked = liked
    const prevCount = likeCount
    setLiked(l => !l)
    setLikeCount(c => prevLiked ? c - 1 : c + 1)
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
      if (!res.ok) throw new Error()
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
      toast.error("Gagal mengubah like")
    }
  }, [liked, likeCount, post.id])

  const handleDelete = useCallback(async () => {
    if (!confirm("Hapus post ini? Tindakan tidak bisa dibatalkan.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onDelete?.(post.id)
      toast.success("Post dihapus")
    } catch {
      setDeleting(false)
      toast.error("Gagal menghapus post")
    }
  }, [post.id, onDelete])

  async function copyLink() {
    const url = `${window.location.origin}/posts/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link disalin!")
    } catch {
      toast.error("Gagal menyalin link")
    }
  }

  const timeAgo  = formatDistanceToNowStrict(new Date(post.createdAt), {
    locale: idLocale, addSuffix: false,
  })
  const fullDate = format(new Date(post.createdAt), "HH:mm · d MMM yyyy", { locale: idLocale })
  const hasStats = likeCount > 0 || post.commentsCount > 0

  return (
    <>
      <article className={cn(
        "relative group transition-colors duration-100",
        !expandedView && "border-b border-ax-bg-border hover:bg-ax-bg-hover",
        deleting && "opacity-50 pointer-events-none",
      )}>
        <div className={cn("flex gap-3", expandedView ? "p-4 pb-2" : "px-4 pt-3 pb-1")}>

          {/* Avatar */}
          <Link
            href={`/${post.author.username}`}
            className="flex-shrink-0 self-start"
            aria-label={`Profil ${post.author.displayName}`}
            onClick={e => e.stopPropagation()}
          >
            <Avatar
              name={post.author.displayName}
              src={post.author.avatarUrl}
              size={expandedView ? "lg" : "md"}
              className="hover:opacity-85 transition-opacity"
            />
          </Link>

          <div className="flex-1 min-w-0">
            {/* Author row */}
            <div className="flex items-start justify-between gap-1">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <Link
                    href={`/${post.author.username}`}
                    onClick={e => e.stopPropagation()}
                    className="text-sm font-semibold text-ax-text-primary hover:underline"
                  >
                    {post.author.displayName}
                  </Link>
                  {post.author.isVerified && (
                    <BadgeCheck
                      size={13}
                      className="text-ax-accent-light flex-shrink-0"
                      aria-label="Terverifikasi"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ax-text-muted">
                  <span>@{post.author.username}</span>
                  {!expandedView && (
                    <>
                      <span aria-hidden="true">·</span>
                      <Link
                        href={`/posts/${post.id}`}
                        onClick={e => e.stopPropagation()}
                        className="hover:text-ax-text-secondary"
                      >
                        <time dateTime={post.createdAt} title={fullDate}>{timeAgo}</time>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* More menu */}
              {isOwner && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
                    className="p-1.5 rounded-ax text-ax-text-hint hover:text-ax-text-muted
                               hover:bg-ax-bg-subtle transition-all
                               opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Opsi post"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal size={15} aria-hidden="true" />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                      <div role="menu" className="absolute right-0 top-8 z-20 ax-card shadow-xl py-1 w-44 animate-fade-in">
                        <button
                          role="menuitem" type="button"
                          onClick={e => { e.stopPropagation(); setMenuOpen(false); setEditOpen(true) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                                     text-ax-text-secondary hover:bg-ax-bg-subtle transition-colors"
                        >
                          <Pencil size={14} aria-hidden="true" /> Edit Post
                        </button>
                        <button
                          role="menuitem" type="button"
                          onClick={e => { e.stopPropagation(); setMenuOpen(false); void handleDelete() }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                                     text-red-400 hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={14} aria-hidden="true" /> Hapus Post
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <p className={cn(
              "text-ax-text-primary leading-relaxed whitespace-pre-wrap break-words mt-1",
              expandedView ? "text-[17px]" : "text-[14px]"
            )}>
              {renderContent(content)}
            </p>

            {/* Media grid */}
            {post.media.length > 0 && (
              <div className={cn(
                "mt-2.5 grid gap-0.5 rounded-xl overflow-hidden border border-ax-bg-border",
                post.media.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}>
                {post.media.slice(0, 4).map((m, i) => (
                  <MediaTile
                    key={m.id}
                    url={m.fileUrl}
                    isSingle={post.media.length === 1}
                    spanTwoRows={post.media.length === 3 && i === 0}
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i) }}
                  />
                ))}
              </div>
            )}

            {expandedView && (
              <time dateTime={post.createdAt} className="block mt-3 text-sm text-ax-text-muted">
                {fullDate}
              </time>
            )}
          </div>
        </div>

        {/* Stats (expanded) — selalu render border separator untuk konsistensi visual */}
        {expandedView && (
          <div className="px-4 py-2.5 border-t border-ax-bg-border flex items-center gap-4 text-sm
                          min-h-[41px]">
            {hasStats ? (
              <>
                {likeCount > 0 && (
                  <span>
                    <strong className="text-ax-text-primary">{formatCount(likeCount)}</strong>
                    {" "}<span className="text-ax-text-muted">Like</span>
                  </span>
                )}
                {post.commentsCount > 0 && (
                  <span>
                    <strong className="text-ax-text-primary">{formatCount(post.commentsCount)}</strong>
                    {" "}<span className="text-ax-text-muted">Komentar</span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-ax-text-hint text-xs">Belum ada interaksi</span>
            )}
          </div>
        )}

        {/* Action bar — expanded view dapat label text + lebih lega */}
        <div className={cn(
          "flex items-center border-t border-ax-bg-border",
          expandedView ? "px-2 py-1" : "px-3 py-1",
        )}>
          <Link
            href={`/posts/${post.id}`}
            onClick={e => e.stopPropagation()}
            className={cn("ax-action-btn flex-1 justify-center", expandedView ? "py-2.5" : "py-1.5")}
            aria-label={`${post.commentsCount} komentar`}
          >
            <MessageCircle size={expandedView ? 18 : 16} strokeWidth={1.8} aria-hidden="true" />
            {expandedView ? (
              <span className="text-xs">Balas</span>
            ) : post.commentsCount > 0 && (
              <span className="text-xs">{formatCount(post.commentsCount)}</span>
            )}
          </Link>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); void toggleLike() }}
            className={cn(
              "ax-action-btn flex-1 justify-center",
              expandedView ? "py-2.5" : "py-1.5",
              liked && "liked"
            )}
            aria-label={liked ? "Hapus like" : "Like post ini"}
            aria-pressed={liked}
          >
            <Heart
              size={expandedView ? 18 : 16}
              strokeWidth={1.8}
              fill={liked ? "currentColor" : "none"}
              className={cn("transition-transform duration-150", liked && "scale-110")}
              aria-hidden="true"
            />
            {expandedView ? (
              <span className="text-xs">{liked ? "Disukai" : "Suka"}</span>
            ) : likeCount > 0 && (
              <span className="text-xs">{formatCount(likeCount)}</span>
            )}
          </button>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); void copyLink() }}
            className={cn("ax-action-btn flex-1 justify-center", expandedView ? "py-2.5" : "py-1.5")}
            aria-label="Salin link post"
          >
            {expandedView
              ? <LinkIcon size={17} strokeWidth={1.8} aria-hidden="true" />
              : <Share2  size={15} strokeWidth={1.8} aria-hidden="true" />
            }
            {expandedView && <span className="text-xs">Bagikan</span>}
          </button>

          {post.currentUserId && (
            <div onClick={e => e.stopPropagation()}>
              <BookmarkButton
                postId={post.id}
                initialBookmarked={post.isBookmarked ?? false}
                compact={!expandedView}
              />
            </div>
          )}
        </div>
      </article>

      {editOpen && (
        <EditPostModal
          postId={post.id}
          initialContent={content}
          onSave={newContent => setContent(newContent)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {lightboxIndex !== null && post.media.length > 0 && (
        <ImageLightbox
          images={post.media.map(m => m.fileUrl)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
