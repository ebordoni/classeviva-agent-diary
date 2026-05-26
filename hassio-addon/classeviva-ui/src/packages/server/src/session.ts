import type { ClassevivaClient } from "@classeviva/core";

declare module "express-session" {
  interface SessionData {
    studentId?: string;
    authenticated?: boolean;
  }
}

const clientStore = new Map<string, ClassevivaClient>();

export function getClientBySessionId(
  sessionId: string,
): ClassevivaClient | undefined {
  return clientStore.get(sessionId);
}

export function setClientBySessionId(
  sessionId: string,
  client: ClassevivaClient,
): void {
  clientStore.set(sessionId, client);
}

export function clearClientBySessionId(sessionId: string): void {
  clientStore.delete(sessionId);
}
