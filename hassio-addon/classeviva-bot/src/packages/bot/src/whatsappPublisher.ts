import { createHash, createHmac } from "node:crypto";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_LENGTH = 3_800;

export interface WhatsAppPublisherOptions {
  endpoint: string;
  secret: string;
}

export interface WhatsAppDigestPart {
  id: string;
  text: string;
}

export function splitWhatsAppDigest(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_MESSAGE_LENGTH) {
    const boundary = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    const index = boundary > 0 ? boundary : MAX_MESSAGE_LENGTH;
    parts.push(remaining.slice(0, index).trimEnd());
    remaining = remaining.slice(index).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

export function createWhatsAppDigestParts({
  studentId,
  date,
  text,
}: {
  studentId: string;
  date: string;
  text: string;
}): WhatsAppDigestPart[] {
  return splitWhatsAppDigest(text).map((part, index) => {
    const hash = createHash("sha256").update(part).digest("hex").slice(0, 16);
    return {
      id: `digest:${studentId}:${date}:${index + 1}:${hash}`,
      text: part,
    };
  });
}

function validOptions(env: NodeJS.ProcessEnv): WhatsAppPublisherOptions | undefined {
  if (env.WHATSAPP_DIGEST_ENABLED !== "true") return undefined;

  const endpoint = env.WHATSAPP_PUBLISHER_URL?.trim();
  const secret = env.WHATSAPP_SHARED_SECRET ?? "";
  if (!endpoint || secret.length < 32) {
    console.error(
      "[whatsapp] Digest disabilitato: configura URL e segreto di almeno 32 caratteri.",
    );
    return undefined;
  }

  try {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
      throw new Error("URL non valido");
    }
  } catch {
    console.error("[whatsapp] Digest disabilitato: URL del publisher non valido.");
    return undefined;
  }

  return { endpoint, secret };
}

export class WhatsAppPublisher {
  constructor(private readonly options: WhatsAppPublisherOptions) {}

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): WhatsAppPublisher | undefined {
    const options = validOptions(env);
    return options ? new WhatsAppPublisher(options) : undefined;
  }

  async publish(part: WhatsAppDigestPart): Promise<void> {
    const body = JSON.stringify(part);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", this.options.secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Publisher-Timestamp": timestamp,
        "X-Publisher-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Publisher ha risposto ${response.status}`);
    }
  }
}
