/**
 * Sync Service — Bidirectional sync between Dexie (local) and Firestore (cloud).
 * 
 * Strategy: Last-write-wins using `updatedAt` timestamp.
 * - On app open (cloud mode): pull from Firestore, merge with local
 * - On local write: push to Firestore in background
 * - Manual "Force Sync" pulls everything fresh
 */

import { db } from '../db';
import {
  cloudPut,
  cloudDelete,
  cloudGetAll,
  cloudBatchPut,
  getCurrentUser,
  isCloudMode,
} from '../firebase';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';
type SyncCallback = (status: SyncStatus, message?: string) => void;

let syncCallback: SyncCallback | null = null;

export function onSyncStatus(cb: SyncCallback) {
  syncCallback = cb;
}

function emitStatus(status: SyncStatus, message?: string) {
  syncCallback?.(status, message);
}

// ── Push Single Item to Cloud ────────────────────────
export async function pushToCloud(collectionName: string, id: string, data: Record<string, any>) {
  if (!isCloudMode()) return;
  const user = getCurrentUser();
  if (!user) return;

  try {
    await cloudPut(user.uid, collectionName, id, data);
  } catch (err) {
    console.error(`[Sync] Failed to push ${collectionName}/${id}:`, err);
  }
}

export async function deleteFromCloud(collectionName: string, id: string) {
  if (!isCloudMode()) return;
  const user = getCurrentUser();
  if (!user) return;

  try {
    await cloudDelete(user.uid, collectionName, id);
  } catch (err) {
    console.error(`[Sync] Failed to delete ${collectionName}/${id}:`, err);
  }
}

// ── Full Sync (Pull + Push) ──────────────────────────
export async function fullSync(): Promise<{ pulled: number; pushed: number }> {
  const user = getCurrentUser();
  if (!user || !isCloudMode()) {
    return { pulled: 0, pushed: 0 };
  }

  emitStatus('syncing', 'Syncing your data...');
  let totalPulled = 0;
  let totalPushed = 0;

  try {
    // Sync each collection
    const result1 = await syncCollection('transactions', db.transactions);
    const result2 = await syncCollection('accounts', db.accounts);
    const result3 = await syncCollection('categories', db.categories);
    const result4 = await syncCollection('budgets', db.budgets);
    const result5 = await syncCollection('goals', db.goals);
    const result6 = await syncCollection('recurring', db.recurring_transactions);

    const results = [result1, result2, result3, result4, result5, result6];
    totalPulled = results.reduce((sum, r) => sum + r.pulled, 0);
    totalPushed = results.reduce((sum, r) => sum + r.pushed, 0);

    emitStatus('success', `Synced! ${totalPulled} pulled, ${totalPushed} pushed`);
  } catch (err) {
    console.error('[Sync] Full sync failed:', err);
    emitStatus('error', 'Sync failed. Check your connection.');
  }

  return { pulled: totalPulled, pushed: totalPushed };
}

async function syncCollection(
  cloudCollectionName: string,
  dexieTable: any
): Promise<{ pulled: number; pushed: number }> {
  const user = getCurrentUser();
  if (!user) return { pulled: 0, pushed: 0 };

  let pulled = 0;
  let pushed = 0;

  try {
    // 1. Get all cloud items
    const cloudItems = await cloudGetAll(user.uid, cloudCollectionName);
    const cloudMap = new Map(cloudItems.map(item => [item.id, item]));

    // 2. Get all local items
    const localItems = await dexieTable.toArray();
    const localMap = new Map(localItems.map((item: any) => [item.id, item]));

    // 3. Merge: Cloud → Local (pull items that are newer in cloud or missing locally)
    for (const [id, cloudItem] of cloudMap) {
      const localItem = localMap.get(id) as any;
      const cloudUpdated = cloudItem._updatedAt || cloudItem.updatedAt || 0;
      const localUpdated = localItem?.updatedAt || 0;

      if (!localItem) {
        // Item exists in cloud but not locally → pull
        const { _updatedAt, _syncedAt, ...cleanItem } = cloudItem;
        await dexieTable.put({ ...cleanItem, updatedAt: cloudUpdated });
        pulled++;
      } else if (cloudUpdated > localUpdated) {
        // Cloud is newer → pull
        const { _updatedAt, _syncedAt, ...cleanItem } = cloudItem;
        await dexieTable.put({ ...cleanItem, updatedAt: cloudUpdated });
        pulled++;
      }
    }

    // 4. Merge: Local → Cloud (push items that are newer locally or missing in cloud)
    for (const [id, localItem] of localMap) {
      const cloudItem = cloudMap.get(id);
      const localUpdated = (localItem as any).updatedAt || 0;
      const cloudUpdated = cloudItem?._updatedAt || cloudItem?.updatedAt || 0;

      if (!cloudItem || localUpdated > cloudUpdated) {
        // Local is newer or missing in cloud → push
        await cloudPut(user.uid, cloudCollectionName, id as string, localItem as Record<string, any>);
        pushed++;
      }
    }

    // 5. Handle cloud deletions — items in cloud that have a _deleted flag
    // (We don't implement soft deletes for simplicity; deletions are handled via deleteFromCloud)

  } catch (err) {
    console.error(`[Sync] Error syncing ${cloudCollectionName}:`, err);
  }

  return { pulled, pushed };
}

// ── Initial Upload (first time cloud user) ───────────
export async function uploadAllToCloud(): Promise<number> {
  const user = getCurrentUser();
  if (!user) return 0;

  emitStatus('syncing', 'Uploading your data to cloud...');
  let total = 0;

  try {
    const collections = [
      { name: 'transactions', table: db.transactions },
      { name: 'accounts', table: db.accounts },
      { name: 'categories', table: db.categories },
      { name: 'budgets', table: db.budgets },
      { name: 'goals', table: db.goals },
      { name: 'recurring', table: db.recurring_transactions },
    ];

    for (const { name, table } of collections) {
      const items = await table.toArray();
      if (items.length > 0) {
        await cloudBatchPut(user.uid, name, items);
        total += items.length;
      }
    }

    emitStatus('success', `Uploaded ${total} items to cloud`);
  } catch (err) {
    console.error('[Sync] Upload failed:', err);
    emitStatus('error', 'Upload failed. Check your connection.');
  }

  return total;
}

// ── Download All from Cloud ──────────────────────────
export async function downloadAllFromCloud(): Promise<number> {
  const user = getCurrentUser();
  if (!user) return 0;

  emitStatus('syncing', 'Downloading your data from cloud...');
  let total = 0;

  try {
    const collections = [
      { name: 'transactions', table: db.transactions },
      { name: 'accounts', table: db.accounts },
      { name: 'categories', table: db.categories },
      { name: 'budgets', table: db.budgets },
      { name: 'goals', table: db.goals },
      { name: 'recurring', table: db.recurring_transactions },
    ];

    for (const { name, table } of collections) {
      const cloudItems = await cloudGetAll(user.uid, name);
      for (const item of cloudItems) {
        const { _updatedAt, _syncedAt, ...cleanItem } = item;
        await (table as any).put({ ...cleanItem, updatedAt: _updatedAt || Date.now() });
        total++;
      }
    }

    emitStatus('success', `Downloaded ${total} items from cloud`);
  } catch (err) {
    console.error('[Sync] Download failed:', err);
    emitStatus('error', 'Download failed. Check your connection.');
  }

  return total;
}
