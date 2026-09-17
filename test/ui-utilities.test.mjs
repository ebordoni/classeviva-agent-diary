import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(file) {
  const source = await readFile(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const gradeUtils = await importTypeScriptModule(
  new URL("../hassio-addon/classeviva-ui/src/packages/ui/src/gradeUtils.ts", import.meta.url),
);
const agendaUtils = await importTypeScriptModule(
  new URL("../hassio-addon/classeviva-ui/src/packages/ui/src/agendaUtils.ts", import.meta.url),
);

function voto(parziale = {}) {
  return {
    subjectId: 1,
    evtDate: "2026-09-17",
    decimalValue: null,
    displayValue: "",
    color: "",
    periodDesc: "",
    skillDesc: "",
    subjectDesc: "",
    notesForFamily: "",
    skills: [],
    ...parziale,
  };
}

test("il giudizio più specifico prevale su quello contenuto nel testo", () => {
  assert.equal(
    gradeUtils.estraiVotoTestuale("Valutazione: gravemente insufficiente"),
    "GRAVEMENTE INSUFFICIENTE",
  );
});

test("la media combina voti numerici e giudizi per skill", () => {
  const numerico = voto({ decimalValue: 8, displayValue: "8" });
  const testuale = voto({ skills: [{ skillValueNote: "Ottimo" }] });

  assert.equal(gradeUtils.valoreNumericoVoto(testuale), 9);
  assert.equal(gradeUtils.calcolaMedia([numerico, testuale]), 8.5);
});

test("il range predefinito degli avvisi è un intervallo ISO valido", () => {
  const { inizio, fine } = agendaUtils.defaultAvvisiRange();
  assert.match(inizio, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(fine, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(inizio <= fine);
});
