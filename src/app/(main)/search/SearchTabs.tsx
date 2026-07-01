"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Users, FileText } from "lucide-react"

interface Props {
  query:     string
  activeTab: "users" | "posts"
}

const TABS = [
  { key: "users" as const, label: "Pengguna", icon: Users    },
  { key: "posts" as const, label: "Post",     icon: FileText },
]

export function SearchTabs({ query, activeTab }: Props) {
  return (
    <div className="flex" role="tablist" aria-label="Filter hasil pencarian">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key
        return (
          <Link
            key={key}
            href={`/search?q=${encodeURIComponent(query)}&tab=${key}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium",
              "transition-all duration-150 hover:bg-ax-bg-hover relative",
              isActive ? "text-ax-text-primary" : "text-ax-text-muted"
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5
                           bg-ax-accent rounded-full"
                aria-hidden="true"
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
