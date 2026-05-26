import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { bachecaApi } from "../api.ts";

export default function Bacheca() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bacheca"],
    queryFn: bachecaApi.get,
  });

  const mutation = useMutation({
    mutationFn: ({ eventCode, pubId }: { eventCode: string; pubId: number }) =>
      bachecaApi.leggi(eventCode, pubId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bacheca"] }),
  });

  const items = [...(data?.items ?? [])].sort((a, b) =>
    b.pubDT.localeCompare(a.pubDT),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bacheca</h1>

      {isLoading && <Spinner />}
      {error && <ErrorMsg message={(error as Error).message} />}

      {!isLoading && items.length === 0 && (
        <p className="text-gray-500 text-sm">
          Nessuna comunicazione disponibile.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.pubId}
            className={`bg-white rounded-xl border shadow-sm px-4 py-4 ${
              item.readStatus ? "border-gray-100" : "border-indigo-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {!item.readStatus && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                  <p className="text-sm font-medium text-gray-800">
                    {item.cntTitle}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{item.cntCategory}</span>
                  <span>
                    {format(parseISO(item.pubDT.split(" ")[0]!), "d MMM yyyy", {
                      locale: it,
                    })}
                  </span>
                  {item.cntHasAttach && <span>📎 Allegato</span>}
                </div>
              </div>
              {!item.readStatus && (
                <button
                  onClick={() =>
                    mutation.mutate({ eventCode: "BCV", pubId: item.pubId })
                  }
                  disabled={mutation.isPending}
                  className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0"
                >
                  Segna letta
                </button>
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
