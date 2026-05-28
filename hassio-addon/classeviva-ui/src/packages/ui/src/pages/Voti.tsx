import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { votiApi } from "../api.ts";
import type { Skill, Voto } from "../types.ts";

// Voti testuali ordinati dal più alto al più basso
const VOTI_TESTUALI = [
  "ECCELLENTE",
  "OTTIMO",
  "DISTINTO",
  "BUONO",
  "DISCRETO",
  "SUFFICIENTE",
  "INSUFFICIENTE",
  "GRAVEMENTE INSUFFICIENTE",
] as const;

type VotoTestuale = (typeof VOTI_TESTUALI)[number];

function estraiVotoTestuale(
  note: string | null | undefined,
): VotoTestuale | null {
  if (!note) return null;
  const upper = note.toUpperCase();
  return VOTI_TESTUALI.find((v) => upper.includes(v)) ?? null;
}

const COLOR_TESTUALE: Record<VotoTestuale, string> = {
  ECCELLENTE: "text-purple-700 bg-purple-50",
  OTTIMO: "text-green-700 bg-green-50",
  DISTINTO: "text-teal-700 bg-teal-50",
  BUONO: "text-blue-700 bg-blue-50",
  DISCRETO: "text-sky-700 bg-sky-50",
  SUFFICIENTE: "text-yellow-700 bg-yellow-50",
  INSUFFICIENTE: "text-orange-700 bg-orange-50",
  "GRAVEMENTE INSUFFICIENTE": "text-red-700 bg-red-50",
};

const RANK_TESTUALE: Record<VotoTestuale, number> = {
  ECCELLENTE: 8,
  OTTIMO: 7,
  DISTINTO: 6,
  BUONO: 5,
  DISCRETO: 4,
  SUFFICIENTE: 3,
  INSUFFICIENTE: 2,
  "GRAVEMENTE INSUFFICIENTE": 1,
};

function gradeColorNumerico(v: number): string {
  if (v >= 8) return "text-green-700 bg-green-50";
  if (v >= 6) return "text-blue-700 bg-blue-50";
  if (v >= 5) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

/** Determina se il voto usa la valutazione testuale per skill */
function isVotoSkill(v: Voto): boolean {
  return (
    (v.decimalValue == null || v.decimalValue === 0) &&
    v.displayValue === "" &&
    v.skills?.length > 0
  );
}

/** Estrae il voto testuale "principale" da un Voto (prima skill con nota) */
function votoTestualeDisplay(v: Voto): VotoTestuale | null {
  for (const s of v.skills ?? []) {
    const vt = estraiVotoTestuale(s.skillValueNote);
    if (vt) return vt;
  }
  return null;
}

export default function Voti() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["voti"],
    queryFn: votiApi.get,
  });

  const bySubject = new Map<string, Voto[]>();
  for (const v of data?.grades ?? []) {
    if (!bySubject.has(v.subjectDesc)) bySubject.set(v.subjectDesc, []);
    bySubject.get(v.subjectDesc)!.push(v);
  }

  const subjects = [...bySubject.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  function avgNumerico(voti: Voto[]): string {
    const numeric = voti.filter(
      (v) =>
        v.decimalValue != null && !isNaN(v.decimalValue) && v.decimalValue > 0,
    );
    if (numeric.length === 0) return "—";
    const mean =
      numeric.reduce((s, v) => s + (v.decimalValue ?? 0), 0) / numeric.length;
    return mean.toFixed(2);
  }

  function avgTestuale(voti: Voto[]): VotoTestuale | null {
    const ranks = voti
      .map((v) => votoTestualeDisplay(v))
      .filter((vt): vt is VotoTestuale => vt != null)
      .map((vt) => RANK_TESTUALE[vt]);
    if (ranks.length === 0) return null;
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const rounded = Math.round(mean);
    return (
      VOTI_TESTUALI.find((vt) => RANK_TESTUALE[vt] === rounded) ??
      VOTI_TESTUALI[VOTI_TESTUALI.length - 1]
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Voti</h1>
        {data?.fromCache && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            📦 cache
          </span>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {subjects.map(([subject, voti]) => {
        const usaSkill = voti.some(isVotoSkill);
        const mediaNum = avgNumerico(voti);
        const mediaText = avgTestuale(voti);

        return (
          <div key={subject} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {subject}
              </h2>
              {usaSkill && mediaText ? (
                <span
                  className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${COLOR_TESTUALE[mediaText]}`}
                >
                  Media:{" "}
                  {mediaText.charAt(0) + mediaText.slice(1).toLowerCase()}
                </span>
              ) : (
                <span
                  className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${gradeColorNumerico(parseFloat(mediaNum))}`}
                >
                  Media: {mediaNum}
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {usaSkill ? (
                // ── Vista skill/voto testuale ──────────────────────────────
                <div className="divide-y divide-gray-100">
                  {voti
                    .slice()
                    .sort((a, b) => b.evtDate.localeCompare(a.evtDate))
                    .map((v, i) => (
                      <VotoSkillRow key={`${v.evtDate}-${i}`} voto={v} />
                    ))}
                </div>
              ) : (
                // ── Vista classica numerica ────────────────────────────────
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="px-4 py-2 text-left">Data</th>
                      <th className="px-4 py-2 text-left">Voto</th>
                      <th className="px-4 py-2 text-left hidden md:table-cell">
                        Periodo
                      </th>
                      <th className="px-4 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voti
                      .slice()
                      .sort((a, b) => b.evtDate.localeCompare(a.evtDate))
                      .map((v, i) => (
                        <tr
                          key={`${v.evtDate}-${i}`}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-4 py-2 text-gray-500">
                            {format(parseISO(v.evtDate), "d MMM", {
                              locale: it,
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${v.decimalValue != null ? gradeColorNumerico(v.decimalValue) : "text-gray-500"}`}
                            >
                              {v.displayValue || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                            {v.periodDesc}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {v.notesForFamily || "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}

      {!isLoading && subjects.length === 0 && (
        <p className="text-gray-500 text-sm">Nessun voto disponibile.</p>
      )}
    </div>
  );
}

function VotoSkillRow({ voto }: { voto: Voto }) {
  const votoTestuale = votoTestualeDisplay(voto);

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">
              {format(parseISO(voto.evtDate), "d MMM", { locale: it })}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{voto.periodDesc}</span>
          </div>
          {voto.notesForFamily && (
            <p className="text-sm text-gray-700 mb-2">{voto.notesForFamily}</p>
          )}
          {voto.skills?.map((s: Skill) => (
            <SkillRow key={s.evtId} skill={s} />
          ))}
        </div>
        {votoTestuale && (
          <span
            className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${COLOR_TESTUALE[votoTestuale]}`}
          >
            {votoTestuale.charAt(0) + votoTestuale.slice(1).toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const vt = estraiVotoTestuale(skill.skillValueNote);
  return (
    <div className="flex items-start justify-between gap-2 mt-1.5">
      <p className="text-xs text-gray-500 flex-1">{skill.skillDesc}</p>
      {vt && (
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${COLOR_TESTUALE[vt]}`}
        >
          {vt.charAt(0) + vt.slice(1).toLowerCase()}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
      {message}
    </div>
  );
}
