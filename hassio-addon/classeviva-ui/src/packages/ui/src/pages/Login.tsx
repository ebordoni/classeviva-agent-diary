import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AccountInfo } from "../api.ts";
import { authApi } from "../api.ts";

interface Props {
  accounts: AccountInfo[];
}

export default function Login({ accounts }: Props) {
  const [studentId, setStudentId] = useState(accounts[0]?.studentId ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.login(studentId, password);
      queryClient.setQueryData(["me"], {
        authenticated: true,
        user: result.user,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-5xl">🏫</span>
          <h1 className="text-2xl font-bold mt-3 text-gray-900">Classeviva</h1>
          <p className="text-sm text-gray-500 mt-1">Accedi al registro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID
            </label>
            {accounts.length > 0 ? (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.studentId} value={a.studentId}>
                    {a.nome ? `${a.nome} (${a.studentId})` : a.studentId}
                  </option>
                ))}
                <option value="">+ Nuovo account…</option>
              </select>
            ) : null}
            {(accounts.length === 0 || studentId === "") && (
              <input
                type="text"
                value={studentId === "" ? "" : studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="S1234567"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus={accounts.length > 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}

