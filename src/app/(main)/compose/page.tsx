// src/app/(main)/compose/page.tsx
// Halaman buat post — primary entry point untuk mobile (desktop pakai CreatePostBox inline)

import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ComposeForm } from "./ComposeForm"

export const metadata: Metadata = {
  title: "Buat Post",
  robots: { index: false, follow: false },
}

export default async function ComposePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <ComposeForm user={session.user} />
}
