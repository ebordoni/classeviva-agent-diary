/**
 * ClassevivaClient - Client TypeScript per l'API Classeviva
 */

import axios, { AxiosError, AxiosInstance } from "axios";
import type {
  AgendaResponse,
  AssenzeResponse,
  AuthResponse,
  BachecaResponse,
  ClassevivaConfig,
  ContenutoItem,
  DidatticaResponse,
  DocumentiResponse,
  ElementiDidatticaResponse,
  LezioniResponse,
  MaterieResponse,
  NoteResponse,
  PeriodiResponse,
  UserData,
  VotiResponse,
} from "../types/index.js";
import { Collegamenti } from "../utils/endpoints.js";
import {
  NonAccesso,
  PasswordNonValida,
  sollevaErroreHTTP,
} from "../utils/exceptions.js";
import {
  intestazione,
  TEMPO_CONNESSIONE,
  validaDate,
} from "../utils/helpers.js";

export class ClassevivaClient {
  private studentId: string;
  private password?: string;
  private authData?: AuthResponse;
  private axiosInstance: AxiosInstance;
  private loginTimestamp?: number;

  constructor(studentId: string, password?: string, config?: ClassevivaConfig) {
    this.studentId = studentId;
    this.password = password;

    // Configura axios
    this.axiosInstance = axios.create({
      baseURL: config?.baseUrl || "https://web.spaggiari.eu/rest/v1",
      timeout: config?.timeout || 30000,
      headers: intestazione,
    });

    // Interceptor per gestire errori
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
              (d["descrizione"] as string) ||
              JSON.stringify(data);
          } else {
            message = `Errore HTTP ${error.response.status}`;
          }
          try {
            sollevaErroreHTTP(error.response.status, message);
          } catch (customError: any) {
            // Preserva le info di debug dell'errore Axios originale
            customError.config = error.config;
            customError.response = error.response;
            customError.code = error.code;
            throw customError;
          }
        }
        throw error;
      },
    );
  }

  /**
   * Effettua il login tramite REST API
   */
  async accedi(password?: string): Promise<void> {
    const pwd = password || this.password;
    if (!pwd) throw new PasswordNonValida("Password non fornita");

    const loginResponse = await axios.post<AuthResponse>(
      Collegamenti.AUTH,
      JSON.stringify({ uid: this.studentId, pass: pwd, ident: null }),
      { headers: intestazione },
    );

    const data = loginResponse.data;
    this.authData = data;

    // Imposta il token di autenticazione per tutte le richieste successive
    this.axiosInstance.defaults.headers.common["Z-Auth-Token"] = data.token;

    // Per account G (genitori) gli endpoint studente usano l'ID numerico
    const numericId = data.ident.replace(/\D/g, "");
    if (data.ident !== numericId) {
      this.studentId = numericId;
    }

    this.loginTimestamp = Date.now();
    this.password = pwd;
  }

  /**
   * Verifica se l'utente è connesso
   */
  get connesso(): boolean {
    if (!this.authData || !this.loginTimestamp) {
      return false;
    }

    const elapsed = (Date.now() - this.loginTimestamp) / 1000;
    return elapsed < TEMPO_CONNESSIONE;
  }

  /**
   * Verifica connessione e solleva errore se non connesso
   */
  private verificaConnessione(): void {
    if (!this.connesso) {
      throw new NonAccesso("Utente non connesso. Effettuare il login prima.");
    }
  }

  /**
   * Ottiene i dati utente
   */
  get datiUtente(): UserData | undefined {
    if (!this.authData) {
      return undefined;
    }

    return {
      ident: this.authData.ident,
      firstName: this.authData.firstName,
      lastName: this.authData.lastName,
      token: this.authData.token,
    };
  }

  get nome(): string | undefined {
    return this.authData?.firstName;
  }

  get cognome(): string | undefined {
    return this.authData?.lastName;
  }

  get nomeCompleto(): string | undefined {
    if (!this.authData) return undefined;
    const nome = this.authData.firstName;
    const cognome = this.authData.lastName;
    if (!nome && !cognome) return this.studentId;
    return `${nome} ${cognome}`.trim();
  }

  // ============================================================================
  // LEZIONI
  // ============================================================================

  /**
   * Ottiene le lezioni di oggi
   */
  async lezioni(): Promise<LezioniResponse> {
    this.verificaConnessione();

    const url = Collegamenti.getLessonsUrl(this.studentId);
    const response = await this.axiosInstance.get<LezioniResponse>(url);
    return response.data;
  }

  /**
   * Ottiene le lezioni di un giorno specifico
   */
  async lezioniGiorno(data: string): Promise<LezioniResponse> {
    this.verificaConnessione();

    const url = Collegamenti.getLessonsUrl(this.studentId, data);
    const response = await this.axiosInstance.get<LezioniResponse>(url);
    return response.data;
  }

  /**
   * Ottiene le lezioni in un intervallo di date
   */
  async lezioniDaA(
    dataInizio: string,
    dataFine: string,
  ): Promise<LezioniResponse> {
    this.verificaConnessione();
    validaDate(dataInizio, dataFine);

    const url = Collegamenti.getLessonsUrl(
      this.studentId,
      undefined,
      dataInizio,
      dataFine,
    );
    const response = await this.axiosInstance.get<LezioniResponse>(url);
    return response.data;
  }

  /**
   * Ottiene le lezioni per una materia specifica
   */
  async lezioniDaAMateria(
    dataInizio: string,
    dataFine: string,
    materiaId: number,
  ): Promise<LezioniResponse> {
    this.verificaConnessione();
    validaDate(dataInizio, dataFine);

    const url = Collegamenti.getLessonsUrl(
      this.studentId,
      undefined,
      dataInizio,
      dataFine,
      materiaId,
    );
    const response = await this.axiosInstance.get<LezioniResponse>(url);
    return response.data;
  }

  // ============================================================================
  // VOTI
  // ============================================================================

  /**
   * Ottiene tutti i voti
   */
  async voti(): Promise<VotiResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.GRADES, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<VotiResponse>(url);
    return response.data;
  }

  // ============================================================================
  // ASSENZE
  // ============================================================================

  /**
   * Ottiene tutte le assenze
   */
  async assenze(): Promise<AssenzeResponse> {
    this.verificaConnessione();

    const url = Collegamenti.getAbsencesUrl(this.studentId);
    const response = await this.axiosInstance.get<AssenzeResponse>(url);
    return response.data;
  }

  /**
   * Ottiene le assenze da una data
   */
  async assenzeDa(dataInizio: string): Promise<AssenzeResponse> {
    this.verificaConnessione();

    const url = Collegamenti.getAbsencesUrl(this.studentId, dataInizio);
    const response = await this.axiosInstance.get<AssenzeResponse>(url);
    return response.data;
  }

  /**
   * Ottiene le assenze in un intervallo
   */
  async assenzeDaA(
    dataInizio: string,
    dataFine: string,
  ): Promise<AssenzeResponse> {
    this.verificaConnessione();
    validaDate(dataInizio, dataFine);

    const url = Collegamenti.getAbsencesUrl(
      this.studentId,
      dataInizio,
      dataFine,
    );
    const response = await this.axiosInstance.get<AssenzeResponse>(url);
    return response.data;
  }

  // ============================================================================
  // AGENDA
  // ============================================================================

  /**
   * Ottiene l'agenda della settimana corrente
   */
  async agenda(): Promise<AgendaResponse> {
    this.verificaConnessione();

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

  /**
   * Ottiene l'agenda in un intervallo di date (formato YYYY-MM-DD)
   */
  async agendaDaA(
    dataInizio: string,
    dataFine: string,
  ): Promise<AgendaResponse> {
    this.verificaConnessione();
    validaDate(dataInizio, dataFine);

    const url = Collegamenti.getAgendaUrl(this.studentId, dataInizio, dataFine);
    const response = await this.axiosInstance.get<AgendaResponse>(url);
    return response.data;
  }

  // ============================================================================
  // MATERIE E PERIODI
  // ============================================================================

  /**
   * Ottiene tutte le materie
   */
  async materie(): Promise<MaterieResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.SUBJECTS, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<MaterieResponse>(url);
    return response.data;
  }

  /**
   * Ottiene tutti i periodi
   */
  async periodi(): Promise<PeriodiResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.PERIODS, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<PeriodiResponse>(url);
    return response.data;
  }

  // ============================================================================
  // NOTE
  // ============================================================================

  /**
   * Ottiene tutte le note
   */
  async note(): Promise<NoteResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.NOTES, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<NoteResponse>(url);
    return response.data;
  }

  /**
   * Legge una nota specifica
   */
  async leggiNota(eventCode: string, evtId: number): Promise<void> {
    this.verificaConnessione();

    const url = Collegamenti.getNotesReadUrl(this.studentId, eventCode, evtId);
    await this.axiosInstance.post(url);
  }

  // ============================================================================
  // BACHECA
  // ============================================================================

  /**
   * Ottiene la bacheca
   */
  async bacheca(): Promise<BachecaResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.NOTICEBOARD, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<BachecaResponse>(url);
    return response.data;
  }

  /**
   * Legge un elemento della bacheca
   */
  async bachecaLeggi(eventCode: string, pubId: number): Promise<ContenutoItem> {
    this.verificaConnessione();

    const url = Collegamenti.getNoticeboardReadUrl(
      this.studentId,
      eventCode,
      pubId,
    );
    const response = await this.axiosInstance.post<{ item: ContenutoItem }>(
      url,
    );
    return response.data.item;
  }

  // ============================================================================
  // DIDATTICA
  // ============================================================================

  /**
   * Ottiene i folder della didattica
   */
  async didattica(): Promise<DidatticaResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.DIDACTICS, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<DidatticaResponse>(url);
    return response.data;
  }

  /**
   * Ottiene gli elementi di un folder
   */
  async didatticaElemento(
    folderId: number,
  ): Promise<ElementiDidatticaResponse> {
    this.verificaConnessione();

    const url = Collegamenti.getDidacticsItemUrl(this.studentId, folderId);
    const response =
      await this.axiosInstance.get<ElementiDidatticaResponse>(url);
    return response.data;
  }

  // ============================================================================
  // DOCUMENTI
  // ============================================================================

  /**
   * Ottiene i documenti
   */
  async documenti(): Promise<DocumentiResponse> {
    this.verificaConnessione();

    const url = Collegamenti.formatUrl(Collegamenti.DOCUMENTS, {
      studentId: this.studentId,
    });
    const response = await this.axiosInstance.get<DocumentiResponse>(url);
    return response.data;
  }

  /**
   * Controlla un documento specifico
   */
  async controllaDocumento(hash: string): Promise<any> {
    this.verificaConnessione();

    const url = Collegamenti.getDocumentsCheckUrl(this.studentId, hash);
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  // ============================================================================
  // AVATAR (Bonus)
  // ============================================================================

  /**
   * Ottiene l'URL dell'avatar
   */
  get avatar(): string | undefined {
    if (!this.authData?.ident) return undefined;
    return `https://web.spaggiari.eu/fml/app/images/studenti/${this.authData.ident}.jpg`;
  }
}
