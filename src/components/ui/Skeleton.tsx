import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  rounded?:   "sm" | "md" | "lg" | "full"
}

const ROUND_CLASSES = {
  sm:   "rounded",
  md:   "rounded-ax",
  lg:   "rounded-xl",
  full: "rounded-full",
} as const

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      className={cn("ax-skeleton", ROUND_CLASSES[rounded], className)}
      aria-hidden="true"
    />
  )
}

export function PostSkeleton() {
  return (
    <div
      className="border-b border-ax-bg-border p-4 flex gap-3 animate-pulse"
      aria-hidden="true"
    >
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="full" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-6 mt-3 pt-1">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-36 w-full" rounded="sm" />
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <Skeleton className="w-20 h-20 border-4 border-ax-bg-primary" rounded="full" />
          <Skeleton className="w-24 h-9 mt-12" />
        </div>
        <Skeleton className="h-5 w-40 mb-1.5" />
        <Skeleton className="h-3.5 w-24 mb-3" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4 mb-4" />
        <div className="flex gap-6">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      </div>
    </div>
  )
}

export function NotificationSkeleton() {
  return (
    <div
      className="flex gap-4 px-5 py-4 border-b border-ax-bg-border animate-pulse"
      aria-hidden="true"
    >
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}
