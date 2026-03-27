const CACHE_NAME = 'jump-pwa-v2';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './js/app.js',
    './js/jump-core.js',
    './js/jump-storage.js',
    './mediapipe/pose/pose.js',
    './mediapipe/pose/pose_solution_packed_assets_loader.js',
    './mediapipe/pose/pose_solution_packed_assets.data',
    './mediapipe/pose/pose_solution_simd_wasm_bin.js',
    './mediapipe/pose/pose_solution_simd_wasm_bin.wasm',
    './mediapipe/pose/pose_solution_wasm_bin.js',
    './mediapipe/pose/pose_solution_wasm_bin.wasm',
    './mediapipe/pose/pose_landmark_full.tflite',
    './mediapipe/pose/pose_landmark_heavy.tflite',
    './mediapipe/pose/pose_landmark_lite.tflite',
    './mediapipe/pose/pose_web.binarypb',
    './mediapipe/camera_utils/camera_utils.js',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const networkFirst =
        request.mode === 'navigate' ||
        url.pathname.endsWith('/index.html') ||
        url.pathname.endsWith('/manifest.webmanifest') ||
        url.pathname.includes('/js/');

    if (networkFirst) {
        event.respondWith(
            fetch(request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                }
                return response;
            }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
        );
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                return response;
            });
        })
    );
});
