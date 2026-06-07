import {
  getPendingActions,
  updateActionStatus,
  removePendingAction,
} from "@/db/offlineStore";

// ---------------------------------------------------------------------------
// CONFLICT RESOLUTION ENGINE (Version Vectoring / Last-Write-Wins)
// ---------------------------------------------------------------------------

/**
 * Smart Conflict Resolver using Last-Write-Wins (LWW).
 * Compares the local offline record against the remote database record.
 * @param {Object} localRecord - The record saved while offline.
 * @param {Object} remoteRecord - The current truth from the database.
 * @returns {Object} The safely merged record ready for syncing.
 */
export function resolveConflict(localRecord, remoteRecord) {
  if (!remoteRecord) return localRecord; // No conflict, remote doesn't exist

  // Normalize timestamps to epochs for accurate mathematical comparison
  const getEpoch = (record) => {
    const timeVal = record.timestamp || record.updatedAt || 0;
    return new Date(timeVal).getTime();
  };

  const localTime = getEpoch(localRecord);
  const remoteTime = getEpoch(remoteRecord);

  // If local is strictly newer, local wins. Otherwise, remote wins to prevent stale overwrites.
  if (localTime > remoteTime) {
    console.warn(
      `[Sync] Conflict detected for ${localRecord.id}: Local is newer. Overwriting remote.`
    );
    // Deep merge: Keep remote metadata, overwrite with local data
    return {
      ...remoteRecord,
      ...localRecord,
      updatedAt: new Date().toISOString(),
    };
  } else {
    console.warn(
      `[Sync] Conflict detected for ${localRecord.id}: Remote is newer. Discarding stale local cache.`
    );
    return remoteRecord;
  }
}

// ---------------------------------------------------------------------------
// NETWORK & RETRY UTILITIES
// ---------------------------------------------------------------------------

/**
 * Wrapper for fetch with basic timeout and exponential backoff retry logic.
 */
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return response;
    } catch (err) {
      if (i === retries) throw err;
      // Exponential backoff: 500ms, 1000ms
      await new Promise((res) => setTimeout(res, 500 * Math.pow(2, i)));
    }
  }
}

// ---------------------------------------------------------------------------
// CORE SYNC LOGIC
// ---------------------------------------------------------------------------

/**
 * Syncs a single record by fetching the remote version,
 * resolving conflicts, and pushing the result safely.
 */
export async function syncSingleRecord(record, token) {
  try {
    // 1. Fetch remote record to verify state
    let remoteRecord = null;
    try {
      const response = await fetchWithRetry(
        `/api/attendance/get-record?id=${record.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      remoteRecord = await response.json();
    } catch (fetchErr) {
      console.info(
        `[Sync] No remote record found or fetch failed for ${record.id}. Proceeding with local.`
      );
    }

    // 2. Resolve conflicts
    const resolvedRecord = resolveConflict(record, remoteRecord);

    // If the conflict resolver determined the remote is newer, skip the push
    if (remoteRecord && resolvedRecord === remoteRecord) {
      console.info(`[Sync] Record ${record.id} is stale. Skipping push.`);
      return true;
    }

    // 3. Push the resolved record to the server
    await fetchWithRetry("/api/attendance/sync-single", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ record: resolvedRecord }),
    });

    return true;
  } catch (err) {
    console.error(`[Sync] Failed to sync record ${record.id}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// PENDING ACTIONS QUEUE SYNC
// ---------------------------------------------------------------------------

/**
 * Flushes the pending actions queue to the server.
 */
export async function syncPendingActions() {
  const pending = await getPendingActions();
  for (const action of pending) {
    try {
      const res = await fetch("/api/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.data),
      });
      if (res.ok) {
        await removePendingAction(action.id);
      } else {
        const retryCount = (action.retryCount || 0) + 1;
        if (retryCount >= 5) {
          await updateActionStatus(action.id, "failed", retryCount);
        } else {
          await updateActionStatus(action.id, "pending", retryCount);
        }
      }
    } catch {
      const retryCount = (action.retryCount || 0) + 1;
      await updateActionStatus(action.id, "pending", retryCount);
    }
  }
}

// ---------------------------------------------------------------------------
// BACKGROUND SYNC REGISTRATION
// ---------------------------------------------------------------------------

/**
 * Registers background sync for PWA environments.
 */
export function registerBackgroundSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.sync.register("sync-attendance").catch(() => {});
  });
}
