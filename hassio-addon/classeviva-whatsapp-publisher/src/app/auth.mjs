import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function createSignature(secret, timestamp, body) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verifySignedRequest({ secret, timestamp, signature, body, now = Date.now() }) {
  const parsedTimestamp = Number.parseInt(timestamp, 10);
  if (!Number.isSafeInteger(parsedTimestamp) || Math.abs(now - parsedTimestamp) > MAX_CLOCK_SKEW_MS) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/i.test(signature ?? "")) return false;

  const expected = Buffer.from(createSignature(secret, timestamp, body), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 200);
}
