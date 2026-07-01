import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { SessionProvider } from "next-auth/react"
import { ToastContainer } from "@/components/ui/ToastContainer"
import { ThemeProvider } from "@/components/ui/ThemeProvider"
import { PWAProvider } from "@/components/ui/PWAProvider"
import "./globals.css"

export const viewport = {
  width:              "device-width",
  initialScale:       1,
  maximumScale:       1,
  userScalable:       false,
  viewportFit:        "cover",  // iPhone notch/home bar support
  themeColor:         [
    { media: "(prefers-color-scheme: dark)",  color: "#0f0f11" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
}

export const metadata: Metadata = {
  title:       { default: "Axora", template: "%s · Axora" },
  description: "Komunitas modern untuk builder, developer, dan kreator Indonesia.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://axora.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable:           true,
    statusBarStyle:    "black-translucent",
    title:             "Axora",
    startupImage:      "/icons/apple-touch-icon.png",
  },
  icons: {
    icon:  [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type:        "website",
    siteName:    "Axora",
    title:       "Axora — Komunitas Builder Indonesia",
    description: "Komunitas modern untuk builder, developer, dan kreator Indonesia.",
    images:      [{ url: "/og-default.png", width: 1200, height: 630, alt: "Axora" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Axora — Komunitas Builder Indonesia",
    description: "Komunitas modern untuk builder, developer, dan kreator Indonesia.",
    images:      ["/og-default.png"],
  },
  robots: {
    index:        true,
    follow:       true,
    googleBot: {
      index:             true,
      follow:            true,
      "max-image-preview": "large",
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        {/*
          Anti-flash script: baca localStorage SEBELUM React hydrate
          untuk menerapkan theme class langsung — mencegah white flash
          pada halaman dengan dark theme default.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('axora-theme') || 'dark';
                  var r = t === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : t;
                  document.documentElement.classList.add(r);
                  if (r === 'light') document.documentElement.classList.remove('dark');
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }
              })()
            `,
          }}
        />
        <SessionProvider>
          <ThemeProvider>
            {children}
            <ToastContainer />
            <PWAProvider />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
