import axios, { AxiosError, AxiosInstance } from "axios";
import type {
  AgendaResponse,
  AssenzeResponse,
  Auth4Response,
  BachecaResponse,
  CardResponse,
  ClassevivaConfig,
  CompitiResponse,
  ContenutoItem,
  DidatticaResponse,
  ElementiDidatticaResponse,
  FunctionsResponse,
  LezioniResponse,
  LibrettoWebConf,
  MaterieResponse,
  NoteResponse,
  PeriodiResponse,
  VotiResponse,
  WhoAmI,
} from "../types/index.js";
import {
  NonAccesso,
  PasswordNonValida,
  sollevaErroreHTTP,
} from "../utils/exceptions.js";
import {
  AUTH_URL,
  BASE_URL_W1,
  TEMPO_CONNESSIONE,
  dataFineAnno,
  dataInizioAnno,
  toRestDate,
  validaDate,
} from "../utils/helpers.js";

export class ClassevivaClient {
  private userId: string;
  private password?: string;
  private auth4Data?: Auth4Response;
  private whoAmIData?: WhoAmI;
  private numericStudentId?: string;
  private sessionCookie?: string;
  private axiosInstance: AxiosInstance;
  private loginTimestamp?: number;

  constructor(userId: string, password?: string, config?: ClassevivaConfig) {
    this.userId = userId;
    this.password = password;

    this.axiosInstance = axios.create({
      baseURL: config?.baseUrl ?? BASE_URL_W1,
      timeout: config?.timeout ?? 30000,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data;
          let message: string;
          if (typeof data === "string" && data.length > 0) {
            message = data;
          } else if (data && typeof data === "object") {
            const d = data as Record<string, unknown>;
            message =
              (d["message"] as string) ||
              (d["error"] as string) ||
              JSON.stringify(data);
          } else {
            message = `Errore HTTP ${error.response.status}`;
          }
          try {
            sollevaErroreHTTP(error.response.status, message);
          } catch (customError: unknown) {
            const e = customError as Error & Record<string, unknown>;
            e["config"] = error.config;
            e["response"] = error.response;
            throw e;
          }
        }
        throw error;
      },
    );
  }

  // ============================================================================
  // AUTH
  // Login tramite AuthApi4.php (endpoint del vecchio portale PHP),
  // ottiene il PHPSESSID che autentica le chiamate w1.
  // ============================================================================

  async accedi(password?: string): Promise<void> {
    const pwd = password ?? this.password;
    if (!pwd) throw new PasswordNonValida();

    const formData = new URLSearchParams({
      cid: "",
      uid: this.userId,
      pwd,
      pin: "",
      target: "",
    });

    const loginResponse = await axios.post<Auth4Response>(
      AUTH_URL,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0",
          Accept: "*/*",
          Referer: "https://web.spaggiari.eu/home/app/default/login.php",
          Origin: "https://web.spaggiari.eu",
        },
      },
    );

    const data = loginResponse.data;

    // Verifica che il login sia avvenuto con successo
    if (!data.data?.auth?.loggedIn) {
      const errors =
        data.data?.auth?.errors?.join(", ") ?? "Credenziali non valide";
      throw new PasswordNonValida(errors);
    }

    this.auth4Data = data;

    // Estrai il PHPSESSID dalla risposta
    const setCookieHeader = (
      loginResponse.headers as Record<string, string | string[] | undefined>
    )["set-cookie"];
    let phpsessid: string | undefined;
    if (typeof setCookieHeader === "string") {
      phpsessid = setCookieHeader.match(/PHPSESSID=([^;]+)/)?.[1];
    } else if (Array.isArray(setCookieHeader)) {
      for (const c of setCookieHeader) {
        const m = c.match(/PHPSESSID=([^;]+)/);
        if (m) {
          phpsessid = m[1];
          break;
        }
      }
    }

    if (!phpsessid) {
      throw new NonAccesso("PHPSESSID non ricevuto dopo il login");
    }

    this.sessionCookie = `PHPSESSID=${phpsessid}`;
    this.axiosInstance.defaults.headers.common["Cookie"] = this.sessionCookie;

    // ID numerico studente dall'auth response
    const accountInfo = data.data?.auth?.accountInfo;
    if (accountInfo?.id) {
      this.numericStudentId = String(accountInfo.id);
    }

    // Carica whoami
    this.whoAmIData = (
      await this.axiosInstance.get<WhoAmI>("/misc/whoami")
    ).data;

    if (this.whoAmIData.id) {
      this.numericStudentId = this.whoAmIData.id;
    }

    this.loginTimestamp = Date.now();
    this.password = pwd;
  }

  get connesso(): boolean {
    if (!this.sessionCookie || !this.loginTimestamp) return false;
    return (Date.now() - this.loginTimestamp) / 1000 < TEMPO_CONNESSIONE;
  }

  private verificaConnessione(): void {
    if (!this.connesso) throw new NonAccesso();
  }

  private get sid(): string {
    return this.numericStudentId ?? this.userId;
  }

  // ============================================================================
  // DATI UTENTE
  // ============================================================================

  get datiUtente(): WhoAmI | undefined {
    return this.whoAmIData;
  }

  get nome(): string | undefined {
    return (
      this.whoAmIData?.nome ?? this.auth4Data?.data?.auth?.accountInfo?.nome
    );
  }

  get cognome(): string | undefined {
    return (
      this.whoAmIData?.cognome ??
      this.auth4Data?.data?.auth?.accountInfo?.cognome
    );
  }

  get nomeCompleto(): string | undefined {
    const n = this.nome;
    const c = this.cognome;
    if (!n && !c) return this.userId;
    return `${n} ${c}`.trim();
  }

  async card(): Promise<CardResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<CardResponse>(
      `/students/${this.sid}/card`,
    );
    return r.data;
  }

  async functions(): Promise<FunctionsResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<FunctionsResponse>(
      `/students/${this.sid}/_functions`,
    );
    return r.data;
  }

  // ============================================================================
  // PERIODI
  // ============================================================================

  async periodi(): Promise<PeriodiResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<PeriodiResponse>(
      `/students/${this.sid}/periods`,
    );
    return r.data;
  }

  // ============================================================================
  // MATERIE
  // ============================================================================

  async materie(): Promise<MaterieResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<MaterieResponse>(
      `/students/${this.sid}/subjects`,
    );
    return r.data;
  }

  // ============================================================================
  // VOTI — endpoint rinominato: grades → grades26
  // ============================================================================

  async voti(): Promise<VotiResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<VotiResponse>(
      `/students/${this.sid}/grades26`,
    );
    return r.data;
  }

  // ============================================================================
  // ASSENZE — risposta cambiata: "absences" → "events"
  // ============================================================================

  async assenze(): Promise<AssenzeResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<AssenzeResponse>(
      `/students/${this.sid}/absences/details/`,
    );
    return r.data;
  }

  async assenzeDa(dataInizio: string): Promise<AssenzeResponse> {
    const tutto = await this.assenze();
    return { events: tutto.events.filter((a) => a.evtDate >= dataInizio) };
  }

  async assenzeDaA(
    dataInizio: string,
    dataFine: string,
  ): Promise<AssenzeResponse> {
    const tutto = await this.assenze();
    return {
      events: tutto.events.filter(
        (a) => a.evtDate >= dataInizio && a.evtDate <= dataFine,
      ),
    };
  }

  async librettoWebConf(): Promise<LibrettoWebConf> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<LibrettoWebConf>(
      `/students/${this.sid}/absences/librettowebconf`,
    );
    return r.data;
  }

  // ============================================================================
  // LEZIONI — stessa struttura v1, range date in YYYYMMDD
  // ============================================================================

  async lezioniDaA(inizio: string, fine: string): Promise<LezioniResponse> {
    this.verificaConnessione();
    validaDate(inizio, fine);
    const r = await this.axiosInstance.get<LezioniResponse>(
      `/students/${this.sid}/lessons/${toRestDate(inizio)}/${toRestDate(fine)}`,
    );
    return r.data;
  }

  async lezioniGiorno(data: string): Promise<LezioniResponse> {
    return this.lezioniDaA(data, data);
  }

  async lezioniDaAMateria(
    inizio: string,
    fine: string,
    materiaId: number,
  ): Promise<LezioniResponse> {
    const risposta = await this.lezioniDaA(inizio, fine);
    return {
      lessons: risposta.lessons.filter((l) => l.subjectId === materiaId),
    };
  }

  async lezioniAnnoCorrente(): Promise<LezioniResponse> {
    return this.lezioniDaA(dataInizioAnno(), dataFineAnno());
  }

  // ============================================================================
  // AGENDA — endpoint rinominato: agenda → agendav2
  // ============================================================================

  async agendaDaA(inizio: string, fine: string): Promise<AgendaResponse> {
    this.verificaConnessione();
    validaDate(inizio, fine);
    const r = await this.axiosInstance.get<AgendaResponse>(
      `/students/${this.sid}/agendav2/all/${toRestDate(inizio)}/${toRestDate(fine)}`,
    );
    return r.data;
  }

  async agenda(): Promise<AgendaResponse> {
    const oggi = new Date();
    const lunedi = new Date(oggi);
    lunedi.setDate(
      oggi.getDate() - oggi.getDay() + (oggi.getDay() === 0 ? -6 : 1),
    );
    const domenica = new Date(lunedi);
    domenica.setDate(lunedi.getDate() + 6);
    return this.agendaDaA(
      lunedi.toISOString().slice(0, 10),
      domenica.toISOString().slice(0, 10),
    );
  }

  // ============================================================================
  // COMPITI — nuovo endpoint dedicato (non esisteva in v1)
  // ============================================================================

  async compiti(): Promise<CompitiResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<CompitiResponse>(
      `/students/${this.sid}/homeworks/index`,
    );
    return r.data;
  }

  // ============================================================================
  // NOTE DISCIPLINARI — risposta cambiata: array → { NTTE, NTCL, NTWN, NTST }
  // ============================================================================

  async note(): Promise<NoteResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<NoteResponse>(
      `/students/${this.sid}/notes/all/`,
    );
    return r.data;
  }

  async leggiNota(eventCode: string, evtId: number): Promise<void> {
    this.verificaConnessione();
    await this.axiosInstance.post(
      `/students/${this.sid}/notes/${eventCode}/${evtId}/read`,
    );
  }

  async bacheca(): Promise<BachecaResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<BachecaResponse>(
      `/students/${this.sid}/noticeboard`,
    );
    return r.data;
  }

  async bachecaLeggi(eventCode: string, pubId: number): Promise<ContenutoItem> {
    this.verificaConnessione();
    const r = await this.axiosInstance.post<{ item: ContenutoItem }>(
      `/students/${this.sid}/noticeboard/${eventCode}/${pubId}/read/`,
    );
    return r.data.item;
  }

  async didattica(): Promise<DidatticaResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<DidatticaResponse>(
      `/students/${this.sid}/didactics`,
    );
    return r.data;
  }

  async didatticaElemento(
    folderId: number,
  ): Promise<ElementiDidatticaResponse> {
    this.verificaConnessione();
    const r = await this.axiosInstance.get<ElementiDidatticaResponse>(
      `/students/${this.sid}/didactics/${folderId}`,
    );
    return r.data;
  }
}
