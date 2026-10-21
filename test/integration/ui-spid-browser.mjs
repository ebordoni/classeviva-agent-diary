// Fixture manuale: nessun token reale, tutte le risposte Spaggiari sono simulate.
// UI_APP_ROOT deve puntare a hassio-addon/classeviva-ui/src, già compilato.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.UI_APP_ROOT;
if (!root) throw new Error("UI_APP_ROOT richiesto");
const require = createRequire(path.join(root, "package.json"));
const axios = await import(pathToFileURL(path.join(path.dirname(require.resolve("axios/package.json")), "index.js")).href);
const directory = await mkdtemp(path.join(tmpdir(), "classeviva-browser-test-"));
process.env.ACCOUNTS_PATH = path.join(directory, "accounts.json");
process.env.CACHE_DB_PATH = path.join(directory, "cache_ui.json");
process.env.UI_DIST_PATH = path.join(directory, "ui");
await cp(path.join(root, 'packages/ui/dist'), process.env.UI_DIST_PATH, { recursive: true });
if (process.env.REAL_EXTENSION !== '1') {
  const index = path.join(process.env.UI_DIST_PATH, 'index.html');
  await writeFile(index, (await readFile(index, 'utf8')).replace('</head>', '<script src="./test-extension.js"></script></head>'));
  await writeFile(path.join(process.env.UI_DIST_PATH, 'test-extension.js'), `
    let pending;
    const channel='classeviva-extension-v2';
    const post=data=>window.postMessage({channel,direction:'extension',...data},location.origin);
    window.addEventListener('message',event=>{
      const data=event.data;
      if(event.source===window.parent&&event.origin==='http://127.0.0.1:18773'&&data?.type==='complete-test-login'&&pending){
        post({type:'token',nonce:pending.nonce,paToken:'TEST_ONLY_PA'});return;
      }
      if(event.source!==window||event.origin!==location.origin||data?.channel!==channel||data.direction!=='ui')return;
      if(data.type==='discover')post({type:'ready',requestId:data.requestId});
      if(data.type==='start'){pending=data;post({type:'started',nonce:data.nonce});}
      if(data.type==='cancel'||data.type==='finished')pending=null;
    });
  `);
}
process.env.PORT = "18772";
axios.default.defaults.adapter = async config => ({ config, status: 200, statusText: "OK",
  headers: axios.AxiosHeaders.from({ "z-spid-rauth": "TEST_ONLY_REFRESH" }), data:
  config.url.startsWith("/auth/") ? { ident: "G1234567A", token: "TEST_ONLY_ACCESS", expire: new Date(Date.now() + 3600_000).toISOString() } :
  config.url.endsWith("/card") ? { card: { ident: "G1234567A", usrId: 1234567, usrType: "G", firstName: "Studente", lastName: "di prova" } } :
  { subjects: [{ id: 1, description: "Italiano", order: 1, teachers: [] }], events: [], lessons: [], periods: [] } });
await import(pathToFileURL(path.join(root, "packages/server/dist/index.js")).href);
createServer(async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="it"><title>Prova UI Ingress — dati simulati</title>
    <style>body{margin:0;font:14px system-ui;background:#eee}header{padding:12px}iframe{border:0;width:100%;height:calc(100vh - 60px)}</style>
    <header>Prova Ingress · dati ed estensione simulati <button onclick="document.querySelector('iframe').contentWindow.postMessage({type:'complete-test-login'},'http://127.0.0.1:18772')">Completa accesso di prova</button></header>
    <iframe title="Classeviva UI" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" src="http://127.0.0.1:18772/"></iframe></html>`);
}).listen(18773, "127.0.0.1", () => console.log("Fixture pronta: http://127.0.0.1:18773 (solo dati simulati)"));
