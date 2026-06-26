"use client"

import { useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  defaultValue?: string
  autoFocus?:    boolean
}

export function SearchInput({ defaultValue = "", autoFocus = true }: Props) {
  const router              = useRouter()
  const inputRef            = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (!q) return
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    })
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ""
    router.push("/search")
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} role="search" aria-label="Cari di Axora">
      <div className={cn(
        "flex items-center gap-2 bg-ax-bg-elevated border rounded-full px-4 py-2.5",
        "transition-colors duration-150 focus-within:border-ax-accent",
        defaultValue ? "border-ax-accent" : "border-ax-bg-border"
      )}>
        {isPending
          ? <Loader2 size={16} className="text-ax-text-muted animate-spin flex-shrink-0" aria-hidden="true" />
          : <Search  size={16} className="text-ax-text-muted flex-shrink-0" aria-hidden="true" />
        }
        <input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Cari pengguna, topik, atau #hashtag..."
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-sm text-ax-text-primary
                     placeholder:text-ax-text-muted outline-none"
          aria-label="Kata kunci pencarian"
        />
        {defaultValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-ax-text-muted hover:text-ax-text-secondary
                       transition-colors flex-shrink-0"
            aria-label="Hapus pencarian"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  )
}
