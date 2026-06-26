/**
 * prisma/seed.ts
 * Jalankan: npm run db:seed
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

interface SeededUser {
  id:       string
  username: string
  email:    string
}

const USERS = [
  {
    username:    "reza",
    email:       "reza@axora.dev",
    displayName: "Reza Mahendra",
    bio:         "Senior Engineer @ Tokopedia. Suka Next.js, Rust, dan kopi hitam ☕",
    password:    "Password123",
  },
  {
    username:    "sari_dev",
    email:       "sari@axora.dev",
    displayName: "Sari Pratiwi",
    bio:         "Fullstack developer. Open source enthusiast. Builder of side projects 🛠️",
    password:    "Password123",
  },
  {
    username:    "adi_k",
    email:       "adi@axora.dev",
    displayName: "Adi Kurniawan",
    bio:         "DevOps & Cloud @ GoPay. Kubernetes addict.",
    password:    "Password123",
  },
  {
    username:    "dini_ui",
    email:       "dini@axora.dev",
    displayName: "Dini Rahayu",
    bio:         "Product Designer. Making things beautiful and functional ✨",
    password:    "Password123",
  },
  {
    username:    "faiz",
    email:       "faiz@axora.dev",
    displayName: "Faiz Hasan",
    bio:         "Indie hacker. Building SaaS products from Yogyakarta 🌴",
    password:    "Password123",
  },
] as const

const POSTS = [
  {
    author:  "reza",
    content: "Next.js 15 dengan Turbopack di production itu beneran game changer. Cold start yang tadinya 8 detik sekarang 1.2 detik. Nggak ada alasan lagi untuk nggak upgrade.\n\n#NextJS #WebDev #Performance",
  },
  {
    author:  "sari_dev",
    content: "Sharing project side-project: tool untuk auto-generate Prisma schema dari ERD diagram. Masih beta tapi udah bisa handle relation N:N dan enum 🎉\n\nGithub link di bio!\n\n#Prisma #OpenSource #DevTools",
  },
  {
    author:  "adi_k",
    content: "Pertanyaan buat yang sudah production dengan Supabase: apakah connection pooling dari PgBouncer bawaan mereka cukup untuk ~500 concurrent user? Atau perlu setup sendiri?\n\n#Supabase #PostgreSQL #DevOps",
  },
  {
    author:  "dini_ui",
    content: "Hot take: design system yang over-abstracted lebih berbahaya dari tidak punya design system sama sekali.\n\n#DesignSystem #ProductDesign",
  },
  {
    author:  "faiz",
    content: "6 bulan pertama solo founder itu yang paling berat. Bukan karena coding-nya — tapi karena nggak ada yang notice kerja kerasmu. Terus aja ship.\n\n#IndieHacker #SaaS #BuildInPublic",
  },
  {
    author:  "reza",
    content: "Tips TypeScript yang sering dilupain: pakai 'satisfies' operator buat validasi object shape tanpa kehilangan type inference.\n\n#TypeScript #WebDev",
  },
  {
    author:  "faiz",
    content: "MRR update bulan ini: $847 🎉\n\nMasih jauh dari target, tapi growth 23% MoM dan churn rate 0% bulan ini. Pelan-pelan.\n\n#BuildInPublic #IndieHacker #SaaS",
  },
] as const

const FOLLOW_PAIRS = [
  ["reza",    "sari_dev"],
  ["reza",    "faiz"],
  ["sari_dev","reza"],
  ["sari_dev","adi_k"],
  ["adi_k",   "reza"],
  ["adi_k",   "faiz"],
  ["dini_ui", "reza"],
  ["dini_ui", "sari_dev"],
  ["faiz",    "reza"],
  ["faiz",    "dini_ui"],
] as const

const SAMPLE_COMMENTS = [
  "Setuju banget! Udah ngerasain sendiri perbedaannya 🔥",
  "Bisa share lebih detail ga? Penasaran sama implementasinya",
  "Mantap! Ini yang lagi gue cari-cari. Thanks sharing!",
  "Worth it buat di-implement di production?",
  "GG! Keep shipping 🚀",
] as const

async function main() {
  console.log("🌱 Seeding database Axora...\n")

  // ── Users ────────────────────────────────────────────────────────────────
  console.log("👤 Membuat users...")
  const createdUsers = new Map<string, SeededUser>()

  for (const userData of USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12)
    const user = await prisma.user.upsert({
      where:  { email: userData.email },
      update: {},
      create: {
        username:    userData.username,
        email:       userData.email,
        displayName: userData.displayName,
        bio:         userData.bio,
        passwordHash,
        isVerified:  userData.username === "reza",
      },
      select: { id: true, username: true, email: true },
    })
    createdUsers.set(userData.username, user)
    console.log(`  ✓ @${user.username}`)
  }

  // ── Posts ─────────────────────────────────────────────────────────────────
  console.log("\n📝 Membuat posts...")
  const createdPostIds: string[] = []

  for (const postData of POSTS) {
    const author = createdUsers.get(postData.author)
    if (!author) continue

    const post = await prisma.post.create({
      data:   { content: postData.content, authorId: author.id },
      select: { id: true },
    })
    createdPostIds.push(post.id)
    console.log(`  ✓ Post oleh @${postData.author}: "${postData.content.slice(0, 40)}…"`)
  }

  // ── Follows ────────────────────────────────────────────────────────────────
  console.log("\n🤝 Membuat follows...")

  for (const [followerName, followingName] of FOLLOW_PAIRS) {
    const follower  = createdUsers.get(followerName)
    const following = createdUsers.get(followingName)
    if (!follower || !following) continue

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId:  follower.id,
          followingId: following.id,
        },
      },
      update: {},
      create: {
        followerId:  follower.id,
        followingId: following.id,
      },
    })
  }
  console.log(`  ✓ ${FOLLOW_PAIRS.length} follows dibuat`)

  // ── Likes ──────────────────────────────────────────────────────────────────
  console.log("\n❤️  Membuat likes...")
  const allUsers  = [...createdUsers.values()]
  let likeCount   = 0

  for (const postId of createdPostIds) {
    // 2–3 user random like setiap post
    const post = await prisma.post.findUnique({
      where:  { id: postId },
      select: { authorId: true },
    })
    if (!post) continue

    const likers = allUsers
      .filter(u => u.id !== post.authorId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2))

    for (const liker of likers) {
      await prisma.like.upsert({
        where:  { userId_postId: { userId: liker.id, postId } },
        update: {},
        create: { userId: liker.id, postId },
      })
      likeCount++
    }
  }
  console.log(`  ✓ ${likeCount} likes dibuat`)

  // ── Comments ───────────────────────────────────────────────────────────────
  console.log("\n💬 Membuat comments...")
  let commentCount = 0

  for (const [index, postId] of createdPostIds.slice(0, 4).entries()) {
    const post = await prisma.post.findUnique({
      where:  { id: postId },
      select: { authorId: true },
    })
    if (!post) continue

    const commenter = allUsers.find(u => u.id !== post.authorId)
    if (!commenter) continue

    await prisma.comment.create({
      data: {
        content:  SAMPLE_COMMENTS[index % SAMPLE_COMMENTS.length] ?? SAMPLE_COMMENTS[0],
        authorId: commenter.id,
        postId,
      },
    })
    commentCount++
  }
  console.log(`  ✓ ${commentCount} comments dibuat`)

  console.log("\n✅ Seed selesai!")
  console.log("\n📋 Test accounts (semua password: Password123):")
  for (const u of USERS) console.log(`   ${u.email}`)
}

main()
  .catch(e => { console.error("❌ Seed gagal:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
