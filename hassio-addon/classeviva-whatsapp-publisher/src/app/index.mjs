import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { BaileysClient } from "./baileysClient.mjs";
import { loadConfig } from "./config.mjs";
import { Publisher } from "./publisher.mjs";
import { createPublisherServer } from "./server.mjs";
import { JobStore } from "./store.mjs";

const config = loadConfig();
await Promise.all([mkdir(config.authDir, { recursive: true }), mkdir(dirname(config.databasePath), { recursive: true })]);

const store = new JobStore(config.databasePath);
let publisher;
const client = new BaileysClient({
  authDir: config.authDir,
  onStatusChange: ({ status }) => {
    console.log(`[classeviva-whatsapp-publisher] Stato WhatsApp: ${status}`);
    if (status === "connected") void resolveConfiguredChannel();
  },
});
publisher = new Publisher({ config, store, client });
const server = createPublisherServer({ config, store, publisher, client });

async function resolveConfiguredChannel() {
  if (config.channelJid) {
    publisher.setChannelJid(config.channelJid);
  } else if (config.channelInviteCode) {
    try {
      const channelJid = await client.resolveNewsletterJid(config.channelInviteCode);
      publisher.setChannelJid(channelJid);
      console.log("[classeviva-whatsapp-publisher] Canale WhatsApp risolto");
    } catch {
      console.error("[classeviva-whatsapp-publisher] Impossibile risolvere il Canale WhatsApp");
      return;
    }
  }
  await publisher.drain();
}

server.listen(config.port, () => {
  console.log(`[classeviva-whatsapp-publisher] In ascolto sulla porta ${config.port}`);
});

if (config.channelJid || config.channelInviteCode) {
  client.start().catch(() => console.error("[classeviva-whatsapp-publisher] Connessione WhatsApp non disponibile"));
}

setInterval(() => void publisher.drain(), 15_000).unref();

function shutdown() {
  client.stop();
  server.close(() => store.close());
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
