import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Users, FileText, UserX, TrendingUp } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const metadata: Metadata = { title: "Admin Dashboard" }
export const dynamic = "force-dynamic"

interface StatCard {
  label: string
  value: number
  icon:  LucideIcon
  color: string
}

async function getStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [totalUsers, totalPosts, postsToday, bannedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { isDeleted: false } }),
    prisma.post.count({ where: { isDeleted: false, createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { isBanned: true } }),
  ])

  return { totalUsers, totalPosts, postsToday, bannedUsers }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const cards: StatCard[] = [
    { label: "Total Pengguna",  value: stats.totalUsers,  icon: Users,      color: "text-blue-400"    },
    { label: "Total Post",      value: stats.totalPosts,  icon: FileText,   color: "text-emerald-400" },
    { label: "Post Hari Ini",   value: stats.postsToday,  icon: TrendingUp, color: "text-ax-accent-light" },
    { label: "Pengguna Dibanned", value: stats.bannedUsers, icon: UserX,    color: "text-red-400"     },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-ax-text-primary mb-1">Dashboard</h1>
      <p className="text-sm text-ax-text-muted mb-6">Ringkasan statistik Axora</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="ax-card p-5">
            <div className="flex items-center justify-between mb-3">
              <Icon size={20} className={color} aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-ax-text-primary tabular-nums">
              {value.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-ax-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 ax-card p-5">
        <h2 className="text-sm font-semibold text-ax-text-primary mb-2">Quick Actions</h2>
        <p className="text-sm text-ax-text-muted">
          Gunakan menu di samping untuk mengelola pengguna dan post.
        </p>
      </div>
    </div>
  )
}
