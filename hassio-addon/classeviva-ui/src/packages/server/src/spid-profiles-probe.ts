import { type ClassevivaClient, headersV1 } from "@classeviva/core";
import axios from "axios";

const FIELDS = new Set("cards card students student users user profiles profile accounts account ident usrId usrType firstName lastName school schCode schName data status token tokenAP expire release login auth portfolio items id name description links linkedUsers children parents schId error info message personalInfo schoolYY schoolYear uid cid authToken accessToken miurSchoolCode miurDivisionCode birthDate fiscalCode schDedication schCity schProv".split(" "));

/** No response values, identifiers, names or credentials leave this diagnostic. */
function shape(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) return { type: "array", count: value.length,
    ...(value.length && depth < 6 ? { item: shape(value[0], depth + 1) } : {}) };
  if (typeof value !== "object") return typeof value;
  if (depth >= 6) return "object";
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
  const fetchPath = async (path: string) => {
    try {
      const response = await http.get<unknown>(path);
      return { httpStatus: response.status, data: response.status === 200 ? response.data : undefined };
    } catch (error) {
      return { httpStatus: axios.isAxiosError(error) ? error.response?.status ?? null : null, data: undefined };
    }
  };
  const reads = new Map<string, ReturnType<typeof fetchPath>>();
  const read = (path: string) => {
    if (!reads.has(path)) reads.set(path, fetchPath(path));
    return reads.get(path)!;
  };
  const known = [...new Set(savedIds.map(id => id.toUpperCase()))];
  const cards = await read(`/students/${match[1]}/cards`);
  const portfolioRequest = read("/xauth/myportfolio");
  const returned = identities(cards.data);
  const others = known.filter(id => id !== session.ident.toUpperCase() && /^[GSX]\d+[A-Z]?$/i.test(id)).slice(0, 5);
  const existingProfiles = await Promise.all(others.map(async (ident, index) => {
    const numeric = /^[GSX](\d+)[A-Z]?$/i.exec(ident)![1];
    const response = await read(`/students/${numeric}/card`);
    return { profile: index + 1, httpStatus: response.httpStatus,
      identityMatches: identities(response.data).has(ident) };
  }));
  const allCards = cards.data && typeof cards.data === "object" && "cards" in cards.data && Array.isArray(cards.data.cards) ? cards.data.cards : [];
  const cardList = allCards.slice(0, 2);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Every candidate is supplied by the authenticated /cards response, never by
  // the browser. Test both documented numeric fields without assuming equality.
  const profileReads = (await Promise.all(cardList.map(async (value, index) => {
    if (!value || typeof value !== "object") return null;
    const entry = value as Record<string, unknown>;
    const ident = typeof entry.ident === "string" ? entry.ident.toUpperCase() : "";
    const numeric = /^[GSX](\d+)[A-Z]?$/i.exec(ident)?.[1];
    if (!numeric) return null;
    const usrId = typeof entry.usrId === "number" && Number.isSafeInteger(entry.usrId) && entry.usrId > 0 ? String(entry.usrId) : undefined;
    const candidateIds = [...new Set([numeric, ...(usrId ? [usrId] : [])])];
    const routes = await Promise.all(candidateIds.map(async candidate => {
      const [card, subjects, lessons] = await Promise.all([
        read(`/students/${candidate}/card`), read(`/students/${candidate}/subjects`),
        read(`/students/${candidate}/lessons/${today}/${today}`),
      ]);
      const subjectsData = subjects.data as { subjects?: unknown } | undefined;
      const lessonsData = lessons.data as { lessons?: unknown } | undefined;
      return { idSource: candidate === numeric ? (usrId === numeric ? "ident-and-usrId" : "ident") : "usrId",
        card: { httpStatus: card.httpStatus, identityMatches: identities(card.data).has(ident) },
        subjects: { httpStatus: subjects.httpStatus, readable: Array.isArray(subjectsData?.subjects),
          ...(Array.isArray(subjectsData?.subjects) ? { count: subjectsData.subjects.length } : {}) },
        lessons: { httpStatus: lessons.httpStatus, readable: Array.isArray(lessonsData?.lessons),
          ...(Array.isArray(lessonsData?.lessons) ? { count: lessonsData.lessons.length } : {}) } };
    }));
    return { profile: index + 1, active: ident === session.ident.toUpperCase(),
      saved: known.includes(ident), usrIdMatchesIdent: usrId ? usrId === numeric : null, routes };
  }))).filter(value => value !== null);
  const portfolio = await portfolioRequest;
  return { sessionAvailable: true, savedAccountCount: known.length,
    cards: { httpStatus: cards.httpStatus, schema: shape(cards.data),
      returnedProfileCount: returned.size, savedProfilesMatched: known.filter(id => returned.has(id)).length },
    portfolio: { httpStatus: portfolio.httpStatus, schema: shape(portfolio.data) }, profileReads,
    returnedProfilesSkipped: Math.max(0, allCards.length - profileReads.length),
    existingProfiles, additionalSavedProfilesSkipped: Math.max(0, known.filter(id => id !== session.ident.toUpperCase()).length - others.length) };
}
