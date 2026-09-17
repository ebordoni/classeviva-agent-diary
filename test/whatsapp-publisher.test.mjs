import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const publisherRoot = path.resolve("hassio-addon/classeviva-whatsapp-publisher/src/app");
const importPublisherModule = (name) => import(pathToFileURL(path.join(publisherRoot, name)).href);
const { createSignature, verifySignedRequest } = await importPublisherModule("auth.mjs");
const { loadConfig } = await importPublisherModule("config.mjs");
const { inviteCodeFromChannelUrl, normalizeNewsletterJid } = await importPublisherModule("newsletter.mjs");
const { Publisher } = await importPublisherModule("publisher.mjs");
const { JobStore } = await importPublisherModule("store.mjs");

async function createStore(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "classeviva-whatsapp-test-"));
  const store = new JobStore(path.join(directory, "publisher.sqlite"));
  t.after(async () => {
    store.close();
    await rm(directory, { recursive: true, force: true });
  });
  return store;
}

test("la configurazione resta inattiva senza impostazioni WhatsApp", () => {
  const config = loadConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.maxPostsPerDay, 10);
});

test("la configurazione attiva richiede canale e segreto robusto", () => {
  assert.throws(
    () => loadConfig({ PUBLISHER_ENABLED: "true", PUBLISHER_SHARED_SECRET: "a".repeat(32) }),
    /CHANNEL_JID oppure PUBLISHER_CHANNEL_URL/,
  );
  assert.throws(
    () => loadConfig({
      PUBLISHER_ENABLED: "true",
      PUBLISHER_CHANNEL_JID: "123@newsletter",
      PUBLISHER_SHARED_SECRET: "corto",
    }),
    /almeno 32 caratteri/,
  );
});

test("il link pubblico del Canale viene convertito nel suo codice d'invito", () => {
  assert.equal(inviteCodeFromChannelUrl("https://whatsapp.com/channel/0029VbExample"), "0029VbExample");
  assert.equal(normalizeNewsletterJid("120363012345678901"), "120363012345678901@newsletter");
  assert.throws(() => inviteCodeFromChannelUrl("https://example.com/channel/0029VbExample"), /formato/);

  const config = loadConfig({
    PUBLISHER_ENABLED: "true",
    PUBLISHER_CHANNEL_URL: "https://whatsapp.com/channel/0029VbExample",
    PUBLISHER_SHARED_SECRET: "s".repeat(32),
  });
  assert.equal(config.channelJid, undefined);
  assert.equal(config.channelInviteCode, "0029VbExample");
});

test("la firma HMAC accetta solo il corpo e il timestamp originali", () => {
  const secret = "s".repeat(32);
  const timestamp = "1700000000000";
  const body = JSON.stringify({ id: "compiti:1", text: "Studiare matematica" });
  const signature = createSignature(secret, timestamp, body);
  assert.equal(verifySignedRequest({ secret, timestamp, signature, body, now: Number(timestamp) }), true);
  assert.equal(verifySignedRequest({ secret, timestamp, signature, body: `${body} `, now: Number(timestamp) }), false);
  assert.equal(verifySignedRequest({ secret, timestamp: "1699999000000", signature, body, now: Number(timestamp) }), false);
});

test("la coda deduplica e conserva il fallimento terminale", async (t) => {
  const store = await createStore(t);
  const first = store.enqueue({ id: "compiti:2026-09-17", text: "Ripassare storia", now: 1_000 });
  const duplicate = store.enqueue({ id: "compiti:2026-09-17", text: "Ripassare storia", now: 2_000 });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.conflict, false);

  const firstAttempt = store.claimNext({ now: 1_000, dailyLimit: 10 });
  assert.equal(firstAttempt.attempts, 1);
  store.markFailed(firstAttempt.id, { error: "rete assente", now: 1_000, retryAfterMs: 0, maxAttempts: 2 });
  const secondAttempt = store.claimNext({ now: 1_000, dailyLimit: 10 });
  assert.equal(secondAttempt.attempts, 2);
  store.markFailed(secondAttempt.id, { error: "rete assente", now: 1_000, retryAfterMs: 0, maxAttempts: 2 });
  assert.equal(store.get(firstAttempt.id).status, "failed");
});

test("il publisher invia un job una sola volta e rispetta il limite giornaliero", async (t) => {
  const store = await createStore(t);
  store.enqueue({ id: "compiti:1", text: "Esercizi pagina 10", now: 1_000 });
  const sent = [];
  const client = { isReady: true, sendText: async (jid, text) => sent.push({ jid, text }) };
  const publisher = new Publisher({
    config: { enabled: true, channelJid: "123@newsletter", maxPostsPerDay: 1, minIntervalMs: 0, maxAttempts: 3 },
    store,
    client,
  });
  await publisher.drain(1_000);
  await publisher.drain(2_000);
  assert.deepEqual(sent, [{ jid: "123@newsletter", text: "Esercizi pagina 10" }]);
  assert.equal(store.get("compiti:1").status, "sent");
});
