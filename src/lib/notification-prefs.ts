import { z } from "zod"

export const notifPrefsSchema = z.object({
  like:    z.boolean(),
  follow:  z.boolean(),
  comment: z.boolean(),
  mention: z.boolean(),
})

export type NotificationPrefs = z.infer<typeof notifPrefsSchema>

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  like:    true,
  follow:  true,
  comment: true,
  mention: true,
}

/**
 * Parse raw JSON dari DB dengan fallback ke default.
 * Dipakai di API route dan server component — single source of truth.
 */
export function parseNotifPrefs(raw: unknown): NotificationPrefs {
  const parsed = notifPrefsSchema.safeParse(
    typeof raw === "object" && raw !== null ? raw : {}
  )
  return parsed.success ? parsed.data : DEFAULT_NOTIF_PREFS
}
