// Fixture manuale: nessun token reale, tutte le risposte Spaggiari sono simulate.
// UI_APP_ROOT deve puntare a hassio-addon/classeviva-ui/src, già compilato.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createLinkServer } from "../../scripts/link-home-assistant.mjs";

const root = process.env.UI_APP_ROOT;
if (!root) throw new Error("UI_APP_ROOT richiesto");
const require = createRequire(path.join(root, "package.json"));
const axios = await import(pathToFileURL(path.join(path.dirname(require.resolve("axios/package.json")), "index.js")).href);
const directory = await mkdtemp(path.join(tmpdir(), "classeviva-browser-test-"));
process.env.ACCOUNTS_PATH = path.join(directory, "accounts.json");
process.env.CACHE_DB_PATH = path.join(directory, "cache_ui.json");
process.env.UI_DIST_PATH = path.join(root, "packages/ui/dist");
process.env.PORT = "18772";
axios.default.defaults.adapter = async config => ({ config, status: 200, statusText: "OK",
  headers: axios.AxiosHeaders.from({ "z-spid-rauth": "TEST_ONLY_REFRESH" }), data:
  config.url.startsWith("/auth/") ? { ident: "G1234567A", token: "TEST_ONLY_ACCESS", expire: new Date(Date.now() + 3600_000).toISOString() } :
  config.url.endsWith("/card") ? { card: { ident: "G1234567A", usrId: 1234567, usrType: "G", firstName: "Studente", lastName: "di prova" } } :
  { subjects: [{ id: 1, description: "Italiano", order: 1, teachers: [] }], events: [], lessons: [], periods: [] } });
await import(pathToFileURL(path.join(root, "packages/server/dist/index.js")).href);
let code;
const helper = createLinkServer();
helper.prependListener("request", (req, res) => {
  if (req.url !== "/link") return;
  const end = res.end.bind(res);
  res.end = (body, ...rest) => {
    code = /id="code" type="password" value="([a-f0-9]{48})"/.exec(String(body))?.[1];
    return end(body, ...rest);
  };
});
helper.listen(18765, "127.0.0.1");
createServer(async (req, res) => {
  if (req.url === "/capture" && req.method === "POST") {
    const result = await fetch("http://127.0.0.1:18765/bridge/probe", { method: "POST",
      headers: { Origin: `chrome-extension://${"a".repeat(32)}`, "Content-Type": "application/json", "X-Bridge-Code": code ?? "" },
      body: JSON.stringify({ paToken: "TEST_ONLY_PA" }) });
    res.writeHead(result.status, { "Content-Type": "application/json" }); return res.end(await result.text());
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="it"><title>Prova UI Ingress — dati simulati</title>
    <style>body{margin:0;font:14px system-ui;background:#eee}header{padding:12px}iframe{border:0;width:100%;height:calc(100vh - 60px)}</style>
    <header>Prova Ingress · dati simulati <button onclick="fetch('/capture',{method:'POST'}).then(r=>r.json()).then(d=>document.getElementById('result').textContent=d.tokenCaptured?'Inviata credenziale di prova':'Avvia prima il collegamento')">Simula credenziale di prova</button> <span id="result"></span></header>
    <iframe title="Classeviva UI" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" src="http://127.0.0.1:18772/"></iframe></html>`);
}).listen(18773, "127.0.0.1", () => console.log("Fixture pronta: http://127.0.0.1:18773 (solo dati simulati)"));
