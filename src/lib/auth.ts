/**
 * auth.ts — Full NextAuth config untuk server-side usage.
 *
 * File ini TIDAK boleh diimport dari middleware.ts karena:
 *   - Menarik @prisma/client → bundle bloat di Edge
 *   - Menarik bcryptjs → tidak compatible dengan Edge runtime
 *   - Menarik @auth/prisma-adapter → besar dan butuh Node.js runtime
 *
 * Untuk middleware, gunakan auth-edge.ts yang ringan.
 * File ini digunakan di:
 *   - Server Components (via auth())
 *   - API Routes (via auth())
 *   - Route Handlers (src/app/api/auth/[...nextauth]/route.ts)
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { loginSchema } from "./validations"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      // user hanya ada saat login pertama kali — persist ke token
      if (user) {
        token.id       = user.id
        token.username = user.username
        token.role     = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id       = token.id
      session.user.username = token.username
      session.user.role     = token.role
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where:  { email: parsed.data.email },
          select: {
            id:           true,
            email:        true,
            username:     true,
            displayName:  true,
            passwordHash: true,
            avatarUrl:    true,
            role:         true,
            isBanned:     true,
          },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValid) return null

        // Banned user tidak bisa login — meski password benar
        if (user.isBanned) return null

        // Jangan kirim passwordHash/isBanned ke session
        const { passwordHash: _omit, isBanned: _banned, ...safeUser } = user
        return safeUser
      },
    }),
  ],
})
