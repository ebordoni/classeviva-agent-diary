import type {
  AgendaResponse,
  AssenzeResponse,
  CompitiEstrattiResponse,
  CompitoEstratto,
  LezioniResponse,
  MaterieResponse,
  VotiResponse,
} from "@classeviva/core";
import { AIService, ClassevivaClient } from "@classeviva/core";
import Keyv from "keyv";
import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────
// FileStore: adattatore Keyv puro-JS, persistenza su file JSON.
// Zero dipendenze native — funziona su qualsiasi piattaforma.
// ─────────────────────────────────────────────────────────────────

class FileStore {
  private filename: string;
  private data: Record<string, string> = {};
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(filename: string) {
    this.filename = filename;
    try {
      const raw = fs.readFileSync(filename, "utf-8");
      this.data = JSON.parse(raw) as Record<string, string>;
    } catch {
      // Il file non esiste ancora: si parte vuoti
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      const dir = path.dirname(this.filename);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filename + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.filename);
    }, 300);
  }

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.data[key]);
  }

  set(key: string, value: string): Promise<void> {
    this.data[key] = value;
    this.scheduleFlush();
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    const had = Object.prototype.hasOwnProperty.call(this.data, key);
    if (had) {
      delete this.data[key];
      this.scheduleFlush();
    }
    return Promise.resolve(had);
  }

  /** Cancella tutte le chiavi che iniziano con il prefisso dato. */
  deleteByPrefix(prefix: string): Promise<number> {
    const toDelete = Object.keys(this.data).filter((k) =>
      k.startsWith(prefix),
    );
    for (const k of toDelete) delete this.data[k];
    if (toDelete.length > 0) this.scheduleFlush();
    return Promise.resolve(toDelete.length);
  }

  /**
   * Rimuove le chiavi scadute dal file JSON.
   * Keyv salva ogni entry come {"value":...,"expires":<timestamp ms>}.
   */
  gc(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    for (const [k, v] of Object.entries(this.data)) {
      try {
        const parsed = JSON.parse(v) as { expires?: number };
        if (parsed.expires !== undefined && parsed.expires < now) {
          delete this.data[k];
          removed++;
        }
      } catch {
        // entry non parsabile: lascia stare
      }
    }
    if (removed > 0) this.scheduleFlush();
    return Promise.resolve(removed);
  }

  clear(): Promise<void> {
    this.data = {};
    this.scheduleFlush();
    return Promise.resolve();
  }
}

// TTL in millisecondi
const TTL = {
  lezioni: 6 * 60 * 60 * 1000, // 6 ore
  voti: 12 * 60 * 60 * 1000, // 12 ore
  assenze: 12 * 60 * 60 * 1000, // 12 ore
  agenda: 6 * 60 * 60 * 1000, // 6 ore
  materie: 24 * 60 * 60 * 1000, // 24 ore
  compiti: 12 * 60 * 60 * 1000, // 12 ore
};

const cachePath = process.env.CACHE_DB_PATH ?? "./cache.json";

const fileStore = new FileStore(cachePath);

const store = new Keyv({
  store: fileStore,
  namespace: "classeviva",
});

store.on("error", (err) => console.error("[cache] Errore store:", err));

// GC ogni 2 ore: rimuove le chiavi scadute dal file JSON
setInterval(
  () => {
    fileStore
      .gc()
      .then((n) => {
        if (n > 0) console.log(`[cache] GC: rimosse ${n} chiavi scadute`);
      })
      .catch(() => {});
  },
  2 * 60 * 60 * 1000,
).unref();

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function key(...parts: (string | number)[]): string {
  return parts.join(":");
}

async function getOrFetch<T>(
  cacheKey: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  const cached = await store.get<T>(cacheKey);
  if (cached !== undefined) {
    return { data: cached, fromCache: true };
  }
  const data = await fetcher();
  await store.set(cacheKey, data, ttl);
  return { data, fromCache: false };
}

// ─────────────────────────────────────────────────────────────────
// API cachate
// ─────────────────────────────────────────────────────────────────

export async function getLezioni(
  client: ClassevivaClient,
  inizio: string,
  fine: string,
): Promise<{ data: LezioniResponse; fromCache: boolean }> {
  return getOrFetch(
    key("lezioni", client.datiUtente!.ident, inizio, fine),
    TTL.lezioni,
    () => client.lezioniDaA(inizio, fine),
  );
}

export async function getVoti(
  client: ClassevivaClient,
): Promise<{ data: VotiResponse; fromCache: boolean }> {
  return getOrFetch(key("voti", client.datiUtente!.ident), TTL.voti, () =>
    client.voti(),
  );
}

export async function getAssenze(
  client: ClassevivaClient,
): Promise<{ data: AssenzeResponse; fromCache: boolean }> {
  return getOrFetch(key("assenze", client.datiUtente!.ident), TTL.assenze, () =>
    client.assenze(),
  );
}

export async function getAgenda(
  client: ClassevivaClient,
): Promise<{ data: AgendaResponse; fromCache: boolean }> {
  return getOrFetch(key("agenda", client.datiUtente!.ident), TTL.agenda, () =>
    client.agenda(),
  );
}

export async function getMaterie(
  client: ClassevivaClient,
): Promise<{ data: MaterieResponse; fromCache: boolean }> {
  return getOrFetch(key("materie", client.datiUtente!.ident), TTL.materie, () =>
    client.materie(),
  );
}

export async function getCompiti(
  client: ClassevivaClient,
  inizio: string,
  fine: string,
  ai: AIService,
): Promise<{ data: CompitiEstrattiResponse; fromCache: boolean }> {
  const oggi = new Date().toISOString().split("T")[0];

  // Genera la lista di date nel range [inizio, fine]
  const dates: string[] = [];
  const cur = new Date(inizio + "T00:00:00");
  const end = new Date(fine + "T00:00:00");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // Controlla quali giorni sono già in cache
  const cached = await Promise.all(
    dates.map((d) =>
      store
        .get<CompitiEstrattiResponse>(
          key("compiti_giorno", client.datiUtente!.ident, d),
        )
        .then((v) => ({ date: d, value: v })),
    ),
  );

  const hitDates = cached.filter((c) => c.value !== undefined);
  const missDates = cached
    .filter((c) => c.value === undefined)
    .map((c) => c.date);
  const allFromCache = missDates.length === 0;

  // Mappa per i risultati nuovi (usata nel merge finale)
  const newByDate = new Map<string, CompitiEstrattiResponse>();

  if (missDates.length > 0) {
    const missInizio = missDates[0];
    const missFine = missDates[missDates.length - 1];
    const lezioni = await client.lezioniDaA(missInizio, missFine);

    // ── UNA SOLA chiamata AI per tutti i giorni mancanti ──
    // Evita N chiamate sequenziali che causano timeout a 90s.
    const hasLessons = lezioni.lessons.length > 0;
    const aiResult = hasLessons
      ? await ai.estraiCompiti(lezioni)
      : null;

    // Raggruppa i compiti restituiti per data_lezione
    const compitiByDate = new Map<string, CompitoEstratto[]>();
    for (const c of aiResult?.compiti ?? []) {
      const d = c.data_lezione || missInizio;
      if (!compitiByDate.has(d)) compitiByDate.set(d, []);
      compitiByDate.get(d)!.push(c);
    }

    // Raggruppa le lezioni per data (per i metadata per-giorno)
    const lessonsByDate = new Map<string, number>();
    for (const l of lezioni.lessons) {
      lessonsByDate.set(l.evtDate, (lessonsByDate.get(l.evtDate) ?? 0) + 1);
    }

    // Cacha il risultato per ogni giorno mancante separatamente
    for (const d of missDates) {
      const dayCompiti = compitiByDate.get(d) ?? [];
      const ttl =
        d < oggi ? 30 * 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
      const dayResult: CompitiEstrattiResponse = {
        compiti: dayCompiti,
        metadata: {
          totale_lezioni: lessonsByDate.get(d) ?? 0,
          totale_compiti: dayCompiti.length,
          modello_utilizzato: aiResult?.metadata.modello_utilizzato ?? "",
          timestamp: new Date().toISOString(),
        },
      };
      await store.set(
        key("compiti_giorno", client.datiUtente!.ident, d),
        dayResult,
        ttl,
      );
      newByDate.set(d, dayResult);
    }
  }

  // Merge: cache hit + nuovi
  const allCompiti = [
    ...hitDates.flatMap((c) => c.value!.compiti),
    ...missDates.flatMap((d) => newByDate.get(d)?.compiti ?? []),
  ];

  const merged: CompitiEstrattiResponse = {
    compiti: allCompiti,
    metadata: {
      totale_lezioni: dates.length,
      totale_compiti: allCompiti.length,
      modello_utilizzato:
        newByDate.values().next().value?.metadata.modello_utilizzato ??
        hitDates[0]?.value?.metadata.modello_utilizzato ??
        "",
      timestamp: new Date().toISOString(),
    },
  };

  return { data: merged, fromCache: allFromCache };
}

// ─────────────────────────────────────────────────────────────────
// Stato del flusso di login (persistente, sopravvive ai restart)
// ─────────────────────────────────────────────────────────────────

const LOGIN_TTL = 10 * 60 * 1000; // 10 minuti

interface LoginState {
  step: "awaiting_studentId" | "awaiting_password";
  pendingStudentId?: string;
}

export async function setLoginState(
  chatId: number,
  state: LoginState,
): Promise<void> {
  await store.set(key("login_state", chatId), state, LOGIN_TTL);
}

export async function getLoginState(
  chatId: number,
): Promise<LoginState | undefined> {
  return store.get<LoginState>(key("login_state", chatId));
}

export async function clearLoginState(chatId: number): Promise<void> {
  await store.delete(key("login_state", chatId));
}

// ─────────────────────────────────────────────────────────────────
// Student ID ricordato per chat (nessuna scadenza — rimane finché
// l'utente non fa /logout o sovrascrive con un nuovo login)
// ─────────────────────────────────────────────────────────────────

export async function saveStudentId(
  chatId: number,
  studentId: string,
): Promise<void> {
  // TTL 365 giorni — di fatto permanente per uso pratico
  await store.set(key("saved_student_id", chatId), studentId, 365 * 24 * 60 * 60 * 1000);
}

export async function getSavedStudentId(
  chatId: number,
): Promise<string | undefined> {
  return store.get<string>(key("saved_student_id", chatId));
}

export async function clearSavedStudentId(chatId: number): Promise<void> {
  await store.delete(key("saved_student_id", chatId));
}

// ─────────────────────────────────────────────────────────────────
// Invalidazione manuale (es. dopo /logout o su richiesta utente)
// ─────────────────────────────────────────────────────────────────

export async function invalidateUser(studentId: string): Promise<void> {
  const prefixes = [
    "lezioni",
    "voti",
    "assenze",
    "agenda",
    "materie",
    "compiti_giorno",
  ];
  // Le chiavi nel FileStore hanno il namespace prefissato: "classeviva:<tipo>:<studentId>..."
  // deleteByPrefix cancella tutte le chiavi che iniziano con quel prefisso,
  // incluse quelle con range data (es. lezioni:S123:2026-04-17:2026-04-24).
  await Promise.all(
    prefixes.map((p) =>
      fileStore.deleteByPrefix(`classeviva:${key(p, studentId)}`),
    ),
  );
}
