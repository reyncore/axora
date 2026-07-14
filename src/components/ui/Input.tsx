import { forwardRef, useId } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  hint?:      string
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id          = externalId ?? generatedId
    const errorId     = `${id}-error`
    const hintId      = `${id}-hint`

    const describedBy = [
      error ? errorId : null,
      hint  ? hintId  : null,
    ].filter(Boolean).join(" ") || undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ax-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ax-text-muted pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={cn(
              "ax-input",
              leftIcon  && "pl-10",
              rightIcon && "pr-10",
              error     && "border-red-600 focus:border-red-500 focus:ring-red-500/50",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ax-text-muted"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-400 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-ax-text-muted">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
