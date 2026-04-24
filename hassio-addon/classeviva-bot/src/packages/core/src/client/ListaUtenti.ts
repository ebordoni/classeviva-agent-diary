/**
 * ListaUtenti - Gestione di più utenti Classeviva
 */

import { UtenteErrore } from "../utils/exceptions.js";
import { ClassevivaClient } from "./ClassevivaClient.js";

export interface UtenteConfig {
  studentId: string;
  password?: string;
}

export class ListaUtenti {
  private utenti: Map<string, ClassevivaClient>;

  constructor(utentiConfig?: UtenteConfig[]) {
    this.utenti = new Map();

    if (utentiConfig) {
      for (const config of utentiConfig) {
        this.aggiungi(config.studentId, config.password);
      }
    }
  }

  /**
   * Aggiunge un nuovo utente alla lista
   */
  aggiungi(studentId: string, password?: string): ClassevivaClient {
    if (this.utenti.has(studentId)) {
      throw new UtenteErrore(
        `L'utente ${studentId} è già presente nella lista`
      );
    }

    const client = new ClassevivaClient(studentId, password);
    this.utenti.set(studentId, client);
    return client;
  }

  /**
   * Rimuove un utente dalla lista
   */
  rimuovi(studentId: string): void {
    if (!this.utenti.has(studentId)) {
      throw new UtenteErrore(
        `L'utente ${studentId} non è presente nella lista`
      );
    }

    this.utenti.delete(studentId);
  }

  /**
   * Ottiene un utente specifico
   */
  ottieni(studentId: string): ClassevivaClient {
    const client = this.utenti.get(studentId);

    if (!client) {
      throw new UtenteErrore(
        `L'utente ${studentId} non è presente nella lista`
      );
    }

    return client;
  }

  /**
   * Verifica se un utente esiste
   */
  esiste(studentId: string): boolean {
    return this.utenti.has(studentId);
  }

  /**
   * Ottiene tutti gli ID utente
   */
  get idUtenti(): string[] {
    return Array.from(this.utenti.keys());
  }

  /**
   * Ottiene tutti i client
   */
  get tuttiUtenti(): ClassevivaClient[] {
    return Array.from(this.utenti.values());
  }

  /**
   * Numero di utenti
   */
  get numeroUtenti(): number {
    return this.utenti.size;
  }

  /**
   * Effettua il login per tutti gli utenti
   */
  async accediTutti(): Promise<void> {
    const promesse = Array.from(this.utenti.values()).map((client) =>
      client.accedi()
    );
    await Promise.all(promesse);
  }

  /**
   * Effettua il login per un sottogruppo di utenti
   */
  async accediMultipli(studentIds: string[]): Promise<void> {
    const promesse = studentIds.map((id) => {
      const client = this.ottieni(id);
      return client.accedi();
    });
    await Promise.all(promesse);
  }

  /**
   * Ottiene le lezioni per tutti gli utenti
   */
  async lezioniTutti(): Promise<Map<string, any>> {
    const risultati = new Map();

    for (const [id, client] of this.utenti) {
      try {
        const lezioni = await client.lezioni();
        risultati.set(id, lezioni);
      } catch (error) {
        risultati.set(id, { errore: error });
      }
    }

    return risultati;
  }

  /**
   * Svuota la lista
   */
  svuota(): void {
    this.utenti.clear();
  }
}
