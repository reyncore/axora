import { Metadata } from "next"
import { BannedSignOut } from "./BannedSignOut"
import { ShieldOff } from "lucide-react"

export const metadata: Metadata = { title: "Akun Dibanned" }

export default function BannedPage() {
  return (
    <div className="min-h-screen bg-ax-bg-primary flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/40 flex items-center
                        justify-center mx-auto mb-4">
          <ShieldOff size={28} className="text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-ax-text-primary mb-2">
          Akun kamu telah dibanned
        </h1>
        <p className="text-sm text-ax-text-muted mb-6 leading-relaxed">
          Akses kamu ke Axora telah dibatasi oleh administrator.
          Jika ini adalah kesalahan, hubungi tim support kami.
        </p>
        <BannedSignOut />
      </div>
    </div>
  )
}
