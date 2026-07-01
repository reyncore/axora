"use client"

import { signOut } from "next-auth/react"

export function BannedSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="ax-btn-primary px-6 py-2.5"
    >
      Keluar
    </button>
  )
}
