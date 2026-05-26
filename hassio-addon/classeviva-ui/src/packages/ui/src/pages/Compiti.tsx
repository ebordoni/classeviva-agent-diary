import { useMutation } from "@tanstack/react-query";
import { format, isPast, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { compitiApi } from "../api.ts";
import type { CompitiResponse } from "../types.ts";

const PROVIDERS = ["openai", "google", "anthropic", "groq", "xai"] as const;

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0]!;
}

export default function Compiti() {
  const [giorni, setGiorni] = useState(10);
  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const fine = new Date();
      const inizio = new Date();
      inizio.setDate(fine.getDate() - giorni);
      return compitiApi.get({
        inizio: toDateInput(inizio),
        fine: toDateInput(fine),
        ...(provider ? { provider } : {}),
        ...(apiKey ? { apiKey } : {}),
        ...(model ? { model } : {}),
      });
    },
  });

  const result: CompitiResponse | undefined = mutation.data;

  const byDeadline = new Map<string, NonNullable<typeof result>["compiti"]>();
  for (const c of result?.compiti ?? []) {
    const key = c.scadenza ?? "senza scadenza";
    if (!byDeadline.has(key)) byDeadline.set(key, []);
    byDeadline.get(key)!.push(c);
  }
  const deadlines = [...byDeadline.keys()].sort();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Compiti AI</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Configurazione
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Giorni da analizzare: <strong>{giorni}</strong>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={giorni}
              onChange={(e) => setGiorni(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Provider AI (opzionale)
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Usa configurazione addon</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              API Key (opzionale)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Usa configurazione addon"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Modello (opzionale)
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Es. gpt-4o-mini"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {mutation.isPending ? "Analisi in corso…" : "Estrai compiti"}
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-gray-500">
              {result.metadata.totale_compiti} compiti trovati su{" "}
              {result.metadata.totale_lezioni} giorni —{" "}
              {result.metadata.modello_utilizzato}
            </p>
            {result.fromCache && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                📦 cache
              </span>
            )}
          </div>

          {result.compiti.length === 0 && (
            <p className="text-gray-500 text-sm">
              🎉 Nessun compito trovato nel periodo.
            </p>
          )}

          {deadlines.map((deadline) => {
            const isExpired =
              deadline !== "senza scadenza" &&
              isPast(parseISO(deadline)) &&
              !isToday(parseISO(deadline));
            const isScadenzaOggi =
              deadline !== "senza scadenza" && isToday(parseISO(deadline));

            return (
              <div key={deadline} className="mb-4">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  {isExpired && <span className="text-red-500">⚠️</span>}
                  {isScadenzaOggi && (
                    <span className="text-orange-500">🔴</span>
                  )}
                  <span
                    className={
                      isExpired
                        ? "text-red-600"
                        : isScadenzaOggi
                          ? "text-orange-600"
                          : "text-indigo-600"
                    }
                  >
                    Entro{" "}
                    {deadline === "senza scadenza"
                      ? "data non specificata"
                      : format(parseISO(deadline), "EEEE d MMMM", {
                          locale: it,
                        })}
                  </span>
                </h2>
                <div className="space-y-2">
                  {(byDeadline.get(deadline) ?? []).map((c, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                    >
                      <p className="text-xs font-semibold text-indigo-600 mb-0.5">
                        {c.materia}
                      </p>
                      <p className="text-sm text-gray-800">{c.testo}</p>
                      {c.note && (
                        <p className="text-xs text-gray-400 mt-1">{c.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
