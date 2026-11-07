var V = 'tuitiondesk-v2';
var SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(V).then(function (c) {
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (n) { return n !== V && n.indexOf('tuitiondesk-') === 0; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);

  if (u.origin === location.origin) {
    if (r.mode === 'navigate') {
      // Open the latest page when online, the saved copy when offline
      e.respondWith(
        fetch(r).then(function (res) {
          var cp = res.clone();
          caches.open(V).then(function (c) { c.put('index.html', cp); });
          return res;
        }).catch(function () { return caches.match('index.html'); })
      );
      return;
    }
    e.respondWith(
      caches.match(r).then(function (m) {
        var net = fetch(r).then(function (res) {
          if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
          return res;
        }).catch(function () { return m; });
        return m || net;
      })
    );
    return;
  }

  // Keep the database library so the app can start offline. Data requests are never cached.
  if (u.hostname === 'cdn.jsdelivr.net' && u.pathname.indexOf('/npm/@supabase/') === 0) {
    e.respondWith(
      caches.match(r).then(function (m) {
        return m || fetch(r).then(function (res) {
          var cp = res.clone();
          caches.open(V).then(function (c) { c.put(r, cp); });
          return res;
        });
      })
    );
  }
});
