// Service worker: deixa o app instalável e funcionando offline.
const CACHE = 'atelier-v4';
const SHELL = ['./', 'index.html', 'css/app.css', 'css/fonts.css', 'fonts/eb-garamond-latin-400-normal.woff2', 'fonts/cormorant-garamond-latin-600-normal.woff2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/app.js', 'js/config.js', 'js/parser.js', 'js/store.js', 'js/speech.js', 'js/util.js', 'js/data.js',
  'js/lesson.js', 'js/exercises.js', 'js/cards.js', 'js/studio.js', 'js/modelo.js', 'js/library.js', 'js/tests.js', 'js/voice.js', 'js/zip.js', 'js/practice.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase / APIs: nunca interceptar
  if (/googleapis\.com$|firebaseio|identitytoolkit|securetoken|firestore/.test(url.hostname) && !url.hostname.startsWith('fonts.')) return;
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'www.gstatic.com';
  if (!sameOrigin && !isFont) return;
  // Rede primeiro (conteúdo sempre atualizado), cache como reserva offline.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
