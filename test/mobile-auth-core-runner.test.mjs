import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import axios, { AxiosHeaders } from "axios";
import { createProbeServer } from "../scripts/probe-mobile-auth.mjs";

test("core mode uses the production client for browser login, diary reads and renewal", async t => {
  const originalAdapter = axios.defaults.adapter;
  const calls = [];
  let refreshed = false;
  axios.defaults.adapter = async config => {
    calls.push(config.url);
    assert.equal(config.baseURL, "https://web.spaggiari.eu/rest/v1");
    const auth = { ident: "G1234567A", token: refreshed ? "PRIVATE_NEW" : "PRIVATE_ACCESS",
      expire: new Date(Date.now() + 3600_000).toISOString() };
    let data;
    const headers = {};
    if (config.url === "/auth/spidlogin") {
      assert.deepEqual(JSON.parse(config.data), { pa: "PRIVATE_PA", rf: null });
      data = auth;
      headers["z-spid-rauth"] = "PRIVATE_RF";
    } else if (config.url === "/auth/spidrf") {
      assert.deepEqual(JSON.parse(config.data), { pa: "PRIVATE_PA", rf: "PRIVATE_RF" });
      assert.equal(config.headers.get("Z-Auth-Token"), undefined);
      refreshed = true;
      data = { ...auth, token: "PRIVATE_NEW" };
    } else if (config.url.endsWith("/card")) {
      data = { card: { ident: "G1234567A", firstName: "PRIVATE_NAME", lastName: "PRIVATE_SURNAME" } };
    } else if (config.url.includes("/lessons/")) {
      data = { lessons: [{ lessonArg: "PRIVATE_HOMEWORK" }] };
    } else if (config.url.endsWith("/subjects")) {
      data = { subjects: [{ id: 1, description: "PRIVATE_SUBJECT" }] };
    } else if (config.url.endsWith("/periods")) {
      data = { periods: [] };
    } else if (config.url.endsWith("/absences/details/")) {
      data = { events: [] };
    } else throw Error("Unexpected core route");
    return { config, status: 200, statusText: "OK", headers: AxiosHeaders.from(headers), data };
  };
  const server = createProbeServer({ port: 18769, useCore: true,
    request: async () => { throw Error("Direct diagnostic API must not run"); } });
  server.listen(18769, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { await new Promise(resolve => server.close(resolve)); axios.defaults.adapter = originalAdapter; });
  const html = await (await fetch("http://127.0.0.1:18769/")).text();
  assert.match(html, /Modalità: core dell’applicativo/);
  const code = /id="bridge-code"[^>]*value="([a-f0-9]+)"/.exec(html)[1];
  const csrf = /const csrf="([a-f0-9]+)"/.exec(html)[1];
  const login = await fetch("http://127.0.0.1:18769/bridge/probe", {
    method: "POST", headers: { Origin: `chrome-extension://${"a".repeat(32)}`, "Content-Type": "application/json", "X-Bridge-Code": code },
    body: JSON.stringify({ paToken: "PRIVATE_PA" }),
  });
  const result = await login.json();
  assert.equal(login.status, 200);
  assert.equal(result.engine, "@classeviva/core");
  assert.equal(result.refreshAvailable, true);
  assert.equal(result.core.connected, true);
  assert.equal(result.core.lessonsReadable, true);
  assert.equal(result.core.subjectsReadable, true);
  assert.equal(result.core.periodsReadable, true);
  assert.equal(result.core.absencesReadable, true);
  assert.equal(result.core.lessonCount, 1);
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
  const renewal = await fetch("http://127.0.0.1:18769/refresh", {
    method: "POST", headers: { Origin: "http://127.0.0.1:18769", "Content-Type": "application/json", "X-Probe-CSRF": csrf }, body: "{}",
  });
  const renewed = await renewal.json();
  assert.equal(renewal.status, 200);
  assert.equal(renewed.engine, "@classeviva/core");
  assert.equal(renewed.accessTokenReplaced, true);
  assert.equal(renewed.core.lessonsReadable, true);
  assert.equal(JSON.stringify(renewed).includes("PRIVATE"), false);
  assert.equal(calls.filter(path => path === "/auth/spidrf").length, 1);
});
