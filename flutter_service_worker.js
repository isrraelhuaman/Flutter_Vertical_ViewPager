'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/fonts/Roboto-Medium.ttf": "58aef543c97bbaf6a9896e8484456d98",
"assets/fonts/Friz%2520Quadrata%2520Std%2520Italic.otf": "1523f3a54b55b90818d8b2a4e6041656",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/fonts/Bevan-Regular.ttf": "c800526423a8747db3cab278dbd5244f",
"assets/NOTICES": "fba3f4f265f90e628d52628393c269b3",
"assets/FontManifest.json": "c3fbb53e4370020ef555c9a7813e2734",
"assets/images/role/assasin.png": "f863ebf1e14e3b869e91e5a57197fb5d",
"assets/images/role/tanker.png": "6ea544cbbac5356d227a6b82a5778ca7",
"assets/images/role/mage.png": "f89b903a9974ce16776b6f0b08925f42",
"assets/images/role/marksman.png": "2c429ad70e0c8c5df8bb694b18334885",
"assets/images/role/fighter.png": "336ff2ca0b657c241591afc8dfbe5d67",
"assets/images/camile_lol.gif": "578d72c30f9048b01487a5f6375e9a06",
"assets/images/zoe_lol.gif": "aa79a4ff55bf1d4833e62efe6da51371",
"assets/images/mojave.png": "d6ff99c9ede189122d84f736debab14c",
"assets/images/poppy_lol.gif": "3f6243140d0fbd03130b283d3278afd2",
"assets/images/logo.png": "3b04882651cd553210ec8a2bb455670d",
"assets/images/high_sierra.png": "5196eb645a58e1dd8a68b9bd6b74c184",
"assets/images/el_capitan.png": "c37d19e152df3227e745046d7b7c5e31",
"assets/images/catalina.png": "a9d1dc1723f2bca91199248b44b47385",
"assets/images/yosemite.png": "557146eecfb68fc7c6838a01d6a1e5e3",
"assets/images/ezreal_lol.gif": "8c2725a5af21c3a9cb6c336e5b012de6",
"assets/images/sierra.png": "e7122ea7540ef446bdb9af2923a2dc51",
"assets/images/irelia_lol.gif": "e5e7cdb815b49c5cf754f168363526d1",
"assets/images/akali_lol.gif": "53dde89a8bbed5c9c50565517342482b",
"assets/AssetManifest.json": "15895ea86210296987d1743d3068b23a",
"main.dart.js": "2b6ec4bc734ddb3b410a0ad728da6302",
"index.html": "50efc89b64ed07e6b565147712f97ed0",
"/": "50efc89b64ed07e6b565147712f97ed0"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "/",
"main.dart.js",
"index.html",
"assets/NOTICES",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      // Provide a no-cache param to ensure the latest version is downloaded.
      return cache.addAll(CORE.map((value) => new Request(value, {'cache': 'no-cache'})));
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#')) {
    key = '/';
  }
  // If the URL is not the the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache. Ensure the resources are not cached
        // by the browser for longer than the service worker expects.
        var modifiedRequest = new Request(event.request, {'cache': 'no-cache'});
        return response || fetch(modifiedRequest).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.message == 'skipWaiting') {
    return self.skipWaiting();
  }

  if (event.message = 'downloadOffline') {
    downloadOffline();
  }
});

// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey in Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
