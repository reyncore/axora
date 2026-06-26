"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "dark" | "light" | "system"

interface ThemeContextValue {
  theme:       Theme
  resolvedTheme: "dark" | "light"
  setTheme:    (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "axora-theme"

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(theme: Theme): "dark" | "light" {
  return theme === "system" ? getSystemTheme() : theme
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
    root.classList.remove("light")
  } else {
    root.classList.add("light")
    root.classList.remove("dark")
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  // Init dari localStorage — harus di useEffect untuk SSR safety
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initial = stored ?? "dark"
    setThemeState(initial)
    applyTheme(resolveTheme(initial))
  }, [])

  // Listen system preference changes
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    function handle() { applyTheme(getSystemTheme()) }
    mq.addEventListener("change", handle)
    return () => mq.removeEventListener("change", handle)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(resolveTheme(t))
  }, [])

  const resolvedTheme = resolveTheme(theme)

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
