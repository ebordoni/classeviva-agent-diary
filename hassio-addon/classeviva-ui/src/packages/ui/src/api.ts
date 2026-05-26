// Wrapper fetch con gestione errori uniforme

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Errore HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────

export interface MeResponse {
  authenticated: boolean;
  savedStudentId?: string | null;
  user?: { nome: string; ident: string };
}

export const authApi = {
  me: () => apiFetch<MeResponse>("/api/auth/me"),
  login: (studentId: string, password: string) =>
    apiFetch<{ success: boolean; user: { nome: string; ident: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ studentId, password }) },
    ),
  logout: () =>
    apiFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
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
    return apiFetch<LezioniResponse>(`/api/lezioni?${qs}`);
  },
};

export const votiApi = {
  get: () => apiFetch<VotiResponse>("/api/voti"),
};

export const assenzeApi = {
  get: () => apiFetch<AssenzeResponse>("/api/assenze"),
};

export const agendaApi = {
  get: (params: { inizio?: string; fine?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.inizio) qs.set("inizio", params.inizio);
    if (params.fine) qs.set("fine", params.fine);
    return apiFetch<AgendaResponse>(`/api/agenda?${qs}`);
  },
};

export const materieApi = {
  get: () => apiFetch<MaterieResponse>("/api/materie"),
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
    apiFetch<CompitiResponse>("/api/compiti", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

export const noteApi = {
  get: () => apiFetch<NoteResponse>("/api/note"),
  leggi: (eventCode: string, evtId: number) =>
    apiFetch<{ success: boolean }>(`/api/note/${eventCode}/${evtId}/leggi`, {
      method: "POST",
    }),
};

export const bachecaApi = {
  get: () => apiFetch<BachecaResponse>("/api/bacheca"),
  leggi: (eventCode: string, pubId: number) =>
    apiFetch<unknown>(`/api/bacheca/${eventCode}/${pubId}/leggi`, {
      method: "POST",
    }),
};

export const didatticaApi = {
  get: () => apiFetch<DidatticaResponse>("/api/didattica"),
  getFolder: (folderId: number) =>
    apiFetch<ElementiDidatticaResponse>(`/api/didattica/${folderId}`),
};

export const cacheApi = {
  invalida: () =>
    apiFetch<{ success: boolean }>("/api/cache/invalida", { method: "POST" }),
};
