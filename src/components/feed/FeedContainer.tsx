"use client"

import { useState, useCallback, useRef } from "react"
import { FeedList } from "./FeedList"
import { CreatePostBox } from "./CreatePostBox"
import { cn } from "@/lib/utils"
import type { PostData } from "@/types"

const TABS = [
  { key: "home",      label: "Untuk Kamu" },
  { key: "following", label: "Following"  },
  { key: "explore",   label: "Trending"   },
] as const

type FeedType = typeof TABS[number]["key"]

interface FeedListHandle {
  prependPost: (post: PostData) => void
}

interface Props {
  userId:      string
  sessionUser: {
    id:       string
    name?:    string | null
    username: string
    image?:   string | null
  }
}

export function FeedContainer({ userId, sessionUser }: Props) {
  const [activeTab, setActiveTab] = useState<FeedType>("home")
  const feedRef = useRef<FeedListHandle | null>(null)

  /**
   * Optimistic UI: saat post berhasil dibuat, prepend ke feed langsung
   * tanpa menunggu refetch dari server.
   * Hanya prepend jika tab aktif adalah "home" — tab lain mungkin
   * tidak menampilkan post kita (e.g. "following" hanya orang lain).
   */
  const handlePostCreated = useCallback((post: PostData) => {
    if (activeTab === "home") {
      feedRef.current?.prependPost(post)
    }
  }, [activeTab])

  return (
    <div className="min-w-0">
      {/* Feed masthead: hierarki editorial yang ringkas, bukan dashboard card. */}
      <header className="px-4 sm:px-5 pt-5 pb-3 border-b border-ax-bg-border">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ax-text-muted">
              Axora <span aria-hidden="true">/</span> Ruang publik
            </p>
            <h1 className="mt-1 text-2xl sm:text-[28px] leading-tight font-bold tracking-tight text-ax-text-primary">
              Beranda<span className="text-ax-accent-light">.</span>
            </h1>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 text-[11px] font-mono tracking-wide text-ax-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-ax-repost" aria-hidden="true" />
            LIVE FEED
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="sticky top-0 z-10 bg-ax-bg-primary/90 backdrop-blur-md border-b border-ax-bg-border"
        role="tablist"
        aria-label="Filter feed"
      >
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="home-feed-panel"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 min-h-12 px-2 py-3 text-sm font-medium transition-colors relative",
                "hover:bg-ax-bg-hover focus-visible:outline-none focus-visible:ring-inset",
                "focus-visible:ring-2 focus-visible:ring-ax-accent",
                activeTab === tab.key
                  ? "text-ax-text-primary"
                  : "text-ax-text-secondary hover:text-ax-text-primary"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-ax-accent-light rounded-t-full"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Composer dipisahkan dari masthead agar alur baca lebih terstruktur. */}
      <section aria-label="Buat post" className="border-b border-ax-bg-border">
        <CreatePostBox user={sessionUser} onPostCreated={handlePostCreated} />
      </section>

      {/* Feed */}
      <div
        id="home-feed-panel"
        role="tabpanel"
        aria-label={TABS.find(t => t.key === activeTab)?.label}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        <FeedList
          key={activeTab}
          ref={feedRef}
          userId={userId}
          feedType={activeTab}
        />
      </div>
    </div>
  )
}
