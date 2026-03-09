const DB_NAME = "raahi-offline";
const QUEUE_STORE = "mutation-queue";
const CACHE_STORE = "query-cache";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Cache persistence
export async function setCache(key: string, value: unknown) {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, "readwrite");
  tx.objectStore(CACHE_STORE).put({ key, value, ts: Date.now() });
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

export async function getCache(key: string): Promise<unknown | null> {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, "readonly");
  const req = tx.objectStore(CACHE_STORE).get(key);
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result?.value ?? null); req.onerror = () => rej(req.error); });
}

export async function getAllCache(): Promise<Record<string, unknown>> {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, "readonly");
  const req = tx.objectStore(CACHE_STORE).getAll();
  return new Promise((res, rej) => {
    req.onsuccess = () => {
      const map: Record<string, unknown> = {};
      (req.result || []).forEach((r: { key: string; value: unknown }) => { map[r.key] = r.value; });
      res(map);
    };
    req.onerror = () => rej(req.error);
  });
}

// Offline mutation queue
interface QueuedMutation {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  filter?: Record<string, unknown>;
  createdAt: number;
}

export async function queueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">) {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).add({ ...mutation, createdAt: Date.now() });
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const req = tx.objectStore(QUEUE_STORE).getAll();
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error); });
}

export async function clearQueue() {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).clear();
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

// Sync queued mutations when back online
export async function syncQueuedMutations(supabase: any) {
  const mutations = await getQueuedMutations();
  if (mutations.length === 0) return;

  for (const m of mutations) {
    try {
      if (m.operation === "insert") {
        await supabase.from(m.table).insert(m.payload);
      } else if (m.operation === "update" && m.filter) {
        let query = supabase.from(m.table).update(m.payload);
        Object.entries(m.filter).forEach(([k, v]) => { query = query.eq(k, v); });
        await query;
      }
    } catch (e) {
      console.error("Failed to sync mutation:", e);
    }
  }
  await clearQueue();
}
