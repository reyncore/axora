"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-4 px-5 py-3.5 w-full hover:bg-red-950/20 transition-colors group text-left"
    >
      <div className="w-9 h-9 rounded-ax bg-ax-bg-elevated flex items-center justify-center flex-shrink-0 group-hover:bg-red-950/40 transition-colors">
        <LogOut size={17} className="text-ax-text-muted group-hover:text-red-400 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-medium text-ax-text-primary group-hover:text-red-400 transition-colors">
          Keluar
        </p>
        <p className="text-xs text-ax-text-muted">Keluar dari semua sesi</p>
      </div>
    </button>
  )
}
