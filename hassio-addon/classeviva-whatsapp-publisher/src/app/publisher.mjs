import { sanitizeError } from "./auth.mjs";

const RETRY_AFTER_MS = 60 * 1000;

export class Publisher {
  constructor({ config, store, client }) {
    this.config = config;
    this.store = store;
    this.client = client;
    this.channelJid = config.channelJid;
    this.draining = false;
    this.nextSendAt = 0;
  }

  setChannelJid(channelJid) {
    this.channelJid = channelJid;
  }

  async drain(now = Date.now()) {
    if (this.draining || !this.config.enabled || !this.channelJid || !this.client.isReady || now < this.nextSendAt) {
      return;
    }
    this.draining = true;
    try {
      const job = this.store.claimNext({ now, dailyLimit: this.config.maxPostsPerDay });
      if (!job) return;

      this.nextSendAt = now + this.config.minIntervalMs;
      try {
        await this.client.sendText(this.channelJid, job.text);
        this.store.markSent(job.id, now);
      } catch (error) {
        this.store.markFailed(job.id, {
          error: sanitizeError(error),
          now,
          retryAfterMs: RETRY_AFTER_MS,
          maxAttempts: this.config.maxAttempts,
        });
      }
    } finally {
      this.draining = false;
    }
  }
}
