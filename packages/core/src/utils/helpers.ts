import { DataFuoriGamma, FormatoNonValido } from "./exceptions.js";

export const BASE_URL_W1 = "https://web.spaggiari.eu/rest/w1";
/** Endpoint di login del portale Classeviva (AuthApi4) */
export const AUTH_URL =
  "https://web.spaggiari.eu/auth-p7/app/default/AuthApi4.php?a=aLoginPwd";
export const TEMPO_CONNESSIONE = 5400; // secondi (1.5 ore)

export function anno(): number {
  const oggi = new Date();
  const mese = oggi.getMonth() + 1;
  return mese >= 9 ? oggi.getFullYear() : oggi.getFullYear() - 1;
}

export function dataInizioAnno(annoScolastico?: number): string {
  const a = annoScolastico ?? anno();
  return `${a}-09-01`;
}

export function dataFineAnno(annoScolastico?: number): string {
  const a = annoScolastico ?? anno();
  return `${a + 1}-06-30`;
}

/** Converte YYYY-MM-DD in YYYYMMDD per gli endpoint REST */
export function toRestDate(date: string): string {
  return date.replace(/-/g, "");
}

/** Formatta una data Date | string in YYYY-MM-DD */
export function formattaData(data: Date | string): string {
  const d = data instanceof Date ? data : new Date(data);
  return d.toISOString().slice(0, 10);
}

/** Restituisce le date di inizio e fine degli ultimi N giorni */
export function ultimiNGiorni(n: number): { inizio: string; fine: string } {
  const oggi = new Date();
  const inizio = new Date(oggi);
  inizio.setDate(oggi.getDate() - n);
  return { inizio: formattaData(inizio), fine: formattaData(oggi) };
}

export function validaDate(inizio: string, fine: string): void {
  const rISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!rISO.test(inizio) || !rISO.test(fine)) {
    throw new FormatoNonValido("Le date devono essere nel formato YYYY-MM-DD");
  }
  if (new Date(inizio) > new Date(fine)) {
    throw new DataFuoriGamma(
      "La data di inizio non può essere successiva alla fine",
    );
  }
}

/** Header comuni per le richieste all'API v1 (per il login) */
export const headersV1 = {
  "User-Agent": "CVVS/std/4.2.3 Android/12",
  "Z-Dev-ApiKey": "Tg1NWEwNGIgIC0K",
  "Content-Type": "application/json",
};
