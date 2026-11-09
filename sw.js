const CACHE_NAME = 'zain-pwa-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './customers.js',
    './manifest.json',
    './icon.svg'
];

// تنزيل وحفظ الملفات في الكاش عند التثبيت
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// جلب الملفات من الكاش للعمل بدون إنترنت
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // إذا وجدنا الملف في الكاش، نعيده، وإلا نحضره من الإنترنت
                return response || fetch(event.request);
            })
    );
});
