import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { assenzeApi } from "../api.ts";
import type { Assenza } from "../types.ts";

function evtLabel(code: string): string {
  if (code === "ABA") return "Assenza";
  if (code === "ABR") return "Ritardo";
  if (code === "ABU") return "Uscita anticipata";
  return code;
}

function evtBadge(code: string): string {
  if (code === "ABA") return "bg-red-100 text-red-700";
  if (code === "ABR") return "bg-yellow-100 text-yellow-700";
  if (code === "ABU") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

export default function Assenze() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["assenze"],
    queryFn: assenzeApi.get,
  });

  const events: Assenza[] = [...(data?.events ?? [])].sort((a, b) =>
    b.evtDate.localeCompare(a.evtDate),
  );

  const totale = events.length;
  const nonGiustificate = events.filter((e) => !e.isJustified).length;
  const assenzeTot = events.filter((e) => e.evtCode === "ABA").length;
  const ritardiTot = events.filter((e) => e.evtCode === "ABR").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assenze</h1>
        {data?.fromCache && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            📦 cache
          </span>
        )}
      </div>

      {!isLoading && totale > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Totale" value={totale} color="gray" />
          <StatCard label="Assenze" value={assenzeTot} color="red" />
          <StatCard label="Ritardi" value={ritardiTot} color="yellow" />
          <StatCard
            label="Da giustificare"
            value={nonGiustificate}
            color="orange"
          />
        </div>
      )}

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {!isLoading && events.length === 0 && (
        <p className="text-gray-500 text-sm">Nessuna assenza registrata.</p>
      )}

      {events.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Giustificata</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Motivazione
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr
                  key={`${e.evtDate}-${e.evtCode}-${i}`}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 text-gray-700">
                    {format(parseISO(e.evtDate), "EEE d MMM yyyy", {
                      locale: it,
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${evtBadge(e.evtCode)}`}
                    >
                      {evtLabel(e.evtCode)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {e.isJustified ? (
                      <span className="text-green-600 text-xs">✅ Sì</span>
                    ) : (
                      <span className="text-orange-600 text-xs">⏳ No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                    {e.justifReasonDesc || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    gray: "bg-gray-50 text-gray-700",
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color] ?? colors["gray"]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-70">{label}</div>
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
