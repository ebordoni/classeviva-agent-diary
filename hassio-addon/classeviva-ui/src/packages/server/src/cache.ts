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
// FileStore: adattatore Keyv puro-JS, persistenza su file JSON
// ─────────────────────────────────────────────────────────────────

class FileStore {
  private filename: string;
  private data: Record<string, string> = {};
  private pendingWrites: Record<string, string> = {};
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMtime: number = 0;

  constructor(filename: string) {
    this.filename = filename;
    try {
      const stat = fs.statSync(filename);
      this.lastMtime = stat.mtimeMs;
      const raw = fs.readFileSync(filename, "utf-8");
      this.data = JSON.parse(raw) as Record<string, string>;
    } catch {
      // Il file non esiste ancora: si parte vuoti
    }
  }

  private syncIfStale() {
    try {
      const stat = fs.statSync(this.filename);
      if (stat.mtimeMs === this.lastMtime) return;
      const raw = fs.readFileSync(this.filename, "utf-8");
      const fresh = JSON.parse(raw) as Record<string, string>;
      this.data = { ...fresh, ...this.pendingWrites };
      this.lastMtime = stat.mtimeMs;
    } catch {
      // file non ancora esistente o non leggibile
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        const stat = fs.statSync(this.filename);
        if (stat.mtimeMs !== this.lastMtime) {
          const raw = fs.readFileSync(this.filename, "utf-8");
          const fresh = JSON.parse(raw) as Record<string, string>;
          this.data = { ...fresh, ...this.pendingWrites };
          this.lastMtime = stat.mtimeMs;
        }
      } catch {
        /* file non ancora esistente */
      }
      const dir = path.dirname(this.filename);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filename + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.filename);
      try {
        this.lastMtime = fs.statSync(this.filename).mtimeMs;
      } catch {}
      this.pendingWrites = {};
    }, 300);
  }

  get(key: string): Promise<string | undefined> {
    this.syncIfStale();
    return Promise.resolve(this.data[key]);
  }

  set(key: string, value: string): Promise<void> {
    this.syncIfStale();
    this.data[key] = value;
    this.pendingWrites[key] = value;
    this.scheduleFlush();
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    this.syncIfStale();
    const had = Object.prototype.hasOwnProperty.call(this.data, key);
    if (had) {
      delete this.data[key];
      delete this.pendingWrites[key];
      this.scheduleFlush();
    }
    return Promise.resolve(had);
  }

  deleteByPrefix(prefix: string): Promise<number> {
    this.syncIfStale();
    const toDelete = Object.keys(this.data).filter((k) => k.startsWith(prefix));
    for (const k of toDelete) {
      delete this.data[k];
      delete this.pendingWrites[k];
    }
    if (toDelete.length > 0) this.scheduleFlush();
    return Promise.resolve(toDelete.length);
  }

  gc(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    for (const [k, v] of Object.entries(this.data)) {
      try {
        const parsed = JSON.parse(v) as { expires?: number };
        if (parsed.expires !== undefined && parsed.expires < now) {
          delete this.data[k];
          delete this.pendingWrites[k];
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
    this.pendingWrites = {};
    this.scheduleFlush();
    return Promise.resolve();
  }
}

const TTL = {
  lezioni: 6 * 60 * 60 * 1000,
  voti: 12 * 60 * 60 * 1000,
  assenze: 12 * 60 * 60 * 1000,
  agenda: 6 * 60 * 60 * 1000,
  materie: 24 * 60 * 60 * 1000,
};

const cachePath = process.env.CACHE_DB_PATH ?? "./cache_ui.json";

export const fileStore = new FileStore(cachePath);

const store = new Keyv({
  store: fileStore,
  namespace: "classeviva",
});

store.on("error", (err) => console.error("[cache] Errore store:", err));

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

export async function getLezioni(
  client: ClassevivaClient,
  inizio: string,
  fine: string,
): Promise<{ data: LezioniResponse; fromCache: boolean }> {
  return getOrFetch(
    key("lezioni", client.datiUtente!.id, inizio, fine),
    TTL.lezioni,
    () => client.lezioniDaA(inizio, fine),
  );
}

export async function getVoti(
  client: ClassevivaClient,
): Promise<{ data: VotiResponse; fromCache: boolean }> {
  return getOrFetch(key("voti", client.datiUtente!.id), TTL.voti, () =>
    client.voti(),
  );
}

export async function getAssenze(
  client: ClassevivaClient,
): Promise<{ data: AssenzeResponse; fromCache: boolean }> {
  return getOrFetch(key("assenze", client.datiUtente!.id), TTL.assenze, () =>
    client.assenze(),
  );
}

export async function getAgenda(
  client: ClassevivaClient,
  inizio: string,
  fine: string,
): Promise<{ data: AgendaResponse; fromCache: boolean }> {
  return getOrFetch(
    key("agenda", client.datiUtente!.id, inizio, fine),
    TTL.agenda,
    () => client.agendaDaA(inizio, fine),
  );
}

export async function getMaterie(
  client: ClassevivaClient,
): Promise<{ data: MaterieResponse; fromCache: boolean }> {
  return getOrFetch(key("materie", client.datiUtente!.id), TTL.materie, () =>
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

  const dates: string[] = [];
  const cur = new Date(inizio + "T00:00:00");
  const end = new Date(fine + "T00:00:00");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  const cached = await Promise.all(
    dates.map((d) =>
      store
        .get<CompitiEstrattiResponse>(
          key("compiti_giorno", client.datiUtente!.id, d),
        )
        .then((v) => ({ date: d, value: v })),
    ),
  );

  const hitDates = cached.filter((c) => c.value !== undefined);
  const missDates = cached
    .filter((c) => c.value === undefined)
    .map((c) => c.date);
  const allFromCache = missDates.length === 0;

  const newByDate = new Map<string, CompitiEstrattiResponse>();

  if (missDates.length > 0) {
    const missInizio = missDates[0];
    const missFine = missDates[missDates.length - 1];
    const lezioni = await client.lezioniDaA(missInizio!, missFine!);

    const hasLessons = lezioni.lessons.length > 0;
    const aiResult = hasLessons ? await ai.estraiCompiti(lezioni) : null;

    const compitiByDate = new Map<string, CompitoEstratto[]>();
    for (const c of aiResult?.compiti ?? []) {
      const d = c.data_lezione || missInizio!;
      if (!compitiByDate.has(d)) compitiByDate.set(d, []);
      compitiByDate.get(d)!.push(c);
    }

    const lessonsByDate = new Map<string, number>();
    for (const l of lezioni.lessons) {
      lessonsByDate.set(l.evtDate, (lessonsByDate.get(l.evtDate) ?? 0) + 1);
    }

    for (const d of missDates) {
      const dayCompiti = compitiByDate.get(d) ?? [];
      const ttl = d! < oggi! ? 30 * 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
      const dayResult: CompitiEstrattiResponse = {
        compiti: dayCompiti,
        metadata: {
          totale_lezioni: lessonsByDate.get(d!) ?? 0,
          totale_compiti: dayCompiti.length,
          modello_utilizzato: aiResult?.metadata.modello_utilizzato ?? "",
          timestamp: new Date().toISOString(),
        },
      };
      await store.set(
        key("compiti_giorno", client.datiUtente!.id, d!),
        dayResult,
        ttl,
      );
      newByDate.set(d!, dayResult);
    }
  }

  const allCompiti = [
    ...hitDates.flatMap((c) => c.value!.compiti),
    ...missDates.flatMap((d) => newByDate.get(d!)?.compiti ?? []),
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
// Student ID ricordato (per pre-compilare il form di login)
// ─────────────────────────────────────────────────────────────────

export async function saveStudentId(studentId: string): Promise<void> {
  await store.set("saved_student_id", studentId, 365 * 24 * 60 * 60 * 1000);
}

export async function getSavedStudentId(): Promise<string | undefined> {
  return store.get<string>("saved_student_id");
}

export async function clearSavedStudentId(): Promise<void> {
  await store.delete("saved_student_id");
}

// ─────────────────────────────────────────────────────────────────
// Invalidazione manuale (es. dopo logout o su richiesta utente)
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
  await Promise.all(
    prefixes.map((p) =>
      fileStore.deleteByPrefix(`classeviva:${key(p, studentId)}`),
    ),
  );
}
