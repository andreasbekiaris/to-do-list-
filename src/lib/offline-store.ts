import type { Task, TodoInput } from "@/lib/todo-validation";

const DB_NAME = "thread-offline";
const DB_VERSION = 1;
const TASKS = "tasks";
const OUTBOX = "outbox";

export type OfflineOperation =
  | { type: "save"; id: string; parentId: string | null; input: TodoInput }
  | { type: "complete"; id: string; done: boolean }
  | { type: "delete"; id: string };
type QueuedOperation = OfflineOperation & { seq: number };
export type SyncResult = "empty" | "offline" | "synced" | "auth" | "error";

function request<T>(value: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

function done(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openOfflineDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, DB_VERSION);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains(TASKS)) db.createObjectStore(TASKS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "seq", autoIncrement: true });
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

export async function getOfflineTasks() {
  const db = await openOfflineDb();
  const transaction = db.transaction(TASKS, "readonly");
  const tasks = await request(transaction.objectStore(TASKS).getAll() as IDBRequest<Task[]>);
  db.close();
  return tasks;
}

export async function cacheServerTasks(tasks: Task[]) {
  const db = await openOfflineDb();
  const transaction = db.transaction([TASKS, OUTBOX], "readwrite");
  const queued = await request(transaction.objectStore(OUTBOX).count());
  if (!queued) {
    const store = transaction.objectStore(TASKS);
    store.clear();
    for (const task of tasks) store.put(task);
  }
  await done(transaction);
  db.close();
}

async function updateOfflineTasks(change: (tasks: Task[], taskStore: IDBObjectStore, outbox: IDBObjectStore) => void) {
  const db = await openOfflineDb();
  const transaction = db.transaction([TASKS, OUTBOX], "readwrite");
  const taskStore = transaction.objectStore(TASKS);
  const tasks = await request(taskStore.getAll() as IDBRequest<Task[]>);
  change(tasks, taskStore, transaction.objectStore(OUTBOX));
  await done(transaction);
  db.close();
  return getOfflineTasks();
}

function inputOf(task: Task): TodoInput {
  return { title: task.title, description: task.description, color: task.color, priority: task.priority, startAt: task.startAt, dueAt: task.dueAt, allDay: task.allDay };
}

export async function saveOfflineTask(task: Task) {
  return updateOfflineTasks((tasks, taskStore, outbox) => {
    const parentTitle = task.parentId ? tasks.find(item => item.id === task.parentId)?.title ?? null : null;
    const saved = { ...task, parentTitle };
    taskStore.put(saved);
    outbox.add({ type: "save", id: saved.id, parentId: saved.parentId, input: inputOf(saved) } satisfies OfflineOperation);
  });
}

export async function addOfflineTask(title: string) {
  const task: Task = {
    id: crypto.randomUUID(), parentId: null, parentTitle: null, title: title.trim(), description: "", color: "sage", priority: "none",
    startAt: null, dueAt: null, allDay: false, isDone: false, completedAt: null, childCount: 0, completedChildren: 0,
  };
  return saveOfflineTask(task);
}

export async function completeOfflineTask(id: string, completed: boolean) {
  return updateOfflineTasks((tasks, taskStore, outbox) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    taskStore.put({ ...task, isDone: completed, completedAt: completed ? new Date().toISOString() : null });
    outbox.add({ type: "complete", id, done: completed } satisfies OfflineOperation);
  });
}

export async function deleteOfflineTask(id: string) {
  return updateOfflineTasks((tasks, taskStore, outbox) => {
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const task of tasks) if (task.parentId && ids.has(task.parentId) && !ids.has(task.id)) { ids.add(task.id); changed = true; }
    }
    for (const taskId of ids) taskStore.delete(taskId);
    outbox.add({ type: "delete", id } satisfies OfflineOperation);
  });
}

let activeSync: Promise<SyncResult> | null = null;
export function flushOfflineChanges(): Promise<SyncResult> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!navigator.onLine) return "offline";
    const db = await openOfflineDb();
    const read = db.transaction(OUTBOX, "readonly");
    const queued = await request(read.objectStore(OUTBOX).getAll() as IDBRequest<QueuedOperation[]>);
    db.close();
    if (!queued.length) return "empty";
    try {
      const response = await fetch("/api/sync", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: queued }),
      });
      if (response.status === 401) return "auth";
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return "error";
      const body = await response.json() as { ok?: boolean; tasks?: Task[] };
      if (!body.ok || !Array.isArray(body.tasks)) return "error";
      const syncedDb = await openOfflineDb();
      const transaction = syncedDb.transaction([TASKS, OUTBOX], "readwrite");
      const outbox = transaction.objectStore(OUTBOX);
      for (const item of queued) outbox.delete(item.seq);
      const remaining = await request(outbox.count());
      if (!remaining) {
        const tasks = transaction.objectStore(TASKS);
        tasks.clear();
        for (const task of body.tasks) tasks.put(task);
      }
      await done(transaction);
      syncedDb.close();
      return "synced";
    } catch {
      return "error";
    }
  })().finally(() => { activeSync = null; });
  return activeSync;
}

export async function clearOfflineData() {
  await new Promise<void>((resolve) => {
    const deleting = indexedDB.deleteDatabase(DB_NAME);
    deleting.onsuccess = () => resolve();
    deleting.onerror = () => resolve();
    deleting.onblocked = () => resolve();
  });
}
