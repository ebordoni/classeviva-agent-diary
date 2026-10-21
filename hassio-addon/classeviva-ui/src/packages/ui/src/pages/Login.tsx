import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accountsApi, authApi, type AccountInfo } from "../api.ts";
import SpidConnect from "../components/SpidConnect.tsx";

export default function Login({ accounts, forceNew = false }: { accounts: AccountInfo[]; forceNew?: boolean }) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  async function connected() {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ predicate: q => q.queryKey[0] !== "me" });
    await queryClient.refetchQueries({ queryKey: ["me"] });
    navigate("/", { replace: true });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try { await authApi.login(studentId, password); setPassword(""); await connected(); }
    catch (err) { setError(err instanceof Error ? err.message : "Errore di accesso"); }
    finally { setLoading(false); }
  }
  async function saved(account: AccountInfo, remove = false) {
    setLoading(true); setError(null);
    try {
      if (remove) { await accountsApi.remove(account.studentId); await queryClient.invalidateQueries({ queryKey: ["me"] }); }
      else { await accountsApi.switch(account.studentId); await connected(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Operazione non riuscita"); }
    finally { setLoading(false); }
  }
  return <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-lg space-y-6">
      <div className="text-center"><span className="text-5xl">🏫</span><h1 className="text-2xl font-bold mt-3 text-gray-900">Classeviva</h1><p className="text-sm text-gray-500 mt-1">{forceNew ? "Collega un altro account" : "Accedi al registro"}</p></div>
      {(error || location.state?.error) && <p role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error || location.state.error}</p>}
      {!forceNew && accounts.length > 0 && <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Account salvati</h2>
        {accounts.map(a => <div key={a.studentId} className="border rounded-lg p-3 flex gap-3 items-center">
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.nome || a.studentId}</p><p className="text-xs text-gray-500">{a.studentId} · {a.authType === "spid" ? (a.needsLogin ? "Da ricollegare con SPID/CIE" : "SPID/CIE") : "Password"}</p></div>
          <button disabled={loading || a.needsLogin} onClick={() => saved(a)} className="text-sm text-indigo-700 disabled:text-gray-400">Apri</button>
          <button disabled={loading} onClick={() => saved(a, true)} className="text-xs text-red-700">Rimuovi</button>
        </div>)}
      </section>}
      <SpidConnect onConnected={connected} />
      <details className="border-t pt-4 text-sm">
        <summary className="cursor-pointer text-gray-600">Accesso con password</summary>
        <p className="text-gray-500 mt-3">Disponibile solo per gli account che consentono ancora questo accesso.</p>
        <form onSubmit={submit} className="space-y-3 mt-3">
          <label className="block">Student ID<input value={studentId} onChange={e => setStudentId(e.target.value)} required autoComplete="username" placeholder="S1234567" className="block w-full border rounded-lg p-2 mt-1" /></label>
          <label className="block">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="block w-full border rounded-lg p-2 mt-1" /></label>
          <button disabled={loading} className="w-full border border-indigo-600 text-indigo-700 rounded-lg p-2">{loading ? "Accesso in corso…" : "Accedi con password"}</button>
        </form>
      </details>
      {forceNew && <button className="text-sm text-gray-600" onClick={() => navigate("/")}>Torna al diario</button>}
    </div>
  </div>;
}
