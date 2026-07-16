'use strict';
var CACHE = 'on-ona-shell-v1';
var SHELL = ['./index.html', './manifest.json', './icon.png', './icon-maskable.png', './apple-touch-icon.png', './sw.js'];

/* ── Install: кешируем приложение ── */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

/* ── Activate: удаляем старые кеши ── */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  /* Шрифты Google — через сеть, без кеширования (фолбэк на системный шрифт если нет сети) */
  if(url.hostname.indexOf('googleapis.com') >= 0 || url.hostname.indexOf('gstatic.com') >= 0) return;

  /* HTML-документ — СЕТЬ В ПРИОРИТЕТЕ (чтобы обновления всегда применялись),
     кеш только когда нет интернета */
  if(e.request.mode === 'navigate' || url.pathname.indexOf('index.html') >= 0){
    e.respondWith(
      fetch(e.request).then(function(response){
        var clone = response.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return response;
      }).catch(function(){
        return caches.match(e.request).then(function(c){ return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* Остальное (иконки, манифест) — кеш сразу, обновление в фоне */
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var networkFetch = fetch(e.request).then(function(response){
        if(response && response.status === 200 && response.type === 'basic'){
          var clone = response.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return response;
      }).catch(function(){});
      return cached || networkFetch;
    })
  );
});
