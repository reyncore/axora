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
    <div>
      {/* Compose box — di atas tabs agar selalu visible */}
      <CreatePostBox user={sessionUser} onPostCreated={handlePostCreated} />

      {/* Tabs */}
      <div
        className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                   border-b border-ax-bg-border"
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
              aria-controls={`feed-panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-3.5 text-sm font-medium transition-all duration-150 relative",
                "hover:bg-ax-bg-hover focus-visible:outline-none focus-visible:ring-inset",
                "focus-visible:ring-2 focus-visible:ring-ax-accent",
                activeTab === tab.key ? "text-ax-text-primary" : "text-ax-text-muted"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5
                             bg-ax-accent rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        id={`feed-panel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find(t => t.key === activeTab)?.label}
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
