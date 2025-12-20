/**
 * Background Sync Manager
 * Handles offline data synchronization for PWA
 */

export interface SyncTask {
  id: string;
  type: 'post' | 'comment' | 'reaction' | 'profile';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

const SYNC_STORE_KEY = 'scrng_sync_queue';
const MAX_RETRIES = 3;

/**
 * Get all pending sync tasks
 */
export function getPendingTasks(): SyncTask[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SYNC_STORE_KEY);
    if (!stored) return [];

    const tasks: SyncTask[] = JSON.parse(stored);
    return tasks.filter((t) => t.status === 'pending' || t.status === 'syncing');
  } catch {
    return [];
  }
}

/**
 * Add a task to the sync queue
 */
export function queueSyncTask(
  task: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount' | 'status'>
): SyncTask {
  const newTask: SyncTask = {
    ...task,
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  const tasks = getAllTasks();
  tasks.push(newTask);
  saveTasks(tasks);

  // Register for background sync if available
  void registerBackgroundSync('sync-data');

  return newTask;
}

/**
 * Update a sync task
 */
export function updateSyncTask(id: string, updates: Partial<SyncTask>): void {
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.id === id);

  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveTasks(tasks);
  }
}

/**
 * Remove a sync task
 */
export function removeSyncTask(id: string): void {
  const tasks = getAllTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
}

/**
 * Process all pending sync tasks
 */
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const tasks = getPendingTasks();
  let success = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      updateSyncTask(task.id, { status: 'syncing' });
      await processTask(task);
      updateSyncTask(task.id, { status: 'completed' });
      success++;
    } catch (error) {
      console.error(`Sync task ${task.id} failed:`, error);

      if (task.retryCount >= MAX_RETRIES) {
        updateSyncTask(task.id, { status: 'failed' });
        failed++;
      } else {
        updateSyncTask(task.id, {
          status: 'pending',
          retryCount: task.retryCount + 1,
        });
      }
    }
  }

  // Clean up completed tasks older than 24 hours
  cleanupOldTasks();

  return { success, failed };
}

/**
 * Process a single sync task
 */
async function processTask(task: SyncTask): Promise<void> {
  const endpoints: Record<string, Record<string, { method: string; path: string }>> = {
    post: {
      create: { method: 'POST', path: '/api/posts' },
      update: { method: 'PATCH', path: '/api/posts' },
      delete: { method: 'DELETE', path: '/api/posts' },
    },
    comment: {
      create: { method: 'POST', path: '/api/comments' },
      update: { method: 'PATCH', path: '/api/comments' },
      delete: { method: 'DELETE', path: '/api/comments' },
    },
    reaction: {
      create: { method: 'POST', path: '/api/reactions' },
      delete: { method: 'DELETE', path: '/api/reactions' },
    },
    profile: {
      update: { method: 'PATCH', path: '/api/users/me' },
    },
  };

  const config = endpoints[task.type]?.[task.action];
  if (!config) {
    throw new Error(`Unknown sync task: ${task.type}/${task.action}`);
  }

  let url = config.path;
  if (task.action !== 'create' && task.data.id) {
    url = `${config.path}/${task.data.id}`;
  }

  const response = await fetch(url, {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: config.method !== 'DELETE' ? JSON.stringify(task.data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
}

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (
      registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }
    ).sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Subscribe to online/offline events
 */
export function subscribeToConnectivity(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    callback(true);
    // Automatically process queue when coming online
    void processSyncQueue();
  };
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Helper functions

function getAllTasks(): SyncTask[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SYNC_STORE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: SyncTask[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SYNC_STORE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save sync tasks:', error);
  }
}

function cleanupOldTasks(): void {
  const tasks = getAllTasks();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const filtered = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'syncing' || t.timestamp > dayAgo
  );

  saveTasks(filtered);
}

/**
 * Queue helpers for common operations
 */
export const syncQueue = {
  post: {
    create: (data: Record<string, unknown>) =>
      queueSyncTask({ type: 'post', action: 'create', data }),
    update: (id: string, data: Record<string, unknown>) =>
      queueSyncTask({ type: 'post', action: 'update', data: { id, ...data } }),
    delete: (id: string) => queueSyncTask({ type: 'post', action: 'delete', data: { id } }),
  },
  comment: {
    create: (data: Record<string, unknown>) =>
      queueSyncTask({ type: 'comment', action: 'create', data }),
    update: (id: string, data: Record<string, unknown>) =>
      queueSyncTask({ type: 'comment', action: 'update', data: { id, ...data } }),
    delete: (id: string) => queueSyncTask({ type: 'comment', action: 'delete', data: { id } }),
  },
  reaction: {
    add: (postId: string, type: string) =>
      queueSyncTask({ type: 'reaction', action: 'create', data: { postId, type } }),
    remove: (postId: string, type: string) =>
      queueSyncTask({ type: 'reaction', action: 'delete', data: { postId, type } }),
  },
  profile: {
    update: (data: Record<string, unknown>) =>
      queueSyncTask({ type: 'profile', action: 'update', data }),
  },
};
