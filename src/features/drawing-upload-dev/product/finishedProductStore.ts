import type { DrawingDraftSettings } from '../generate/drawing-draft/draftStorage';

export interface FinishedProductModel {
  blob: Blob;
  pageNumber: number;
  confirmedAt: string | null;
  draft: DrawingDraftSettings;
}

export interface FinishedProduct {
  pageNumber: number | null;
  name: string;
  number: string;
  model: FinishedProductModel | null;
}
export type FinishedProductInfo = Omit<FinishedProduct, 'model'>;
export type FinishedProductChange = FinishedProductInfo | { model: FinishedProductModel };

const STORE = 'products';

async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('hanwha-finished-products', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? request.error);
    });
  } finally { database.close(); }
}

export async function readFinishedProduct(hash: string): Promise<FinishedProduct | null> {
  return await withStore('readonly', (store) => store.get(hash)) ?? null;
}

export async function saveFinishedProduct(hash: string, change: FinishedProductChange) {
  const database = await openDatabase();
  try {
    return await new Promise<FinishedProduct>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(hash);
      let product: FinishedProduct;
      let reason: Error | undefined;
      request.onsuccess = () => {
        const previous: FinishedProduct | undefined = request.result;
        if ('model' in change) {
          if (!previous || previous.pageNumber !== change.model.pageNumber) {
            reason = new Error('완제품 대표 도면이 변경되었습니다. 다시 열어 주세요.');
            transaction.abort();
            return;
          }
          product = { ...previous, model: change.model };
        } else product = { ...change, model: previous?.model ?? null };
        store.put(product, hash);
      };
      transaction.oncomplete = () => resolve(product);
      transaction.onabort = () => reject(reason ?? transaction.error);
    });
  } finally { database.close(); }
}
