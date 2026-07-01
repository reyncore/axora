"use client"

import { useEffect } from "react"
import Link from "next/link"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    // Log ke error monitoring (Sentry, dll) di production
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-5xl" aria-hidden="true">💥</div>
      <h2 className="text-xl font-bold text-ax-text-primary">Terjadi kesalahan</h2>
      <p className="text-sm text-ax-text-muted text-center max-w-xs">
        Maaf, ada sesuatu yang tidak berjalan dengan baik.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="ax-btn-primary px-6 py-2.5"
        >
          Coba Lagi
        </button>
        <Link href="/" className="ax-btn-ghost px-6 py-2.5">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
