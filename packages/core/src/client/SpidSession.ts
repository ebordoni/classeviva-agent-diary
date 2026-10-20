import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type { ClassevivaConfig, SessioneSpid } from "../types/index.js";
import { AccessoSpidRichiesto, ErroreHTTP, FormatoNonValido } from "../utils/exceptions.js";
import { headersV1 } from "../utils/helpers.js";

const BASE_URL = "https://web.spaggiari.eu/rest/v1";
const REFRESH_MARGIN = 30_000;

function validSecret(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 32_768 &&
    !/^(?:\[redacted\]|<redacted>|\*+)$/i.test(value);
}

export function studentIdFromIdent(ident: string): string {
  const match = /^[GS](\d+)[A-Z]?$/i.exec(ident);
  if (!match) throw new FormatoNonValido("Il profilo SPID/CIE deve essere un genitore o uno studente.");
  return match[1];
}

function jwtExpiry(token: string): number | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return undefined;
    const exp: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).exp;
    if (typeof exp === "number" && Number.isFinite(exp)) return exp * 1000;
  } catch { /* Solo un controllo preliminare; la firma è verificata dal server. */ }
  return undefined;
}

function safeError(error: unknown): ErroreHTTP {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  // Non propagare AxiosError: config, request e response possono contenere token.
  return new ErroreHTTP(status ?? 503, "Richiesta mobile ClasseViva non completata. Riprova.");
}

/** Stato privato anche a runtime: JSON.stringify/inspect non esportano i token. */
export class SpidSession {
  #session: SessioneSpid;
  #http: AxiosInstance;
  #invalid = false;
  #refreshing?: Promise<string>;

  private constructor(session: SessioneSpid, http: AxiosInstance) {
    this.#session = { version: 1, ident: session.ident, paToken: session.paToken,
      accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt };
    this.#http = http;
  }

  private static transport(config?: ClassevivaConfig): AxiosInstance {
    return axios.create({ baseURL: BASE_URL, timeout: config?.timeout ?? 30_000,
      headers: headersV1, maxRedirects: 0 });
  }

  static async login(paToken: string, config?: ClassevivaConfig): Promise<SpidSession> {
    if (!validSecret(paToken)) throw new FormatoNonValido("Token iniziale SPID/CIE non valido.");
    const expiry = jwtExpiry(paToken);
    if (expiry !== undefined && expiry <= Date.now()) throw new AccessoSpidRichiesto();
    const http = this.transport(config);
    let response: AxiosResponse;
    try {
      response = await http.post("/auth/spidlogin", { pa: paToken, rf: null });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 400 || status === 401 || status === 403 || status === 422) throw new AccessoSpidRichiesto();
      throw safeError(error);
    }
    const refreshToken: unknown = response.headers["z-spid-rauth"];
    if (!validSecret(refreshToken)) throw new ErroreHTTP(502, "Credenziale di rinnovo SPID/CIE assente nella risposta.");
    const session = await this.parseResponse(http, response, { paToken, refreshToken });
    return new SpidSession(session, http);
  }

  static restore(session: SessioneSpid, config?: ClassevivaConfig): SpidSession {
    if (!session || session.version !== 1 || !validSecret(session.paToken) ||
        !validSecret(session.accessToken) || !validSecret(session.refreshToken) ||
        !Number.isFinite(session.expiresAt) || session.expiresAt <= 0 || typeof session.ident !== "string") {
      throw new FormatoNonValido("Sessione SPID/CIE non valida.");
    }
    studentIdFromIdent(session.ident);
    return new SpidSession(session, this.transport(config));
  }

  private static async parseResponse(http: AxiosInstance, response: AxiosResponse,
    previous: Pick<SessioneSpid, "paToken" | "refreshToken"> & Partial<SessioneSpid>): Promise<SessioneSpid> {
    const data: unknown = response.data;
    if (!data || typeof data !== "object") throw new ErroreHTTP(502, "Risposta mobile non valida.");
    const auth = data as Record<string, unknown>;
    if (!validSecret(auth.token) || typeof auth.ident !== "string") throw new ErroreHTTP(502, "Risposta mobile non valida.");
    studentIdFromIdent(auth.ident);
    if (previous.ident && auth.ident !== previous.ident) throw new AccessoSpidRichiesto();
    // Accettare solo date con timezone esplicito, per non dipendere dal fuso del server HA.
    let expiresAt = typeof auth.expire === "string" && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(auth.expire)
      ? Date.parse(auth.expire) : NaN;
    if (!Number.isFinite(expiresAt)) {
      let status: AxiosResponse;
      try { status = await http.get("/auth/status", { headers: { "Z-Auth-Token": auth.token } }); }
      catch (error) { throw safeError(error); }
      const remains: unknown = status.data?.status?.remains;
      if (typeof remains !== "number" || !Number.isFinite(remains) || remains <= 0) {
        throw new ErroreHTTP(502, "Scadenza della sessione mobile non valida.");
      }
      expiresAt = Date.now() + remains * 1000;
    }
    if (expiresAt <= Date.now()) throw new ErroreHTTP(502, "Il server ha restituito una sessione mobile già scaduta.");
    const rotated: unknown = response.headers["z-spid-rauth"];
    return { version: 1, ident: auth.ident, paToken: previous.paToken, accessToken: auth.token,
      refreshToken: validSecret(rotated) ? rotated : previous.refreshToken, expiresAt };
  }

  get ident(): string { return this.#session.ident; }

  get connected(): boolean {
    if (this.#invalid) return false;
    if (this.#session.expiresAt > Date.now()) return true;
    const expiry = jwtExpiry(this.#session.refreshToken);
    return expiry === undefined || expiry > Date.now();
  }

  export(): SessioneSpid | undefined {
    return this.#invalid ? undefined : { ...this.#session };
  }

  renew(): Promise<string> {
    if (this.#invalid) return Promise.reject(new AccessoSpidRichiesto());
    if (this.#refreshing) return this.#refreshing;
    this.#refreshing = this.refresh().finally(() => { this.#refreshing = undefined; });
    return this.#refreshing;
  }

  private async refresh(): Promise<string> {
    const expiry = jwtExpiry(this.#session.refreshToken);
    if (expiry !== undefined && expiry <= Date.now()) {
      this.#invalid = true;
      throw new AccessoSpidRichiesto();
    }
    let response: AxiosResponse;
    try {
      // Un vecchio Z-Auth-Token fa rifiutare il rinnovo anche con RF valido.
      response = await this.#http.post("/auth/spidrf", { pa: this.#session.paToken, rf: this.#session.refreshToken });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403 || status === 422) {
        this.#invalid = true;
        throw new AccessoSpidRichiesto();
      }
      throw safeError(error);
    }
    try { this.#session = await SpidSession.parseResponse(this.#http, response, this.#session); }
    catch (error) {
      if (error instanceof AccessoSpidRichiesto) this.#invalid = true;
      throw error;
    }
    return this.#session.accessToken;
  }

  async get<T>(path: string): Promise<AxiosResponse<T>> {
    if (this.#invalid) throw new AccessoSpidRichiesto();
    let token = this.#session.expiresAt > Date.now() + REFRESH_MARGIN ? this.#session.accessToken : await this.renew();
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await this.#http.get<T>(path, { headers: { "Z-Auth-Token": token } }); }
      catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status !== 401) throw safeError(error);
        if (attempt === 1) {
          this.#invalid = true;
          throw new AccessoSpidRichiesto();
        }
        // Un'altra lettura può aver già completato il rinnovo di questo token.
        token = this.#session.accessToken !== token ? this.#session.accessToken : await this.renew();
      }
    }
    throw new AccessoSpidRichiesto();
  }
}
