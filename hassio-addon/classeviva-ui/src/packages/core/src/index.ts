/**
 * Classeviva Core Library - TypeScript
 *
 * Libreria per interagire con le API di Classeviva (Registro elettronico Spaggiari)
 *
 * @packageDocumentation
 */

// ============================================================================
// CLIENT EXPORTS
// ============================================================================

export { AIService } from "./client/AIService.js";
export { ClassevivaClient } from "./client/ClassevivaClient.js";
export { ListaUtenti, type UtenteConfig } from "./client/ListaUtenti.js";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  AgendaResponse,
  // AI
  AIProvider,
  AIServiceOptions,
  // Assenze
  Assenza,
  AssenzeResponse,
  AuthHeaders,
  // Auth
  AuthResponse,
  BachecaResponse,
  ClassevivaConfig,
  CompitiEstrattiResponse,
  CompitoEstratto,
  ContenutoItem,
  // Utility
  DateRange,
  DidatticaResponse,
  DocumentiResponse,
  // Documenti
  Documento,
  ElementiDidatticaResponse,
  ElementoDidattica,
  ErrorResponse,
  // Agenda
  EventoAgenda,
  // Didattica
  FolderDidattica,
  // Bacheca
  ItemBacheca,
  // Lezioni
  Lezione,
  LezioniResponse,
  // Materie e Periodi
  Materia,
  MaterieResponse,
  // Note
  Nota,
  NoteResponse,
  PeriodiResponse,
  Periodo,
  UserData,
  VotiResponse,
  // Voti
  Voto,
} from "./types/index.js";

// ============================================================================
// EXCEPTION EXPORTS
// ============================================================================

export {
  CategoriaNonPresente,
  ClassevivaError,
  DataErrore,
  DataFuoriGamma,
  ErroreHTTP,
  ErroreHTTP404,
  FormatoNonValido,
  NonAccesso,
  ParametroNonValido,
  PasswordNonValida,
  SenzaDati,
  sollevaErroreHTTP,
  TokenErrore,
  TokenNonPresente,
  TokenNonValido,
  TokenScaduto,
  UtenteErrore,
  ValoreNonValido,
} from "./utils/exceptions.js";

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export {
  aggiungiGiorni,
  anno,
  dataFineAnno,
  dataFineAnnoOOggi,
  dataInAnnoScolastico,
  dataInizioAnno,
  FORMATO_DATA,
  formattaData,
  formattaDataConTrattini,
  giornoSettimana,
  intestazione,
  prossimoGiornoSettimana,
  TEMPO_CONNESSIONE,
  ultimiNGiorni,
  validaDate,
  validaFormatoData,
} from "./utils/helpers.js";

// ============================================================================
// ENDPOINT EXPORTS
// ============================================================================

export { Collegamenti } from "./utils/endpoints.js";

// ============================================================================
// VERSION
// ============================================================================

export const VERSION = "2.0.0";
