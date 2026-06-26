import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { RightPanel } from "@/components/layout/RightPanel"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { EmailVerificationBanner } from "@/components/ui/EmailVerificationBanner"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userMeta = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { email: true, emailVerified: true, isBanned: true, isVerified: true },
  })

  if (userMeta?.isBanned) redirect("/banned")

  const showVerificationBanner = userMeta !== null && userMeta.emailVerified === false

  return (
    <div className="min-h-screen bg-ax-bg-primary">
      {/* Container dengan max-width optimal untuk semua layar */}
      <div className="max-w-[1280px] mx-auto flex relative">

        {/* Sidebar kiri — sticky */}
        <aside
          className="hidden lg:flex flex-col sticky top-0 h-screen
                     w-[72px] xl:w-[260px] flex-shrink-0
                     border-r border-ax-bg-border"
          aria-label="Navigasi utama"
        >
          <Sidebar user={session.user} />
        </aside>

        {/* Main content */}
        <main
          className="flex-1 min-w-0 border-r border-ax-bg-border
                     pb-16 lg:pb-0"
        >
          {showVerificationBanner && (
            <EmailVerificationBanner email={userMeta.email} />
          )}
          {children}
        </main>

        {/* Right panel — hanya desktop, 320px */}
        <aside
          className="hidden xl:block w-[320px] flex-shrink-0"
          aria-label="Panel samping"
        >
          <div className="sticky top-0 h-screen overflow-y-auto
                          scrollbar-thin scrollbar-thumb-ax-bg-border">
            <RightPanel />
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <MobileSidebar
        user={{
          ...session.user,
          isVerified: userMeta?.isVerified ?? false,
        }}
      />
    </div>
  )
}
