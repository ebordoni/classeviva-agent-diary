import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
