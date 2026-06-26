import { auth } from "@/lib/auth-edge"
import { NextResponse } from "next/server"

// ── Route classification ───────────────────────────────────────────────────────

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
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

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * auth() dari NextAuth v5 menerima callback dengan signature (req) => Response.
 * req memiliki properti .auth yang berisi session atau null.
 * NextAuth v5 mengextend NextRequest dengan .auth secara internal.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn   = !!req.auth

  const isPublic    = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  const isGuestOnly = GUEST_ONLY_PREFIXES.some(p => pathname.startsWith(p))

  if (isLoggedIn && isGuestOnly) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
}
