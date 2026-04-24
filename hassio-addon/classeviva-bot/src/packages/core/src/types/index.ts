/**
 * Type definitions per l'API Classeviva
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface ClassevivaConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface AuthResponse {
  ident: string;
  firstName: string;
  lastName: string;
  token: string;
  release: string;
  expire: string;
}

export interface AuthHeaders {
  "User-Agent": string;
  "Z-Dev-ApiKey": string;
  "Z-Auth-Token"?: string;
  "Content-Type": string;
}

// ============================================================================
// LEZIONI (LESSONS)
// ============================================================================

export interface Lezione {
  evtId: number;
  evtDate: string; // YYYY-MM-DD
  evtCode: string;
  evtHPos: number;
  evtDuration: number;
  classDesc: string;
  authorName: string;
  subjectId: number;
  subjectCode: string;
  subjectDesc: string;
  lessonType: string;
  lessonArg?: string;
  evtText?: string;
}

export interface LezioniResponse {
  lessons: Lezione[];
}

// ============================================================================
// VOTI (GRADES)
// ============================================================================

export interface Voto {
  subjectId: number;
  subjectCode: string;
  subjectDesc: string;
  evtId: number;
  evtDate: string;
  evtCode: string;
  decimalValue: number;
  displayValue: string;
  displaPos: number;
  notesForFamily: string;
  color: string;
  canceled: boolean;
  underlined: boolean;
  periodPos: number;
  periodDesc: string;
  componentPos: number;
  componentDesc: string;
  weightFactor: number;
  skillId: number;
  gradeMasterId: number;
  skillDesc: string;
  skillCode: string;
  skillMasterId: number;
  skillValueDesc: string;
  skillValueShortDesc: string;
  oldskillId: number;
  oldskillDesc: string;
}

export interface VotiResponse {
  grades: Voto[];
}

// ============================================================================
// ASSENZE (ABSENCES)
// ============================================================================

export interface Assenza {
  evtId: number;
  evtDate: string;
  evtCode: string;
  evtHPos: number;
  evtValue: number;
  isJustified: boolean;
  justifReasonCode: string;
  justifReasonDesc: string;
  hoursAbsence?: number;
}

export interface AssenzeResponse {
  events: Assenza[];
}

// ============================================================================
// AGENDA
// ============================================================================

export interface EventoAgenda {
  evtId: number;
  evtDatetimeBegin: string;
  evtDatetimeEnd: string;
  evtCode: string;
  evtText: string;
  authorName: string;
  classDesc: string;
  subjectId?: number;
  subjectDesc?: string;
  homeworkId?: number;
  notes?: string;
}

export interface AgendaResponse {
  agenda: EventoAgenda[];
}

// ============================================================================
// MATERIE (SUBJECTS)
// ============================================================================

export interface Materia {
  id: number;
  description: string;
  order: number;
  teachers: Array<{
    teacherId: number;
    teacherName: string;
    teacherFirstName: string;
    teacherLastName: string;
  }>;
}

export interface MaterieResponse {
  subjects: Materia[];
}

// ============================================================================
// PERIODI (PERIODS)
// ============================================================================

export interface Periodo {
  periodCode: string;
  periodPos: number;
  periodDesc: string;
  isFinal: boolean;
  dateStart: string;
  dateEnd: string;
}

export interface PeriodiResponse {
  periods: Periodo[];
}

// ============================================================================
// NOTE DISCIPLINARI (DISCIPLINARY NOTES)
// ============================================================================

export interface Nota {
  evtId: number;
  evtDate: string;
  evtCode: string;
  evtText: string;
  authorName: string;
  readStatus: boolean;
  evtHPos?: number;
  warningType?: string;
}

export interface NoteResponse {
  NTTE: Nota[]; // Note disciplinari
  NTCL: Nota[]; // Annotazioni
  NTWN: Nota[]; // Richiami
}

// ============================================================================
// BACHECA (NOTICEBOARD)
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
  evento?: any;
}

export interface BachecaResponse {
  items: ItemBacheca[];
}

export interface ContenutoItem {
  text: string;
  attachments?: Array<{
    fileName: string;
    attachNum: number;
  }>;
}

// ============================================================================
// DIDATTICA (EDUCATIONAL MATERIALS)
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
// DOCUMENTI (DOCUMENTS)
// ============================================================================

export interface Documento {
  fileName: string;
  attachNum: number;
}

export interface DocumentiResponse {
  documents: Documento[];
}

// ============================================================================
// AI TYPES
// ============================================================================

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

export type AIProvider = "openai" | "google" | "anthropic" | "groq" | "xai";

export interface AIServiceOptions {
  provider?: AIProvider;
  model?: string;
  apiKey?: string;
  temperature?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

// ============================================================================
// USER DATA
// ============================================================================

export interface UserData {
  ident: string;
  firstName: string;
  lastName: string;
  token?: string;
  schoolName?: string;
  schoolCode?: string;
}
