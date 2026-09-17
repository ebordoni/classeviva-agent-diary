import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { agendaApi } from "../api.ts";
import { AVVISO_EVTCODE, defaultAvvisiRange } from "../agendaUtils.ts";

export default function Avvisi() {
  const [range, setRange] = useState(defaultAvvisiRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agenda", range.inizio, range.fine],
    queryFn: () => agendaApi.get({ inizio: range.inizio, fine: range.fine }),
  });

  const avvisi = (data?.agenda ?? [])
    .filter((e) => e.evtCode === AVVISO_EVTCODE)
    .sort((a, b) => b.evtDatetimeBegin.localeCompare(a.evtDatetimeBegin));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Avvisi</h1>
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

      {!isLoading && avvisi.length === 0 && (
        <p className="text-gray-500 text-sm">
          Nessun avviso nel periodo selezionato.
        </p>
      )}

      <div className="space-y-3">
        {avvisi.map((a) => (
          <div
            key={a.evtId}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex gap-3 items-start"
          >
            <span className="text-lg leading-none mt-0.5">📢</span>
            <div>
              <p className="text-xs font-semibold text-indigo-600 mb-0.5">
                {format(parseISO(a.evtDatetimeBegin), "EEEE d MMMM yyyy", {
                  locale: it,
                })}
                {a.subjectDesc ? ` — ${a.subjectDesc}` : ""}
                {a.classDesc ? ` — ${a.classDesc}` : ""}
              </p>
              <p className="text-sm text-gray-800">{a.notes || "—"}</p>
              {a.authorName && (
                <p className="text-xs text-gray-400 mt-0.5">{a.authorName}</p>
              )}
            </div>
          </div>
        ))}
      </div>
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
