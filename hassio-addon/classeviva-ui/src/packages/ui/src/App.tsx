import { useQuery } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { authApi } from "./api.ts";
import Layout from "./components/Layout.tsx";
import Agenda from "./pages/Agenda.tsx";
import Assenze from "./pages/Assenze.tsx";
import Bacheca from "./pages/Bacheca.tsx";
import Compiti from "./pages/Compiti.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Didattica from "./pages/Didattica.tsx";
import Lezioni from "./pages/Lezioni.tsx";
import Login from "./pages/Login.tsx";
import Materie from "./pages/Materie.tsx";
import Note from "./pages/Note.tsx";
import Voti from "./pages/Voti.tsx";

function AppRoutes() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const authenticated = data?.authenticated ?? false;
  const userName = data?.user?.nome ?? "";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login savedStudentId={data?.savedStudentId ?? null} />
          )
        }
      />
      {authenticated ? (
        <Route
          path="/*"
          element={
            <Layout userName={userName}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/lezioni" element={<Lezioni />} />
                <Route path="/voti" element={<Voti />} />
                <Route path="/assenze" element={<Assenze />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/materie" element={<Materie />} />
                <Route path="/compiti" element={<Compiti />} />
                <Route path="/note" element={<Note />} />
                <Route path="/bacheca" element={<Bacheca />} />
                <Route path="/didattica" element={<Didattica />} />
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
