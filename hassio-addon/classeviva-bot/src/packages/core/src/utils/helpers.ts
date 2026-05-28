/**
 * Utilities per gestione date e validazione
 */

import { DataFuoriGamma, FormatoNonValido } from "./exceptions.js";

/**
 * Costanti
 */
export const TEMPO_CONNESSIONE = 5400; // secondi (1.5 ore)
export const FORMATO_DATA = "YYYY-MM-DD";

/**
 * Anno scolastico corrente
 */
export function anno(): number {
  const oggi = new Date();
  const mese = oggi.getMonth() + 1;
  return mese >= 9 ? oggi.getFullYear() : oggi.getFullYear() - 1;
}

/**
 * Formatta una data in formato YYYY-MM-DD
 */
export function formattaData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;

  if (isNaN(d.getTime())) {
    throw new FormatoNonValido("Data non valida");
  }

  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, "0");
  const giorno = String(d.getDate()).padStart(2, "0");

  return `${anno}-${mese}-${giorno}`;
}

/**
 * Formatta una data con trattini (alias di formattaData)
 */
export function formattaDataConTrattini(data: Date | string): string {
  return formattaData(data);
}

/**
 * Data inizio anno scolastico (1 settembre)
 */
export function dataInizioAnno(annoScolastico?: number): string {
  const a = annoScolastico ?? anno();
  return `${a}-09-01`;
}

/**
 * Data fine anno scolastico (31 agosto dell'anno successivo)
 */
export function dataFineAnno(annoScolastico?: number): string {
  const a = annoScolastico ?? anno();
  return `${a + 1}-08-31`;
}

/**
 * Data fine anno scolastico o oggi, se oggi è precedente
 */
export function dataFineAnnoOOggi(annoScolastico?: number): string {
  const oggi = formattaData(new Date());
  const fineAnno = dataFineAnno(annoScolastico);
  return oggi < fineAnno ? oggi : fineAnno;
}

/**
 * Verifica se una data è nell'anno scolastico
 */
export function dataInAnnoScolastico(
  data: string,
  annoScolastico?: number,
): boolean {
  const inizio = dataInizioAnno(annoScolastico);
  const fine = dataFineAnno(annoScolastico);
  return data >= inizio && data <= fine;
}

/**
 * Valida il formato di una data (YYYY-MM-DD)
 */
export function validaFormatoData(data: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) {
    return false;
  }

  const [annoStr, meseStr, giornoStr] = data.split("-");
  const anno = parseInt(annoStr, 10);
  const mese = parseInt(meseStr, 10);
  const giorno = parseInt(giornoStr, 10);

  if (mese < 1 || mese > 12) {
    return false;
  }

  if (giorno < 1 || giorno > 31) {
    return false;
  }

  // Verifica giorni per mese
  const giorniPerMese = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Anno bisestile
  if (anno % 4 === 0 && (anno % 100 !== 0 || anno % 400 === 0)) {
    giorniPerMese[1] = 29;
  }

  return giorno <= giorniPerMese[mese - 1];
}

/**
 * Valida due date e verifica che siano nell'ordine corretto
 */
export function validaDate(dataInizio: string, dataFine: string): void {
  // Verifica formato
  if (!validaFormatoData(dataInizio)) {
    throw new FormatoNonValido(`Formato data inizio non valido: ${dataInizio}`);
  }

  if (!validaFormatoData(dataFine)) {
    throw new FormatoNonValido(`Formato data fine non valido: ${dataFine}`);
  }

  // Verifica ordine
  if (dataInizio > dataFine) {
    throw new DataFuoriGamma(
      "La data di inizio deve essere precedente alla data di fine",
    );
  }

  // Verifica anno scolastico
  const annoCorrente = anno();
  if (
    !dataInAnnoScolastico(dataInizio, annoCorrente) &&
    !dataInAnnoScolastico(dataInizio, annoCorrente - 1)
  ) {
    throw new DataFuoriGamma(
      "La data di inizio non è in un anno scolastico valido",
    );
  }
}

/**
 * Calcola il giorno della settimana
 */
export function giornoSettimana(data: string): string {
  const giorni = [
    "domenica",
    "lunedì",
    "martedì",
    "mercoledì",
    "giovedì",
    "venerdì",
    "sabato",
  ];
  const d = new Date(data);
  return giorni[d.getDay()];
}

/**
 * Aggiunge giorni a una data
 */
export function aggiungiGiorni(data: string, giorni: number): string {
  const d = new Date(data);
  d.setDate(d.getDate() + giorni);
  return formattaData(d);
}

/**
 * Calcola il prossimo giorno specifico della settimana
 * @param data Data di partenza
 * @param giornoTarget Giorno target (0=domenica, 1=lunedì, ..., 6=sabato)
 */
export function prossimoGiornoSettimana(
  data: string,
  giornoTarget: number,
): string {
  const d = new Date(data);
  const giornoCorrente = d.getDay();

  let differenza = giornoTarget - giornoCorrente;
  if (differenza <= 0) {
    differenza += 7;
  }

  d.setDate(d.getDate() + differenza);
  return formattaData(d);
}

/**
 * Ottiene le date degli ultimi N giorni
 */
export function ultimiNGiorni(n: number): { inizio: string; fine: string } {
  const oggi = new Date();
  const inizio = new Date(oggi);
  inizio.setDate(oggi.getDate() - n);

  return {
    inizio: formattaData(inizio),
    fine: formattaData(oggi),
  };
}

/**
 * Headers di default per le richieste REST
 */
export const intestazione = {
  "User-Agent": "CVVS/std/4.2.3 Android/12",
  "Z-Dev-ApiKey": "Tg1NWEwNGIgIC0K",
  "Content-Type": "application/json",
};
