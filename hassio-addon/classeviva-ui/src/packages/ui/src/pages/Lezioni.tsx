import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { lezioniApi } from "../api.ts";
import type { Lezione } from "../types.ts";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0]!;
}

function defaultRange() {
  const fine = new Date();
  const inizio = new Date();
  inizio.setDate(fine.getDate() - 7);
  return { inizio: toDateInput(inizio), fine: toDateInput(fine) };
}

interface RigaLezione {
  evtId: number;
  oreInizio: number;
  oreFine: number;
  subjectDesc: string;
  authorName: string;
  argomento: string;
}

/**
 * Ordina per ora e accorpa le lezioni consecutive identiche (stessa materia,
 * stesso docente, stesso argomento): Classeviva a volte restituisce la stessa
 * voce ripetuta su più ore consecutive.
 */
function raggruppaLezioni(lessons: Lezione[]): RigaLezione[] {
  const ordinate = [...lessons].sort((a, b) => a.evtHPos - b.evtHPos);
  const righe: RigaLezione[] = [];

  for (const l of ordinate) {
    const argomento = l.lessonArg || "—";
    const precedente = righe[righe.length - 1];
    if (
      precedente &&
      precedente.subjectDesc === l.subjectDesc &&
      precedente.authorName === l.authorName &&
      precedente.argomento === argomento &&
      precedente.oreFine === l.evtHPos - 1
    ) {
      precedente.oreFine = l.evtHPos;
    } else {
      righe.push({
        evtId: l.evtId,
        oreInizio: l.evtHPos,
        oreFine: l.evtHPos,
        subjectDesc: l.subjectDesc,
        authorName: l.authorName,
        argomento,
      });
    }
  }

  return righe;
}

export default function Lezioni() {
  const [range, setRange] = useState(defaultRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["lezioni", range.inizio, range.fine],
    queryFn: () => lezioniApi.get({ inizio: range.inizio, fine: range.fine }),
  });

  const byDate = new Map<string, NonNullable<typeof data>["lessons"]>();
  for (const l of data?.lessons ?? []) {
    if (!byDate.has(l.evtDate)) byDate.set(l.evtDate, []);
    byDate.get(l.evtDate)!.push(l);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lezioni</h1>
        {data?.fromCache && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            📦 cache
          </span>
        )}
      </div>

      <div className="flex gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Da</label>
          <input
            type="date"
            value={range.inizio}
            onChange={(e) =>
              setRange((r) => ({ ...r, inizio: e.target.value }))
            }
            className="border border-gray-200 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">A</label>
          <input
            type="date"
            value={range.fine}
            onChange={(e) => setRange((r) => ({ ...r, fine: e.target.value }))}
            className="border border-gray-200 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {!isLoading && dates.length === 0 && (
        <p className="text-gray-500 text-sm">
          Nessuna lezione nel periodo selezionato.
        </p>
      )}

      {dates.map((date) => (
        <div key={date} className="mb-5">
          <h2 className="text-sm font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
            {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })}
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2 text-left w-8">Ora</th>
                  <th className="px-4 py-2 text-left">Materia</th>
                  <th className="px-4 py-2 text-left hidden md:table-cell">
                    Docente
                  </th>
                  <th className="px-4 py-2 text-left">Argomento</th>
                </tr>
              </thead>
              <tbody>
                {raggruppaLezioni(byDate.get(date) ?? []).map((r, i) => (
                  <tr
                    key={r.evtId}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-2 text-gray-400 font-mono">
                      {r.oreInizio === r.oreFine
                        ? `${r.oreInizio}ª`
                        : `${r.oreInizio}ª-${r.oreFine}ª`}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {r.subjectDesc}
                    </td>
                    <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                      {r.authorName}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.argomento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
