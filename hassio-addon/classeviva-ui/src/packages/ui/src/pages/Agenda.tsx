import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agendaApi } from "../api.ts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0]!;
}

function defaultRange() {
  const oggi = new Date();
  const tra30 = new Date();
  tra30.setDate(oggi.getDate() + 30);
  return { inizio: toDateInput(oggi), fine: toDateInput(tra30) };
}

function evtIcon(code: string): string {
  if (code === "AGHW") return "📝";
  if (code === "AGNT") return "📋";
  if (code === "AGRE") return "📌";
  return "📅";
}

export default function Agenda() {
  const [range, setRange] = useState(defaultRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agenda", range.inizio, range.fine],
    queryFn: () => agendaApi.get({ inizio: range.inizio, fine: range.fine }),
  });

  const byDate = new Map<string, NonNullable<typeof data>["agenda"]>();
  for (const e of data?.agenda ?? []) {
    const date = e.evtDatetimeBegin.split("T")[0]!;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(e);
  }
  const dates = [...byDate.keys()].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        {data?.fromCache && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">📦 cache</span>
        )}
      </div>

      <div className="flex gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Da</label>
          <input
            type="date"
            value={range.inizio}
            onChange={(e) => setRange((r) => ({ ...r, inizio: e.target.value }))}
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
        <p className="text-gray-500 text-sm">Nessun evento nel periodo selezionato.</p>
      )}

      {dates.map((date) => (
        <div key={date} className="mb-4">
          <h2 className="text-sm font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
            {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })}
          </h2>
          <div className="space-y-2">
            {(byDate.get(date) ?? []).map((e) => (
              <div
                key={e.evtId}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex gap-3 items-start"
              >
                <span className="text-lg leading-none mt-0.5">{evtIcon(e.evtCode)}</span>
                <div>
                  {e.subjectDesc && (
                    <p className="text-xs font-semibold text-indigo-600 mb-0.5">{e.subjectDesc}</p>
                  )}
                  <p className="text-sm text-gray-800">{e.evtText}</p>
                  {e.authorName && (
                    <p className="text-xs text-gray-400 mt-0.5">{e.authorName}</p>
                  )}
                </div>
              </div>
            ))}
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
