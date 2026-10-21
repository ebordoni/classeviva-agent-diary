import { randomBytes, timingSafeEqual } from "node:crypto";

/** Nonce monouso, legato alla sessione del browser. Mai un token Spaggiari. */
export class SpidPairing {
  private pending = new Map<string, { nonce: string; expiresAt: number }>();
  constructor(private now = Date.now) {}
  start(sessionId: string) {
    for (const [id, entry] of this.pending) if (entry.expiresAt <= this.now()) this.pending.delete(id);
    if (this.pending.size >= 128 && !this.pending.has(sessionId)) throw new Error("Troppi collegamenti in corso. Riprova.");
    const entry = { nonce: randomBytes(32).toString("hex"), expiresAt: this.now() + 5 * 60_000 };
    this.pending.set(sessionId, entry);
    return { ...entry };
  }
  consume(sessionId: string, nonce: unknown): boolean {
    const entry = this.pending.get(sessionId);
    if (!entry || typeof nonce !== "string" || !/^[a-f0-9]{64}$/.test(nonce)) return false;
    if (entry.expiresAt <= this.now()) { this.pending.delete(sessionId); return false; }
    if (!timingSafeEqual(Buffer.from(entry.nonce), Buffer.from(nonce))) return false;
    this.pending.delete(sessionId);
    return true;
  }
  cancel(sessionId: string): void { this.pending.delete(sessionId); }
}
