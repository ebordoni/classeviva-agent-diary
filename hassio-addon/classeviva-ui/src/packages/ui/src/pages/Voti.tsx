import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { votiApi } from "../api.ts";
import {
  COLOR_TESTUALE,
  VALORE_NUMERICO,
  VOTI_TESTUALI,
  isVotoSkill,
  votoTestualeDisplay,
  type VotoTestuale,
} from "../gradeUtils.ts";
import type { Skill, Voto } from "../types.ts";

function gradeColorNumerico(v: number): string {
  if (v >= 8) return "text-green-700 bg-green-50";
  if (v >= 6) return "text-blue-700 bg-blue-50";
  if (v >= 5) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
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

  function avgTestuale(
    voti: Voto[],
  ): { valore: number; label: VotoTestuale } | null {
    const valori = voti
      .map((v) => votoTestualeDisplay(v))
      .filter((vt): vt is VotoTestuale => vt != null)
      .map((vt) => VALORE_NUMERICO[vt]);
    if (valori.length === 0) return null;
    const mean = valori.reduce((a, b) => a + b, 0) / valori.length;
    const label = VOTI_TESTUALI.reduce((prev, curr) =>
      Math.abs(VALORE_NUMERICO[curr] - mean) <
      Math.abs(VALORE_NUMERICO[prev] - mean)
        ? curr
        : prev,
    );
    return { valore: mean, label };
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
        const mediaTestuale = avgTestuale(voti);

        return (
          <div key={subject} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {subject}
              </h2>
              {usaSkill && mediaTestuale ? (
                <span
                  className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${COLOR_TESTUALE[mediaTestuale.label]}`}
                >
                  Media: {mediaTestuale.valore.toFixed(2)}{" "}
                  <span className="font-normal">
                    (
                    {mediaTestuale.label.charAt(0) +
                      mediaTestuale.label.slice(1).toLowerCase()}
                    )
                  </span>
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
    <div className="px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400">
            {format(parseISO(voto.evtDate), "d MMM", { locale: it })}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">{voto.periodDesc}</span>
        </div>
        {voto.notesForFamily && (
          <p className="text-sm text-gray-700 mb-1">{voto.notesForFamily}</p>
        )}
        {voto.skills?.map((s: Skill) => (
          <SkillRow key={s.evtId} skill={s} />
        ))}
      </div>
      <div className="shrink-0 w-28 flex justify-center">
        {votoTestuale && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLOR_TESTUALE[votoTestuale]}`}
          >
            {votoTestuale.charAt(0) + votoTestuale.slice(1).toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  return <p className="text-xs text-gray-500 mt-1">{skill.skillDesc}</p>;
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
