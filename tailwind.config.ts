import type { Config } from "tailwindcss"

/**
 * Semua warna ax-* mengacu ke CSS variables yang didefinisikan di globals.css.
 * Variable berbeda value antara .dark dan .light class pada <html>.
 *
 * KENAPA INI PENTING:
 * Tailwind compile class seperti `bg-ax-bg-primary` menjadi CSS statis saat build.
 * Jika value di sini adalah hex literal (#0f0f11), maka class tersebut akan
 * SELALU menghasilkan warna itu — toggle dark/light tidak akan berefek apapun,
 * karena Tailwind tidak tahu tentang runtime theme switching.
 *
 * Dengan rgb(var(--ax-bg-primary) / <alpha-value>), Tailwind generate CSS yang
 * me-reference CSS variable. Browser resolve variable ini saat render — dan
 * variable BERUBAH saat class .dark/.light berubah di <html> (lihat globals.css).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ax: {
          bg: {
            primary:   "rgb(var(--ax-bg-primary) / <alpha-value>)",
            secondary: "rgb(var(--ax-bg-secondary) / <alpha-value>)",
            elevated:  "rgb(var(--ax-bg-elevated) / <alpha-value>)",
            hover:     "rgb(var(--ax-bg-hover) / <alpha-value>)",
            border:    "rgb(var(--ax-bg-border) / <alpha-value>)",
            subtle:    "rgb(var(--ax-bg-subtle) / <alpha-value>)",
          },
          text: {
            primary:   "rgb(var(--ax-text-primary) / <alpha-value>)",
            secondary: "rgb(var(--ax-text-secondary) / <alpha-value>)",
            muted:     "rgb(var(--ax-text-muted) / <alpha-value>)",
            hint:      "rgb(var(--ax-text-hint) / <alpha-value>)",
          },
          accent: {
            DEFAULT:   "rgb(var(--ax-accent) / <alpha-value>)",
            hover:     "rgb(var(--ax-accent-hover) / <alpha-value>)",
            light:     "rgb(var(--ax-accent-light) / <alpha-value>)",
            muted:     "rgb(var(--ax-accent-muted) / <alpha-value>)",
          },
          like:    "rgb(var(--ax-like) / <alpha-value>)",
          repost:  "rgb(var(--ax-repost) / <alpha-value>)",
          danger:  "rgb(var(--ax-danger) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        ax: "10px",
      },
      animation: {
        "fade-in":   "fadeIn 0.2s ease-out",
        "slide-up":  "slideUp 0.25s ease-out",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:  { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseDot: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
      },
    },
  },
  plugins: [],
}

export default config
