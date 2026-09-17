import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { normalizeNewsletterJid } from "./newsletter.mjs";

function disconnectCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode;
}

export class BaileysClient {
  constructor({ authDir, onStatusChange = () => {} }) {
    this.authDir = authDir;
    this.onStatusChange = onStatusChange;
    this.isReady = false;
    this.qr = undefined;
    this.status = "stopped";
    this.socket = undefined;
    this.stopped = false;
  }

  setStatus(status) {
    this.status = status;
    this.onStatusChange(this.getStatus());
  }

  getStatus() {
    return { status: this.status, pairingRequired: Boolean(this.qr), qr: this.qr };
  }

  async start() {
    this.stopped = false;
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const socket = makeWASocket({ auth: state, printQRInTerminal: false });
    this.socket = socket;
    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", (update) => {
      if (update.qr) {
        this.qr = update.qr;
        this.setStatus("pairing");
      }
      if (update.connection === "open") {
        this.isReady = true;
        this.qr = undefined;
        this.setStatus("connected");
      }
      if (update.connection === "close") {
        this.isReady = false;
        this.qr = undefined;
        const loggedOut = disconnectCode(update.lastDisconnect) === DisconnectReason.loggedOut;
        this.setStatus(loggedOut ? "logged_out" : "disconnected");
        if (!loggedOut && !this.stopped) {
          setTimeout(() => this.start().catch(() => this.setStatus("disconnected")), 5000).unref();
        }
      }
    });
    this.setStatus("connecting");
  }

  async sendText(channelJid, text) {
    if (!this.isReady || !this.socket) throw new Error("WhatsApp non connesso");
    await this.socket.sendMessage(channelJid, { text });
  }

  async resolveNewsletterJid(inviteCode) {
    if (!this.isReady || !this.socket) throw new Error("WhatsApp non connesso");
    const metadata = await this.socket.newsletterMetadata("invite", inviteCode);
    if (!metadata?.id) throw new Error("Canale WhatsApp non trovato");
    return normalizeNewsletterJid(metadata.id);
  }

  stop() {
    this.stopped = true;
    this.isReady = false;
    this.socket?.end?.();
    this.setStatus("stopped");
  }
}
