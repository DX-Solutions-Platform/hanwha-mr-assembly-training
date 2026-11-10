import type { FlowProject } from './flowProject';

export interface SavedFlowTraining { project: FlowProject; savedAt: number; }
const storeName = 'training';

async function accessStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('hanwha-drawing-flow', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? request.error);
    });
  } finally {
    database.close();
  }
}

export function saveFlowTraining(project: FlowProject) {
  const entry: SavedFlowTraining = { project, savedAt: Date.now() };
  return accessStore('readwrite', (store) => store.put(entry, project.key));
}

export async function listFlowTraining(): Promise<SavedFlowTraining[]> {
  const entries: SavedFlowTraining[] = await accessStore('readonly', (store) => store.getAll());
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}
