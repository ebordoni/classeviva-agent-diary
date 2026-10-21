import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createLinkServer } from "../scripts/link-home-assistant.mjs";

const source = await readFile(new URL("../hassio-addon/classeviva-ui/src/packages/server/src/spid-pairing.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { SpidPairing } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("UI pairing is bound to the browser session, expires and cannot be replayed", () => {
  let now = 1000;
  const pairing = new SpidPairing(() => now);
  const first = pairing.start("browser1");
  assert.equal(pairing.consume("browser2", first.nonce), false);
  assert.equal(pairing.consume("browser1", "0".repeat(64)), false);
  assert.equal(pairing.consume("browser1", first.nonce), true);
  assert.equal(pairing.consume("browser1", first.nonce), false);
  const second = pairing.start("browser1");
  const third = pairing.start("browser1");
  assert.equal(pairing.consume("browser1", second.nonce), false);
  pairing.cancel("browser1");
  assert.equal(pairing.consume("browser1", third.nonce), false);
  const last = pairing.start("browser1"); now = last.expiresAt;
  assert.equal(pairing.consume("browser1", last.nonce), false);
});

test("local companion accepts one extension capture and only releases it to its private channel", async t => {
  let now = 1000;
  const port = 18771;
  const server = createLinkServer({ port, now: () => now });
  await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${port}`;
  const page = await fetch(`${base}/link`);
  const html = await page.text();
  assert.ok(page.headers.get("content-security-policy").includes("frame-ancestors 'none'"));
  const code = /id="code" type="password" value="([a-f0-9]{48})"/.exec(html)[1];
  assert.equal((await fetch(`${base}/link/result`)).status, 403);
  const headers = { Origin: `chrome-extension://${"a".repeat(32)}`, "Content-Type": "application/json", "X-Bridge-Code": code };
  const body = JSON.stringify({ paToken: "PRIVATE_PA" });
  assert.equal((await fetch(`${base}/bridge/probe`, { method: "POST", headers: { ...headers, Origin: "https://evil.example" }, body })).status, 403);
  const result = await fetch(`${base}/bridge/probe`, { method: "POST", headers, body });
  assert.equal(result.status, 200);
  assert.equal((await result.text()).includes("PRIVATE_PA"), false);
  assert.equal((await fetch(`${base}/bridge/probe`, { method: "POST", headers, body })).status, 403);
  const privateResult = await fetch(`${base}/link/result`, { headers: { "X-Link-Code": code } });
  assert.equal(privateResult.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await privateResult.json(), { paToken: "PRIVATE_PA" });
  await fetch(`${base}/link/finish`, { method: "POST", headers: { "Content-Type": "application/json", "X-Link-Code": code }, body: "{}" });
  assert.equal((await fetch(`${base}/link/result`, { headers: { "X-Link-Code": code } })).status, 403);
  const next = /id="code" type="password" value="([a-f0-9]{48})"/.exec(await (await fetch(`${base}/link`)).text())[1];
  now += 300_000;
  assert.equal((await fetch(`${base}/bridge/probe`, { method: "POST", headers: { ...headers, "X-Bridge-Code": next }, body })).status, 403);
});
