import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.axora.app" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 48, 64, 96, 128, 256, 384],
    formats:     ["image/avif", "image/webp"],
  },

  // ── Bundle optimization ───────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  /**
   * serverExternalPackages: paket yang TIDAK di-bundle oleh Next.js server
   * dan diperlakukan sebagai Node.js external require().
   *
   * Prisma, bcryptjs, dan @aws-sdk wajib di sini karena:
   * 1. Mereka menggunakan Node.js native modules (tidak compatible Edge)
   * 2. Mereka BESAR — sebaiknya tidak masuk webpack bundle
   * 3. Vercel serverless functions sudah punya akses ke node_modules
   *
   * Tanpa ini, webpack mencoba bundle @prisma/client yang menyebabkan:
   * - Build error "Cannot find module .prisma/client"
   * - Bundle bloat yang tidak perlu
   */
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "bcryptjs",
    "@aws-sdk/client-s3",
    "@auth/prisma-adapter",
  ],

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "SAMEORIGIN"                    },
          { key: "X-Content-Type-Options",  value: "nosniff"                       },
          { key: "X-XSS-Protection",        value: "1; mode=block"                 },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },

  async redirects() { return [] },
  async rewrites()  { return [] },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  poweredByHeader: false,
}

export default nextConfig
