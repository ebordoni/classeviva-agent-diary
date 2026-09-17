import fs from "node:fs";
import path from "node:path";

export class FileStore {
  private filename: string;
  private data: Record<string, string> = {};
  private pendingWrites: Record<string, string> = {};
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMtime: number = 0;

  constructor(filename: string) {
    this.filename = filename;
    try {
      const stat = fs.statSync(filename);
      this.lastMtime = stat.mtimeMs;
      const raw = fs.readFileSync(filename, "utf-8");
      this.data = JSON.parse(raw) as Record<string, string>;
    } catch {
      // Il file non esiste ancora: si parte vuoti
    }
  }

  private syncIfStale() {
    try {
      const stat = fs.statSync(this.filename);
      if (stat.mtimeMs === this.lastMtime) return;
      const raw = fs.readFileSync(this.filename, "utf-8");
      const fresh = JSON.parse(raw) as Record<string, string>;
      this.data = { ...fresh, ...this.pendingWrites };
      this.lastMtime = stat.mtimeMs;
    } catch {
      // file non ancora esistente o non leggibile
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        const stat = fs.statSync(this.filename);
        if (stat.mtimeMs !== this.lastMtime) {
          const raw = fs.readFileSync(this.filename, "utf-8");
          const fresh = JSON.parse(raw) as Record<string, string>;
          this.data = { ...fresh, ...this.pendingWrites };
          this.lastMtime = stat.mtimeMs;
        }
      } catch {
        /* file non ancora esistente */
      }
      const dir = path.dirname(this.filename);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filename + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.filename);
      try {
        this.lastMtime = fs.statSync(this.filename).mtimeMs;
      } catch {}
      this.pendingWrites = {};
    }, 300);
  }

  get(key: string): Promise<string | undefined> {
    this.syncIfStale();
    return Promise.resolve(this.data[key]);
  }

  set(key: string, value: string): Promise<void> {
    this.syncIfStale();
    this.data[key] = value;
    this.pendingWrites[key] = value;
    this.scheduleFlush();
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    this.syncIfStale();
    const had = Object.prototype.hasOwnProperty.call(this.data, key);
    if (had) {
      delete this.data[key];
      delete this.pendingWrites[key];
      this.scheduleFlush();
    }
    return Promise.resolve(had);
  }

  deleteByPrefix(prefix: string): Promise<number> {
    this.syncIfStale();
    const toDelete = Object.keys(this.data).filter((key) =>
      key.startsWith(prefix),
    );
    for (const key of toDelete) {
      delete this.data[key];
      delete this.pendingWrites[key];
    }
    if (toDelete.length > 0) this.scheduleFlush();
    return Promise.resolve(toDelete.length);
  }

  gc(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    for (const [key, value] of Object.entries(this.data)) {
      try {
        const parsed = JSON.parse(value) as { expires?: number };
        if (parsed.expires !== undefined && parsed.expires < now) {
          delete this.data[key];
          delete this.pendingWrites[key];
          removed++;
        }
      } catch {
        // entry non parsabile: lascia stare
      }
    }
    if (removed > 0) this.scheduleFlush();
    return Promise.resolve(removed);
  }

  clear(): Promise<void> {
    this.data = {};
    this.pendingWrites = {};
    this.scheduleFlush();
    return Promise.resolve();
  }
}
