/**
 * Type definitions per la nuova API Classeviva /rest/w1
 */

// ============================================================================
// CONFIG
// ============================================================================

export interface ClassevivaConfig {
  baseUrl?: string;
  timeout?: number;
}

// ============================================================================
// AUTH — risposta di AuthApi4.php?a=aLoginPwd
// ============================================================================

export interface Auth4AccountInfo {
  type: string; // "G" = genitore, "S" = studente
  id: number;
  cognome: string;
  nome: string;
  cid: string; // sede/school code
}

export interface Auth4Auth {
  verified: boolean;
  loggedIn: boolean;
  actionRequested: boolean;
  hints: string[];
  errors: string[];
  accountInfo: Auth4AccountInfo;
  redirects: string[];
  aMode: string;
  mMode: string;
  errCod: string[];
}

export interface Auth4Response {
  time: string;
  data: {
    auth: Auth4Auth;
    pfolio: boolean;
  };
}

// ============================================================================
// WHOAMI — GET /rest/w1/misc/whoami
// ============================================================================

export interface WhoAmI {
  id: string;
  account_type: string; // "G" = genitore, "S" = studente
  sede_codice: string;
  anno_scol: string;
  cognome: string;
  nome: string;
  classe_ident: string;
  classe_desc: string;
  data_nascita: string; // YYYY-MM-DD
  codice_fisc: string;
  login_type: string | null;
  last_login_at: string | null;
  email: string | null;
  schoolpass: string;
}

// ============================================================================
// CARD — GET /rest/w1/students/{studentId}/card
// ============================================================================

export interface Card {
  ident: string;
  usrType: string;
  usrId: number;
  miurSchoolCode: string;
  miurDivisionCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  fiscalCode: string;
  schCode: string;
  schName: string;
  schDedication: string;
  schCity: string;
  schProv: string;
}

export interface CardResponse {
  card: Card;
}

// ============================================================================
// PERIODI — GET /rest/w1/students/{studentId}/periods
// ============================================================================

export interface Periodo {
  periodCode: string;
  periodPos: number;
  periodDesc: string;
  periodLabel: string;
  isFinal: boolean;
  dateStart: string; // YYYY-MM-DD
  dateEnd: string; // YYYY-MM-DD
  miurDivisionCode: string | null;
}

export interface PeriodiResponse {
  periods: Periodo[];
}

// ============================================================================
// MATERIE — GET /rest/w1/students/{studentId}/subjects
// ============================================================================

export interface Docente {
  teacherId: string;
  teacherName: string;
}

export interface Materia {
  id: number;
  description: string;
  order: number;
  teachers: Docente[];
}

export interface MaterieResponse {
  subjects: Materia[];
}

// ============================================================================
// VOTI — GET /rest/w1/students/{studentId}/grades26
// Risposta rinominata da grades → grades26; include skills[] per ogni voto
// ============================================================================

export interface Skill {
  evtId: number;
  evtCode: string;
  evtDate: string;
  decimalValue: number | null;
  skillId: number;
  gradeMasterId: number;
  skillDesc: string;
  skillCode: string;
  skillMasterId: number;
  displayValue: string;
  skillValueDesc: string | null;
  skillValueShortDesc: string | null;
  skillValueNote: string | null;
  evtPosition: string;
}

export interface Voto {
  subjectId: number;
  subjectCode: string;
  subjectDesc: string;
  evtId: number;
  evtCode: string;
  evtDate: string;
  decimalValue: number | null;
  displayValue: string;
  displaPos: number;
  notesForFamily: string;
  color: string;
  canceled: boolean;
  underlined: boolean;
  periodPos: number;
  periodDesc: string;
  periodLabel: string;
  componentPos: number;
  componentDesc: string;
  weightFactor: number;
  noAverage: boolean;
  teacherName: string;
  evtPosition: string;
  skills: Skill[];
}

export interface VotiResponse {
  grades: Voto[];
}

// ============================================================================
// ASSENZE — GET /rest/w1/students/{studentId}/absences/details/
// Cambio rispetto a v1: campo top-level è "events" (non "absences")
// ============================================================================

export interface Assenza {
  evtId: number;
  evtCode: string;
  evtDate: string;
  evtHPos: number;
  evtValue: number;
  isJustified: boolean;
  justifReasonCode: string | null;
  justifReasonDesc: string | null;
  hoursAbsence: unknown[];
  webJustifStatus: number;
}

export interface AssenzeResponse {
  events: Assenza[];
}

// ============================================================================
// LEZIONI — GET /rest/w1/students/{studentId}/lessons/{start}/{end}
// Struttura identica alla v1
// ============================================================================

export interface Lezione {
  evtId: number;
  evtDate: string;
  evtCode: string;
  evtHPos: number;
  evtDuration: number;
  classDesc: string;
  authorName: string;
  subjectId: number;
  subjectCode: string;
  subjectDesc: string;
  lessonType: string;
  lessonArg: string;
}

export interface LezioniResponse {
  lessons: Lezione[];
}

// ============================================================================
// AGENDA — GET /rest/w1/students/{studentId}/agendav2/all/{start}/{end}
// Rinominato da agenda → agendav2
// ============================================================================

export interface AgendaItem {
  evtId: number;
  evtCode: string;
  evtDatetimeBegin: string;
  evtDatetimeEnd: string;
  isFullDay: boolean;
  notes: string;
  authorName: string;
  classDesc: string;
  subjectId: number | null;
  subjectDesc: string | null;
  homeworkId: number | null;
}

export interface AgendaResponse {
  agenda: AgendaItem[];
}

// ============================================================================
// COMPITI — GET /rest/w1/students/{studentId}/homeworks/index
// NUOVO endpoint dedicato ai compiti (non esisteva in v1)
// ============================================================================

export interface Compito {
  id: number;
  subjectId: number;
  subjectDesc: string;
  teacherName: string;
  date: string;
  dueDate: string;
  text: string;
  attachments: unknown[];
}

export interface CompitiResponse {
  items: Compito[];
}

// ============================================================================
// NOTE DISCIPLINARI — GET /rest/w1/students/{studentId}/notes/all/
// Cambio rispetto a v1: risposta è { NTTE, NTCL, NTWN, NTST } invece di array
// ============================================================================

export interface Nota {
  evtId: number;
  evtText: string;
  evtDate: string;
  authorName: string;
  readStatus: boolean;
}

export interface NoteResponse {
  NTTE: Nota[]; // Annotazioni docente
  NTCL: Nota[]; // Note disciplinari
  NTWN: Nota[]; // Richiami
  NTST: Nota[]; // Sanzioni
}

// ============================================================================
// FUNCTIONS — GET /rest/w1/students/{studentId}/_functions
// Nuovo: funzionalità abilitate per l'utente
// ============================================================================

export interface FunctionItem {
  title: string;
  desc: string;
  type: string;
  url: string | null;
  options: Record<string, unknown> | unknown[];
  readonly: boolean;
}

export interface FunctionsResponse {
  functions: Record<string, FunctionItem>;
  appEnabled: string[];
  options: Record<string, unknown>;
}

// ============================================================================
// LIBRETTO WEB — GET /rest/w1/students/{studentId}/absences/librettowebconf
// ============================================================================

export interface CausaleAssenza {
  code: string;
  usercode: string;
  shortdesc: string;
  longdesc: string;
}

export interface LibrettoWebConf {
  enableJustA: boolean;
  enableJustR: boolean;
  enableJustU: boolean;
  numDaysStopA: number;
  numDaysStopR: number;
  numDaysStopU: number;
  otherInfo: unknown[];
  causals: CausaleAssenza[];
}

// ============================================================================
// BACHECA — GET /rest/w1/students/{studentId}/noticeboard
// ============================================================================

export interface ItemBacheca {
  pubId: number;
  pubDT: string;
  readStatus: boolean;
  evtCode: string;
  cntId: number;
  cntValidFrom: string;
  cntValidTo: string;
  cntValidInRange: boolean;
  cntStatus: string;
  cntTitle: string;
  cntCategory: string;
  cntHasChanged: boolean;
  cntHasAttach: boolean;
  needJoin: boolean;
  needReply: boolean;
  needFile: boolean;
  evento?: unknown;
}

export interface BachecaResponse {
  items: ItemBacheca[];
}

export interface ContenutoItem {
  text: string;
  attachments?: Array<{ fileName: string; attachNum: number }>;
}

// ============================================================================
// DIDATTICA — GET /rest/w1/students/{studentId}/didactics
// ============================================================================

export interface FolderDidattica {
  folderId: number;
  folderName: string;
  lastShareDT: string;
}

export interface DidatticaResponse {
  didacticts: FolderDidattica[];
}

export interface ElementoDidattica {
  contentId: number;
  contentName: string;
  objectId: number;
  objectType: string;
  shareDT: string;
}

export interface ElementiDidatticaResponse {
  contents: ElementoDidattica[];
}

// ============================================================================
// AI SERVICE
// ============================================================================

export type AIProvider = "openai" | "google" | "anthropic" | "groq" | "xai";

export interface AIServiceOptions {
  provider?: AIProvider;
  model?: string;
  apiKey?: string;
  temperature?: number;
}

export interface CompitoEstratto {
  testo: string;
  materia: string;
  data_lezione: string;
  scadenza: string;
  note: string | null;
}

export interface CompitiEstrattiResponse {
  compiti: CompitoEstratto[];
  metadata: {
    totale_lezioni: number;
    totale_compiti: number;
    modello_utilizzato: string;
    timestamp: string;
  };
}

