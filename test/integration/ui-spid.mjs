// Eseguibile nel container UI: node /app/test/ui-spid.mjs
// Solo risposte simulate; nessuna chiamata reale a Spaggiari.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.env.UI_APP_ROOT ?? "/app";
const require = createRequire(path.join(root, "package.json"));
const express = require("express");
const session = require("express-session");
const load = relative => import(pathToFileURL(path.join(root, relative)).href);
const axios = await load("node_modules/axios/index.js");

test("UI SPID linking, restart, refresh, revocation and account removal", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "classeviva-ui-http-"));
  process.env.ACCOUNTS_PATH = path.join(directory, "accounts.json");
  process.env.CACHE_DB_PATH = path.join(directory, "cache_ui.json");
  t.after(() => rm(directory, { recursive: true, force: true }));
  let id = "G1234567A";
  let token = "PRIVATE_ACCESS_1";
  let deny = false;
  let transient = false;
  let refreshes = 0;
  let diskFailure = false;
  const calls = [];
  const originalAdapter = axios.default.defaults.adapter;
  axios.default.defaults.adapter = async config => {
    calls.push(config.url);
    let status = 200;
    let data;
    let headers = {};
    const auth = () => ({ ident: id, token, expire: new Date(Date.now() + 3600_000).toISOString() });
    if (config.url === "/auth/spidlogin") { data = auth(); headers["z-spid-rauth"] = "PRIVATE_REFRESH"; }
    else if (config.url === "/auth/spidrf") {
      refreshes++;
      assert.equal(config.headers.get("Z-Auth-Token"), undefined);
      assert.deepEqual(JSON.parse(config.data), { pa: "PRIVATE_PA", rf: "PRIVATE_REFRESH" });
      if (deny) status = 422;
      else if (transient) status = 503;
      else { token = "PRIVATE_ACCESS_ROTATED"; data = auth(); headers["z-spid-rauth"] = "PRIVATE_REFRESH_ROTATED"; }
      if (diskFailure) {
        diskFailure = false;
        await rename(process.env.ACCOUNTS_PATH, `${process.env.ACCOUNTS_PATH}.backup`);
        await mkdir(process.env.ACCOUNTS_PATH);
      }
    } else if (config.url.endsWith("/card")) {
      data = { card: { ident: id, usrId: Number(id.slice(1, -1)), usrType: "G", firstName: "Studente", lastName: "Esempio" } };
    } else data = { subjects: [{ id: 1, description: "Italiano", order: 1, teachers: [] }], lessons: [], events: [] };
    const response = { status, statusText: "", config, headers: axios.AxiosHeaders.from(headers), data };
    if (status >= 400) throw new axios.AxiosError("PRIVATE_ECHO", "ERR_BAD_RESPONSE", config, {}, response);
    return response;
  };
  t.after(() => { axios.default.defaults.adapter = originalAdapter; });
  const accounts = await load("packages/server/dist/accounts.js");
  const clients = await load("packages/server/dist/session.js");
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-only-secret", saveUninitialized: false, resave: false }));
  app.use("/api/auth", (await load("packages/server/dist/routes/auth.js")).default);
  app.use("/api/accounts", (await load("packages/server/dist/routes/accounts.js")).default);
  app.use("/api/materie", (await load("packages/server/dist/routes/materie.js")).default);
  app.use("/api/voti", (await load("packages/server/dist/routes/voti.js")).default);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  async function request(url, { other = false, ...options } = {}) {
    const response = await fetch(base + url, { ...options, headers: { "Content-Type": "application/json", "X-Classeviva-Request": "1", ...(!other && cookie ? { Cookie: cookie } : {}), ...options.headers } });
    if (!other && response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
    const data = await response.json();
    assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
    return { status: response.status, data };
  }
  const post = (url, data, options = {}) => request(url, { method: "POST", body: JSON.stringify(data), ...options });
  const start = () => post("/api/auth/spid/start", {});
  const complete = nonce => post("/api/auth/spid/complete", { nonce, paToken: "PRIVATE_PA" });

  assert.equal((await request("/api/auth/me")).data.authenticated, false);
  assert.equal((await post("/api/auth/spid/start", {}, { headers: { "X-Classeviva-Request": "" } })).status, 403);
  let pairing = (await start()).data;
  assert.equal((await post("/api/auth/spid/complete", { nonce: pairing.nonce, paToken: "PRIVATE_PA" }, { other: true })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await complete(pairing.nonce)).status, 200);
  assert.equal((await complete(pairing.nonce)).status, 400);
  assert.equal((await request("/api/auth/me")).data.user.authType, "spid");
  assert.equal((await request("/api/materie")).data.subjects.length, 1);
  assert.equal((await request("/api/voti")).status, 409);
  assert.equal((await readFile(process.env.ACCOUNTS_PATH, "utf8")).includes("PRIVATE"), false);
  if (process.platform !== "win32") {
    for (const file of [process.env.ACCOUNTS_PATH, path.join(directory, "spid-session.key")]) {
      assert.equal((await stat(file)).mode & 0o777, 0o600);
    }
  }

  // Perdita di RAM e cookie equivale a un riavvio per il ripristino delle credenziali.
  clients.clearClientByStudentId(id); cookie = "";
  assert.equal((await request("/api/auth/me")).data.authenticated, true);
  let account = (await accounts.loadAccounts())[0];
  const old = await accounts.readSpidSession(account);
  await accounts.saveSpidAccount({ ...old, expiresAt: Date.now() - 1 });
  clients.clearClientByStudentId(id); cookie = "";
  transient = true;
  assert.equal((await request("/api/auth/me")).status, 503);
  assert.equal((await accounts.loadAccounts())[0].needsLogin, undefined);
  transient = false;
  diskFailure = true;
  assert.equal((await request("/api/auth/me")).status, 503);
  await rm(process.env.ACCOUNTS_PATH, { recursive: true });
  await rename(`${process.env.ACCOUNTS_PATH}.backup`, process.env.ACCOUNTS_PATH);
  assert.equal((await request("/api/auth/me")).data.authenticated, true);
  account = (await accounts.loadAccounts())[0];
  assert.equal((await accounts.readSpidSession(account)).refreshToken, "PRIVATE_REFRESH_ROTATED");
  assert.equal(refreshes, 2);

  // Aggiunta e passaggio al secondo profilo non altera il primo.
  id = "G2345678A"; pairing = (await start()).data;
  assert.equal((await complete(pairing.nonce)).status, 200);
  id = "G1234567A";
  assert.equal((await post(`/api/accounts/switch/${id}`, {})).data.user.ident, id);
  await accounts.saveSpidAccount({ ...old, expiresAt: Date.now() - 1 });
  clients.clearClientByStudentId(id); deny = true;
  const expired = await request("/api/materie");
  assert.equal(expired.status, 401); assert.equal(expired.data.code, "SPID_LOGIN_REQUIRED");
  account = (await accounts.loadAccounts()).find(a => a.studentId === id);
  assert.equal(account.needsLogin, true); assert.equal(account.spidSession, undefined);
  assert.equal((await request("/api/auth/me")).data.authenticated, false);
  assert.equal((await accounts.loadAccounts()).find(a => a.studentId === "G2345678A").needsLogin, undefined);
  assert.equal((await request(`/api/accounts/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await accounts.loadAccounts()).some(a => a.studentId === id), false);
  assert.equal((await post(`/api/accounts/switch/${id}`, {})).status, 404);
});
