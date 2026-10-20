import assert from "node:assert/strict";
import { inspect } from "node:util";
import test from "node:test";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { ClassevivaClient, AccessoSpidRichiesto, ErroreHTTP, FormatoNonValido,
  FunzionalitaNonDisponibile } from "../packages/core/dist/index.js";

const NOW = Date.parse("2026-10-20T14:00:00Z");
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp: exp / 1000 })).toString("base64url")}.PRIVATE_SIGNATURE`;
const pa = () => jwt(NOW + 60_000);
const rf = () => jwt(NOW + 30 * 86400_000);
const auth = (token = "PRIVATE_ACCESS", extra = {}) => ({ ident: "G1234567A", token,
  firstName: "Genitore", lastName: "Esempio", expire: new Date(NOW + 3600_000).toISOString(), ...extra });
const snapshot = (extra = {}) => ({ version: 1, ident: "G1234567A", paToken: pa(),
  accessToken: "PRIVATE_ACCESS", refreshToken: rf(), expiresAt: NOW + 3600_000, ...extra });
const card = { card: { ident: "G1234567A", firstName: "Studente", lastName: "Esempio",
  schCode: "SCUOLA", usrId: 1234567, usrType: "G", birthDate: "2010-01-01", fiscalCode: "PRIVATE_FISCAL" } };

function transport(t, handler) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const original = axios.defaults.adapter;
  const calls = [];
  axios.defaults.adapter = async (config) => {
    const request = { path: config.url, method: config.method, headers: config.headers,
      body: config.data && String(config.headers.get("Content-Type")).includes("application/json")
        ? JSON.parse(config.data) : config.data, config };
    calls.push(request);
    const response = await handler(request) ?? {};
    const result = { config, status: response.status ?? 200, statusText: "",
      headers: AxiosHeaders.from(response.headers ?? {}), data: response.data ?? {} };
    if (result.status >= 400) throw new AxiosError("PRIVATE_SERVER_ECHO", "ERR_BAD_RESPONSE", config, {}, result);
    return result;
  };
  t.after(() => { axios.defaults.adapter = original; });
  return calls;
}

function initial(request) {
  if (request.path === "/auth/spidlogin") return { data: auth(), headers: { "z-spid-rauth": rf() } };
  if (request.path.endsWith("/card")) return { data: card };
  return { data: { lessons: [], subjects: [], periods: [], events: [] } };
}

test("SPID login binds the profile and routes diary reads through mobile APIs", async t => {
  const calls = transport(t, initial);
  const client = await ClassevivaClient.accediConSpid(pa());
  assert.equal(client.connesso, true);
  assert.equal(client.nomeCompleto, "Studente Esempio");
  assert.equal(client.datiUtente.id, "1234567");
  assert.equal(client.datiUtente.account_type, "G");
  assert.equal(client.datiUtente.classe_desc, undefined);
  await client.lezioniDaA("2026-10-14", "2026-10-20");
  await client.lezioniGiorno("2026-10-20");
  await client.materie(); await client.periodi(); await client.assenze();
  assert.deepEqual(calls[0].body, { pa: pa(), rf: null });
  for (const call of calls) {
    assert.equal(call.config.baseURL, "https://web.spaggiari.eu/rest/v1");
    assert.equal(call.config.maxRedirects, 0);
    assert.equal(call.headers.get("Cookie"), undefined);
  }
  assert.equal(calls[1].headers.get("Z-Auth-Token"), "PRIVATE_ACCESS");
  assert.ok(calls.some(call => call.path === "/students/1234567/lessons/20261014/20261020"));
  const exported = client.esportaSessioneSpid();
  exported.accessToken = "MUTATED";
  assert.equal(client.esportaSessioneSpid().accessToken, "PRIVATE_ACCESS");
  for (const value of [pa(), rf(), "PRIVATE_ACCESS"]) {
    assert.equal(JSON.stringify(client).includes(value), false);
    assert.equal(inspect(client).includes(value), false);
  }
});

test("restoring an expired access token renews with the original expired PA and rotates RF", async t => {
  const calls = transport(t, request => {
    if (request.path === "/auth/spidrf") {
      assert.equal(request.headers.get("Z-Auth-Token"), undefined);
      assert.equal(request.headers.get("Cookie"), undefined);
      assert.deepEqual(request.body, { pa: jwt(NOW - 60_000), rf: rf() });
      return { data: auth("PRIVATE_NEW"), headers: { "z-spid-rauth": "PRIVATE_ROTATED_RF" } };
    }
    assert.equal(request.headers.get("Z-Auth-Token"), "PRIVATE_NEW");
    return initial(request);
  });
  const client = await ClassevivaClient.daSessioneSpid(snapshot({ expiresAt: NOW - 1, paToken: jwt(NOW - 60_000) }));
  assert.equal(client.esportaSessioneSpid().accessToken, "PRIVATE_NEW");
  assert.equal(client.esportaSessioneSpid().refreshToken, "PRIVATE_ROTATED_RF");
  assert.equal(calls.filter(call => call.path === "/auth/spidrf").length, 1);
  assert.equal(calls.some(call => call.path === "/auth/spidlogin"), false);
});

test("simultaneous reads share one proactive refresh", async t => {
  const calls = transport(t, async request => {
    if (request.path === "/auth/spidrf") {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: auth("PRIVATE_NEW", { expire: new Date(NOW + 7200_000).toISOString() }) };
    }
    return initial(request);
  });
  const client = await ClassevivaClient.accediConSpid(pa());
  t.mock.timers.tick(3600_000);
  await Promise.all([client.card(), client.materie(), client.periodi(), client.lezioniGiorno("2026-10-20")]);
  assert.equal(calls.filter(call => call.path === "/auth/spidrf").length, 1);
  assert.equal(client.esportaSessioneSpid().accessToken, "PRIVATE_NEW");
});

test("concurrent 401 responses retry once using the same refreshed session", async t => {
  const calls = transport(t, async request => {
    if (request.path === "/auth/spidrf") {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: auth("PRIVATE_NEW") };
    }
    if (request.path.endsWith("/subjects") || request.path.endsWith("/periods")) {
      if (request.headers.get("Z-Auth-Token") === "PRIVATE_ACCESS") return { status: 401 };
    }
    return initial(request);
  });
  const client = await ClassevivaClient.accediConSpid(pa());
  await Promise.all([client.materie(), client.periodi()]);
  assert.equal(calls.filter(call => call.path === "/auth/spidrf").length, 1);
  assert.equal(calls.filter(call => call.path.endsWith("/subjects")).length, 2);
  assert.equal(calls.filter(call => call.path.endsWith("/periods")).length, 2);
});

test("rejected refresh requires SPID again and exposes no Axios request or response", async t => {
  const calls = transport(t, request => request.path === "/auth/spidrf" ? { status: 422 } : initial(request));
  const client = await ClassevivaClient.accediConSpid(pa());
  await assert.rejects(client.accedi(), error => {
    assert.ok(error instanceof AccessoSpidRichiesto);
    assert.equal(error.config, undefined); assert.equal(error.response, undefined); assert.equal(error.cause, undefined);
    assert.equal(inspect(error).includes("PRIVATE"), false);
    return true;
  });
  assert.equal(client.connesso, false);
  assert.equal(client.esportaSessioneSpid(), undefined);
  const count = calls.length;
  await assert.rejects(client.materie(), AccessoSpidRichiesto);
  assert.equal(calls.length, count);
});

test("a transient refresh failure preserves the session for the next attempt", async t => {
  let attempts = 0;
  transport(t, request => {
    if (request.path === "/auth/spidrf") return ++attempts === 1 ? { status: 503 } : { data: auth("PRIVATE_NEW") };
    return initial(request);
  });
  const client = await ClassevivaClient.accediConSpid(pa());
  await assert.rejects(client.accedi(), error => error instanceof ErroreHTTP && !inspect(error).includes("PRIVATE"));
  assert.equal(client.connesso, true);
  await client.accedi();
  assert.equal(attempts, 2);
  assert.equal(client.esportaSessioneSpid().accessToken, "PRIVATE_NEW");
});

test("a second unauthorized response ends the retry without a loop", async t => {
  const calls = transport(t, request => {
    if (request.path === "/auth/spidrf") return { data: auth("PRIVATE_NEW") };
    if (request.path.endsWith("/subjects")) return { status: 401 };
    return initial(request);
  });
  const client = await ClassevivaClient.accediConSpid(pa());
  await assert.rejects(client.materie(), AccessoSpidRichiesto);
  assert.equal(client.connesso, false);
  assert.equal(calls.filter(call => call.path === "/auth/spidrf").length, 1);
  assert.equal(calls.filter(call => call.path.endsWith("/subjects")).length, 2);
});

test("a refresh cannot silently change the selected profile", async t => {
  transport(t, request => request.path === "/auth/spidrf" ? { data: auth("PRIVATE_OTHER", { ident: "G9999999A" }) } : initial(request));
  const client = await ClassevivaClient.accediConSpid(pa());
  await assert.rejects(client.accedi(), AccessoSpidRichiesto);
  assert.equal(client.esportaSessioneSpid(), undefined);
});

test("unsupported mobile features fail explicitly without contacting web APIs", async t => {
  const calls = transport(t, initial);
  const client = await ClassevivaClient.accediConSpid(pa());
  const count = calls.length;
  for (const operation of [() => client.voti(), () => client.agenda(), () => client.compiti(),
    () => client.functions(), () => client.librettoWebConf(), () => client.note(), () => client.leggiNota("NT", 1),
    () => client.bacheca(), () => client.bachecaLeggi("EV", 1), () => client.didattica(), () => client.didatticaElemento(1)]) {
    await assert.rejects(operation(), FunzionalitaNonDisponibile);
  }
  assert.equal(calls.length, count);
});

test("invalid sessions and expired initial PA are rejected before networking", async t => {
  const calls = transport(t, () => { throw Error("Network must not run"); });
  await assert.rejects(ClassevivaClient.accediConSpid(jwt(NOW - 1)), AccessoSpidRichiesto);
  await assert.rejects(ClassevivaClient.accediConSpid("[redacted]"), FormatoNonValido);
  for (const session of [null, snapshot({ version: 2 }), snapshot({ ident: "T123" }),
    snapshot({ expiresAt: NaN }), snapshot({ refreshToken: "" })]) {
    await assert.rejects(ClassevivaClient.daSessioneSpid(session), FormatoNonValido);
  }
  assert.equal(calls.length, 0);
});

test("expiry without timezone uses server status instead of the host timezone", async t => {
  const calls = transport(t, request => {
    if (request.path === "/auth/spidlogin") return { data: auth("PRIVATE_ACCESS", { expire: "2026-10-20 16:30:00" }), headers: { "z-spid-rauth": rf() } };
    if (request.path === "/auth/status") return { data: { status: { remains: 900 } } };
    return initial(request);
  });
  const client = await ClassevivaClient.accediConSpid(pa());
  assert.equal(client.esportaSessioneSpid().expiresAt, NOW + 900_000);
  assert.equal(calls.filter(call => call.path === "/auth/status").length, 1);
});

test("legacy password login still uses its PHP cookie and original web routes", async t => {
  const calls = transport(t, request => {
    if (request.path.includes("AuthApi4.php")) return { data: { data: { auth: { loggedIn: true, accountInfo: { id: 1234567, nome: "Nome", cognome: "Cognome" } } } },
      headers: { "set-cookie": ["PHPSESSID=PRIVATE_COOKIE; HttpOnly"] } };
    if (request.path === "/misc/whoami") return { data: { id: "1234567", nome: "Nome", cognome: "Cognome" } };
    assert.equal(request.headers.get("Cookie"), "PHPSESSID=PRIVATE_COOKIE");
    return { data: { lessons: [] } };
  });
  const client = new ClassevivaClient("G1234567A", "PRIVATE_PASSWORD");
  await client.accedi();
  await client.lezioniGiorno("2026-10-20");
  assert.equal(client.connesso, true);
  assert.equal(client.nomeCompleto, "Nome Cognome");
  assert.equal(client.esportaSessioneSpid(), undefined);
  assert.equal(new URLSearchParams(calls[0].body).get("pwd"), "PRIVATE_PASSWORD");
  assert.ok(calls.some(call => call.path === "/students/1234567/lessons/20261020/20261020" && call.config.baseURL.endsWith("/w1")));
});

test("a resource permission error does not invalidate or renew the login", async t => {
  const calls = transport(t, request => request.path.endsWith("/subjects") ? { status: 403 } : initial(request));
  const client = await ClassevivaClient.accediConSpid(pa());
  await assert.rejects(client.materie(), error => error instanceof ErroreHTTP && error.statusCode === 403);
  assert.equal(client.connesso, true);
  assert.equal(calls.some(call => call.path === "/auth/spidrf"), false);
});

test("missing refresh credentials and a mismatched profile cannot create a connected client", async t => {
  let mismatch = false;
  transport(t, request => {
    if (!mismatch && request.path === "/auth/spidlogin") return { data: auth() };
    if (request.path.endsWith("/card")) return { data: { card: { ...card.card, ident: "G9999999A" } } };
    return initial(request);
  });
  await assert.rejects(ClassevivaClient.accediConSpid(pa()), ErroreHTTP);
  mismatch = true;
  await assert.rejects(ClassevivaClient.accediConSpid(pa()), /Profilo/);
});

test("a restored snapshot is copied and does not retain unknown input fields", async t => {
  transport(t, initial);
  const input = snapshot({ unexpected: "PRIVATE_EXTRA" });
  const client = await ClassevivaClient.daSessioneSpid(input);
  input.refreshToken = "CHANGED";
  assert.equal(client.esportaSessioneSpid().refreshToken, rf());
  assert.equal(client.esportaSessioneSpid().unexpected, undefined);
});
