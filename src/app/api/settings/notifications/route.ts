import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const notifPrefsSchema = z.object({
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

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { notificationPrefs: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND" } },
      { status: 404 }
    )
  }

  // Parse dan merge dengan default untuk forward-compatibility
  // (kalau ada field baru di masa depan, default-nya ON)
  const raw    = user.notificationPrefs
  const parsed = notifPrefsSchema.safeParse(
    typeof raw === "object" && raw !== null ? raw : {}
  )
  const prefs = parsed.success
    ? parsed.data
    : DEFAULT_NOTIF_PREFS

  return NextResponse.json({ data: prefs })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST" } },
      { status: 400 }
    )
  }

  // Partial update — hanya field yang dikirim yang di-update
  const partialSchema = notifPrefsSchema.partial()
  const parsed        = partialSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Fetch current prefs lalu merge
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { notificationPrefs: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND" } },
      { status: 404 }
    )
  }

  const currentRaw = user.notificationPrefs
  const currentParsed = notifPrefsSchema.safeParse(
    typeof currentRaw === "object" && currentRaw !== null ? currentRaw : {}
  )
  const current = currentParsed.success ? currentParsed.data : DEFAULT_NOTIF_PREFS
  const merged  = { ...current, ...parsed.data }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { notificationPrefs: merged },
  })

  return NextResponse.json({ data: merged })
}
