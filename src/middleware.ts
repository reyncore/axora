/**
 * middleware.ts — Edge-compatible auth middleware.
 *
 * RUNTIME: Edge (bukan Node.js) — hanya boleh import auth-edge.ts,
 * tidak boleh import @prisma/client, bcrypt, atau Node.js builtins.
 *
 * SECURITY: Setelah user ganti password, semua JWT lama otomatis invalid.
 * Validasi dilakukan dengan membandingkan token.issuedAtPassword dengan
 * passwordChangedAt di DB — dilakukan di API routes/layouts (bukan di sini
 * karena Edge tidak bisa akses Prisma).
 *
 * Middleware hanya bertanggung jawab untuk:
 * 1. Redirect unauthenticated users dari protected routes ke /login
 * 2. Redirect authenticated users dari guest-only routes ke /
 * 3. Validasi format JWT (bukan content validity vs DB)
 */

import { auth } from "@/lib/auth-edge"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/about",
  "/privacy",
  "/terms",
  "/banned",
] as const

const GUEST_ONLY_PREFIXES = [
  "/login",
  "/register",
] as const

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session      = (req as unknown as { auth: { user?: unknown } | null }).auth

  const isPublic    = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  const isGuestOnly = GUEST_ONLY_PREFIXES.some(p => pathname.startsWith(p))
  const isLoggedIn  = !!session?.user

  // Authenticated user mencoba akses guest-only page
  if (isLoggedIn && isGuestOnly) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Unauthenticated user mencoba akses protected page
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip static files dan internals Next.js
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline.html|og-default.png).*)",
  ],
}
