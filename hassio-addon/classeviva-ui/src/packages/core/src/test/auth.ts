/**
 * Test di autenticazione e chiamate base per la nuova API w1.
 * Esegui con: npm run test:auth -w packages/core
 *
 * Legge le credenziali dalle variabili d'ambiente:
 *   CV_USER=<studentId>  CV_PASS=<password>
 */

import { ClassevivaClient } from "../client/ClassevivaClient.js";

const user = process.env["CV_USER"];
const pass = process.env["CV_PASS"];

if (!user || !pass) {
  console.error("Imposta CV_USER e CV_PASS come variabili d'ambiente.");
  console.error(
    "Esempio: CV_USER=S0000001 CV_PASS=mypassword npm run test:auth -w packages/core",
  );
  process.exit(1);
}

const client = new ClassevivaClient(user, pass);

console.log("=== TEST AUTH (nuova API w1) ===\n");

// ── 1. Login ────────────────────────────────────────────────────────────────
process.stdout.write("1. Login... ");
await client.accedi();
console.log("OK");
console.log(`   Nome: ${client.nomeCompleto}`);
console.log(`   Connesso: ${client.connesso}`);

// ── 2. WhoAmI ───────────────────────────────────────────────────────────────
process.stdout.write("2. WhoAmI... ");
const whoami = client.datiUtente;
console.log("OK");
console.log(`   Account type: ${whoami?.account_type}`);
console.log(`   Classe: ${whoami?.classe_desc}`);
console.log(`   Anno scolastico: ${whoami?.anno_scol}`);

// ── 3. Card ─────────────────────────────────────────────────────────────────
process.stdout.write("3. Card... ");
const card = await client.card();
console.log("OK");
console.log(`   Scuola: ${card.card.schName} (${card.card.schCity})`);

// ── 4. Periodi ──────────────────────────────────────────────────────────────
process.stdout.write("4. Periodi... ");
const periodi = await client.periodi();
console.log(`OK — ${periodi.periods.length} periodi`);
periodi.periods.forEach((p) =>
  console.log(`   - ${p.periodLabel}: ${p.dateStart} → ${p.dateEnd}`),
);

// ── 5. Materie ──────────────────────────────────────────────────────────────
process.stdout.write("5. Materie... ");
const materie = await client.materie();
console.log(`OK — ${materie.subjects.length} materie`);

// ── 6. Voti ─────────────────────────────────────────────────────────────────
process.stdout.write("6. Voti (grades26)... ");
const voti = await client.voti();
console.log(`OK — ${voti.grades.length} voti`);
if (voti.grades.length > 0) {
  const v = voti.grades[0]!;
  console.log(`   Esempio: ${v.subjectDesc} ${v.displayValue} (${v.evtDate})`);
  console.log(`   Skills: ${v.skills.length}`);
}

// ── 7. Assenze ──────────────────────────────────────────────────────────────
process.stdout.write("7. Assenze... ");
const assenze = await client.assenze();
console.log(`OK — ${assenze.events.length} eventi`);

// ── 8. Lezioni ──────────────────────────────────────────────────────────────
process.stdout.write("8. Lezioni anno corrente... ");
const lezioni = await client.lezioniAnnoCorrente();
console.log(`OK — ${lezioni.lessons.length} lezioni`);

// ── 9. Agenda ───────────────────────────────────────────────────────────────
process.stdout.write("9. Agenda settimana corrente... ");
const agenda = await client.agenda();
console.log(`OK — ${agenda.agenda.length} eventi`);

// ── 10. Compiti ─────────────────────────────────────────────────────────────
process.stdout.write("10. Compiti (homeworks/index)... ");
const compiti = await client.compiti();
console.log(`OK — ${compiti.items.length} compiti`);

// ── 11. Note ────────────────────────────────────────────────────────────────
process.stdout.write("11. Note disciplinari... ");
const note = await client.note();
console.log(
  `OK — NTTE:${note.NTTE.length} NTCL:${note.NTCL.length} NTWN:${note.NTWN.length} NTST:${note.NTST.length}`,
);

console.log("\n=== TUTTI I TEST SUPERATI ===");
