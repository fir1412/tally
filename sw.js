// Offline cache (adapted from we go gim). Bump VERSION whenever app files change.
const VERSION = 'tally-v23';
const CORE = [
  './', './index.html', './privacy.html', './privacy.ms.html', './privacy.zh.html', './terms.html', './manifest.webmanifest', './css/app.css', './icons/icon.svg',
  './js/app.js', './js/state.js', './js/db.js', './js/engine.js', './js/ui.js', './js/io.js', './js/i18n.js', './js/parse.js', './js/brands.js',
  './js/align.js', './js/scan.js', './js/ocr-worker.js', './js/calendar.js', './js/mmimport.js', './js/statement.js', './js/presets.js', './js/feedback.js', './js/tour.js', './js/lock.js', './js/camera.js', './js/colorpicker.js', './js/learn.js', './js/gamify.js', './js/delight.js',
  './js/views/home.js', './js/views/money.js', './js/views/review.js', './js/views/setup.js', './js/views/learn.js', './js/views/analytics.js', './js/i18n/ms.js', './js/i18n/zh.js',
];
// The OCR engine, models and sql.js (~45 MB) rarely change: their own cache survives app updates.
// Bump ASSETS if one of them changes.
const ASSETS = 'tally-assets-v1';
const isAsset = url => /\/(vendor|models|fonts)\//.test(url.pathname);
const corePaths = new Set(CORE.map(path => new URL(path, self.registration.scope).pathname));
const cacheable = (url, res) => res.ok && !(
  /\.(?:js|css|json|webmanifest|svg)$/.test(url.pathname) &&
  /text\/html/i.test(res.headers.get('content-type') || '')
);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const files = await Promise.all(CORE.map(async path => {
      const url = new URL(path, self.registration.scope);
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!cacheable(url, res)) throw new Error(`Invalid app file: ${url.pathname}`);
      return [url, res];
    }));
    const cache = await caches.open(VERSION);
    await Promise.all(files.map(([url, res]) => cache.put(url, res)));
    await self.skipWaiting();
  })().catch(error => { console.error('Tally offline update failed', error); throw error; }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tally-') && ![VERSION, ASSETS, 'tally-share'].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keyFor = url => url.origin + url.pathname;
const SHARED = 'tally-share';   // files shared into Tally, waiting for the page to pick them up
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const files = (await req.formData()).getAll('files').filter(f => typeof f !== 'string').slice(0, 20);
      await caches.delete(SHARED);
      const c = await caches.open(SHARED);
      await Promise.all(files.map((f, i) => c.put(`./shared/${i}`, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || `file-${i}`) } }))));
      return Response.redirect('./#/share', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google Sheets and calendar links go straight to the network
  if (isAsset(url)) {
    e.respondWith(caches.open(ASSETS).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (cacheable(url, res)) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  const key = keyFor(url), shell = req.mode === 'navigate';
  // Only a page load may fall back to the app shell: a script answered with index.html would leave the app stuck.
  const fromCache = () => caches.match(key).then(r => r || (shell ? caches.match('./index.html') : undefined));
  if (!shell && corePaths.has(url.pathname)) {
    e.respondWith(fromCache().then(hit => hit || fetch(req).then(res => {
      if (cacheable(url, res)) caches.open(VERSION).then(c => c.put(key, res.clone()));
      return res;
    })));
    return;
  }
  e.respondWith(new Promise(resolve => {
    let settled = false;
    const timer = shell ? setTimeout(() => { fromCache().then(r => { if (!settled && r) { settled = true; resolve(r); } }); }, 3000) : null;
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (cacheable(url, res)) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
      clearTimeout(timer);
      if (!settled) { settled = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then(r => { if (!settled) { settled = true; resolve(r || Response.error()); } });
    });
  }));
});
