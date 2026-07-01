import { cn, getInitials } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

interface AvatarBaseProps {
  /** Sumber URL gambar. null/undefined akan menampilkan inisial. */
  src?:       string | null
  /** Nama pengguna — dipakai untuk inisial dan alt text. */
  name:       string
  size?:      AvatarSize
  className?: string
}

// Dua varian: clickable (button) atau dekoratif (div)
type AvatarProps =
  | (AvatarBaseProps & { onClick: () => void })
  | (AvatarBaseProps & { onClick?: never })

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-6  h-6  text-[9px]",
  sm: "w-8  h-8  text-[10px]",
  md: "w-10 h-10 text-xs",
  lg: "w-14 h-14 text-sm",
  xl: "w-20 h-20 text-lg",
}

// Gradients deterministik — seed dari karakter pertama nama
const GRADIENTS = [
  "from-violet-600 to-purple-400",
  "from-teal-600   to-emerald-400",
  "from-blue-600   to-cyan-400",
  "from-rose-600   to-pink-400",
  "from-amber-600  to-yellow-400",
  "from-indigo-600 to-blue-400",
  "from-fuchsia-600 to-pink-400",
] as const

function pickGradient(name: string): typeof GRADIENTS[number] {
  const code = name.codePointAt(0) ?? 0
  return GRADIENTS[code % GRADIENTS.length]!
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Avatar universal — menampilkan gambar atau inisial dengan gradient.
 * Render sebagai <button> jika ada onClick, <div> jika tidak.
 */
export function Avatar({ src, name, size = "md", className, onClick }: AvatarProps) {
  const baseClass = cn(
    "rounded-full flex-shrink-0 select-none overflow-hidden",
    SIZE_CLASSES[size],
    onClick && "cursor-pointer hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ax-accent",
    className,
  )

  const content = src ? (
    <img src={src} alt={name} className="w-full h-full object-cover" />
  ) : (
    <span className={cn(
      "w-full h-full flex items-center justify-center font-semibold text-white",
      `bg-gradient-to-br ${pickGradient(name)}`,
    )}>
      {getInitials(name)}
    </span>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        aria-label={name}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={baseClass} aria-hidden={!src ? undefined : "true"}>
      {content}
    </div>
  )
}
