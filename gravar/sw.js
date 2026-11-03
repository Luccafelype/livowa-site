/* livowa.com/gravar — guarda a página para abrir sem internet.
   Rede primeiro de verdade: cada pedido vai à rede com cache:'no-cache' (revalida; o GitHub Pages manda
   max-age=600, e sem isso o fetch do service worker podia devolver o app.js velho por até 10 min).
   Sem conexão, usa a cópia guardada. Escopo: só /gravar/. Não guarda nem envia vídeo nenhum. */
const CACHE = 'gravar-v3';
const FILES = ['./', './index.html', './texto.js', './app.js', './gravar.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('gravar-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  e.respondWith(
    fetch(new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(url.href.split('?')[0], copy));
      }
      return res;
    }).catch(() => caches.match(url.href.split('?')[0], { ignoreSearch: true })
      .then((r) => r || caches.match(new URL('./', self.registration.scope).href)))
  );
});
