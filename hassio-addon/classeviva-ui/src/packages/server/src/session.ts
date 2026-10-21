import type { ClassevivaClient } from "@classeviva/core";

declare module "express-session" {
  interface SessionData {
    activeStudentId?: string;
    authenticated?: boolean;
    /** Impostato al logout esplicito per non essere ri-autenticati subito dall'auto-login da config */
    manualLogout?: boolean;
    spidLinkStartedAt?: number;
  }
}

// Client condivisi tra sessioni del browser; ricreati dalle credenziali al riavvio.
const clientStore = new Map<string, ClassevivaClient>();

export function getClientByStudentId(
  studentId: string,
): ClassevivaClient | undefined {
  return clientStore.get(studentId);
}

export function setClientByStudentId(
  studentId: string,
  client: ClassevivaClient,
): void {
  clientStore.set(studentId, client);
}

export function clearClientByStudentId(studentId: string): void {
  clientStore.delete(studentId);
}
