import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { AccountInfo } from "./api.ts";
import { authApi } from "./api.ts";
import Layout from "./components/Layout.tsx";
import Assenze from "./pages/Assenze.tsx";
import Avvisi from "./pages/Avvisi.tsx";
import Bacheca from "./pages/Bacheca.tsx";
import Compiti from "./pages/Compiti.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Lezioni from "./pages/Lezioni.tsx";
import Login from "./pages/Login.tsx";
import Materie from "./pages/Materie.tsx";
import Voti from "./pages/Voti.tsx";

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    const expired = (event: Event) => {
      void queryClient.cancelQueries();
      queryClient.removeQueries({ predicate: q => q.queryKey[0] !== "me" });
      queryClient.setQueryData(["me"], (old: typeof data) => ({ ...old, authenticated: false, user: undefined }));
      navigate("/login", { replace: true, state: { error: (event as CustomEvent).detail || "Accedi nuovamente al registro." } });
    };
    window.addEventListener("classeviva:login-required", expired);
    return () => window.removeEventListener("classeviva:login-required", expired);
  }, [navigate, queryClient]);
  const addAccount =
    (location.state as { addAccount?: boolean } | null)?.addAccount === true;
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
  });

  if (isLoading && location.pathname !== "/login") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const authenticated = data?.authenticated ?? false;
  const userName = data?.user?.nome ?? "";
  const activeStudentId = data?.user?.ident ?? "";
  const accounts: AccountInfo[] = data?.accounts ?? [];
  const mobileAuth = data?.user?.authType === "spid";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authenticated && !addAccount ? (
            <Navigate to="/" replace />
          ) : (
            <Login accounts={accounts} forceNew={addAccount} />
          )
        }
      />
      {authenticated ? (
        <Route
          path="/*"
          element={
            <Layout
              userName={userName}
              activeStudentId={activeStudentId}
              accounts={accounts}
              mobileAuth={mobileAuth}
            >
              <Routes>
                <Route path="/" element={<Dashboard mobileAuth={mobileAuth} />} />
                <Route path="/lezioni" element={<Lezioni />} />
                <Route path="/materie" element={<Materie />} />
                <Route path="/voti" element={mobileAuth ? <Navigate to="/" replace /> : <Voti />} />
                <Route path="/assenze" element={<Assenze />} />
                <Route path="/compiti" element={<Compiti />} />
                <Route path="/avvisi" element={mobileAuth ? <Navigate to="/" replace /> : <Avvisi />} />
                <Route path="/bacheca" element={mobileAuth ? <Navigate to="/" replace /> : <Bacheca />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
