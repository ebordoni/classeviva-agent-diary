import { AccessoSpidRichiesto, ClassevivaClient, FormatoNonValido, NonAccesso, type SessioneSpid } from "@classeviva/core";
import { loadAccounts, readSpidSession, requireSpidLogin, saveSpidAccount } from "./accounts.js";
import { clearClientByStudentId, getClientByStudentId, setClientByStudentId } from "./session.js";

const reconnecting = new Map<string, Promise<ClassevivaClient>>();
// Se il disco fallisce durante il ripristino, non perdere in RAM un RF appena ruotato.
const pendingSnapshots = new Map<string, SessioneSpid>();

export async function persistSpidSession(session: SessioneSpid): Promise<void> {
  pendingSnapshots.set(session.ident, { ...session });
  try { await saveSpidAccount(session, undefined, true); }
  catch (error) {
    const accounts = await loadAccounts().catch(() => undefined);
    if (!accounts) throw error; // Errore I/O: conservare la copia per il prossimo tentativo.
    const account = accounts.find(a => a.studentId === session.ident);
    if (!account || account.authType !== "spid" || account.needsLogin) pendingSnapshots.delete(session.ident);
    else {
      const stored = await readSpidSession(account).catch(() => undefined);
      if (stored && stored.paToken !== session.paToken) pendingSnapshots.delete(session.ident);
    }
    throw error;
  }
  if (pendingSnapshots.get(session.ident)?.refreshToken === session.refreshToken) pendingSnapshots.delete(session.ident);
}

export function forgetClient(studentId: string): void {
  clearClientByStudentId(studentId);
  pendingSnapshots.delete(studentId);
}

export async function accountClient(studentId: string): Promise<ClassevivaClient> {
  const account = (await loadAccounts()).find(a => a.studentId === studentId);
  if (!account) throw new Error("Account non trovato.");
  const existing = getClientByStudentId(studentId);
  if (existing?.connesso) return existing;
  if (reconnecting.has(studentId)) return reconnecting.get(studentId)!;
  const operation = (async () => {
    let client: ClassevivaClient;
    if (account.authType === "spid") {
      try {
        const session = pendingSnapshots.get(studentId) ?? await readSpidSession(account);
        if (pendingSnapshots.has(studentId)) await persistSpidSession(session);
        client = await ClassevivaClient.daSessioneSpid(session, {
          onSpidSessionChanged: persistSpidSession,
        });
      } catch (error) {
        if (error instanceof NonAccesso || error instanceof FormatoNonValido || (error as Error).message === "SPID_LOGIN_REQUIRED") {
          await requireSpidLogin(studentId);
          throw new AccessoSpidRichiesto();
        }
        throw error;
      }
    } else {
      client = new ClassevivaClient(studentId, account.password);
      await client.accedi();
    }
    if (!(await loadAccounts()).some(a => a.studentId === studentId)) throw new Error("Account rimosso.");
    setClientByStudentId(studentId, client);
    return client;
  })();
  reconnecting.set(studentId, operation);
  try { return await operation; } finally { reconnecting.delete(studentId); }
}

export async function invalidateSpidClient(studentId: string): Promise<void> {
  forgetClient(studentId);
  await requireSpidLogin(studentId);
}
