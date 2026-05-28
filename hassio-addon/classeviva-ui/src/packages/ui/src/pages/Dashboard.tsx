import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { assenzeApi, compitiApi, votiApi } from "../api.ts";
import {
  calcolaMedia,
  COLOR_TESTUALE,
  VALORE_NUMERICO,
  valoreNumericoVoto,
  VOTI_TESTUALI,
  votoTestualeDisplay,
  type VotoTestuale,
} from "../gradeUtils.ts";

function gradeColor(v: number): string {
  if (v >= 8) return "text-green-700";
  if (v >= 6) return "text-blue-700";
  if (v >= 5) return "text-yellow-700";
  return "text-red-700";
}

export default function Dashboard() {
  const { data: votiData } = useQuery({
    queryKey: ["voti"],
    queryFn: votiApi.get,
  });

  const { data: assenzeData } = useQuery({
    queryKey: ["assenze"],
    queryFn: assenzeApi.get,
  });

  const { data: compitiData } = useQuery({
    queryKey: ["compiti-cached"],
    queryFn: () => compitiApi.getCached(7),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const grades = votiData?.grades ?? [];
  const absences = assenzeData?.events ?? [];

  const nonGiustificate = absences.filter((a) => !a.isJustified).length;

  const compiti = (compitiData?.compiti ?? [])
    .slice()
    .sort((a, b) => b.data_lezione.localeCompare(a.data_lezione));

  // Media generale (numerici + testuali)
  const mediaRaw = calcolaMedia(grades);
  const mediaGenerale = mediaRaw !== null ? mediaRaw.toFixed(2) : "—";
  const mediaLabel: VotoTestuale | null =
    mediaRaw !== null
      ? VOTI_TESTUALI.reduce((prev, curr) =>
          Math.abs(VALORE_NUMERICO[curr] - mediaRaw) <
          Math.abs(VALORE_NUMERICO[prev] - mediaRaw)
            ? curr
            : prev,
        )
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <p
            className={`text-3xl font-bold ${gradeColor(parseFloat(mediaGenerale))}`}
          >
            {mediaLabel
              ? mediaLabel.charAt(0) + mediaLabel.slice(1).toLowerCase()
              : mediaGenerale}
          </p>
          <p className="text-xs text-gray-500 mt-1">Media voti</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <p className="text-3xl font-bold text-gray-800">{grades.length}</p>
          <p className="text-xs text-gray-500 mt-1">Voti totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <p className="text-3xl font-bold text-gray-800">{absences.length}</p>
          <p className="text-xs text-gray-500 mt-1">Assenze totali</p>
        </div>
        <div
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${nonGiustificate > 0 ? "border-orange-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${nonGiustificate > 0 ? "text-orange-600" : "text-gray-800"}`}
          >
            {nonGiustificate}
          </p>
          <p className="text-xs text-gray-500 mt-1">Da giustificare</p>
        </div>
      </div>

      {/* Compiti degli ultimi 7 giorni */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
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

      {/* Ultimi voti */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Ultimi voti
        </h2>
        {grades.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun voto disponibile.</p>
        ) : (
          <div className="space-y-2">
            {grades
              .slice()
              .sort((a, b) => (b.evtDate ?? "").localeCompare(a.evtDate ?? ""))
              .slice(0, 6)
              .map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  {(() => {
                    const vt = votoTestualeDisplay(g);
                    const val = valoreNumericoVoto(g);
                    if (vt) {
                      return (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full w-20 text-center shrink-0 ${COLOR_TESTUALE[vt]}`}
                        >
                          {vt.charAt(0) + vt.slice(1).toLowerCase()}
                        </span>
                      );
                    }
                    return (
                      <span
                        className={`text-lg font-bold w-12 text-center shrink-0 ${gradeColor(val ?? 0)}`}
                      >
                        {g.displayValue || "—"}
                      </span>
                    );
                  })()}
                  <div>
                    <p className="text-sm text-gray-800">{g.subjectDesc}</p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(g.evtDate), "d MMM", { locale: it })} —{" "}
                      {g.skillDesc || g.periodDesc}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
