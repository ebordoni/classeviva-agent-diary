import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { isMobileCallback, readMobileToken, sendActiveToken } from "../tools/mobile-auth-bridge/bridge.mjs";
import { createProbeServer } from "../scripts/probe-mobile-auth.mjs";

test("extension requests automation hosts at setup and preserves the isolated diagnostic mode", async () => {
  const manifest = JSON.parse(await readFile(new URL("../tools/mobile-auth-bridge/manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["http://127.0.0.1/*"]);
  assert.equal(manifest.content_scripts, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);
  assert.equal(manifest.externally_connectable, undefined);
  assert.deepEqual(manifest.background, { service_worker: "background.mjs", type: "module" });
  assert.match(manifest.content_security_policy.extension_pages, /connect-src http:\/\/127\.0\.0\.1:18765$/);
});

test("page reader requires the exact callback page, form and single token field", () => {
  const context = {
    location: { origin: "https://web.spaggiari.eu", pathname: "/home/app/default/mspidauth.php" },
    document: { getElementById: () => ({}), querySelectorAll: () => [{ value: "TEST_PA" }] },
  };
  const read = () => runInNewContext(`(${readMobileToken.toString()})()`, context);
  assert.equal(read(), "TEST_PA");
  context.location.pathname = "/home/app/default/login.php";
  assert.equal(read(), null);
  context.location.pathname = "/home/app/default/mspidauth.php";
  context.document.querySelectorAll = () => [{ value: "[redacted]" }];
  assert.equal(read(), null);
  context.document.querySelectorAll = () => [{ value: "a" }, { value: "b" }];
  assert.equal(read(), null);
});

test("automatic reader distinguishes the intermediate profile chooser from the final token", () => {
  const context = {
    URL,
    location: { origin: 'https://web.spaggiari.eu', pathname: '/home/app/default/mspidauth.php', href: 'https://web.spaggiari.eu/home/app/default/mspidauth.php' },
    document: { getElementById: () => null, querySelectorAll: () => [{ getAttribute: () => '/home/app/default/mspidauth.php?private-profile' }] },
  };
  const read = () => JSON.parse(JSON.stringify(runInNewContext(`(${readMobileToken.toString()})(true)`, context)));
  assert.deepEqual(read(), { state: 'profile-selection' });
  context.document.getElementById = () => ({});
  context.document.querySelectorAll = () => [{ value: 'PRIVATE_PA' }];
  assert.deepEqual(read(), { state: 'token', paToken: 'PRIVATE_PA' });
  context.document.querySelectorAll = () => [];
  assert.deepEqual(read(), { state: 'waiting' });
});

test("extension rejects other pages before injection and transfers only to the fixed local receiver", async () => {
  for (const url of ["https://example.com/home/app/default/mspidauth.php", "http://web.spaggiari.eu/home/app/default/mspidauth.php",
    "https://web.spaggiari.eu/home/app/default/login.php", "https://name:password@web.spaggiari.eu/home/app/default/mspidauth.php"]) {
    assert.equal(isMobileCallback(url), false);
    const response = await sendActiveToken("a".repeat(48), {
      tabs: { query: async () => [{ id: 1, url }] },
      scripting: { executeScript: () => { throw new Error("must not inject"); } },
    });
    assert.equal(typeof response.error, "string");
  }
  let calls = 0;
  const result = await sendActiveToken("a".repeat(48), {
    tabs: { query: async () => [{ id: 7, url: "https://web.spaggiari.eu/home/app/default/mspidauth.php?data=PRIVATE_CALLBACK" }] },
    scripting: { executeScript: async ({ target }) => { assert.deepEqual(target, { tabId: 7 }); return [{ result: "PRIVATE_PA" }]; } },
  }, async (url, options) => {
    calls++;
    assert.equal(url, "http://127.0.0.1:18765/bridge/probe");
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.deepEqual(JSON.parse(options.body), { paToken: "PRIVATE_PA" });
    return Response.json({ login: { httpStatus: 200 } });
  });
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
});

test("local bridge enforces origin, single-use pairing and expiry before invoking the API", async (t) => {
  let clock = 1_000;
  let calls = 0;
  const server = createProbeServer({ port: 18767, now: () => clock, autoExchange: false, request: async () => {
    calls++; return Response.json({ error: "PRIVATE_SERVER_ECHO" }, { status: 401 });
  } });
  server.listen(18767, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  let csrf;
  const code = async () => {
    const html = await (await fetch("http://127.0.0.1:18767/")).text();
    csrf = /const csrf="([a-f0-9]+)"/.exec(html)[1];
    return /id="bridge-code"[^>]*value="([a-f0-9]+)"/.exec(html)[1];
  };
  const submit = (pairing, origin = `chrome-extension://${"a".repeat(32)}`) => fetch("http://127.0.0.1:18767/bridge/probe", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Bridge-Code": pairing },
    body: JSON.stringify({ paToken: "PRIVATE_PA" }),
  });
  const first = await code();
  assert.equal((await submit(first, "https://example.com")).status, 403);
  assert.equal((await submit("b".repeat(48))).status, 403);
  assert.equal(calls, 0);
  const accepted = await submit(first);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("access-control-allow-origin"), `chrome-extension://${"a".repeat(32)}`);
  const output = await accepted.text();
  assert.equal(output.includes("PRIVATE_PA"), false);
  assert.equal(output.includes("PRIVATE_SERVER_ECHO"), false);
  assert.equal(calls, 0);
  assert.equal((await submit(first)).status, 403);
  const retry = (origin) => fetch("http://127.0.0.1:18767/retry", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Probe-CSRF": csrf }, body: "{}",
  });
  assert.equal((await retry("https://example.com")).status, 403);
  assert.equal(calls, 0);
  const retried = await retry("http://127.0.0.1:18767");
  assert.equal(retried.status, 200);
  const retriedText = await retried.text();
  assert.equal(retriedText.includes("PRIVATE_PA"), false);
  assert.equal(retriedText.includes("PRIVATE_SERVER_ECHO"), false);
  assert.equal(calls, 1);
  const expired = await code();
  clock += 300_001;
  assert.equal((await submit(expired)).status, 403);
  assert.equal(calls, 1);
  const preflight = await fetch("http://127.0.0.1:18767/bridge/probe", {
    method: "OPTIONS", headers: { Origin: `chrome-extension://${"a".repeat(32)}`,
      "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type, x-bridge-code" },
  });
  assert.equal(preflight.status, 204);
});

test("bridge immediately exchanges the one-minute PA token and keeps the refresh header private", async (t) => {
  let requests = 0;
  const server = createProbeServer({ port: 18768, request: async (url, options) => {
    requests++;
    if (url.pathname.endsWith("/spidlogin")) {
      assert.deepEqual(JSON.parse(options.body), { pa: "PRIVATE_PA", rf: null });
      return Response.json({ token: "PRIVATE_ACCESS" }, { headers: { "Z-Spid-Rauth": "PRIVATE_REFRESH" } });
    }
    assert.equal(options.headers["Z-Auth-Token"], "PRIVATE_ACCESS");
    return Response.json({ id: "123" });
  } });
  server.listen(18768, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const html = await (await fetch("http://127.0.0.1:18768/")).text();
  const code = /id="bridge-code"[^>]*value="([a-f0-9]+)"/.exec(html)[1];
  const response = await fetch("http://127.0.0.1:18768/bridge/probe", {
    method: "POST", headers: { Origin: `chrome-extension://${"a".repeat(32)}`, "Content-Type": "application/json", "X-Bridge-Code": code },
    body: JSON.stringify({ paToken: "PRIVATE_PA" }),
  });
  const output = await response.json();
  assert.equal(response.status, 200);
  assert.equal(output.accessTokenReceived, true);
  assert.equal(output.refreshAvailable, true);
  assert.ok(requests > 1);
  assert.equal(JSON.stringify(output).includes("PRIVATE"), false);
});
