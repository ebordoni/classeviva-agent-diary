import { type ClassevivaClient, headersV1 } from "@classeviva/core";
import axios from "axios";

const FIELDS = new Set("cards card students student users user profiles profile accounts account ident usrId usrType firstName lastName school schCode schName data status token tokenAP expire release login auth portfolio items id name description links linkedUsers children parents schId error info message".split(" "));

/** No response values, identifiers, names or credentials leave this diagnostic. */
function shape(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) return { type: "array", count: value.length,
    ...(value.length && depth < 4 ? { item: shape(value[0], depth + 1) } : {}) };
  if (typeof value !== "object") return typeof value;
  if (depth >= 4) return "object";
  const entries = Object.entries(value);
  return { fields: Object.fromEntries(entries.filter(([key]) => FIELDS.has(key)).map(([key, entry]) => [key, shape(entry, depth + 1)])),
    otherFieldCount: entries.filter(([key]) => !FIELDS.has(key)).length };
}

function identities(value: unknown, found = new Set<string>(), depth = 0): Set<string> {
  if (depth > 5 || !value || typeof value !== "object") return found;
  if (!Array.isArray(value)) {
    const ident = (value as Record<string, unknown>).ident;
    if (typeof ident === "string" && /^[GSX]\d+[A-Z]?$/i.test(ident)) found.add(ident.toUpperCase());
  }
  for (const child of Object.values(value).slice(0, 100)) identities(child, found, depth + 1);
  return found;
}

export async function probeSpidProfiles(client: ClassevivaClient, savedIds: string[]) {
  // Let the production client renew and persist its session before taking a snapshot.
  await client.card();
  const session = client.esportaSessioneSpid();
  if (!session) throw new Error("SPID_SESSION_REQUIRED");
  const match = /^[GS](\d+)[A-Z]?$/i.exec(session.ident);
  if (!match) throw new Error("SPID_SESSION_REQUIRED");
  const http = axios.create({ baseURL: "https://web.spaggiari.eu/rest/v1", timeout: 15_000,
    maxRedirects: 0, maxContentLength: 512 * 1024,
    headers: { ...headersV1, "Z-Auth-Token": session.accessToken }, validateStatus: () => true });
  const read = async (path: string) => {
    try {
      const response = await http.get<unknown>(path);
      return { httpStatus: response.status, data: response.status === 200 ? response.data : undefined };
    } catch (error) {
      return { httpStatus: axios.isAxiosError(error) ? error.response?.status ?? null : null, data: undefined };
    }
  };
  const known = [...new Set(savedIds.map(id => id.toUpperCase()))];
  const cards = await read(`/students/${match[1]}/cards`);
  const returned = identities(cards.data);
  const others = known.filter(id => id !== session.ident.toUpperCase() && /^[GSX]\d+[A-Z]?$/i.test(id)).slice(0, 5);
  const existingProfiles = [];
  for (const [index, ident] of others.entries()) {
    const numeric = /^[GSX](\d+)[A-Z]?$/i.exec(ident)![1];
    const response = await read(`/students/${numeric}/card`);
    existingProfiles.push({ profile: index + 1, httpStatus: response.httpStatus,
      identityMatches: identities(response.data).has(ident) });
  }
  return { sessionAvailable: true, savedAccountCount: known.length,
    cards: { httpStatus: cards.httpStatus, schema: shape(cards.data),
      returnedProfileCount: returned.size, savedProfilesMatched: known.filter(id => returned.has(id)).length },
    existingProfiles, additionalSavedProfilesSkipped: Math.max(0, known.filter(id => id !== session.ident.toUpperCase()).length - others.length) };
}
