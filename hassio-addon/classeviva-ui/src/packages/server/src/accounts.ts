import type { SessioneSpid } from "@classeviva/core";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

interface EncryptedSession { version: 1; iv: string; tag: string; ciphertext: string }
export interface Account {
  studentId: string;
  password?: string;
  nome?: string;
  fromConfig?: boolean;
  authType?: "password" | "spid";
  needsLogin?: boolean;
  spidSession?: EncryptedSession;
}

const ACCOUNTS_PATH = process.env.ACCOUNTS_PATH ?? "/data/accounts.json";
const KEY_PATH = path.join(path.dirname(ACCOUNTS_PATH), "spid-session.key");
let mutations: Promise<unknown> = Promise.resolve();

async function readAccounts(): Promise<Account[]> {
  try {
    const data: unknown = JSON.parse(await readFile(ACCOUNTS_PATH, "utf8"));
    if (!Array.isArray(data)) throw new Error("Archivio account non valido.");
    return data as Account[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Impossibile leggere gli account salvati.");
  }
}

export async function loadAccounts(): Promise<Account[]> {
  await mutations;
  return readAccounts();
}

async function persistAccounts(accounts: Account[]): Promise<void> {
  await mkdir(path.dirname(ACCOUNTS_PATH), { recursive: true, mode: 0o700 });
  const temporary = `${ACCOUNTS_PATH}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(accounts, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, ACCOUNTS_PATH);
  await chmod(ACCOUNTS_PATH, 0o600);
}

function mutate(change: (accounts: Account[]) => Promise<Account[]> | Account[]): Promise<void> {
  const operation = mutations.then(async () => persistAccounts(await change(await readAccounts())));
  mutations = operation.catch(() => {});
  return operation;
}

async function key(create: boolean): Promise<Buffer> {
  if (create) {
    await mkdir(path.dirname(KEY_PATH), { recursive: true, mode: 0o700 });
    try { await writeFile(KEY_PATH, randomBytes(32), { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  const value = await readFile(KEY_PATH);
  if (value.length !== 32) throw new Error("Chiave della sessione SPID/CIE non valida.");
  return value;
}

export function publicAccount(account: Account) {
  return { studentId: account.studentId, nome: account.nome,
    authType: account.authType === "spid" ? "spid" as const : "password" as const,
    needsLogin: account.authType === "spid" && (!account.spidSession || account.needsLogin === true) };
}

export async function readSpidSession(account: Account): Promise<SessioneSpid> {
  if (account.authType !== "spid" || !account.spidSession || account.needsLogin) throw new Error("SPID_LOGIN_REQUIRED");
  try {
    const envelope = account.spidSession;
    if (envelope.version !== 1) throw new Error("version");
    const decipher = createDecipheriv("aes-256-gcm", await key(false), Buffer.from(envelope.iv, "base64"));
    decipher.setAAD(Buffer.from(account.studentId));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const data = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
    const session = JSON.parse(data.toString("utf8")) as SessioneSpid;
    if (session.ident !== account.studentId) throw new Error("profile");
    return session;
  } catch { throw new Error("SPID_LOGIN_REQUIRED"); }
}

export async function saveSpidAccount(session: SessioneSpid, nome?: string, onlyExisting = false): Promise<void> {
  await mutate(async accounts => {
    const index = accounts.findIndex(a => a.studentId === session.ident);
    if (onlyExisting && (index < 0 || accounts[index].authType !== "spid" || accounts[index].needsLogin)) {
      throw new Error("Account SPID/CIE non più collegato.");
    }
    if (onlyExisting && (await readSpidSession(accounts[index])).paToken !== session.paToken) {
      throw new Error("Account SPID/CIE ricollegato da un’altra sessione.");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", await key(true), iv);
    cipher.setAAD(Buffer.from(session.ident));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
    const account: Account = { studentId: session.ident, authType: "spid", nome: nome ?? accounts[index]?.nome,
      spidSession: { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") } };
    if (index < 0) accounts.push(account); else accounts[index] = account;
    return accounts;
  });
}

export async function requireSpidLogin(studentId: string): Promise<void> {
  await mutate(accounts => accounts.map(a => a.studentId === studentId && a.authType === "spid"
    ? { studentId: a.studentId, nome: a.nome, authType: "spid", needsLogin: true } : a));
}

export async function upsertAccount(studentId: string, password: string, nome?: string): Promise<void> {
  await mutate(accounts => {
    const index = accounts.findIndex(a => a.studentId === studentId);
    const account: Account = { studentId, password, nome: nome ?? accounts[index]?.nome };
    if (accounts[index]?.fromConfig !== undefined) account.fromConfig = accounts[index].fromConfig;
    if (index < 0) accounts.push(account); else accounts[index] = account;
    return accounts;
  });
}

export async function removeAccount(studentId: string): Promise<void> {
  await mutate(accounts => accounts.filter(a => a.studentId !== studentId));
}

export async function getAccountPassword(studentId: string): Promise<string | undefined> {
  return (await loadAccounts()).find(a => a.studentId === studentId)?.password;
}

export async function syncConfigAccounts(configAccounts: Array<{ student_id: string; password: string }>): Promise<void> {
  await mutate(accounts => {
    for (const a of accounts) a.fromConfig = false;
    for (const config of configAccounts) {
      const existing = accounts.find(a => a.studentId === config.student_id);
      if (existing?.authType === "spid") continue;
      if (existing) { existing.password = config.password; existing.fromConfig = true; }
      else accounts.push({ studentId: config.student_id, password: config.password, fromConfig: true });
    }
    return accounts;
  });
}
