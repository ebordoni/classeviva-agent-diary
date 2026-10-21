import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import ts from "typescript";

async function importTypeScriptModule(file) {
  const source = await readFile(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const testDirectory = await mkdtemp(path.join(tmpdir(), "classeviva-accounts-test-"));
const previousAccountsPath = process.env.ACCOUNTS_PATH;
process.env.ACCOUNTS_PATH = path.join(testDirectory, "accounts.json");

const accounts = await importTypeScriptModule(
  new URL(
    "../hassio-addon/classeviva-ui/src/packages/server/src/accounts.ts",
    import.meta.url,
  ),
);

after(async () => {
  if (previousAccountsPath === undefined) delete process.env.ACCOUNTS_PATH;
  else process.env.ACCOUNTS_PATH = previousAccountsPath;
  await rm(testDirectory, { recursive: true, force: true });
});

test("un account aggiornato conserva il nome e sostituisce la password", async () => {
  await accounts.upsertAccount("S1", "prima-password", "Mario Rossi");
  await accounts.upsertAccount("S1", "nuova-password");

  assert.deepEqual(await accounts.loadAccounts(), [
    { studentId: "S1", password: "nuova-password", nome: "Mario Rossi" },
  ]);
  assert.equal(await accounts.getAccountPassword("S1"), "nuova-password");
});

test("la sincronizzazione di configurazione aggiorna solo gli account configurati", async () => {
  await accounts.upsertAccount("S2", "password-locale", "Lucia Bianchi");
  await accounts.syncConfigAccounts([
    { student_id: "S1", password: "password-configurata" },
  ]);

  assert.deepEqual(await accounts.loadAccounts(), [
    {
      studentId: "S1",
      password: "password-configurata",
      nome: "Mario Rossi",
      fromConfig: true,
    },
    {
      studentId: "S2",
      password: "password-locale",
      nome: "Lucia Bianchi",
      fromConfig: false,
    },
  ]);
});

test("rimuovere un account elimina anche la password salvata", async () => {
  await accounts.removeAccount("S1");

  assert.equal(await accounts.getAccountPassword("S1"), undefined);
  assert.deepEqual(await accounts.loadAccounts(), [
    {
      studentId: "S2",
      password: "password-locale",
      nome: "Lucia Bianchi",
      fromConfig: false,
    },
  ]);
});

const spid = (ident = "G1234567A", extra = {}) => ({ version: 1, ident,
  paToken: "PRIVATE_PA", accessToken: "PRIVATE_ACCESS", refreshToken: "PRIVATE_REFRESH",
  expiresAt: Date.now() + 3600_000, ...extra });

test("SPID sessions are encrypted, profile-bound and excluded from public accounts", async () => {
  const session = spid();
  await accounts.saveSpidAccount(session, "Studente Esempio");
  const account = (await accounts.loadAccounts()).find(a => a.studentId === session.ident);
  assert.deepEqual(await accounts.readSpidSession(account), session);
  const disk = await readFile(process.env.ACCOUNTS_PATH, "utf8");
  const exposed = JSON.stringify(accounts.publicAccount(account));
  for (const secret of [session.paToken, session.accessToken, session.refreshToken]) {
    assert.equal(disk.includes(secret), false); assert.equal(exposed.includes(secret), false);
  }
  await assert.rejects(accounts.readSpidSession({ ...account, studentId: "G7654321A" }), /SPID_LOGIN_REQUIRED/);
  await assert.rejects(accounts.readSpidSession({ ...account, spidSession: { ...account.spidSession, tag: Buffer.alloc(16).toString("base64") } }), /SPID_LOGIN_REQUIRED/);
  assert.equal((await readFile(path.join(testDirectory, "spid-session.key"))).length, 32);
  if (process.platform !== "win32") {
    assert.equal((await stat(process.env.ACCOUNTS_PATH)).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(testDirectory, "spid-session.key"))).mode & 0o777, 0o600);
  }
});

test("config password does not overwrite SPID and concurrent saves keep all profiles", async () => {
  await accounts.syncConfigAccounts([{ student_id: "G1234567A", password: "obsolete" }]);
  assert.equal((await accounts.loadAccounts()).find(a => a.studentId === "G1234567A").password, undefined);
  await Promise.all([accounts.saveSpidAccount(spid("G2345678A")), accounts.saveSpidAccount(spid("G3456789A"))]);
  for (const id of ["G1234567A", "G2345678A", "G3456789A"]) {
    const account = (await accounts.loadAccounts()).find(a => a.studentId === id);
    assert.equal((await accounts.readSpidSession(account)).ident, id);
  }
});

test("revocation and removal prevent delayed renewals from recreating credentials", async () => {
  await accounts.requireSpidLogin("G1234567A");
  let account = (await accounts.loadAccounts()).find(a => a.studentId === "G1234567A");
  assert.equal(accounts.publicAccount(account).needsLogin, true);
  assert.equal(account.spidSession, undefined);
  await assert.rejects(accounts.saveSpidAccount(spid(), undefined, true));
  await accounts.saveSpidAccount(spid());
  await accounts.saveSpidAccount(spid(undefined, { paToken: "PRIVATE_NEW_LOGIN" }));
  await assert.rejects(accounts.saveSpidAccount(spid(), undefined, true));
  const relinked = (await accounts.loadAccounts()).find(a => a.studentId === "G1234567A");
  assert.equal((await accounts.readSpidSession(relinked)).paToken, "PRIVATE_NEW_LOGIN");
  await accounts.removeAccount("G1234567A");
  await assert.rejects(accounts.saveSpidAccount(spid(), undefined, true));
  assert.equal((await accounts.loadAccounts()).some(a => a.studentId === "G1234567A"), false);
});
