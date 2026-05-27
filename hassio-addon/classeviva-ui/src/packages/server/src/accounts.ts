import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Account {
  studentId: string;
  password: string;
  nome?: string;
}

const ACCOUNTS_PATH = process.env.ACCOUNTS_PATH ?? "/data/accounts.json";

export async function loadAccounts(): Promise<Account[]> {
  try {
    if (!existsSync(ACCOUNTS_PATH)) return [];
    const raw = await readFile(ACCOUNTS_PATH, "utf-8");
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
}

async function persistAccounts(accounts: Account[]): Promise<void> {
  await mkdir(path.dirname(ACCOUNTS_PATH), { recursive: true });
  await writeFile(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), "utf-8");
}

export async function upsertAccount(
  studentId: string,
  password: string,
  nome?: string,
): Promise<void> {
  const accounts = await loadAccounts();
  const idx = accounts.findIndex((a) => a.studentId === studentId);
  if (idx >= 0) {
    accounts[idx].password = password;
    if (nome) accounts[idx].nome = nome;
  } else {
    accounts.push({ studentId, password, nome });
  }
  await persistAccounts(accounts);
}

export async function removeAccount(studentId: string): Promise<void> {
  const accounts = await loadAccounts();
  await persistAccounts(accounts.filter((a) => a.studentId !== studentId));
}

export async function getAccountPassword(
  studentId: string,
): Promise<string | undefined> {
  const accounts = await loadAccounts();
  return accounts.find((a) => a.studentId === studentId)?.password;
}
