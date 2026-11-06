import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * Storage adapters for the demo database.
 *
 * - RedisStorage: Upstash Redis over its REST API. Used automatically when
 *   KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* names)
 *   are set — which Vercel does for you when you add an Upstash store.
 * - FileStorage: JSON + files on local disk. Used for local development.
 *   On Vercel without Redis this falls back to /tmp, which is temporary.
 *
 * The production plan is to replace this whole layer with Supabase
 * (see supabase/migrations). Everything above it talks to `repo.ts` only.
 */
export interface Storage {
  readonly kind: "redis" | "file" | "temporary";
  getText(key: string): Promise<string | null>;
  setText(key: string, value: string): Promise<void>;
  getBytes(key: string): Promise<Buffer | null>;
  setBytes(key: string, value: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
}

class RedisStorage implements Storage {
  readonly kind = "redis" as const;
  constructor(private url: string, private token: string) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Redis request failed (${res.status})`);
    }
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error(`Redis error: ${json.error}`);
    return json.result ?? null;
  }

  async getText(key: string) {
    const r = await this.command(["GET", key]);
    return typeof r === "string" ? r : null;
  }
  async setText(key: string, value: string) {
    await this.command(["SET", key, value]);
  }
  async getBytes(key: string) {
    const r = await this.getText(key);
    return r ? Buffer.from(r, "base64") : null;
  }
  async setBytes(key: string, value: Buffer) {
    await this.setText(key, value.toString("base64"));
  }
  async delete(key: string) {
    await this.command(["DEL", key]);
  }
}

class FileStorage implements Storage {
  constructor(private dir: string, readonly kind: "file" | "temporary") {}

  private file(key: string) {
    return path.join(this.dir, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
  }
  async getText(key: string) {
    try {
      return await fs.readFile(this.file(key), "utf8");
    } catch {
      return null;
    }
  }
  async setText(key: string, value: string) {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(key);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, value, "utf8");
    await fs.rename(tmp, target);
  }
  async getBytes(key: string) {
    try {
      return await fs.readFile(this.file(key));
    } catch {
      return null;
    }
  }
  async setBytes(key: string, value: Buffer) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file(key), value);
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }
}

let storage: Storage | undefined;

export function getStorage(): Storage {
  if (storage) return storage;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    storage = new RedisStorage(url, token);
  } else if (process.env.VERCEL) {
    storage = new FileStorage("/tmp/gsc-data", "temporary");
  } else {
    storage = new FileStorage(
      process.env.DATA_DIR ?? path.join(process.cwd(), ".data"),
      "file",
    );
  }
  return storage;
}
