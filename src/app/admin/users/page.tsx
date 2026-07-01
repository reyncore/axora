import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Avatar } from "@/components/ui/Avatar"
import { UserActions } from "./UserActions"
import { BadgeCheck, ShieldCheck, Ban } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export const metadata: Metadata = { title: "Kelola Pengguna" }
export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

const PAGE_SIZE = 20

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams
  const page  = Math.max(1, Number(pageParam ?? 1))
  const query = q?.trim()

  const where = query
    ? {
        OR: [
          { username:    { contains: query, mode: "insensitive" as const } },
          { displayName: { contains: query, mode: "insensitive" as const } },
          { email:       { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, username: true, displayName: true, email: true,
        avatarUrl: true, isVerified: true, role: true,
        isBanned: true, banReason: true, createdAt: true,
        _count: { select: { posts: true, followers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h1 className="text-xl font-bold text-ax-text-primary mb-1">Kelola Pengguna</h1>
      <p className="text-sm text-ax-text-muted mb-6">
        {total.toLocaleString("id-ID")} pengguna terdaftar
      </p>

      {/* Search */}
      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cari username, nama, atau email..."
          className="ax-input max-w-md"
        />
      </form>

      <div className="ax-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ax-bg-border text-left">
              <th className="px-4 py-3 font-medium text-ax-text-muted">Pengguna</th>
              <th className="px-4 py-3 font-medium text-ax-text-muted">Email</th>
              <th className="px-4 py-3 font-medium text-ax-text-muted">Stats</th>
              <th className="px-4 py-3 font-medium text-ax-text-muted">Bergabung</th>
              <th className="px-4 py-3 font-medium text-ax-text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-ax-text-muted text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-ax-bg-border last:border-0
                                            hover:bg-ax-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-ax-text-primary truncate">
                          {user.displayName}
                        </span>
                        {user.isVerified && (
                          <BadgeCheck size={13} className="text-ax-accent-light flex-shrink-0" />
                        )}
                        {user.role === "ADMIN" && (
                          <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" aria-label="Admin" />
                        )}
                      </div>
                      <p className="text-xs text-ax-text-muted">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ax-text-secondary">{user.email}</td>
                <td className="px-4 py-3 text-ax-text-muted text-xs">
                  {user._count.posts} post · {user._count.followers} follower
                </td>
                <td className="px-4 py-3 text-ax-text-muted text-xs">
                  {format(user.createdAt, "d MMM yyyy", { locale: idLocale })}
                </td>
                <td className="px-4 py-3">
                  {user.isBanned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                     bg-red-950/40 text-red-400 text-xs">
                      <Ban size={11} aria-hidden="true" />
                      Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full
                                     bg-emerald-950/40 text-emerald-400 text-xs">
                      Aktif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserActions
                    userId={user.id}
                    username={user.username}
                    isBanned={user.isBanned}
                    isVerified={user.isVerified}
                    role={user.role}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-ax-text-muted">
            Tidak ada pengguna ditemukan
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`/admin/users?page=${p}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={`px-3 py-1.5 rounded-ax text-sm transition-colors ${
                p === page
                  ? "bg-ax-accent text-white"
                  : "text-ax-text-muted hover:bg-ax-bg-subtle"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
