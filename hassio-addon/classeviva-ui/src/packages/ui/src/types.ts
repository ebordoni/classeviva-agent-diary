// Tipi che rispecchiano le risposte del server (da @classeviva/core)

export interface User {
  nome: string;
  ident: string;
}

export interface Lezione {
  evtId: number;
  evtDate: string;
  subjectDesc: string;
  authorName: string;
  lessonType: string;
  lessonArg: string;
  evtText: string;
}

export interface LezioniResponse {
  lessons: Lezione[];
  fromCache?: boolean;
}

export interface Voto {
  subjectId: number;
  evtDate: string;
  decimalValue: number;
  displayValue: string;
  color: string;
  periodDesc: string;
  skillDesc: string;
  subjectDesc: string;
}

export interface VotiResponse {
  grades: Voto[];
  fromCache?: boolean;
}

export interface Assenza {
  evtDate: string;
  evtCode: string;
  evtValue: number;
  isJustified: boolean;
  justifReasonDesc: string;
}

export interface AssenzeResponse {
  events: Assenza[];
  fromCache?: boolean;
}

export interface EventoAgenda {
  evtId: number;
  evtDatetimeBegin: string;
  evtDatetimeEnd: string;
  evtText: string;
  subjectDesc: string;
  authorName: string;
  evtCode: string;
}

export interface AgendaResponse {
  agenda: EventoAgenda[];
  fromCache?: boolean;
}

export interface Docente {
  teacherId: number;
  teacherName: string;
}

export interface Materia {
  subjectId: number;
  subjectDesc: string;
  subjectCode: string;
  teachers: Docente[];
}

export interface MaterieResponse {
  subjects: Materia[];
  fromCache?: boolean;
}

export interface CompitoEstratto {
  testo: string;
  materia: string;
  data_lezione: string;
  scadenza: string;
  note?: string;
}

export interface CompitiResponse {
  compiti: CompitoEstratto[];
  metadata: {
    totale_lezioni: number;
    totale_compiti: number;
    modello_utilizzato: string;
    timestamp: string;
  };
  fromCache?: boolean;
}

export interface Nota {
  evtId: number;
  evtDate: string;
  evtText: string;
  authorName: string;
  readStatus: boolean;
  warningType: string;
}

export interface NoteResponse {
  NTTE: Nota[];
  NTCL: Nota[];
  NTWN: Nota[];
}

export interface ItemBacheca {
  pubId: number;
  cntTitle: string;
  cntCategory: string;
  readStatus: boolean;
  cntHasAttach: boolean;
  pubDT: string;
}

export interface BachecaResponse {
  items: ItemBacheca[];
}

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
  objectType: string;
  shareDate: string;
}

export interface ElementiDidatticaResponse {
  didacticts: ElementoDidattica[];
}
