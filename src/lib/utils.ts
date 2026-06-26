import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes dengan deduplication.
 * Gunakan untuk semua penggabungan className di seluruh project.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format angka menjadi format singkat: 1.2K, 3.4M, dll.
 * Dipakai di PostCard, Profile stats, RightPanel.
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Ambil inisial dari nama tampilan.
 * Contoh: "Reza Mahendra" → "RM", "Faiz" → "FA" (max 2 karakter)
 */
export function getInitials(name: string, max = 2): string {
  return name
    .split(" ")
    .map(word => word[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, max)
    .join("")
}
