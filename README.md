# Axora ⚡

Platform komunitas modern untuk builder Indonesia.  
Stack: Next.js 15 · TypeScript · Tailwind · PostgreSQL · Prisma · Auth.js

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/kamu/axora.git
cd axora
npm install
```

### 2. Setup Database

**Opsi A — Supabase (recommended untuk MVP):**
1. Buat project di [supabase.com](https://supabase.com)
2. Settings → Database → Connection string → URI
3. Copy ke `DATABASE_URL` di `.env.local`

**Opsi B — Local PostgreSQL:**
```bash
createdb axora
# DATABASE_URL="postgresql://localhost:5432/axora"
```

### 3. Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local dan isi semua variabel yang diperlukan
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Setup Prisma

```bash
npm run db:push      # Push schema ke database
npm run db:generate  # Generate Prisma Client
npm run db:seed      # Isi data dummy untuk development
```

### 5. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

**Test accounts (password: `Password123`):**
- `reza@axora.dev`
- `sari@axora.dev`
- `adi@axora.dev`

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── (auth)/          # Login, Register (no sidebar)
│   ├── (main)/          # Feed, Profile, Explore, Notif (with sidebar)
│   └── api/             # REST API endpoints
├── components/
│   ├── ui/              # Design system primitives
│   ├── feed/            # Feed & post components
│   ├── layout/          # Sidebar, RightPanel
│   └── profile/         # Profile components
├── lib/                 # Utilities, config, helpers
├── hooks/               # Custom React hooks
└── types/               # TypeScript types
```

---

## 🛠️ Commands

```bash
npm run dev           # Development server (Turbopack)
npm run build         # Production build
npm run type-check    # TypeScript check tanpa build

npm run db:push       # Sync schema ke DB (dev)
npm run db:migrate    # Buat migration file (production)
npm run db:studio     # Prisma Studio UI
npm run db:seed       # Seed data dummy
npm run db:reset      # Reset + re-seed (WARNING: hapus semua data!)
```

---

## 🚢 Deploy ke Vercel + Supabase

### Database (Supabase)
1. [supabase.com](https://supabase.com) → New project
2. Settings → Database → Connection string → copy `DATABASE_URL`
3. Untuk production: gunakan **Transaction pooler** URL (port 6543)

### App (Vercel)
1. Push ke GitHub
2. [vercel.com](https://vercel.com) → Import repo
3. Environment Variables → tambahkan semua dari `.env.example`
4. Deploy!

### File Storage (Cloudflare R2)
1. [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket `axora-media`
2. Settings → Enable public access → set domain `media.axora.app`
3. Manage R2 API tokens → Create token (Object Read & Write)

---

## 🔒 Security Notes

- Password di-hash dengan **bcrypt cost factor 12**
- Session JWT di **httpOnly cookie** (tidak bisa diakses JavaScript)
- Semua input divalidasi dengan **Zod** sebelum masuk DB
- File upload memverifikasi **magic bytes** (bukan hanya Content-Type)
- **Soft delete** pada posts — data tidak langsung hilang dari DB
- Rate limiting per user dan per IP
- Security headers di setiap response

---

## 📋 API Endpoints

```
POST  /api/auth/register              Daftar akun
POST  /api/auth/[...nextauth]         Login/logout (Auth.js)

GET   /api/posts?type=home&cursor=    Feed posts (paginated)
POST  /api/posts                      Buat post baru
GET   /api/posts/:id                  Detail post
DELETE/api/posts/:id                  Hapus post
POST  /api/posts/:id/like             Toggle like
GET   /api/posts/:id/comments         List komentar
POST  /api/posts/:id/comments         Tambah komentar

GET   /api/users/:username            Profil user
PATCH /api/users/:username            Update profil (owner only)
POST  /api/users/:username/follow     Toggle follow

GET   /api/notifications              List notifikasi
PATCH /api/notifications              Mark all as read

POST  /api/upload                     Upload gambar (max 5MB)
```

---

## 🗺️ Roadmap

- [x] Auth (register/login)
- [x] Feed (home + explore)
- [x] Create/delete post
- [x] Media upload (Cloudflare R2)
- [x] Like & comment
- [x] Follow/unfollow
- [x] Notifications
- [x] Profile page
- [ ] Full-text search (PostgreSQL tsvector)
- [ ] Real-time notifications (SSE)
- [ ] Email verifikasi (Resend)
- [ ] Dark/light mode toggle
- [ ] Mobile PWA
- [ ] Admin panel
- [ ] Analytics

---

Built with ☕ untuk komunitas developer Indonesia.
