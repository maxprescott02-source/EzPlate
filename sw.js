/* EzPlate service worker */
const CACHE = 'ezplate-v155';
const ASSETS = [
  './', './index.html', './css/style.css', './js/app.js',
  './css/style.css?v=155', './js/app.js?v=155',
  './fonts/Geist-Regular.woff2', './fonts/Geist-Medium.woff2', './fonts/Geist-SemiBold.woff2', './fonts/Geist-Bold.woff2',
  './fonts/GeistMono-Regular.woff2', './fonts/GeistMono-Medium.woff2', './fonts/GeistMono-SemiBold.woff2', './fonts/GeistMono-Bold.woff2',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).catch(function(){}));
});
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    const keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;
  if(isHTML){
    e.respondWith((async function(){
      try{
        const res = await fetch(req);
        if(res && res.ok){ const c = await caches.open(CACHE); c.put('./index.html', res.clone()); }
        return res;
      }catch(err){ return (await caches.match(req)) || (await caches.match('./index.html')); }
    })());
    return;
  }
  e.respondWith((async function(){
    const cached = await caches.match(req);
    if(cached) return cached;
    const res = await fetch(req);
    if(res && res.ok){ const c = await caches.open(CACHE); c.put(req, res.clone()); }
    return res;
  })());
});
