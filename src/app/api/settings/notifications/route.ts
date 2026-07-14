import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  notifPrefsSchema,
  parseNotifPrefs,
  DEFAULT_NOTIF_PREFS,
} from "@/lib/notification-prefs"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { notificationPrefs: true },
  })

  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  return NextResponse.json({ data: parseNotifPrefs(user.notificationPrefs) })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  const parsed = notifPrefsSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { notificationPrefs: true },
  })

  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  const current = parseNotifPrefs(user.notificationPrefs)
  const merged  = { ...current, ...parsed.data }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { notificationPrefs: merged },
  })

  return NextResponse.json({ data: merged })
}
