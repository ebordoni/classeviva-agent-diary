/** Local, memory-only diagnostic for the official mobile SPID/CIE callback.
 * Start: node scripts/probe-mobile-auth.mjs
 * Paste the fresh official callback URL in the localhost form (or import its HTML).
 * No credentials or API response values are written to disk or console.
 */
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";

const BASE = "https://web.spaggiari.eu/rest/";
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "CVVS/std/4.2.3 Android/12",
  "Z-Dev-ApiKey": "Tg1NWEwNGIgIC0K",
};
const MAX_BYTES = 512 * 1024;

function validPaToken(token) {
  return typeof token === "string" && !!token && token.length <= 32_768 &&
    !/^(?:\[redacted\]|<redacted>|\*+)$/i.test(token);
}

export function tokenMetadata(token, now = Date.now()) {
  const result = { jwt: false };
  try {
    if (token.split(".").length !== 3) return result;
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    result.jwt = true;
    for (const [key, name] of [["iat", "issuedAt"], ["exp", "expiresAt"]]) {
      if (typeof payload[key] === "number" && Number.isFinite(payload[key])) result[name] = new Date(payload[key] * 1000).toISOString();
    }
    if (result.expiresAt) result.expired = payload.exp * 1000 <= now;
  } catch { /* Never expose JWT contents or parsing errors. */ }
  return result;
}

function unescapeAttribute(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    const names = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (entity.toLowerCase() in names) return names[entity.toLowerCase()];
    const hex = /^&#x/i.test(entity);
    const code = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
}

export function parsePaToken(html) {
  if (typeof html !== "string" || Buffer.byteLength(html) > MAX_BYTES) {
    throw new Error("Pagina assente o troppo grande.");
  }
  const tokens = [];
  for (const input of html.match(/<input\b[^>]*>/gi) ?? []) {
    const attributes = Object.fromEntries(
      [...input.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
        .map((match) => [match[1].toLowerCase(), unescapeAttribute(match[2] ?? match[3] ?? match[4])]),
    );
    if (attributes.name === "spid-patoken") tokens.push(attributes.value ?? "");
  }
  if (tokens.length !== 1 || !validPaToken(tokens[0])) {
    throw new Error("Token mobile non trovato: scegli la pagina finale originale del login mobile.");
  }
  return tokens[0];
}

export function schema(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value !== "object") return typeof value;
  if (depth >= 3) return "object";
  return Object.fromEntries(Object.entries(value).slice(0, 60)
    .map(([key, entry]) => [key, schema(entry, depth + 1)]));
}

function field(data, names) {
  for (const container of [data, data?.data, data?.auth, data?.data?.auth]) {
    for (const name of names) {
      if (typeof container?.[name] === "string" && container[name]) return container[name];
    }
  }
}

async function api(path, { body, session } = {}, request = fetch) {
  const response = await request(new URL(path, BASE), {
    method: body ? "POST" : "GET",
    headers: {
      ...API_HEADERS,
      ...(session?.accessToken ? { "Z-Auth-Token": session.accessToken } : {}),
      ...(session?.cookie ? { Cookie: session.cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  // API error text may contain secrets; expose only status and structural types.
  const errorCode = typeof data?.error === "string" ? /^(\d{2,4}):/.exec(data.error)?.[1] : undefined;
  const errorText = [data?.error, data?.info, data?.message].filter(value => typeof value === "string").join(" ");
  const failureReason = !response.ok ? (/expir|scadut/i.test(errorText) ? "expired"
    : /invalid payload/i.test(errorText) ? "invalid_payload"
      : /authentication failed/i.test(errorText) ? "authentication_failed" : "unclassified") : undefined;
  return { response, data, public: { httpStatus: response.status, json: data !== null,
    ...(errorCode ? { errorCode } : {}), ...(failureReason ? { failureReason } : {}), schema: schema(data) } };
}

function credentials(result, previous = {}) {
  const cookie = (result.response.headers.getSetCookie?.() ?? [])
    .map((value) => value.match(/(?:^|;\s*)PHPSESSID=([^;]+)/)?.[1]).find(Boolean);
  return {
    ...previous,
    accessToken: field(result.data, ["token"]) ?? result.response.headers.get("z-auth-token") ?? previous.accessToken,
    refreshToken: field(result.data, ["rtoken", "spidRefreshToken", "spid_refresh_token"])
      ?? result.response.headers.get("z-spid-rauth") ?? previous.refreshToken,
    ident: field(result.data, ["ident"]) ?? previous.ident,
    cookie: cookie ? `PHPSESSID=${cookie}` : previous.cookie,
  };
}

async function checkAccess(session, request) {
  const results = {};
  if (session.accessToken) {
    const status = await api("v1/auth/status", { session }, request);
    results.mobileStatus = status.public;
    const numericId = /^\D?(\d+)[A-Z]?$/i.exec(session.ident ?? "")?.[1];
    if (numericId) {
      const lessons = await api(`v1/students/${numericId}/lessons/today`, { session }, request);
      results.mobileLessons = { httpStatus: lessons.response.status,
        readable: lessons.response.ok && Array.isArray(lessons.data?.lessons),
        count: Array.isArray(lessons.data?.lessons) ? lessons.data.lessons.length : null };
    }
  }
  if (session.accessToken || session.cookie) {
    const identity = await api("w1/misc/whoami", { session }, request);
    results.webIdentity = { httpStatus: identity.response.status,
      readable: identity.response.ok && typeof identity.data?.id === "string" && !!identity.data.id };
  }
  return results;
}

export async function probeLogin(paToken, request = fetch, initialSession = {}) {
  const metadata = tokenMetadata(paToken);
  if (metadata.expired) return { publicResult: { paTokenMetadata: metadata,
    error: "Token mobile scaduto: completa un nuovo login e invialo subito con l'estensione.", failureReason: "expired" }, session: null };
  // Android 5.12.9: SpidrfJTO serializes tokenPa/tokenRf as pa/rf.
  // The initial sign-in supplies only tokenPa; the serializer includes rf:null.
  const login = await api("v1/auth/spidlogin", { body: { pa: paToken, rf: null }, session: initialSession }, request);
  const session = credentials(login, { ...initialSession, paToken });
  const publicResult = { paTokenMetadata: tokenMetadata(paToken), login: login.public, accessTokenReceived: !!session.accessToken,
    refreshTokenReceived: !!session.refreshToken,
    ...(session.refreshToken ? { refreshTokenMetadata: tokenMetadata(session.refreshToken) } : {}) };
  if (!login.response.ok) return { publicResult, session: null };
  Object.assign(publicResult, await checkAccess(session, request));
  return { publicResult, session };
}

const INPUT_ERRORS = {
  callbackInvalid: "Incolla il collegamento completo della pagina finale mobile su web.spaggiari.eu.",
  callbackExpired: "Il collegamento temporaneo è scaduto: completa un nuovo login mobile e incollalo qui subito.",
  callbackUnavailable: "Il callback non ha restituito il token mobile. Potrebbe essere scaduto, già utilizzato o richiedere la sessione del browser.",
  callbackMissingToken: "La risposta del callback non contiene il token mobile. Il trasferimento tramite solo collegamento non è ancora verificato.",
};

export function validateCallbackUrl(value, now = Date.now()) {
  let url;
  try { url = new URL(value); } catch { throw new Error("callbackInvalid"); }
  const data = url.searchParams.get("data");
  if (url.origin !== "https://web.spaggiari.eu" || url.username || url.password ||
      url.pathname !== "/home/app/default/mspidauth.php" || !data || data.length > 32_768) {
    throw new Error("callbackInvalid");
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(data.split(".")[1], "base64url").toString("utf8")); }
  catch { throw new Error("callbackInvalid"); }
  // This is an early expiry check only. Spaggiari must validate the signature.
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) throw new Error("callbackInvalid");
  if (payload.exp * 1000 <= now) throw new Error("callbackExpired");
  const canonical = new URL("https://web.spaggiari.eu/home/app/default/mspidauth.php");
  canonical.searchParams.set("data", data);
  return canonical;
}

export async function probeCallback(value, request = fetch) {
  const url = validateCallbackUrl(value);
  const response = await request(url, {
    headers: { "User-Agent": API_HEADERS["User-Agent"], Accept: "text/html" },
    redirect: "manual", signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const error = new Error("callbackUnavailable");
    const location = response.headers.get("location");
    let redirectPath;
    try { const target = new URL(location, url); if (location && target.origin === url.origin) redirectPath = target.pathname; } catch {}
    error.diagnostic = { httpStatus: response.status, ...(redirectPath ? { redirectPath } : {}) };
    throw error;
  }
  const html = await response.text();
  let paToken;
  try { paToken = parsePaToken(html); } catch { throw new Error("callbackMissingToken"); }
  const initialSession = credentials({ response, data: {} });
  const result = await probeLogin(paToken, request, initialSession);
  result.publicResult.callback = { httpStatus: response.status, tokenFound: true };
  return result;
}

export async function probeRefresh(session, request = fetch) {
  if (!session?.paToken || !session.refreshToken) throw new Error("Rinnovo non disponibile: manca un token richiesto.");
  const result = await api("v1/auth/spidrf", {
    body: { pa: session.paToken, rf: session.refreshToken },
  }, request);
  const updated = result.response.ok ? credentials(result, session) : session;
  const publicResult = { refresh: result.public, accessTokenReplaced: result.response.ok && updated.accessToken !== session.accessToken };
  if (result.response.ok) Object.assign(publicResult, await checkAccess(updated, request));
  return { publicResult, session: updated };
}

/** Official app's WebView uses an API ticket and restbridge.php. Diagnostic only. */
export async function probeWebBridge(session, request = fetch) {
  const publicResult = {
    paTokenMetadata: tokenMetadata(session.paToken),
    accessTokenMetadata: tokenMetadata(session.accessToken),
    refreshTokenMetadata: tokenMetadata(session.refreshToken),
  };
  const ticket = await api("v1/auth/ticket", { session }, request);
  publicResult.ticket = ticket.public;
  if (!ticket.response.ok || typeof ticket.data?.ticket !== "string") return { publicResult, session };
  let target = new URL("https://web.spaggiari.eu/repx/app/default/restbridge.php");
  target.searchParams.set("t", ticket.data.ticket);
  target.searchParams.set("u", "https://web.spaggiari.eu/home/app/default/index.php");
  target.searchParams.set("f", "");
  let updated = { ...session };
  publicResult.bridgeStatuses = [];
  for (let i = 0; i < 5; i++) {
    const response = await request(target, { headers: {
      Accept: "text/html", "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36",
      ...(updated.cookie ? { Cookie: updated.cookie } : {}),
    }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
    publicResult.bridgeStatuses.push(response.status);
    updated = credentials({ response, data: {} }, updated);
    await response.arrayBuffer();
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) break;
    const next = new URL(location, target);
    if (next.origin !== "https://web.spaggiari.eu" || next.username || next.password) {
      publicResult.redirectBlocked = true;
      break;
    }
    target = next;
  }
  publicResult.webCookieReceived = !!updated.cookie;
  Object.assign(publicResult, await checkAccess(updated, request));
  return { publicResult, session: updated };
}

/** Read-only coverage check; exposes shapes, never lesson contents or identities. */
export async function probeMobileCoverage(session, request = fetch, date = new Date()) {
  const studentId = /^\D?(\d+)[A-Z]?$/i.exec(session.ident ?? "")?.[1];
  if (!studentId) throw new Error("Identificativo del profilo non riconosciuto.");
  const compact = value => value.toISOString().slice(0, 10).replaceAll("-", "");
  const start = new Date(date); start.setUTCDate(start.getUTCDate() - 6);
  const end = new Date(date); end.setUTCDate(end.getUTCDate() + 7);
  const endpoints = {
    lessonsRange: `lessons/${compact(start)}/${compact(date)}`,
    subjects: "subjects", periods: "periods", card: "card",
    agenda: `agenda/all/${compact(date)}/${compact(end)}`,
    grades: "grades2324", absences: "absences/details/",
  };
  const coverage = {};
  for (const [name, path] of Object.entries(endpoints)) {
    const result = await api(`v1/students/${studentId}/${path}`, { session }, request);
    const arrays = Object.fromEntries(Object.entries(result.data ?? {})
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, { count: value.length, ...(value.length ? { itemSchema: schema(value[0]) } : {}) }]));
    coverage[name] = { ...result.public, ...(result.response.ok ? { arrays } : {}) };
  }
  return { publicResult: { coverage }, session };
}

function page(csrf, bridgeCode) {
  return `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Prova accesso mobile ClasseViva</title><style>body{font:17px system-ui;max-width:760px;margin:48px auto;padding:0 24px;color:#182e46}button,input{font:inherit;margin:12px 0;padding:10px}pre{white-space:pre-wrap;background:#eef3f7;padding:16px}small{display:block}</style>
<h1>Prova accesso mobile ClasseViva</h1>
<h2>Collegamento dalla pagina aperta</h2>
<p>L’estensione di prova legge il token dalla pagina finale già aperta, senza ricaricarla. Invia il token solo a questo processo locale e solo premendo il suo pulsante.</p>
<label for="bridge-code">Codice di collegamento monouso, valido 5 minuti</label><br>
<input id="bridge-code" type="password" readonly value="${bridgeCode}" autocomplete="off"><button id="copy-code">Copia codice</button>
<p>Copia il codice, apri l’estensione dalla scheda Spaggiari con “loading… please wait” e premi <strong>Invia token al test locale</strong>. Lo scambio API parte subito: il token iniziale può durare appena un minuto. Ricarica questa pagina per generare un nuovo codice.</p>
<details><summary>Alternative diagnostiche: collegamento o HTML</summary>
<p>Completa il <a href="https://web.spaggiari.eu/home/app/default/login_spid.php?mob=on" target="_blank" rel="noreferrer">login mobile ufficiale</a>. Sulla pagina finale con “loading… please wait”, copia l'indirizzo e incollalo qui <strong>subito</strong>: il collegamento di ritorno può scadere in due minuti.</p>
<p>Il collegamento contiene una credenziale temporanea. Questo processo sul PC la gestisce in memoria e la invia soltanto a Spaggiari. Non salva credenziali o dati del registro su disco; alla chiusura del processo la sessione viene persa. Non condividere il collegamento in chat.</p>
<label for="callback">Collegamento finale del login mobile</label><br>
<input type="password" id="callback" autocomplete="off" spellcheck="false" style="width:95%" placeholder="https://web.spaggiari.eu/home/app/default/mspidauth.php?data=…"><br>
<details><summary>In alternativa: pagina HTML già salvata</summary><input type="file" id="file" accept=".html,.htm"><p>Il salvataggio HTML può scaricare di nuovo un collegamento già scaduto e ottenere la schermata di login.</p></details>
<button id="login">Prova accesso</button>
</details>
<button id="refresh" disabled>Prova rinnovo</button><small>Il rinnovo è una prova separata: non dimostra una durata di 30 giorni.</small>
<button id="retry" disabled>Ripeti scambio diagnostico</button>
<pre id="result">In attesa del collegamento finale.</pre><script nonce="${csrf}">
const csrf=${JSON.stringify(csrf)};const out=document.getElementById('result');
let busy=false;async function run(path,body){if(busy)return;busy=true;document.getElementById('login').disabled=true;document.getElementById('refresh').disabled=true;out.textContent='Verifica in corso…';try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Probe-CSRF':csrf},body:JSON.stringify(body)});const result=await r.json();out.textContent=JSON.stringify(result,null,2);document.getElementById('refresh').disabled=!result.refreshAvailable;}catch{out.textContent='Verifica interrotta. Nessuna credenziale viene mostrata.';}finally{busy=false;document.getElementById('login').disabled=false;}}
document.getElementById('login').onclick=async()=>{const input=document.getElementById('callback');const callbackUrl=input.value.trim();input.value='';if(callbackUrl){await run('/probe',{callbackUrl});return;}const file=document.getElementById('file').files[0];if(!file){out.textContent='Incolla il collegamento della pagina finale.';return;}if(file.size>${MAX_BYTES}){out.textContent='File troppo grande: scegli il solo HTML.';return;}await run('/probe',{html:await file.text()});};
document.getElementById('refresh').onclick=()=>run('/refresh',{});
document.getElementById('retry').onclick=()=>run('/retry',{});
document.getElementById('copy-code').onclick=async()=>{const input=document.getElementById('bridge-code');try{await navigator.clipboard.writeText(input.value);document.getElementById('copy-code').textContent='Codice copiato';}catch{input.select();out.textContent='Premi Ctrl+C per copiare il codice selezionato.';}};
setInterval(async()=>{if(busy)return;try{const r=await fetch('/result',{cache:'no-store'});const result=await r.json();if(result.state==='waiting')return;out.textContent=JSON.stringify(result,null,2);document.getElementById('refresh').disabled=!result.refreshAvailable;document.getElementById('retry').disabled=!result.retryAvailable;}catch{}},2000);
</script></html>`;
}

export function createProbeServer({ port = 18765, request = fetch, now = Date.now, autoExchange = true } = {}) {
  const csrf = randomBytes(24).toString("hex");
  const host = `127.0.0.1:${port}`;
  const origin = `http://${host}`;
  let session = null;
  let pendingPaToken = null;
  let lastResult = { state: "waiting" };
  let busy = false;
  let bridgeCode = "";
  let bridgeExpiresAt = 0;
  const server = createServer(async (req, res) => {
    const extensionOrigin = /^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin ?? "") ? req.headers.origin : null;
    const bridgeRequest = req.url === "/bridge/probe";
    const send = (status, data, html = false) => {
      res.writeHead(status, { "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${csrf}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
        ...(bridgeRequest && extensionOrigin ? { "Access-Control-Allow-Origin": extensionOrigin, Vary: "Origin" } : {}),
        ...(bridgeRequest && extensionOrigin && req.method === "OPTIONS" ? {
          "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, X-Bridge-Code",
          ...(req.headers["access-control-request-private-network"] === "true" ? { "Access-Control-Allow-Private-Network": "true" } : {}),
        } : {}) });
      res.end(html ? data : JSON.stringify(data));
    };
    if (req.headers.host !== host) return send(403, { error: "Host non consentito." });
    if (req.method === "GET" && req.url === "/") {
      bridgeCode = randomBytes(24).toString("hex");
      bridgeExpiresAt = now() + 5 * 60_000;
      return send(200, page(csrf, bridgeCode), true);
    }
    if (req.method === "GET" && req.url === "/result") return send(200, {
      ...lastResult, ...(lastResult.paTokenMetadata && pendingPaToken ? { paTokenMetadata: tokenMetadata(pendingPaToken, now()) } : {}),
    });
    if (bridgeRequest) {
      if (!extensionOrigin) return send(403, { error: "Origine del collegamento non consentita." });
      if (req.method === "OPTIONS") {
        const headers = String(req.headers["access-control-request-headers"] ?? "").toLowerCase().split(",").map(h => h.trim()).filter(Boolean);
        if (req.headers["access-control-request-method"] !== "POST" || headers.some(h => !["content-type", "x-bridge-code"].includes(h))) return send(403, { error: "Richiesta non consentita." });
        return send(204, "");
      }
      const code = Buffer.from(String(req.headers["x-bridge-code"] ?? ""));
      if (req.method !== "POST" || req.headers["content-type"] !== "application/json" || !bridgeCode ||
          now() >= bridgeExpiresAt || code.length !== bridgeCode.length || !timingSafeEqual(code, Buffer.from(bridgeCode))) {
        return send(403, { error: "Codice assente, scaduto o già utilizzato. Ricarica la prova locale e copia il nuovo codice." });
      }
      if (busy) return send(409, { error: "Verifica già in corso." });
      busy = true;
      bridgeCode = "";
      lastResult = { state: "Verifica dalla pagina aperta in corso" };
      try {
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 64 * 1024) throw new Error("size"); chunks.push(chunk); }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!validPaToken(body.paToken)) throw new Error("invalidToken");
        pendingPaToken = body.paToken;
        session = null;
        lastResult = { source: "pagina aperta nel browser", tokenCaptured: true,
          paTokenMetadata: tokenMetadata(pendingPaToken), state: "Token ricevuto in memoria; scambio API da avviare separatamente.",
          refreshAvailable: false, retryAvailable: true };
        if (autoExchange) {
          const result = await probeLogin(pendingPaToken, request);
          session = result.session;
          lastResult = { source: "pagina aperta nel browser", tokenCaptured: true, ...result.publicResult,
            refreshAvailable: !!session?.refreshToken, retryAvailable: true };
        }
        return send(200, lastResult);
      } catch {
        lastResult = { error: "Collegamento non completato: token non valido, errore di rete o risposta inattesa. Nessuna credenziale viene mostrata." };
        return send(400, lastResult);
      } finally { busy = false; }
    }
    if (req.method !== "POST" || !["/probe", "/refresh", "/retry"].includes(req.url)) return send(404, { error: "Non trovato." });
    const supplied = Buffer.from(String(req.headers["x-probe-csrf"] ?? ""));
    if (req.headers.origin !== origin || req.headers["content-type"] !== "application/json" ||
        supplied.length !== csrf.length || !timingSafeEqual(supplied, Buffer.from(csrf))) return send(403, { error: "Richiesta non consentita." });
    if (busy) return send(409, { error: "Verifica già in corso." });
    busy = true;
    try {
      let bytes = 0; const chunks = [];
      for await (const chunk of req) { bytes += chunk.length; if (bytes > MAX_BYTES * 2) throw new Error("size"); chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      let result;
      if (req.url === "/probe") {
        session = null;
        if (body.callbackUrl) {
          result = await probeCallback(body.callbackUrl, request);
        } else {
          let token;
          try { token = parsePaToken(body.html); } catch { return send(400, { error: "Token mobile non trovato: il file potrebbe contenere la schermata di login anziché il callback." }); }
          result = await probeLogin(token, request);
        }
      } else if (req.url === "/retry") {
        if (!pendingPaToken) return send(400, { error: "Nessun token mobile nella memoria del processo." });
        // Diagnostic only: reload this trusted local module so protocol fixes can
        // be tested without exporting credentials or asking for another transfer.
        const protocol = await import(`${import.meta.url}?diagnostic=${Date.now()}`);
        result = await protocol.probeLogin(pendingPaToken, request);
      } else {
        if (!session?.refreshToken) return send(400, { error: "Rinnovo non disponibile." });
        result = await probeRefresh(session, request);
      }
      session = result.session;
      lastResult = { ...result.publicResult, refreshAvailable: !!session?.refreshToken, retryAvailable: !!pendingPaToken };
      send(200, lastResult);
    } catch (error) {
      // Never log exceptions, raw server messages, HTML, token values or payloads.
      lastResult = { error: Object.hasOwn(INPUT_ERRORS, error?.message) ? INPUT_ERRORS[error.message]
        : "Verifica non completata: pagina non valida, errore di rete o risposta inattesa.",
        ...(error?.message === "callbackUnavailable" && error.diagnostic ? { callback: error.diagnostic } : {}) };
      send(400, lastResult);
    } finally { busy = false; }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.on("close", () => { session = null; pendingPaToken = null; });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createProbeServer();
  server.listen(18765, "127.0.0.1", () => console.log("Prova locale pronta: http://127.0.0.1:18765"));
  server.on("error", () => { console.error("Impossibile avviare la prova locale sulla porta 18765."); process.exitCode = 1; });
}
