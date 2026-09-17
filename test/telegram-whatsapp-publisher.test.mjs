import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

const publisher = await import("../packages/bot/dist/whatsappPublisher.js");
const format = await import("../packages/bot/dist/format.js");

test("il digest WhatsApp è testo semplice e omette risultati vuoti o falliti", () => {
  assert.equal(
    format.formatCompitiWhatsApp({
      compiti: [],
      metadata: { totale_compiti: 0, totale_lezioni: 1, modello_utilizzato: "test", timestamp: "" },
    }),
    undefined,
  );

  const text = format.formatCompitiWhatsApp({
    compiti: [{ materia: "Matematica", testo: "Esercizi 1-5", data_lezione: "2026-09-17", scadenza: "2026-09-18", note: null }],
    metadata: { totale_compiti: 1, totale_lezioni: 1, modello_utilizzato: "test", timestamp: "" },
  });
  assert.match(text, /Matematica: Esercizi 1-5/);
  assert.doesNotMatch(text, /<b>|<i>/);
});

test("le parti del digest rispettano il limite e hanno ID ripetibili", () => {
  const text = `${"a".repeat(3_800)}\n${"b".repeat(100)}`;
  const first = publisher.createWhatsAppDigestParts({ studentId: "S1", date: "2026-09-17", text });
  const second = publisher.createWhatsAppDigestParts({ studentId: "S1", date: "2026-09-17", text });
  assert.equal(first.length, 2);
  assert.ok(first.every((part) => part.text.length <= 3_800));
  assert.deepEqual(first, second);
  assert.match(first[0].id, /^digest:S1:2026-09-17:1:[a-f0-9]{16}$/);
});

test("il client firma una POST al publisher e non è attivo senza opt-in", async () => {
  assert.equal(publisher.WhatsAppPublisher.fromEnvironment({}), undefined);
  assert.equal(
    publisher.WhatsAppPublisher.fromEnvironment({ WHATSAPP_DIGEST_ENABLED: "true" }),
    undefined,
  );

  const secret = "s".repeat(32);
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return { ok: true, status: 202 };
  };
  try {
    const client = new publisher.WhatsAppPublisher({ endpoint: "http://publisher/api/jobs", secret });
    await client.publish({ id: "digest:S1:2026-09-17:1:abc", text: "Studiare storia" });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.url, "http://publisher/api/jobs");
  const body = request.init.body;
  const timestamp = request.init.headers["X-Publisher-Timestamp"];
  assert.equal(
    request.init.headers["X-Publisher-Signature"],
    createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"),
  );
});
