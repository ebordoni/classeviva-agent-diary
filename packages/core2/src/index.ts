export { AIService } from "./client/AIService.js";
export { ClassevivaClient } from "./client/ClassevivaClient.js";
export { ListaUtenti, type UtenteConfig } from "./client/ListaUtenti.js";
export { OllamaService } from "./client/OllamaService.js";
export * from "./types/index.js";
export * from "./utils/exceptions.js";
export * from "./utils/helpers.js";

// Re-export AgendaItem con il vecchio nome per compatibilità
export type { AgendaItem as EventoAgenda } from "./types/index.js";

export const VERSION = "0.2.0";
