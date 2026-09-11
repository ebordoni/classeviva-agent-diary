import { Plus } from "lucide-react";
import type { AccountInfo } from "../api.ts";

interface AccountSwitcherProps {
  accounts: AccountInfo[];
  activeStudentId: string;
  switching: boolean;
  onSwitch: (studentId: string) => void;
  onAddAccount: () => void;
}

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-violet-600",
];

function initials(account: AccountInfo): string {
  const source = account.nome?.trim() || account.studentId;
  const parole = source.split(/\s+/).filter(Boolean);
  if (parole.length >= 2) {
    return (parole[0]![0]! + parole[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Colore deterministico in base allo studentId, per distinguere gli avatar a colpo d'occhio. */
function colorFor(studentId: string): string {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = (hash * 31 + studentId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export default function AccountSwitcher({
  accounts,
  activeStudentId,
  switching,
  onSwitch,
  onAddAccount,
}: AccountSwitcherProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {accounts.map((a) => {
        const isActive = a.studentId === activeStudentId;
        return (
          <button
            key={a.studentId}
            onClick={() => onSwitch(a.studentId)}
            disabled={switching}
            title={a.nome ?? a.studentId}
            aria-pressed={isActive}
            className={[
              "flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold text-white shrink-0 transition-all disabled:opacity-60",
              colorFor(a.studentId),
              isActive
                ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110"
                : "grayscale opacity-60 hover:grayscale-0 hover:opacity-100",
            ].join(" ")}
          >
            {initials(a)}
          </button>
        );
      })}
      <button
        onClick={onAddAccount}
        title="Aggiungi account"
        className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors shrink-0"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
