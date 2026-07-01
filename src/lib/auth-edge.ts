/**
 * auth-edge.ts — JWT config minimal untuk Edge runtime (middleware).
 *
 * File ini HARUS tetap bebas dari:
 *   - @prisma/client atau lib/prisma
 *   - bcryptjs atau library crypto Node.js
 *   - @auth/prisma-adapter
 *   - lib/validations (zod)
 *   - Import apapun dari lib/auth (yang menarik semua dependency berat di atas)
 *
 * Middleware Edge bundle hanya boleh import dari file ini,
 * sehingga ukuran bundle tetap kecil (< 200KB vs 1MB+ sebelumnya).
 *
 * CARA KERJA:
 * NextAuth v5 memisahkan "auth config" dari "auth handler".
 * Config JWT + session minimal cukup untuk memverifikasi token di middleware
 * tanpa perlu menyentuh database sama sekali.
 */

import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

/**
 * Config minimal — hanya yang dibutuhkan untuk JWT verification di Edge.
 * Tidak ada providers, tidak ada callbacks DB, tidak ada adapter.
 */
export const authEdgeConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  // Pages diperlukan agar middleware tahu ke mana redirect
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  // Providers dikosongkan — Edge hanya perlu verify JWT, tidak perlu issue token
  providers: [],
  callbacks: {
    // JWT callback minimal — hanya preserve field yang ada di token
    jwt({ token }) {
      return token
    },
    // Session callback minimal — expose user id dan username ke session
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      if (typeof token.username === "string") {
        session.user.username = token.username
      }
      return session
    },
  },
}

/**
 * auth function ringan — hanya untuk middleware.
 * Memverifikasi JWT dari cookie tanpa database lookup.
 */
export const { auth } = NextAuth(authEdgeConfig)
