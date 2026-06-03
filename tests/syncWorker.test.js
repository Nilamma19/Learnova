import { describe, it, expect, vi } from 'vitest';
import { processOfflineQueueWithRetry } from '../worker/syncWorker';

describe('Background Worker Offline Synchronization Sync', () => {
  it('should successfully pass data if local modification timestamp is newer (LWW)', async () => {
    const mockQueue = [
      { id: '1', localTimestamp: 2000, serverTimestamp: 1000, data: 'newer_update' }
    ];
    const apiMock = vi.fn().mockResolvedValue({ success: true });
    
    const results = await processOfflineQueueWithRetry(mockQueue, apiMock);
    expect(results[0].status).toBe('synced');
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it('should completely discard local mutation if server timestamp is newer', async () => {
    const mockQueue = [
      { id: '2', localTimestamp: 500, serverTimestamp: 1500, data: 'stale_update' }
    ];
    const apiMock = vi.fn();
    
    const results = await processOfflineQueueWithRetry(mockQueue, apiMock);
    expect(results.length).toBe(0);
    expect(apiMock).not.toHaveBeenCalled();
  });
});
