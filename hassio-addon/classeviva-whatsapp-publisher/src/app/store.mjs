import { DatabaseSync } from "node:sqlite";

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export class JobStore {
  constructor(path) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'sending', 'sent', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sent_at INTEGER,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS jobs_pending_idx ON jobs(status, next_attempt_at);
    `);
    this.database
      .prepare("UPDATE jobs SET status = 'pending' WHERE status = 'sending'")
      .run();
  }

  enqueue({ id, text, now = Date.now() }) {
    const existing = this.database
      .prepare("SELECT id, text, status, attempts FROM jobs WHERE id = ?")
      .get(id);
    if (existing) {
      return { created: false, conflict: existing.text !== text, job: existing };
    }

    this.database
      .prepare(
        `INSERT INTO jobs (id, text, status, attempts, next_attempt_at, created_at, updated_at)
         VALUES (?, ?, 'pending', 0, ?, ?, ?)`,
      )
      .run(id, text, now, now, now);
    return { created: true, conflict: false, job: this.get(id) };
  }

  get(id) {
    return this.database
      .prepare(
        "SELECT id, text, status, attempts, next_attempt_at AS nextAttemptAt, sent_at AS sentAt, error FROM jobs WHERE id = ?",
      )
      .get(id);
  }

  sentCountForDay(now = Date.now()) {
    const start = Date.parse(`${dayKey(now)}T00:00:00.000Z`);
    const end = start + 24 * 60 * 60 * 1000;
    return this.database
      .prepare("SELECT COUNT(*) AS count FROM jobs WHERE status = 'sent' AND sent_at >= ? AND sent_at < ?")
      .get(start, end).count;
  }

  claimNext({ now = Date.now(), dailyLimit }) {
    if (this.sentCountForDay(now) >= dailyLimit) return undefined;
    const job = this.database
      .prepare(
        `SELECT id FROM jobs
         WHERE status = 'pending' AND next_attempt_at <= ?
         ORDER BY created_at ASC LIMIT 1`,
      )
      .get(now);
    if (!job) return undefined;

    this.database
      .prepare(
        "UPDATE jobs SET status = 'sending', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'pending'",
      )
      .run(now, job.id);
    return this.get(job.id);
  }

  markSent(id, now = Date.now()) {
    this.database
      .prepare(
        "UPDATE jobs SET status = 'sent', sent_at = ?, updated_at = ?, error = NULL WHERE id = ?",
      )
      .run(now, now, id);
  }

  markFailed(id, { error, now = Date.now(), retryAfterMs, maxAttempts }) {
    const job = this.get(id);
    if (!job) return;
    const terminal = job.attempts >= maxAttempts;
    this.database
      .prepare(
        `UPDATE jobs
         SET status = ?, next_attempt_at = ?, updated_at = ?, error = ?
         WHERE id = ?`,
      )
      .run(terminal ? "failed" : "pending", now + retryAfterMs, now, error, id);
  }

  close() {
    this.database.close();
  }
}
