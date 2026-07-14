/**
 * Axora Service Worker
 *
 * CACHING STRATEGY:
 * - Static assets (_next/static/*, icons, fonts): Cache First
 *   → Immutable karena Next.js pakai content hash di filename
 * - Navigation (HTML pages): Network First, fallback ke offline.html
 * - Images: Stale While Revalidate
 *   → Tampilkan dari cache langsung, update di background
 * - API routes: Network Only
 *   → Data harus selalu fresh — tidak boleh di-cache
 */

const CACHE_VERSION  = 'v1'
const STATIC_CACHE   = `axora-static-${CACHE_VERSION}`
const IMAGE_CACHE    = `axora-images-${CACHE_VERSION}`
const OFFLINE_URL    = '/offline.html'

// Pre-cache resources saat install
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Aktifkan SW baru segera
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // Ambil kontrol semua tab
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request }  = event
  const url          = new URL(request.url)

  // Hanya handle request ke origin yang sama
  if (url.origin !== self.location.origin) return

  // API routes — Network Only (selalu fetch dari server)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Static assets Next.js (_next/static) — Cache First
  // Immutable: hash di filename, tidak pernah berubah
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Icon dan manifest — Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Images — Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // Navigation (HTML pages) — Network First, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }
})

// ── Strategies ────────────────────────────────────────────────────────────────

/** Cache First: cek cache dulu, kalau tidak ada baru fetch + simpan */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Resource tidak tersedia', { status: 503 })
  }
}

/** Stale While Revalidate: tampilkan cache langsung, update di background */
async function staleWhileRevalidate(request, cacheName) {
  const cached      = await caches.match(request)
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response.clone()))
    }
    return response
  }).catch(() => null)

  return cached ?? (await fetchPromise) ?? new Response('', { status: 503 })
}

/** Network First: coba fetch, kalau gagal tampilkan offline page */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    // Cache page HTML untuk next visit
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Network gagal — cek cache dulu
    const cached = await caches.match(request)
    if (cached) return cached

    // Tidak ada cache — tampilkan halaman offline
    const offline = await caches.match(OFFLINE_URL)
    return offline ?? new Response('Offline', { status: 503 })
  }
}
