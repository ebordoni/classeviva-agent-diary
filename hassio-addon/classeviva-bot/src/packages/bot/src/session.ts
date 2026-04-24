import type { ClassevivaClient } from "@classeviva/core";

export interface Session {
  client?: ClassevivaClient;
}

const store = new Map<number, Session>();

export function getSession(chatId: number): Session {
  if (!store.has(chatId)) store.set(chatId, {});
  return store.get(chatId)!;
}

export function updateSession(chatId: number, data: Partial<Session>): void {
  store.set(chatId, { ...getSession(chatId), ...data });
}

export function clearSession(chatId: number): void {
  store.delete(chatId);
}
