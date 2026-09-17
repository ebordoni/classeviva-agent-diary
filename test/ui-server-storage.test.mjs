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

const { FileStore } = await importTypeScriptModule(
  new URL(
    "../hassio-addon/classeviva-ui/src/packages/server/src/fileStore.ts",
    import.meta.url,
  ),
);

const testDirectory = await mkdtemp(path.join(tmpdir(), "classeviva-ui-test-"));
after(() => rm(testDirectory, { recursive: true, force: true }));

function cacheFile(name) {
  return path.join(testDirectory, `${name}.json`);
}

function waitForFlush() {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

test("FileStore conserva le scritture di due processi", async () => {
  const filename = cacheFile("shared");
  const first = new FileStore(filename);
  const second = new FileStore(filename);

  await first.set("classeviva:lezioni:S1", "lezioni");
  await waitForFlush();
  await second.set("classeviva:voti:S1", "voti");
  await waitForFlush();

  const reader = new FileStore(filename);
  assert.equal(await reader.get("classeviva:lezioni:S1"), "lezioni");
  assert.equal(await reader.get("classeviva:voti:S1"), "voti");
});

test("FileStore invalida le chiavi per prefisso", async () => {
  const filename = cacheFile("invalidate");
  const store = new FileStore(filename);

  await store.set("classeviva:voti:S1", "voti");
  await store.set("classeviva:agenda:S1", "agenda");
  await store.set("classeviva:voti:S2", "altri-voti");
  await waitForFlush();

  assert.equal(await store.deleteByPrefix("classeviva:voti:S1"), 1);
  await waitForFlush();

  const reader = new FileStore(filename);
  assert.equal(await reader.get("classeviva:voti:S1"), undefined);
  assert.equal(await reader.get("classeviva:agenda:S1"), "agenda");
  assert.equal(await reader.get("classeviva:voti:S2"), "altri-voti");
});

test("FileStore rimuove solo le entry scadute", async () => {
  const filename = cacheFile("gc");
  const store = new FileStore(filename);
  const validValue = JSON.stringify({ value: "new", expires: Date.now() + 60_000 });

  await store.set(
    "classeviva:expired",
    JSON.stringify({ value: "old", expires: Date.now() - 1 }),
  );
  await store.set("classeviva:valid", validValue);
  await waitForFlush();

  assert.equal(await store.gc(), 1);
  await waitForFlush();

  const reader = new FileStore(filename);
  assert.equal(await reader.get("classeviva:expired"), undefined);
  assert.equal(await reader.get("classeviva:valid"), validValue);
});
