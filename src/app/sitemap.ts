import { prisma } from "@/lib/prisma"
import type { MetadataRoute } from "next"

/**
 * Dynamic sitemap — Next.js App Router otomatis serve ini di /sitemap.xml.
 *
 * Hanya include URL publik yang boleh diindex search engine:
 * - Static pages (home, about, login, register)
 * - Profile pengguna (publicly viewable)
 * - Post individual (publicly viewable)
 *
 * TIDAK include: /messages, /settings, /admin, /compose, /notifications
 * (semua privat/butuh auth — sudah di-disallow juga di robots.ts sebagai
 * defense-in-depth, tapi tidak perlu masuk sitemap sama sekali).
 *
 * LIMIT: Google merekomendasikan maks 50.000 URL per sitemap file.
 * Untuk skala besar di masa depan, ini perlu dipecah jadi sitemap index
 * + multiple sitemap files. Untuk sekarang, single file cukup.
 */

const APP_URL = process.env.NEXTAUTH_URL ?? "https://axora.app"

// Batas wajar untuk single sitemap — mencegah query terlalu besar
const MAX_USERS = 5000
const MAX_POSTS = 5000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [users, posts] = await Promise.all([
    prisma.user.findMany({
      where:   { isBanned: false },
      select:  { username: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take:    MAX_USERS,
    }),
    prisma.post.findMany({
      where:   { isDeleted: false, parentId: null },
      select:  { id: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take:    MAX_POSTS,
    }),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    {
      url:           APP_URL,
      lastModified:  new Date(),
      changeFrequency: "hourly",
      priority:      1,
    },
    {
      url:           `${APP_URL}/explore`,
      lastModified:  new Date(),
      changeFrequency: "hourly",
      priority:      0.9,
    },
    {
      url:           `${APP_URL}/login`,
      lastModified:  new Date(),
      changeFrequency: "monthly",
      priority:      0.5,
    },
    {
      url:           `${APP_URL}/register`,
      lastModified:  new Date(),
      changeFrequency: "monthly",
      priority:      0.5,
    },
    {
      url:           `${APP_URL}/about`,
      lastModified:  new Date(),
      changeFrequency: "monthly",
      priority:      0.3,
    },
  ]

  const userPages: MetadataRoute.Sitemap = users.map(u => ({
    url:           `${APP_URL}/${u.username}`,
    lastModified:  u.updatedAt,
    changeFrequency: "daily" as const,
    priority:      0.6,
  }))

  const postPages: MetadataRoute.Sitemap = posts.map(p => ({
    url:           `${APP_URL}/posts/${p.id}`,
    lastModified:  p.updatedAt,
    changeFrequency: "weekly" as const,
    priority:      0.7,
  }))

  return [...staticPages, ...userPages, ...postPages]
}
