// RoofScan AI - Service Worker with Automatic Cache Purge & Network-First Strategy
const CACHE_NAME = 'roofscan-v3';

// 1. Install Event: บังคับให้ Service Worker ตัวใหม่ทำงานทันทีโดยไม่ต้องรอ
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate Event: ตรวจจับและลบแคชเวอร์ชันเก่าทั้งหมดในเครื่องทิ้งทันที
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // เข้าควบคุมทุก Client (หน้าเว็บที่เปิดอยู่) ทันที
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: ใช้กลยุทธ์ Network-First เพื่อดึงไฟล์สดจาก Server ก่อนเสมอ
self.addEventListener('fetch', (event) => {
  // ข้ามการแคชสำหรับคำขอที่ไม่ใช่ GET หรือเป็น Endpoint ภายนอก (เช่น Google Gemini API)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // หากโหลดไฟล์จาก Network สำเร็จ นำไฟล์ใหม่ไปอัปเดตแทนที่ในแคช
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // หากไม่มีอินเทอร์เน็ต ให้ดึงไฟล์สำรองจากแคชมาแสดงผล
        return caches.match(event.request);
      })
  );
});
