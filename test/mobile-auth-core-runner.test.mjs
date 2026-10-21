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

test("profile diagnostic keeps two sessions in memory and switches without another identity login", async t => {
  const originalAdapter = axios.defaults.adapter;
  let logins = 0;
  axios.defaults.adapter = async config => {
    let data;
    let headers = {};
    if (config.url === "/auth/spidlogin") {
      logins++;
      const profile = JSON.parse(config.data).pa === "PRIVATE_PA_1" ? 1 : 2;
      data = { ident: `G${profile}234567A`, token: `PRIVATE_ACCESS_${profile}`,
        expire: new Date(Date.now() + 3600_000).toISOString() };
      headers["z-spid-rauth"] = `PRIVATE_RF_${profile}`;
    } else {
      const profile = config.url.includes("/1234567/") ? 1 : 2;
      assert.equal(config.headers.get("Z-Auth-Token"), `PRIVATE_ACCESS_${profile}`);
      data = config.url.endsWith("/card")
        ? { card: { ident: `G${profile}234567A`, firstName: "PRIVATE_NAME", lastName: "PRIVATE_SURNAME" } }
        : { subjects: [{ description: "PRIVATE_SUBJECT" }], lessons: [], periods: [], events: [] };
    }
    return { config, status: 200, statusText: "OK", headers: AxiosHeaders.from(headers), data };
  };
  let crossReads = 0;
  let allowShared = false;
  const server = createProbeServer({ port: 18771, profilesMode: true, request: async (url, options) => {
    crossReads++;
    assert.equal(new URL(url).pathname, "/rest/v1/students/2234567/card");
    assert.equal(options.headers["Z-Auth-Token"], "PRIVATE_ACCESS_1");
    return allowShared
      ? Response.json({ card: { ident: "G2234567A", firstName: "PRIVATE_NAME" } })
      : Response.json({ error: "PRIVATE_RESPONSE" }, { status: 403 });
  } });
  server.listen(18771, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { await new Promise(resolve => server.close(resolve)); axios.defaults.adapter = originalAdapter; });
  const html = await (await fetch("http://127.0.0.1:18771/")).text();
  const csrf = /const csrf="([a-f0-9]+)"/.exec(html)[1];
  const post = (route, body, origin = "http://127.0.0.1:18771") => fetch(`http://127.0.0.1:18771${route}`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Probe-CSRF": csrf }, body: JSON.stringify(body),
  });
  assert.equal((await post("/probe", { paToken: "PRIVATE_PA_1" }, "https://example.com")).status, 403);
  assert.equal(logins, 0);
  assert.equal((await post("/profiles", {})).status, 400);
  assert.equal((await (await post("/probe", { paToken: "PRIVATE_PA_1" })).json()).profilesCaptured, 1);
  assert.equal((await post("/profiles", {})).status, 400);
  assert.equal((await (await post("/probe", { paToken: "PRIVATE_PA_2" })).json()).profilesCaptured, 2);
  const response = await post("/profiles", {});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.switches.map(s => s.profile), [1, 2, 1]);
  assert.ok(result.switches.every(s => s.connected && s.identityBound && s.subjectsReadable));
  assert.equal(result.sameAccessToken, false);
  assert.equal(result.sameRefreshToken, false);
  assert.deepEqual(result.sharedTokenRead, { httpStatus: 403, identityMatches: false });
  assert.equal(logins, 2);
  assert.equal(crossReads, 1);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|1234567|2234567/);
  allowShared = true;
  const shared = await (await post("/profiles", {})).json();
  assert.deepEqual(shared.sharedTokenRead, { httpStatus: 200, identityMatches: true });
  assert.equal(logins, 2);
  assert.doesNotMatch(JSON.stringify(shared), /PRIVATE|1234567|2234567/);
});
