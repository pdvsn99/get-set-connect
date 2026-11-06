import "server-only";
import { getStorage } from "./storage";
import { buildSeed } from "./seed";
import type { Database } from "./types";

const DB_KEY = "gsc:db:v1";

let lock: Promise<unknown> = Promise.resolve();

async function load(): Promise<Database> {
  const storage = getStorage();
  const raw = await storage.getText(DB_KEY);
  if (raw) return JSON.parse(raw) as Database;
  const seeded = buildSeed();
  await storage.setText(DB_KEY, JSON.stringify(seeded));
  return seeded;
}

/** Read a snapshot of the database. */
export async function readDb(): Promise<Database> {
  return load();
}

/**
 * Apply a change and save. Writes are serialised within this server instance.
 * (Supabase/Postgres transactions replace this in production.)
 */
export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = lock.then(async () => {
    const db = await load();
    const result = await fn(db);
    await getStorage().setText(DB_KEY, JSON.stringify(db));
    return result;
  });
  lock = run.catch(() => undefined);
  return run;
}

/** Wipe everything and reload the demonstration data. */
export async function resetDemoData(): Promise<void> {
  const db = await load();
  const storage = getStorage();
  await Promise.all(db.documents.map((d) => storage.delete(d.storageKey)));
  await storage.setText(DB_KEY, JSON.stringify(buildSeed()));
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function storageMode() {
  return getStorage().kind;
}
