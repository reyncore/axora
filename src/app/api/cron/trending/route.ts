import { NextResponse } from "next/server"
import { refreshTrendingHashtags } from "@/lib/search"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    await refreshTrendingHashtags()

    return NextResponse.json({
      ok: true,
      job: "trending-hashtags",
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    console.error("[cron:trending] refresh failed", error)

    return NextResponse.json(
      { ok: false, error: "Trending refresh failed" },
      { status: 500 }
    )
  }
}
