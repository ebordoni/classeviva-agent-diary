import { useState } from "react";
import { accountsApi } from "../api.ts";

export default function ProfileDiagnostics() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function run() {
    setRunning(true); setError(""); setReport(""); setCopied(false);
    try { setReport(JSON.stringify(await accountsApi.probeSpidProfiles(), null, 2)); }
    catch (err) { setError(err instanceof Error ? err.message : "Verifica non riuscita."); }
    finally { setRunning(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(report); setCopied(true); }
    catch { setError("Seleziona e copia il testo dell’esito qui sotto."); }
  }
  return <details className="border-t pt-4 text-sm">
    <summary className="cursor-pointer text-gray-600">Diagnostica del cambio profilo</summary>
    <p className="mt-3 text-gray-600">Verifica se la sessione SPID/CIE già collegata espone gli altri profili, compresi gli account salvati in precedenza con password. Non richiede un nuovo login e non modifica gli account.</p>
    <button disabled={running} onClick={run} className="mt-3 w-full border border-indigo-600 text-indigo-700 rounded-lg p-2 disabled:opacity-60">{running ? "Verifica in corso…" : "Verifica profili SPID/CIE"}</button>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {report && <><p className="mt-3 text-gray-600">L’esito contiene solo informazioni tecniche, senza nomi, codici utente o credenziali. Puoi condividerlo per l’analisi.</p><pre className="mt-3 p-3 bg-gray-100 rounded-lg overflow-x-auto text-xs">{report}</pre><button onClick={copy} className="mt-3 text-indigo-700">{copied ? "Esito copiato" : "Copia esito"}</button></>}
  </details>;
}
