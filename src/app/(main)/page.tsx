import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FeedContainer } from "@/components/feed/FeedContainer"

export const metadata: Metadata = { title: "Beranda" }

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <FeedContainer
      userId={session.user.id}
      sessionUser={session.user}
    />
  )
}
