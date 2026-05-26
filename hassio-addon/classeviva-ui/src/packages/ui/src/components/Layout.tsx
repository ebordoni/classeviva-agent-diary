import { type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Star,
  Calendar,
  ClipboardList,
  Users,
  Brain,
  AlertCircle,
  Bell,
  FolderOpen,
  LogOut,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import { authApi, cacheApi } from "../api.ts";
import { useQueryClient } from "@tanstack/react-query";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/lezioni", icon: <BookOpen size={18} />, label: "Lezioni" },
  { to: "/voti", icon: <Star size={18} />, label: "Voti" },
  { to: "/assenze", icon: <Calendar size={18} />, label: "Assenze" },
  { to: "/agenda", icon: <ClipboardList size={18} />, label: "Agenda" },
  { to: "/materie", icon: <Users size={18} />, label: "Materie" },
  { to: "/compiti", icon: <Brain size={18} />, label: "Compiti AI" },
  { to: "/note", icon: <AlertCircle size={18} />, label: "Note" },
  { to: "/bacheca", icon: <Bell size={18} />, label: "Bacheca" },
  { to: "/didattica", icon: <FolderOpen size={18} />, label: "Didattica" },
];

interface LayoutProps {
  children: ReactNode;
  userName: string;
}

export default function Layout({ children, userName }: LayoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      // ignora errori di refresh
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex flex-col w-56 bg-gray-900 text-gray-100 shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <span className="text-lg font-bold tracking-tight">🏫 Classeviva</span>
          <p className="text-xs text-gray-400 mt-1 truncate">{userName}</p>
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
