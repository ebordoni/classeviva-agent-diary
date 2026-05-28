import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { AccountInfo } from "../api.ts";
import { accountsApi, authApi, cacheApi } from "../api.ts";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/lezioni", icon: <BookOpen size={18} />, label: "Lezioni" },
  { to: "/voti", icon: <Star size={18} />, label: "Voti" },
  { to: "/assenze", icon: <Users size={18} />, label: "Assenze" },
  { to: "/compiti", icon: <Brain size={18} />, label: "Compiti AI" },
  { to: "/bacheca", icon: <Bell size={18} />, label: "Bacheca" },
];

interface LayoutProps {
  children: ReactNode;
  userName: string;
  activeStudentId: string;
  accounts: AccountInfo[];
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export default function Layout({
  children,
  userName,
  activeStudentId,
  accounts,
}: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  // Mobile: overlay open/closed — Desktop: expanded/collapsed
  const [sidebarOpen, setSidebarOpen] = useState(!isMobileViewport());
  const prevMobileRef = useRef(isMobile);

  useEffect(() => {
    const onResize = () => {
      const mobile = isMobileViewport();
      if (mobile !== prevMobileRef.current) {
        prevMobileRef.current = mobile;
        setIsMobile(mobile);
        setSidebarOpen(!mobile);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Chiude la sidebar su navigazione (solo mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      navigate("/login");
    }
  }

  async function handleRefresh() {
    try {
      await cacheApi.invalida();
      queryClient.invalidateQueries();
    } catch {
      // ignora
    }
  }

  async function handleSwitch(studentId: string) {
    if (studentId === activeStudentId) {
      setSwitcherOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await accountsApi.switch(studentId);
      await queryClient.refetchQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries();
    } finally {
      setSwitching(false);
      setSwitcherOpen(false);
    }
  }

  const otherAccounts = accounts.filter((a) => a.studentId !== activeStudentId);
  const expanded = sidebarOpen;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Backdrop mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "flex flex-col bg-gray-900 text-gray-100 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          isMobile
            ? `fixed top-0 left-0 h-full z-30 w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : `relative h-full z-auto ${expanded ? "w-56" : "w-14"}`,
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-3 py-4 border-b border-gray-700 shrink-0">
          <div
            className={`flex items-center ${expanded ? "justify-between" : "justify-center"}`}
          >
            {expanded && (
              <span className="text-base font-bold tracking-tight whitespace-nowrap">
                🏫 Classeviva
              </span>
            )}
            {/* Toggle solo su desktop */}
            {!isMobile && (
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                title={expanded ? "Comprimi menu" : "Espandi menu"}
              >
                {expanded ? (
                  <ChevronLeft size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            )}
          </div>

          {/* User switcher — visibile solo quando espanso */}
          {expanded && (
            <div className="relative mt-2">
              <button
                onClick={() => setSwitcherOpen((v) => !v)}
                disabled={switching}
                className="flex items-center gap-1 w-full text-left text-xs text-gray-300 hover:text-white transition-colors disabled:opacity-60"
              >
                <UserCheck size={13} className="shrink-0" />
                <span className="truncate flex-1">{userName}</span>
                <ChevronDown size={13} className="shrink-0" />
              </button>

              {switcherOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                  <p className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700">
                    Cambia utente
                  </p>
                  {otherAccounts.map((a) => (
                    <button
                      key={a.studentId}
                      onClick={() => handleSwitch(a.studentId)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      <UserCheck size={14} />
                      <span className="truncate">{a.nome ?? a.studentId}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSwitcherOpen(false);
                      navigate("/login", { state: { addAccount: true } });
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                  >
                    + Aggiungi account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={!expanded && !isMobile ? item.label : undefined}
              className={({ isActive }) =>
                [
                  "flex items-center py-2.5 text-sm transition-colors",
                  expanded ? "gap-3 px-4" : "justify-center px-0",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                ].join(" ")
              }
            >
              {item.icon}
              {expanded && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={`py-3 border-t border-gray-700 space-y-1 ${expanded ? "px-3" : "px-1"}`}
        >
          <button
            onClick={handleRefresh}
            title={!expanded && !isMobile ? "Aggiorna cache" : undefined}
            className={[
              "flex items-center gap-2 w-full py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded transition-colors",
              expanded ? "px-3" : "justify-center px-1",
            ].join(" ")}
          >
            <RefreshCw size={16} />
            {expanded && "Aggiorna cache"}
          </button>
          <button
            onClick={handleLogout}
            title={!expanded && !isMobile ? "Logout" : undefined}
            className={[
              "flex items-center gap-2 w-full py-2 text-sm text-gray-300 hover:bg-red-900 hover:text-white rounded transition-colors",
              expanded ? "px-3" : "justify-center px-1",
            ].join(" ")}
          >
            <LogOut size={16} />
            {expanded && "Logout"}
          </button>
        </div>
      </aside>

      {/* Area principale */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        {isMobile && (
          <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white shrink-0 shadow-md">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1 text-gray-300 hover:text-white transition-colors"
              aria-label="Apri menu"
            >
              <Menu size={22} />
            </button>
            <span className="text-base font-bold">🏫 Classeviva</span>
          </header>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
