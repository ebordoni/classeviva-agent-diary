import assert from "node:assert/strict";
import test from "node:test";
import { createSignature } from "../app/auth.mjs";
import { createPublisherServer } from "../app/server.mjs";

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}

test("l'endpoint accoda solo job con firma valida", async (t) => {
  const secret = "s".repeat(32);
  const jobs = [];
  const store = {
    enqueue(job) {
      jobs.push(job);
      return { created: true, conflict: false, job: { status: "pending" } };
    },
  };
  const publisher = { drain: async () => {} };
  const client = {
    isReady: true,
    getStatus: () => ({ status: "connected", pairingRequired: false }),
    resolveNewsletterJid: async (inviteCode) => {
      assert.equal(inviteCode, "0029VbExample");
      return "120363012345678901@newsletter";
    },
  };
  const server = createPublisherServer({
    config: { enabled: true, sharedSecret: secret },
    store,
    publisher,
    client,
  });
  t.after(() => server.close());
  const port = await listen(server);
  const body = JSON.stringify({ id: "compiti:1", text: "Studiare matematica" });
  const timestamp = String(Date.now());
  const response = await fetch(`http://127.0.0.1:${port}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Publisher-Timestamp": timestamp,
      "X-Publisher-Signature": createSignature(secret, timestamp, body),
    },
    body,
  });

  assert.equal(response.status, 202);
  assert.deepEqual(jobs, [{ id: "compiti:1", text: "Studiare matematica" }]);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assert.equal(unauthorized.status, 401);

  const status = await fetch(`http://127.0.0.1:${port}/api/status`);
  assert.equal(status.status, 200);
  assert.match((await status.json()).publisherEndpoint, /^http:\/\/.+:8080\/api\/jobs$/);

  const resolved = await fetch(`http://127.0.0.1:${port}/api/channel/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelUrl: "https://whatsapp.com/channel/0029VbExample" }),
  });
  assert.equal(resolved.status, 200);
  assert.deepEqual(await resolved.json(), { channelJid: "120363012345678901@newsletter" });
});
