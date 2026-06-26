"use client"

import { useEffect } from "react"

/**
 * global-error.tsx — menangkap error yang terjadi DI root layout itu sendiri
 * (bukan di children-nya), misal: crash di ThemeProvider, font loading,
 * atau provider lain yang di-mount langsung di app/layout.tsx.
 *
 * BERBEDA dari error.tsx biasa: karena root layout yang crash sudah tidak
 * bisa dipakai untuk render (dia sendiri yang gagal), file ini WAJIB
 * me-render <html> dan <body> sendiri dari awal — tidak bisa assume
 * root layout masih utuh.
 *
 * Next.js docs: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 *
 * STYLING: tidak bisa pakai Tailwind classes dari globals.css karena
 * kemungkinan besar CSS pipeline juga bagian dari yang crash — pakai
 * inline style sebagai fallback paling aman.
 */

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Global error (root layout crash):", error)
  }, [error])

  return (
    <html lang="id">
      <body
        style={{
          margin:          0,
          minHeight:       "100vh",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             16,
          padding:         24,
          textAlign:       "center",
          backgroundColor: "#0f0f11",
          color:           "#e8e8ec",
          fontFamily:      "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 48 }} aria-hidden="true">⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Aplikasi mengalami masalah serius
        </h1>
        <p style={{ fontSize: 14, color: "#9999aa", maxWidth: 320, margin: 0 }}>
          Maaf, terjadi kesalahan yang tidak terduga. Tim kami akan segera memeriksa.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={reset}
            style={{
              background:   "#7c3aed",
              color:        "#fff",
              border:       "none",
              borderRadius: 999,
              padding:      "10px 24px",
              fontSize:     14,
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            Coba Lagi
          </button>
          <a
            href="/"
            style={{
              background:    "transparent",
              color:         "#e8e8ec",
              border:        "1px solid #2a2a2e",
              borderRadius:  999,
              padding:       "10px 24px",
              fontSize:      14,
              fontWeight:    600,
              textDecoration: "none",
              display:       "inline-flex",
              alignItems:    "center",
            }}
          >
            Kembali ke Beranda
          </a>
        </div>
      </body>
    </html>
  )
}
