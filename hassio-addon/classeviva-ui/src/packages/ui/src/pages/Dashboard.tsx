import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { assenzeApi, lezioniApi, votiApi } from "../api.ts";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0]!;
}

function gradeColor(v: number): string {
  if (v >= 8) return "text-green-700";
  if (v >= 6) return "text-blue-700";
  if (v >= 5) return "text-yellow-700";
  return "text-red-700";
}

export default function Dashboard() {
  const oggi = new Date();
  const sette = new Date();
  sette.setDate(oggi.getDate() - 7);

  const { data: votiData } = useQuery({
    queryKey: ["voti"],
    queryFn: votiApi.get,
  });

  const { data: assenzeData } = useQuery({
    queryKey: ["assenze"],
    queryFn: assenzeApi.get,
  });

  const { data: lezioniData } = useQuery({
    queryKey: ["lezioni", toDateInput(sette), toDateInput(oggi)],
    queryFn: () =>
      lezioniApi.get({ inizio: toDateInput(sette), fine: toDateInput(oggi) }),
  });

  const grades = votiData?.grades ?? [];
  const absences = assenzeData?.events ?? [];

  const nonGiustificate = absences.filter((a) => !a.isJustified).length;

  // Compiti: lezioni con lessonArg non vuoto, ordinate dalla più recente
  const compiti = (lezioniData?.lessons ?? [])
    .filter((l) => l.lessonArg && l.lessonArg.trim().length > 0)
    .sort((a, b) => (b.evtDate ?? "").localeCompare(a.evtDate ?? ""));

  // Media generale
  const numerici = grades.filter(
    (g) => !isNaN(g.decimalValue) && g.decimalValue > 0,
  );
  const mediaGenerale =
    numerici.length > 0
      ? (
          numerici.reduce((s, g) => s + g.decimalValue, 0) / numerici.length
        ).toFixed(2)
      : "—";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <p
            className={`text-3xl font-bold ${gradeColor(parseFloat(mediaGenerale))}`}
          >
            {mediaGenerale}
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
            Nessun compito registrato negli ultimi 7 giorni.
          </p>
        ) : (
          <div className="space-y-3">
            {compiti.map((l) => (
              <div
                key={l.evtId}
                className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0"
              >
                <span className="text-xs font-semibold text-indigo-600 w-16 shrink-0 pt-0.5">
                  {format(parseISO(l.evtDate), "d MMM", { locale: it })}
                </span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    {l.subjectDesc}
                  </p>
                  <p className="text-sm text-gray-800">{l.lessonArg}</p>
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
                  <span
                    className={`text-lg font-bold w-12 text-center ${gradeColor(g.decimalValue)}`}
                  >
                    {g.displayValue}
                  </span>
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
