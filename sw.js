const cacheName = 'arv-cache-v1';
const assets = [
    './',
    './index.html',
    './style.css',
    './main.js'
];

//instalation and saving files
self.addEventListener('install', e => {
    e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)))
});

// Serving files if no internet
self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then (res => res || fetch(e.request)));
});