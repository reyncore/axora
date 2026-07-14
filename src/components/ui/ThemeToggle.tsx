"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "./ThemeProvider"
import { cn } from "@/lib/utils"

interface Props {
  /** compact = icon only, default = icon + label */
  compact?: boolean
}

const OPTIONS = [
  { value: "light",  icon: Sun,     label: "Terang"  },
  { value: "dark",   icon: Moon,    label: "Gelap"   },
  { value: "system", icon: Monitor, label: "Sistem"  },
] as const

export function ThemeToggle({ compact = false }: Props) {
  const { theme, setTheme } = useTheme()

  if (compact) {
    // Single toggle: dark ↔ light
    const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined"
      && window.matchMedia("(prefers-color-scheme: dark)").matches)

    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="ax-nav-item w-full text-left"
        aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      >
        {isDark
          ? <Sun size={18} strokeWidth={1.8} aria-hidden="true" />
          : <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
        }
        <span className="hidden xl:block text-sm">
          {isDark ? "Mode Terang" : "Mode Gelap"}
        </span>
      </button>
    )
  }

  // Full segmented control for settings page
  return (
    <div
      className="flex bg-ax-bg-elevated border border-ax-bg-border rounded-ax p-1 gap-1"
      role="radiogroup"
      aria-label="Pilih tema"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md",
            "text-sm font-medium transition-all duration-150",
            theme === value
              ? "bg-ax-accent text-white shadow-sm"
              : "text-ax-text-muted hover:text-ax-text-primary hover:bg-ax-bg-subtle"
          )}
        >
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
