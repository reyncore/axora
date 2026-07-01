import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NotificationList } from "./NotificationList"
import type { NotificationData } from "@/types"

export const metadata: Metadata = {
  title: "Notifikasi",
  robots: { index: false, follow: false },
}
export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userId = session.user.id

  const raw = await prisma.notification.findMany({
    where:   { receiverId: userId },
    take:    PAGE_SIZE + 1,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      post: { select: { id: true, content: true } },
    },
  })

  const hasMore    = raw.length > PAGE_SIZE
  const items      = hasMore ? raw.slice(0, -1) : raw
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  const initialData: NotificationData[] = items.map(n => ({
    id:        n.id,
    type:      n.type as NotificationData["type"],
    isRead:    n.isRead,
    createdAt: n.createdAt.toISOString(),
    actor:     n.actor,
    post:      n.post,
  }))

  // Mark as read — fire-and-forget, dilakukan setelah query data selesai
  // sehingga response masih reflect status isRead sebelum kunjungan ini
  void prisma.notification.updateMany({
    where: { receiverId: userId, isRead: false },
    data:  { isRead: true },
  })

  return (
    <NotificationList
      initialData={initialData}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
    />
  )
}
