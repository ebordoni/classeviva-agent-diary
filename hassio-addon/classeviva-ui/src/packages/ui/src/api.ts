// Base path per HA Ingress: in produzione pathname = "api/hassio_ingress/TOKEN/"
// in dev = "/". Usato per costruire URL API relativi al path corrente.
const BASE_PATH = window.location.pathname.endsWith("/")
  ? window.location.pathname
  : window.location.pathname + "/";

// Wrapper fetch con gestione errori uniforme

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = BASE_PATH + path;
  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 401 && !path.startsWith("api/auth/")) {
      window.dispatchEvent(new CustomEvent("classeviva:login-required", { detail: body.error }));
    }
    throw new Error(body.error ?? `Errore HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────

export interface AccountInfo {
  studentId: string;
  nome?: string;
  authType?: "password" | "spid";
  needsLogin?: boolean;
}

export interface MeResponse {
  authenticated: boolean;
  accounts?: AccountInfo[];
  user?: { nome: string; ident: string; authType?: "password" | "spid" };
}

export const authApi = {
  startSpid: () => apiFetch<{ nonce: string; expiresAt: number }>("api/auth/spid/start", {
    method: "POST", headers: { "X-Classeviva-Request": "1" }, body: "{}",
  }),
  completeSpid: (nonce: string, paToken: string) => apiFetch<{ success: boolean }>("api/auth/spid/complete", {
    method: "POST", headers: { "X-Classeviva-Request": "1" }, body: JSON.stringify({ nonce, paToken }),
  }),
  cancelSpid: () => apiFetch("api/auth/spid/cancel", {
    method: "POST", headers: { "X-Classeviva-Request": "1" }, body: "{}",
  }),
  me: () => apiFetch<MeResponse>("api/auth/me"),
  login: (studentId: string, password: string) =>
    apiFetch<{ success: boolean; user: { nome: string; ident: string } }>(
      "api/auth/login",
      { method: "POST", body: JSON.stringify({ studentId, password }) },
    ),
  logout: () =>
    apiFetch<{ success: boolean }>("api/auth/logout", { method: "POST" }),
};

// ─── Dati ────────────────────────────────────────────────────────

import type {
  AgendaResponse,
  AssenzeResponse,
  BachecaResponse,
  CompitiResponse,
  DidatticaResponse,
  ElementiDidatticaResponse,
  LezioniResponse,
  MaterieResponse,
  NoteResponse,
  VotiResponse,
} from "./types.ts";

export const lezioniApi = {
  get: (params: { inizio?: string; fine?: string; giorni?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.inizio) qs.set("inizio", params.inizio);
    if (params.fine) qs.set("fine", params.fine);
    if (params.giorni) qs.set("giorni", String(params.giorni));
    return apiFetch<LezioniResponse>(`api/lezioni?${qs}`);
  },
};

export const votiApi = {
  get: () => apiFetch<VotiResponse>("api/voti"),
};

export const assenzeApi = {
  get: () => apiFetch<AssenzeResponse>("api/assenze"),
};

export const agendaApi = {
  get: (params: { inizio?: string; fine?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.inizio) qs.set("inizio", params.inizio);
    if (params.fine) qs.set("fine", params.fine);
    return apiFetch<AgendaResponse>(`api/agenda?${qs}`);
  },
};

export const materieApi = {
  get: () => apiFetch<MaterieResponse>("api/materie"),
};

export const compitiApi = {
  get: (params: {
    inizio?: string;
    fine?: string;
    giorni?: number;
    provider?: string;
    apiKey?: string;
    model?: string;
  }) =>
    apiFetch<CompitiResponse>("api/compiti", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  getCached: (giorni = 7) =>
    apiFetch<CompitiResponse>(`api/compiti?giorni=${giorni}`),
};

export const compitiCachedQueryKey = (giorni: number) =>
  ["compiti-cached", giorni] as const;

export const noteApi = {
  get: () => apiFetch<NoteResponse>("api/note"),
  leggi: (eventCode: string, evtId: number) =>
    apiFetch<{ success: boolean }>(`api/note/${eventCode}/${evtId}/leggi`, {
      method: "POST",
    }),
};

export const bachecaApi = {
  get: () => apiFetch<BachecaResponse>("api/bacheca"),
  leggi: (eventCode: string, pubId: number) =>
    apiFetch<unknown>(`api/bacheca/${eventCode}/${pubId}/leggi`, {
      method: "POST",
    }),
};

export const didatticaApi = {
  get: () => apiFetch<DidatticaResponse>("api/didattica"),
  getFolder: (folderId: number) =>
    apiFetch<ElementiDidatticaResponse>(`api/didattica/${folderId}`),
};

export const cacheApi = {
  invalida: () =>
    apiFetch<{ success: boolean }>("api/cache/invalida", { method: "POST" }),
};

// ─── Accounts ────────────────────────────────────────────────────

export const accountsApi = {
  list: () => apiFetch<{ accounts: AccountInfo[] }>("api/accounts"),
  remove: (studentId: string) =>
    apiFetch<{ success: boolean }>(`api/accounts/${studentId}`, {
      method: "DELETE",
    }),
  switch: (studentId: string) =>
    apiFetch<{ success: boolean; user: { nome: string; ident: string } }>(
      `api/accounts/switch/${studentId}`,
      { method: "POST" },
    ),
};
