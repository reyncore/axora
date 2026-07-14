import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ax-bg-primary flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6 select-none">⚡</div>
        <h1 className="text-4xl font-bold text-ax-text-primary mb-2">404</h1>
        <p className="text-lg font-medium text-ax-text-secondary mb-2">Halaman tidak ditemukan</p>
        <p className="text-sm text-ax-text-muted mb-8">
          Halaman yang kamu cari mungkin sudah dihapus atau tidak pernah ada.
        </p>
        <Link href="/" className="ax-btn-primary inline-flex items-center gap-2 px-6 py-2.5">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
