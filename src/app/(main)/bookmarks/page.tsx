import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getOrCreateDefaultCollection } from "@/lib/bookmarks"
import { CollectionGrid } from "./CollectionGrid"
import type { CollectionCardData } from "./CollectionGrid"

export const metadata: Metadata = {
  title: "Bookmark",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function BookmarksPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Pastikan default collection sudah ada
  await getOrCreateDefaultCollection(session.user.id)

  const collections = await prisma.bookmarkCollection.findMany({
    where:   { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true, name: true, slug: true,
      isDefault: true, isPublic: true, updatedAt: true,
      bookmarks: {
        take:    3,
        orderBy: { createdAt: "desc" },
        select: {
          post: {
            select: {
              media: { take: 1, select: { url: true } },
            },
          },
        },
      },
      _count: { select: { bookmarks: true } },
    },
  })

  const data: CollectionCardData[] = collections.map(c => ({
    id:            c.id,
    name:          c.name,
    slug:          c.slug,
    isDefault:     c.isDefault,
    isPublic:      c.isPublic,
    bookmarkCount: c._count.bookmarks,
    previewImages: c.bookmarks
      .map(b => b.post.media[0]?.url)
      .filter((url): url is string => url !== undefined),
  }))

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md
                      border-b border-ax-bg-border px-5 py-4">
        <h1 className="text-lg font-bold text-ax-text-primary">Bookmark</h1>
      </div>
      <CollectionGrid
        initialData={data}
        username={session.user.username}
      />
    </div>
  )
}
