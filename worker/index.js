import { openDB } from "idb";

const DB_NAME = "learnova_offline_db";
const STORE_NAME = "attendance_outbox";
const DB_VERSION = 1;

const CACHE_NAME = "learnova-api-cache-v1";
const CACHE_MAX_ENTRIES = 200;
const ANONYMOUS_USER_PREFIX = "anon";

async function getOutboxRecords() {
  const db = await openDB(DB_NAME, DB_VERSION);
  return db.getAll(STORE_NAME);
}

async function removeFromOutbox(id) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).delete(id);
  await tx.done;
}

async function syncAttendanceSW() {
  const records = await getOutboxRecords();
  if (records.length === 0) return;

  const BATCH_SIZE = 50;
  let totalSynced = 0;

  try {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const response = await fetch("/api/attendance/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ records: batch }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          for (const id of data.syncedIds ?? []) {
            await removeFromOutbox(id);
          }
          totalSynced += data.syncedIds?.length ?? 0;
          for (const id of data.rejectedIds ?? []) {
            await removeFromOutbox(id);
          }
        }
      } else {
        throw new Error(`Failed to sync batch: ${response.status} ${response.statusText}`);
      }
    }

    if (totalSynced > 0) {
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_COMPLETE", count: totalSynced });
      });
    }
  } catch (error) {
    console.error("[Service Worker] Error during background sync:", error);
    throw error;
  }
}

function getUserHashFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const authTokenMatch = cookieHeader.match(/(?:^|;\s*)authToken=([^;]+)/);
  if (!authTokenMatch) return null;
  const token = authTokenMatch[1];
  return token.slice(0, 16);
}

function buildCacheKey(url, userHash) {
  const suffix = userHash || ANONYMOUS_USER_PREFIX;
  return `${url}__uid__${suffix}`;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > CACHE_MAX_ENTRIES) {
    const toDelete = keys.slice(0, keys.length - CACHE_MAX_ENTRIES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

async function clearCacheForUser(userHash) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const userPattern = `__uid__${userHash}`;
  await Promise.all(
    keys
      .filter((request) => request.url.includes(userPattern))
      .map((request) => cache.delete(request)),
  );
}

async function clearUserCaches() {
  const cacheNames = await caches.keys();
  const apiCaches = cacheNames.filter((name) => name.startsWith("learnova-api-cache"));
  await Promise.all(apiCaches.map((name) => caches.delete(name)));
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-attendance") {
    event.waitUntil(
      syncAttendanceSW().catch((error) => {
        console.error("[Service Worker] Background sync failed:", error);
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    event.waitUntil(syncAttendanceSW());
  } else if (event.data && event.data.type === "CLEAR_USER_CACHE") {
    const userHash = event.data.userHash;
    if (userHash) {
      event.waitUntil(clearCacheForUser(userHash));
    } else {
      event.waitUntil(clearUserCaches());
    }
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method === "GET" && request.url.includes("/api/") && !request.url.includes("/api/auth/")) {
    event.respondWith(
      (async () => {
        const userHash = getUserHashFromRequest(request);
        const cacheKey = buildCacheKey(request.url, userHash);
        const cache = await caches.open(CACHE_NAME);

        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            const cachePutPromise = cache.put(cacheKey, cloned).then(() => trimCache(cache));
            event.waitUntil(cachePutPromise);
          }
          return networkResponse;
        } catch {
          const offlineResponse = await cache.match(cacheKey);
          return offlineResponse || new Response("You are offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cached = await caches.match("/offline.html");
          return cached || new Response("You are offline", {
            headers: { "Content-Type": "text/html" },
          });
        })
    );
  }
});
