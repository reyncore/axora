import Link from "next/link"
import { FileX, ArrowLeft } from "lucide-react"

export default function PostNotFound() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted
                     hover:text-ax-text-primary transition-all"
          aria-label="Kembali ke beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-base font-bold text-ax-text-primary">Post</h1>
      </div>

      <div className="flex flex-col items-center gap-4 py-24 px-6 text-center">
        <div
          className="w-16 h-16 rounded-full bg-ax-bg-elevated flex items-center justify-center"
          aria-hidden="true"
        >
          <FileX size={26} className="text-ax-text-muted" />
        </div>
        <div>
          <p className="font-semibold text-ax-text-primary mb-1">
            Post tidak ditemukan
          </p>
          <p className="text-sm text-ax-text-muted max-w-xs">
            Post ini mungkin sudah dihapus, atau link yang kamu buka tidak valid.
          </p>
        </div>
        <Link href="/" className="ax-btn-primary mt-2">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
