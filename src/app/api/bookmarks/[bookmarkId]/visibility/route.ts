import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ bookmarkId: string }> }

/**
 * PATCH /api/bookmarks/[bookmarkId]/visibility
 * Toggle isVisible untuk bookmark tertentu.
 * Hanya berefek jika collection.isPublic = true.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session      = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const { bookmarkId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 })
  }

  if (typeof body !== "object" || body === null || typeof (body as { isVisible?: unknown }).isVisible !== "boolean") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "isVisible (boolean) diperlukan" } },
      { status: 400 }
    )
  }

  const { isVisible } = body as { isVisible: boolean }

  // Verify ownership dan fetch collection state sekaligus
  const bookmark = await prisma.bookmark.findFirst({
    where:  { id: bookmarkId, userId: session.user.id },
    select: {
      id: true, isVisible: true,
      collection: { select: { isPublic: true } },
    },
  })

  if (!bookmark) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  // isVisible hanya berefek jika collection.isPublic = true
  // Jika collection privat, silently accept request tapi efeknya tidak ada
  // Lebih baik daripada error — UX yang confusing kalau user toggle visibility
  // sambil collection masih privat (mungkin belum sempat toggle public)
  const updated = await prisma.bookmark.update({
    where: { id: bookmarkId },
    data:  { isVisible },
    select: { id: true, isVisible: true, collectionId: true },
  })

  return NextResponse.json({
    data: {
      ...updated,
      effectivelyVisible: isVisible && (bookmark.collection?.isPublic ?? false),
      warning: !bookmark.collection?.isPublic
        ? "Koleksi masih privat — visibility tidak berefek hingga koleksi dipublikasikan"
        : null,
    },
  })
}
