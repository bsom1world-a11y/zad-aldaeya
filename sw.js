const CACHE_NAME = 'zad-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './maskable-icon.svg'
];

// التثبيت: تخزين الأصول الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// التفعيل: تنظيف الذكريات المؤقتة القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// جلب الطلبات: الذكريات المؤقتة أولاً للأصول الثابتة، الشبكة أولاً للباقي
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // طلبات التنقل (الصفحات) →inton من الذكريات المؤقتة أو الشبكة
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  // الأصول الثابتة: الذكريات المؤقتة أولاً
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // لا نخزن طلبات غير GET أو الاستجابات غير الناجحة
        if (event.request.method !== 'GET' || !response.ok) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // عند انقطاع الإنترنت ولم encuentr في الذكريات المؤقتة
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 408, statusText: 'لا يوجد اتصال بالإنترنت' });
      });
    })
  );
});
