import { createServer } from "node:http";
import QRCode from "qrcode";
import { verifySignedRequest } from "./auth.mjs";
import { inviteCodeFromChannelUrl } from "./newsletter.mjs";

const MAX_BODY_BYTES = 8 * 1024;

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return entities[character];
  });
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Corpo richiesta troppo grande");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validJob(job) {
  return (
    job &&
    typeof job.id === "string" &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(job.id) &&
    typeof job.text === "string" &&
    job.text.trim().length > 0 &&
    job.text.length <= 4096
  );
}

async function pairingPage(client, publisher, config) {
  const { status, pairingRequired, qr } = client.getStatus();
  const qrImage = pairingRequired ? await QRCode.toDataURL(qr, { margin: 2, width: 320 }) : undefined;
  const content = qrImage
    ? `<p>Apri WhatsApp sul numero dedicato, quindi Dispositivi collegati e scansiona questo codice.</p><img src="${qrImage}" alt="Codice QR di pairing WhatsApp">`
    : "<p>Il QR compare qui solo quando il pairing è richiesto.</p>";
  const channel = publisher.channelJid ?? "non ancora risolto";
  const configuredUrl = escapeHtml(config.channelUrl ?? "");
  return `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WhatsApp Bot</title><style>body{font-family:system-ui;margin:2rem;max-width:40rem}img{max-width:100%;height:auto}input,button{font:inherit;padding:.55rem;margin:.25rem 0;width:100%;box-sizing:border-box}button{cursor:pointer}#result{min-height:1.4rem}</style><h1>WhatsApp Bot</h1><p>Stato: <strong>${escapeHtml(status)}</strong></p><p>Pubblicazione automatica: <strong>${config.enabled ? "abilitata" : "disabilitata"}</strong></p><p>JID attivo: <code>${escapeHtml(channel)}</code></p>${content}<hr><h2>Verifica link Canale</h2><p>Incolla il link pubblico del Canale. La verifica non salva né modifica la configurazione.</p><form id="channel-form"><input id="channel-url" type="url" required placeholder="https://whatsapp.com/channel/..." value="${configuredUrl}"><button>Ricava JID</button></form><p id="result" aria-live="polite"></p><script>const form=document.getElementById('channel-form');const input=document.getElementById('channel-url');const result=document.getElementById('result');form.addEventListener('submit',async(event)=>{event.preventDefault();result.textContent='Verifica in corso…';try{const response=await fetch('api/channel/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channelUrl:input.value})});const data=await response.json();result.textContent=response.ok?'JID: '+data.channelJid:data.error}catch{result.textContent='Verifica non riuscita'}});</script></html>`;
}

export function createPublisherServer({ config, store, publisher, client }) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (request.method === "GET" && (pathname === "/" || pathname.endsWith("/"))) {
      const html = await pairingPage(client, publisher, config);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "SAMEORIGIN",
      });
      response.end(html);
      return;
    }

    if (request.method === "GET" && pathname.endsWith("/api/status")) {
      const status = client.getStatus();
      sendJson(response, 200, {
        enabled: config.enabled,
        status: status.status,
        pairingRequired: status.pairingRequired,
        channelJid: publisher.channelJid,
      });
      return;
    }

    if (request.method === "POST" && pathname.endsWith("/api/channel/resolve")) {
      try {
        const body = JSON.parse(await readBody(request));
        const inviteCode = inviteCodeFromChannelUrl(body.channelUrl);
        if (!client.isReady) {
          sendJson(response, 409, { error: "Collega prima WhatsApp tramite il QR" });
          return;
        }
        const channelJid = await client.resolveNewsletterJid(inviteCode);
        sendJson(response, 200, { channelJid });
      } catch (error) {
        const status = error instanceof SyntaxError ? 400 : 422;
        sendJson(response, status, { error: "Link del Canale non valido o non risolvibile" });
      }
      return;
    }

    if (request.method !== "POST" || !pathname.endsWith("/api/jobs")) {
      sendJson(response, 404, { error: "Non trovato" });
      return;
    }
    if (!config.enabled) {
      sendJson(response, 503, { error: "Pubblicazione disabilitata" });
      return;
    }

    try {
      const body = await readBody(request);
      if (
        !verifySignedRequest({
          secret: config.sharedSecret,
          timestamp: request.headers["x-publisher-timestamp"],
          signature: request.headers["x-publisher-signature"],
          body,
        })
      ) {
        sendJson(response, 401, { error: "Firma non valida" });
        return;
      }
      const job = JSON.parse(body);
      if (!validJob(job)) {
        sendJson(response, 400, { error: "Messaggio non valido" });
        return;
      }
      const result = store.enqueue({ id: job.id, text: job.text.trim() });
      if (result.conflict) {
        sendJson(response, 409, { error: "ID già usato con un contenuto diverso" });
        return;
      }
      void publisher.drain();
      sendJson(response, result.created ? 202 : 200, {
        id: job.id,
        status: result.job.status,
        duplicate: !result.created,
      });
    } catch (error) {
      const status =
        error instanceof SyntaxError ? 400 : error instanceof Error && error.message === "Corpo richiesta troppo grande" ? 413 : 500;
      sendJson(response, status, { error: "Richiesta non elaborabile" });
    }
  });
}
