// Script para forçar atualização do Service Worker e limpar cache
(function() {
    'use strict';
    
    // Limpar todos os caches antigos
    if ('caches' in window) {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                // Manter apenas o cache atual
                if (!cacheName.includes('chzsensi-v1.0.0')) {
                    caches.delete(cacheName);
                    console.log('Cache removido:', cacheName);
                }
            });
        });
    }
    
    // Desregistrar service workers antigos
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                // Se não for o service worker atual, desregistrar
                if (registration.scope && !registration.active) {
                    registration.unregister();
                    console.log('Service Worker desregistrado:', registration.scope);
                }
            });
        });
    }
    
    // Forçar atualização do service worker atual
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.update();
        });
    }
})();

