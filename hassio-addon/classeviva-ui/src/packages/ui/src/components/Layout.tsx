import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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

export default function Layout({
  children,
  userName,
  activeStudentId,
  accounts,
}: LayoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleLogout() {
    await authApi.logout();
    queryClient.clear();
    navigate("/login");
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
      const result = await accountsApi.switch(studentId);
      queryClient.setQueryData(["me"], (old: Record<string, unknown>) => ({
        ...old,
        user: result.user,
        authenticated: true,
      }));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries();
    } finally {
      setSwitching(false);
      setSwitcherOpen(false);
    }
  }

  const otherAccounts = accounts.filter(
    (a) => a.studentId !== activeStudentId,
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex flex-col w-56 bg-gray-900 text-gray-100 shrink-0">
        <div className="px-4 py-4 border-b border-gray-700">
          <span className="text-lg font-bold tracking-tight">🏫 Classeviva</span>

          {/* User switcher */}
          <div className="relative mt-2">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              disabled={switching || accounts.length <= 1}
              className="flex items-center gap-1 w-full text-left text-xs text-gray-300 hover:text-white transition-colors disabled:opacity-60"
            >
              <UserCheck size={13} className="shrink-0" />
              <span className="truncate flex-1">{userName}</span>
              {accounts.length > 1 && <ChevronDown size={13} className="shrink-0" />}
            </button>

            {switcherOpen && otherAccounts.length > 0 && (
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
                    void handleLogout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                >
                  + Aggiungi account
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-700 space-y-1">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded transition-colors"
          >
            <RefreshCw size={16} />
            Aggiorna cache
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-red-900 hover:text-white rounded transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}

