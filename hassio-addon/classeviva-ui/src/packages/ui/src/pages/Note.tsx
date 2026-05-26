import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "../api.ts";
import type { Nota } from "../types.ts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

function Section({ title, notes }: { title: string; notes: Nota[] }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ eventCode, evtId }: { eventCode: string; evtId: number }) =>
      noteApi.leggi(eventCode, evtId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note"] }),
  });

  if (notes.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      <div className="space-y-2">
        {notes.map((n) => (
          <div
            key={n.evtId}
            className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${
              n.readStatus ? "border-gray-100" : "border-orange-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">
                  {format(parseISO(n.evtDate), "d MMM yyyy", { locale: it })} —{" "}
                  {n.authorName}
                </p>
                <p className="text-sm text-gray-800">{n.evtText}</p>
              </div>
              {!n.readStatus && (
                <button
                  onClick={() =>
                    mutation.mutate({ eventCode: n.warningType, evtId: n.evtId })
                  }
                  disabled={mutation.isPending}
                  className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                >
                  Segna letta
                </button>
              )}
              {n.readStatus && (
                <span className="text-xs text-gray-400">✅</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Note() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["note"],
    queryFn: noteApi.get,
  });

  const ntte = data?.NTTE ?? [];
  const ntcl = data?.NTCL ?? [];
  const ntwn = data?.NTWN ?? [];
  const totale = ntte.length + ntcl.length + ntwn.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Note disciplinari</h1>

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {!isLoading && totale === 0 && (
        <p className="text-gray-500 text-sm">Nessuna nota presente.</p>
      )}

      <Section title="Note" notes={ntte} />
      <Section title="Annotazioni" notes={ntcl} />
      <Section title="Avvertimenti" notes={ntwn} />
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
