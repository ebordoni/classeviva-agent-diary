import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "react-router-dom";
import { agendaApi, assenzeApi, votiApi } from "../api.ts";

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
  const tra14 = new Date();
  tra14.setDate(oggi.getDate() + 14);

  const { data: votiData } = useQuery({
    queryKey: ["voti"],
    queryFn: votiApi.get,
  });

  const { data: assenzeData } = useQuery({
    queryKey: ["assenze"],
    queryFn: assenzeApi.get,
  });

  const { data: agendaData } = useQuery({
    queryKey: ["agenda", toDateInput(oggi), toDateInput(tra14)],
    queryFn: () =>
      agendaApi.get({ inizio: toDateInput(oggi), fine: toDateInput(tra14) }),
  });

  const grades = votiData?.grades ?? [];
  const absences = assenzeData?.events ?? [];
  const events = agendaData?.agenda ?? [];

  const nonGiustificate = absences.filter((a) => !a.isJustified).length;
  const prossimi = events.slice(0, 5);

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
        <Link
          to="/voti"
          className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:border-indigo-200 transition-colors"
        >
          <p
            className={`text-3xl font-bold ${gradeColor(parseFloat(mediaGenerale))}`}
          >
            {mediaGenerale}
          </p>
          <p className="text-xs text-gray-500 mt-1">Media voti</p>
        </Link>
        <Link
          to="/voti"
          className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:border-indigo-200 transition-colors"
        >
          <p className="text-3xl font-bold text-gray-800">{grades.length}</p>
          <p className="text-xs text-gray-500 mt-1">Voti totali</p>
        </Link>
        <Link
          to="/assenze"
          className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:border-indigo-200 transition-colors"
        >
          <p className="text-3xl font-bold text-gray-800">{absences.length}</p>
          <p className="text-xs text-gray-500 mt-1">Assenze totali</p>
        </Link>
        <Link
          to="/assenze"
          className={`bg-white rounded-xl border shadow-sm px-4 py-4 hover:border-orange-200 transition-colors ${nonGiustificate > 0 ? "border-orange-200" : "border-gray-100"}`}
        >
          <p
            className={`text-3xl font-bold ${nonGiustificate > 0 ? "text-orange-600" : "text-gray-800"}`}
          >
            {nonGiustificate}
          </p>
          <p className="text-xs text-gray-500 mt-1">Da giustificare</p>
        </Link>
      </div>

      {/* Prossimi eventi */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Prossimi eventi
          </h2>
          <Link
            to="/agenda"
            className="text-xs text-indigo-600 hover:underline"
          >
            Vedi tutto
          </Link>
        </div>
        {prossimi.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nessun evento nei prossimi 14 giorni.
          </p>
        ) : (
          <div className="space-y-2">
            {prossimi.map((e) => {
              const date = parseISO(e.evtDatetimeBegin.split("T")[0]!);
              const label = isToday(date)
                ? "Oggi"
                : isTomorrow(date)
                  ? "Domani"
                  : format(date, "d MMM", { locale: it });
              return (
                <div key={e.evtId} className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-indigo-600 w-14 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <div>
                    {e.subjectDesc && (
                      <span className="text-xs text-gray-400">
                        {e.subjectDesc} —{" "}
                      </span>
                    )}
                    <span className="text-sm text-gray-800">{e.evtText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ultimi voti */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Ultimi voti</h2>
          <Link to="/voti" className="text-xs text-indigo-600 hover:underline">
            Vedi tutto
          </Link>
        </div>
        {grades.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun voto disponibile.</p>
        ) : (
          <div className="space-y-2">
            {grades
              .slice()
              .sort((a, b) => b.evtDate.localeCompare(a.evtDate))
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
