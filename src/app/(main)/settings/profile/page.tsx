import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditProfileForm } from "./EditProfileForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = { title: "Edit Profil" }

export default async function EditProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id: true, username: true, displayName: true,
      bio: true, avatarUrl: true, bannerUrl: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div>
      <div className="sticky top-0 z-10 bg-ax-bg-primary/80 backdrop-blur-md border-b border-ax-bg-border px-4 py-3 flex items-center gap-4">
        <Link
          href={`/${user.username}`}
          className="p-1.5 rounded-ax hover:bg-ax-bg-subtle text-ax-text-muted hover:text-ax-text-primary transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-base font-bold text-ax-text-primary">Edit Profil</h1>
          <p className="text-xs text-ax-text-muted">@{user.username}</p>
        </div>
      </div>

      <div className="p-5">
        <EditProfileForm user={user} />
      </div>
    </div>
  )
}
