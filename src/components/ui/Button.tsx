import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "ghost" | "danger" | "outline"
type ButtonSize    = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-ax-accent hover:bg-ax-accent-hover text-white",
  ghost:   "bg-transparent hover:bg-ax-bg-subtle text-ax-text-secondary hover:text-ax-text-primary",
  danger:  "bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-800/50",
  outline: "border border-ax-bg-border hover:border-ax-accent-light text-ax-text-secondary hover:text-ax-accent-light",
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-full",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ax-accent focus-visible:ring-offset-2",
        "focus-visible:ring-offset-ax-bg-primary",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
)

Button.displayName = "Button"
