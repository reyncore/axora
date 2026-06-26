import type { MetadataRoute } from "next"

/**
 * Next.js App Router otomatis serve ini di /robots.txt.
 *
 * Disallow semua route privat/internal:
 * - /api/*        — endpoint backend, tidak ada gunanya diindex
 * - /admin/*      — admin panel, sensitif
 * - /messages/*   — DM privat antar user
 * - /settings/*   — pengaturan akun privat
 * - /compose      — halaman buat post (action page, bukan konten)
 * - /notifications — notifikasi privat per user
 * - /banned       — halaman internal untuk user yang di-ban
 *
 * Allow eksplisit untuk halaman publik utama agar jelas mana yang
 * DIHARAPKAN untuk diindex (home, explore, profile, post individual).
 */

const APP_URL = process.env.NEXTAUTH_URL ?? "https://axora.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow:     "/",
      disallow: [
        "/api/",
        "/admin/",
        "/messages/",
        "/settings/",
        "/compose",
        "/notifications",
        "/banned",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
