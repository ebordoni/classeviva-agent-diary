/** Companion locale: trasferisce il PA solo alla scheda che avvia il collegamento. */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

function page(code, nonce) {
  return `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Collega Classeviva a Home Assistant</title><style>body{font:17px system-ui;max-width:680px;margin:48px auto;padding:0 24px;color:#182e46}button,input{font:inherit;padding:12px;margin:10px 0}button{cursor:pointer}input{max-width:90%}#status{padding:16px;background:#edf3f8;border-radius:8px}li{margin:12px 0}</style>
<h1>Collega Classeviva a Home Assistant</h1><p>Destinazione: <strong id="destination"></strong></p>
<p>Il collegamento invia la credenziale temporanea soltanto alla scheda che hai aperto. PIN e conferme CIE restano sul tuo telefono.</p>
<button id="start" disabled>Conferma e apri Spaggiari</button>
<ol><li>Conferma la destinazione e completa SPID/CIE nella nuova scheda. Seleziona il profilo da collegare.</li>
<li>Quando appare “loading… please wait”, apri l’estensione <strong>ClasseViva — prova login mobile</strong>, incolla il codice e premi <strong>Invia token al test locale</strong>.</li></ol>
<label for="code">Codice da incollare nell’estensione</label><br><input id="code" type="password" value="${code}" readonly><button id="copy">Copia codice</button>
<p id="status" role="status">Apri questa finestra dal pulsante SPID/CIE della UI Home Assistant.</p>
<script nonce="${nonce}">
const code=document.getElementById('code').value;
const params=new URLSearchParams(location.hash.slice(1));
const pairing=params.get('nonce');let target;let confirmed=false;let sent=false;let polling=false;
try{const url=new URL(params.get('origin'));if(['http:','https:'].includes(url.protocol)&&url.origin===params.get('origin')&&!url.username&&!url.password)target=url.origin;}catch{}
const status=document.getElementById('status');const opener=window.opener;
document.getElementById('destination').textContent=target||'non disponibile';
if(opener&&target&&/^[a-f0-9]{64}$/.test(pairing||'')){
document.getElementById('start').disabled=false;status.textContent='Verifica la destinazione, poi conferma per iniziare.';
opener.postMessage({type:'classeviva:spid-ready',nonce:pairing},target);
}
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);document.getElementById('copy').textContent='Codice copiato';}catch{document.getElementById('code').select();status.textContent='Premi Ctrl+C per copiare il codice.';}};
document.getElementById('start').onclick=()=>{
confirmed=true;window.open('https://web.spaggiari.eu/home/app/default/login_spid.php?mob=on','_blank','noopener,noreferrer');
document.getElementById('start').disabled=true;status.textContent='Completa il login, copia il codice e invia il collegamento dall’estensione.';
};
window.addEventListener('message',event=>{if(event.source!==opener||event.origin!==target||event.data?.nonce!==pairing||event.data?.type!=='classeviva:spid-finished')return;
status.textContent=event.data.ok?'Account collegato. Puoi chiudere questa finestra e usare il diario.':'Collegamento non riuscito. Torna alla UI Home Assistant e riprova.';});
setInterval(async()=>{if(!confirmed||sent||polling)return;polling=true;try{
const response=await fetch('/link/result',{headers:{'X-Link-Code':code},cache:'no-store'});
if(!response.ok){sent=true;status.textContent='Collegamento scaduto. Torna alla UI e avvialo nuovamente.';return;}
const data=await response.json();if(!data.paToken)return;
sent=true;status.textContent='Collegamento inviato. Attendi la conferma da Home Assistant.';
opener.postMessage({type:'classeviva:spid-pa',nonce:pairing,paToken:data.paToken},target);data.paToken=null;
await fetch('/link/finish',{method:'POST',headers:{'Content-Type':'application/json','X-Link-Code':code},body:'{}'});
}catch{status.textContent='Programma di collegamento non raggiungibile. Torna alla UI e riprova.';}finally{polling=false;}},500);
</script></html>`;
}

export function createLinkServer({ port = 18765, now = Date.now } = {}) {
  const host = `127.0.0.1:${port}`;
  const entries = new Map();
  const server = createServer(async (req, res) => {
    for (const [key, value] of entries) if (value.expiresAt <= now()) entries.delete(key);
    const extensionOrigin = /^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin ?? "") ? req.headers.origin : null;
    const bridge = req.url === "/bridge/probe";
    const nonce = randomBytes(24).toString("hex");
    const send = (status, data, html = false) => {
      res.writeHead(status, { "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
        "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
        ...(bridge && extensionOrigin ? { "Access-Control-Allow-Origin": extensionOrigin, Vary: "Origin" } : {}),
        ...(bridge && extensionOrigin && req.method === "OPTIONS" ? {
          "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, X-Bridge-Code",
          ...(req.headers["access-control-request-private-network"] === "true" ? { "Access-Control-Allow-Private-Network": "true" } : {}),
        } : {}) });
      res.end(html ? data : JSON.stringify(data));
    };
    if (req.headers.host !== host) return send(403, { error: "Host non consentito." });
    if (req.method === "GET" && (req.url === "/link" || req.url === "/")) {
      if (entries.size >= 16) return send(429, { error: "Troppi collegamenti in corso. Attendi cinque minuti." });
      const code = randomBytes(24).toString("hex");
      entries.set(code, { expiresAt: now() + 5 * 60_000, used: false, paToken: null });
      return send(200, page(code, nonce), true);
    }
    if (bridge) {
      if (!extensionOrigin) return send(403, { error: "Origine non consentita." });
      if (req.method === "OPTIONS") {
        const headers = String(req.headers["access-control-request-headers"] ?? "").toLowerCase().split(",").map(h=>h.trim()).filter(Boolean);
        if (req.headers["access-control-request-method"] !== "POST" || headers.some(h=>!["content-type","x-bridge-code"].includes(h))) return send(403, { error: "Richiesta non consentita." });
        return send(204, "");
      }
      const entry = entries.get(req.headers["x-bridge-code"]);
      if (req.method !== "POST" || req.headers["content-type"] !== "application/json" || !entry || entry.used) {
        return send(403, { error: "Codice scaduto o già utilizzato. Avvia un nuovo collegamento dalla UI." });
      }
      entry.used = true;
      try {
        let size = 0; const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > 64 * 1024) throw Error(); chunks.push(chunk); }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (typeof body.paToken !== "string" || !body.paToken || body.paToken.length > 32768 || /^(?:\[redacted\]|<redacted>|\*+)$/i.test(body.paToken)) throw Error();
        entry.paToken = body.paToken;
        return send(200, { tokenCaptured: true, state: "Ricevuto. Attendi la conferma nella UI Home Assistant." });
      } catch { return send(400, { error: "Collegamento non completato. Ripeti dalla UI Home Assistant." }); }
    }
    const code = req.headers["x-link-code"];
    const entry = entries.get(code);
    if (!entry) return send(403, { error: "Collegamento scaduto." });
    if (req.method === "GET" && req.url === "/link/result") return send(200, { paToken: entry.paToken });
    if (req.method === "POST" && req.url === "/link/finish" && req.headers["content-type"] === "application/json") {
      entries.delete(code); return send(200, { success: true });
    }
    return send(404, { error: "Non trovato." });
  });
  const cleanup = setInterval(() => { for (const [key, value] of entries) if (value.expiresAt <= now()) entries.delete(key); }, 30_000);
  cleanup.unref();
  server.on("close", () => { entries.clear(); clearInterval(cleanup); });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createLinkServer();
  server.listen(18765, "127.0.0.1", () => console.log("Collegamento Home Assistant pronto su http://127.0.0.1:18765"));
  server.on("error", () => { console.error("Porta 18765 occupata: chiudi la prova precedente e riprova."); process.exitCode = 1; });
}
