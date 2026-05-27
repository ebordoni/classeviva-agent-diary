import { useQuery } from "@tanstack/react-query";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import type { AccountInfo } from "./api.ts";
import { authApi } from "./api.ts";
import Layout from "./components/Layout.tsx";
import Assenze from "./pages/Assenze.tsx";
import Bacheca from "./pages/Bacheca.tsx";
import Compiti from "./pages/Compiti.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Lezioni from "./pages/Lezioni.tsx";
import Login from "./pages/Login.tsx";
import Voti from "./pages/Voti.tsx";

function AppRoutes() {
  const location = useLocation();
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
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/lezioni" element={<Lezioni />} />
                <Route path="/voti" element={<Voti />} />
                <Route path="/assenze" element={<Assenze />} />
                <Route path="/compiti" element={<Compiti />} />
                <Route path="/bacheca" element={<Bacheca />} />
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
