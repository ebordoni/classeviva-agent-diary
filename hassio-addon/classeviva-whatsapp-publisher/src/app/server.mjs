import { createServer } from "node:http";
import QRCode from "qrcode";
import { verifySignedRequest } from "./auth.mjs";

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

async function pairingPage(client, enabled) {
  const { status, pairingRequired, qr } = client.getStatus();
  const qrImage = pairingRequired ? await QRCode.toDataURL(qr, { margin: 2, width: 320 }) : undefined;
  const content = qrImage
    ? `<p>Apri WhatsApp sul numero dedicato, quindi Dispositivi collegati e scansiona questo codice.</p><img src="${qrImage}" alt="Codice QR di pairing WhatsApp">`
    : "<p>Il QR compare qui solo quando il pairing è richiesto.</p>";
  return `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WhatsApp Bot</title><style>body{font-family:system-ui;margin:2rem;max-width:40rem}img{max-width:100%;height:auto}</style><h1>WhatsApp Bot</h1><p>Stato: <strong>${escapeHtml(status)}</strong></p><p>Pubblicazione automatica: <strong>${enabled ? "abilitata" : "disabilitata"}</strong></p>${content}</html>`;
}

export function createPublisherServer({ config, store, publisher, client }) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (request.method === "GET" && (pathname === "/" || pathname.endsWith("/"))) {
      const html = await pairingPage(client, config.enabled);
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
      });
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
