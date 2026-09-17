import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { agendaApi, assenzeApi, bachecaApi, compitiApi } from "../api.ts";
import { AVVISO_EVTCODE, defaultAvvisiRange } from "../agendaUtils.ts";

export default function Dashboard() {
  const { data: assenzeData } = useQuery({
    queryKey: ["assenze"],
    queryFn: assenzeApi.get,
  });

  const { data: bachecaData } = useQuery({
    queryKey: ["bacheca"],
    queryFn: bachecaApi.get,
  });

  const avvisiRange = defaultAvvisiRange();
  const { data: agendaData } = useQuery({
    queryKey: ["agenda", avvisiRange.inizio, avvisiRange.fine],
    queryFn: () => agendaApi.get(avvisiRange),
  });

  const { data: compitiData } = useQuery({
    queryKey: ["compiti-cached"],
    queryFn: () => compitiApi.getCached(7),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const absences = assenzeData?.events ?? [];
  const nonGiustificate = absences.filter((a) => !a.isJustified).length;

  const bachecaDaLeggere = (bachecaData?.items ?? []).filter(
    (i) => !i.readStatus,
  ).length;

  const avvisiInArrivo = (agendaData?.agenda ?? []).filter(
    (e) => e.evtCode === AVVISO_EVTCODE,
  ).length;

  const oggi = new Date().toISOString().split("T")[0]!;
  const tuttiCompiti = compitiData?.compiti ?? [];
  const compitiDaEseguire = tuttiCompiti.filter(
    (c) => c.scadenza >= oggi,
  ).length;

  const compiti = tuttiCompiti
    .slice()
    .sort((a, b) => b.data_lezione.localeCompare(a.data_lezione));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${compitiDaEseguire > 0 ? "border-indigo-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${compitiDaEseguire > 0 ? "text-indigo-600" : "text-gray-800"}`}
          >
            {compitiDaEseguire}
          </p>
          <p className="text-xs text-gray-500 mt-1">Compiti da eseguire</p>
        </div>
        <div
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${avvisiInArrivo > 0 ? "border-amber-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${avvisiInArrivo > 0 ? "text-amber-600" : "text-gray-800"}`}
          >
            {avvisiInArrivo}
          </p>
          <p className="text-xs text-gray-500 mt-1">Avvisi</p>
        </div>
        <div
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${bachecaDaLeggere > 0 ? "border-sky-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${bachecaDaLeggere > 0 ? "text-sky-600" : "text-gray-800"}`}
          >
            {bachecaDaLeggere}
          </p>
          <p className="text-xs text-gray-500 mt-1">Bacheca da leggere</p>
        </div>
        <div
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${nonGiustificate > 0 ? "border-orange-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${nonGiustificate > 0 ? "text-orange-600" : "text-gray-800"}`}
          >
            {nonGiustificate}
          </p>
          <p className="text-xs text-gray-500 mt-1">Assenze da giustificare</p>
        </div>
      </div>

      {/* Compiti degli ultimi 7 giorni */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          📚 Compiti degli ultimi 7 giorni
        </h2>
        {compiti.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nessun compito in cache per gli ultimi 7 giorni.
          </p>
        ) : (
          <div className="space-y-3">
            {compiti.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0"
              >
                <span className="text-xs font-semibold text-indigo-600 w-16 shrink-0 pt-0.5">
                  {format(parseISO(c.data_lezione), "d MMM", { locale: it })}
                </span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{c.materia}</p>
                  <p className="text-sm text-gray-800">{c.testo}</p>
                  {c.note && (
                    <p className="text-xs text-gray-500 mt-0.5">{c.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
