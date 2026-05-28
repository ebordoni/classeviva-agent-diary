import type { Voto } from "./types.ts";

export const VOTI_TESTUALI = [
  "ECCELLENTE",
  "OTTIMO",
  "DISTINTO",
  "BUONO",
  "DISCRETO",
  "SUFFICIENTE",
  "INSUFFICIENTE",
  "GRAVEMENTE INSUFFICIENTE",
] as const;

export type VotoTestuale = (typeof VOTI_TESTUALI)[number];

export const VALORE_NUMERICO: Record<VotoTestuale, number> = {
  ECCELLENTE: 10,
  OTTIMO: 9,
  DISTINTO: 8,
  BUONO: 7,
  DISCRETO: 6.5,
  SUFFICIENTE: 6,
  INSUFFICIENTE: 5,
  "GRAVEMENTE INSUFFICIENTE": 4,
};

export const COLOR_TESTUALE: Record<VotoTestuale, string> = {
  ECCELLENTE: "text-purple-700 bg-purple-50",
  OTTIMO: "text-green-700 bg-green-50",
  DISTINTO: "text-teal-700 bg-teal-50",
  BUONO: "text-blue-700 bg-blue-50",
  DISCRETO: "text-sky-700 bg-sky-50",
  SUFFICIENTE: "text-yellow-700 bg-yellow-50",
  INSUFFICIENTE: "text-orange-700 bg-orange-50",
  "GRAVEMENTE INSUFFICIENTE": "text-red-700 bg-red-50",
};

export function estraiVotoTestuale(
  note: string | null | undefined,
): VotoTestuale | null {
  if (!note) return null;
  const upper = note.toUpperCase();
  return VOTI_TESTUALI.find((v) => upper.includes(v)) ?? null;
}

export function isVotoSkill(v: Voto): boolean {
  return (
    (v.decimalValue == null || v.decimalValue === 0) &&
    v.displayValue === "" &&
    v.skills?.length > 0
  );
}

export function votoTestualeDisplay(v: Voto): VotoTestuale | null {
  for (const s of v.skills ?? []) {
    const vt = estraiVotoTestuale(s.skillValueNote);
    if (vt) return vt;
  }
  return null;
}

/** Restituisce il valore numerico equivalente di un voto (numerico o testuale) */
export function valoreNumericoVoto(v: Voto): number | null {
  if (v.decimalValue != null && !isNaN(v.decimalValue) && v.decimalValue > 0) {
    return v.decimalValue;
  }
  if (isVotoSkill(v)) {
    const vt = votoTestualeDisplay(v);
    if (vt) return VALORE_NUMERICO[vt];
  }
  return null;
}

/** Calcola la media su tutti i voti (numerici + testuali) */
export function calcolaMedia(voti: Voto[]): number | null {
  const valori = voti
    .map(valoreNumericoVoto)
    .filter((v): v is number => v !== null);
  if (valori.length === 0) return null;
  return valori.reduce((a, b) => a + b, 0) / valori.length;
}
