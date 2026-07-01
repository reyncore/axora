/**
 * lib/admin.ts — Admin authorization guard.
 *
 * Dipakai di layout/page/route admin untuk verifikasi role.
 * Tidak boleh diimport dari middleware (lihat auth-edge.ts boundary notes).
 *
 * PATTERN:
 * Server component: const session = await requireAdmin()
 * → redirect otomatis ke "/" jika bukan admin, atau "/login" jika belum login
 *
 * API route: const session = await requireAdminApi()
 * → return NextResponse 401/403 jika bukan admin
 */

import { auth } from "./auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"

/**
 * Untuk Server Components (pages/layouts).
 * Redirect ke /login jika belum login, ke / jika bukan admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/")

  return session
}

/**
 * Untuk API routes.
 * Return null jika authorized, atau NextResponse error jika tidak.
 *
 * Usage:
 *   const denied = await requireAdminApi()
 *   if (denied) return denied
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login diperlukan" } },
      { status: 401 }
    )
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Akses admin diperlukan" } },
      { status: 403 }
    )
  }

  return null
}
