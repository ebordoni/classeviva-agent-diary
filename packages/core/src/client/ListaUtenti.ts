/**
 * ListaUtenti - Gestione di più utenti Classeviva
 */

import { UtenteErrore } from "../utils/exceptions.js";
import { ClassevivaClient } from "./ClassevivaClient.js";

export interface UtenteConfig {
  userId: string;
  password?: string;
}

export class ListaUtenti {
  private utenti: Map<string, ClassevivaClient>;

  constructor(utentiConfig?: UtenteConfig[]) {
    this.utenti = new Map();

    if (utentiConfig) {
      for (const config of utentiConfig) {
        this.aggiungi(config.userId, config.password);
      }
    }
  }

  aggiungi(userId: string, password?: string): ClassevivaClient {
    if (this.utenti.has(userId)) {
      throw new UtenteErrore(`L'utente ${userId} è già presente nella lista`);
    }
    const client = new ClassevivaClient(userId, password);
    this.utenti.set(userId, client);
    return client;
  }

  rimuovi(userId: string): void {
    if (!this.utenti.has(userId)) {
      throw new UtenteErrore(`L'utente ${userId} non è presente nella lista`);
    }
    this.utenti.delete(userId);
  }

  ottieni(userId: string): ClassevivaClient {
    const client = this.utenti.get(userId);
    if (!client) {
      throw new UtenteErrore(`L'utente ${userId} non è presente nella lista`);
    }
    return client;
  }

  esiste(userId: string): boolean {
    return this.utenti.has(userId);
  }

  get idUtenti(): string[] {
    return Array.from(this.utenti.keys());
  }

  get tuttiUtenti(): ClassevivaClient[] {
    return Array.from(this.utenti.values());
  }

  get numeroUtenti(): number {
    return this.utenti.size;
  }

  async accediTutti(): Promise<void> {
    await Promise.all(Array.from(this.utenti.values()).map((c) => c.accedi()));
  }

  async accediMultipli(userIds: string[]): Promise<void> {
    await Promise.all(userIds.map((id) => this.ottieni(id).accedi()));
  }

  svuota(): void {
    this.utenti.clear();
  }
}
