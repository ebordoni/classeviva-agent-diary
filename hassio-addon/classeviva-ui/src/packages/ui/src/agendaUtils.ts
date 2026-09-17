// Codice evento Classeviva per gli avvisi/note generali in agenda (agendav2).
// NOTA: non documentato ufficialmente, dedotto dai dati osservati — se non
// corrisponde a quanto mostrato come "Avvisi" nell'app ufficiale, va aggiornato qui.
export const AVVISO_EVTCODE = "AGNT";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0]!;
}

/** Range di default per gli avvisi: usato sia dalla pagina Avvisi che dal contatore in Dashboard. */
export function defaultAvvisiRange(): { inizio: string; fine: string } {
  const oggi = new Date();
  const indietro7 = new Date(oggi);
  indietro7.setDate(oggi.getDate() - 7);
  const avanti30 = new Date(oggi);
  avanti30.setDate(oggi.getDate() + 30);
  return { inizio: toDateInput(indietro7), fine: toDateInput(avanti30) };
}
