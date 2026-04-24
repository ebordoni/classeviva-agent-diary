import type {
  AgendaResponse,
  AssenzeResponse,
  CompitiEstrattiResponse,
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
  return getOrFetch(
    key("compiti", client.datiUtente!.ident, inizio, fine),
    TTL.compiti,
    async () => {
      const lezioni = await client.lezioniDaA(inizio, fine);
      return ai.estraiCompiti(lezioni);
    },
  );
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
// Invalidazione manuale (es. dopo /logout o su richiesta utente)
// ─────────────────────────────────────────────────────────────────

export async function invalidateUser(studentId: string): Promise<void> {
  const prefixes = [
    "lezioni",
    "voti",
    "assenze",
    "agenda",
    "materie",
    "compiti",
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
