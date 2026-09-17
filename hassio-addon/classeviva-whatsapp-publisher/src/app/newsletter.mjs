const CHANNEL_URL_HOSTS = new Set(["whatsapp.com", "www.whatsapp.com"]);

export function inviteCodeFromChannelUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Il link del Canale WhatsApp non è valido");
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (
    url.protocol !== "https:" ||
    !CHANNEL_URL_HOSTS.has(url.hostname) ||
    segments.length !== 2 ||
    segments[0] !== "channel" ||
    !/^[A-Za-z0-9]+$/.test(segments[1])
  ) {
    throw new Error("Il link deve avere il formato https://whatsapp.com/channel/<codice>");
  }
  return segments[1];
}

export function normalizeNewsletterJid(value) {
  const jid = value.endsWith("@newsletter") ? value : `${value}@newsletter`;
  if (!/^\d+@newsletter$/.test(jid)) {
    throw new Error("Il JID del Canale WhatsApp non è valido");
  }
  return jid;
}
