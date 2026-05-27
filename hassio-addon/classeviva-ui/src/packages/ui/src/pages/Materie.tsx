import { useQuery } from "@tanstack/react-query";
import { materieApi } from "../api.ts";

export default function Materie() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["materie"],
    queryFn: materieApi.get,
  });

  const subjects = [...(data?.subjects ?? [])].sort((a, b) =>
    (a.subjectDesc ?? "").localeCompare(b.subjectDesc ?? ""),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Materie</h1>
        {data?.fromCache && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            📦 cache
          </span>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {!isLoading && subjects.length === 0 && (
        <p className="text-gray-500 text-sm">Nessuna materia disponibile.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subjects.map((s) => (
          <div
            key={s.subjectId}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4"
          >
            <p className="font-semibold text-gray-800">{s.subjectDesc}</p>
            {s.teachers.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {s.teachers.map((t) => t.teacherName).join(", ")}
              </p>
            )}
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
