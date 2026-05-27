import type { ClassevivaClient } from "@classeviva/core";

declare module "express-session" {
  interface SessionData {
    activeStudentId?: string;
    authenticated?: boolean;
  }
}

// Keyed by studentId: i client persistono tra sessioni diverse e riavvii
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
