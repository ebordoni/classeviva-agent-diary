import assert from "node:assert/strict";
import test from "node:test";
import {
  dataFineAnno,
  dataInizioAnno,
  toRestDate,
  validaDate,
} from "../packages/core/dist/utils/helpers.js";
import {
  DataFuoriGamma,
  FormatoNonValido,
} from "../packages/core/dist/utils/exceptions.js";

test("le date dell'anno scolastico mantengono i confini previsti", () => {
  assert.equal(dataInizioAnno(2025), "2025-09-01");
  assert.equal(dataFineAnno(2025), "2026-06-30");
});

test("toRestDate rimuove i separatori ISO", () => {
  assert.equal(toRestDate("2026-09-17"), "20260917");
});

test("validaDate accetta un intervallo ISO ordinato", () => {
  assert.doesNotThrow(() => validaDate("2026-09-01", "2026-09-17"));
});

test("validaDate rifiuta formati non ISO e intervalli invertiti", () => {
  assert.throws(
    () => validaDate("17/09/2026", "2026-09-17"),
    FormatoNonValido,
  );
  assert.throws(
    () => validaDate("2026-09-18", "2026-09-17"),
    DataFuoriGamma,
  );
});
