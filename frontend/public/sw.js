/*
 * Janatha Motors service worker: lets the app open without internet.
 *  - The app page: network first, falling back to the last saved copy when offline.
 *  - Built files (/assets/…, hashed names): cache first.
 *  - Icons / logos: served from cache, refreshed in the background.
 * API calls (/api/…) are never cached here; the app keeps its own offline copies of data.
 */
const VERSION = 'jms-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add('/')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Pages: try the network, keep the latest app page, fall back to it offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(SHELL).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Built JS/CSS: file names change with every build, so a cached copy is always correct.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSETS).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
    return
  }

  // Other static files (logo, icons): cached copy now, refreshed in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(ASSETS).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => hit)
      return hit || network
    })
  )
})
