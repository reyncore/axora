import { PostSkeleton } from "@/components/ui/Skeleton"

// Next.js akan render halaman ini secara otomatis saat segment sedang loading.
// Jumlah skeleton disesuaikan dengan tinggi viewport rata-rata.
const SKELETON_COUNT = 5

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Memuat konten">
      <div className="border-b border-ax-bg-border px-5 py-4">
        <div className="h-5 w-32 bg-ax-bg-subtle rounded animate-pulse" />
      </div>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}
