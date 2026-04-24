import type {
      AgendaResponse,
      AssenzeResponse,
      CompitiEstrattiResponse,
      LezioniResponse,
      MaterieResponse,
      VotiResponse,
} from "@classeviva/core";

/** Escape HTML per Telegram parse_mode HTML */
function e(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const GIORNI_IT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function formatDateIT(dateStr: string): string {
  if (!dateStr || dateStr === "—" || !/^\d{4}-\d{2}-\d{2}/.test(dateStr))
    return dateStr;
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00");
  return `${GIORNI_IT[d.getDay()]} ${d.getDate()} ${MESI_IT[d.getMonth()]}`;
}

export function formatLezioni(resp: LezioniResponse): string {
  if (!resp.lessons.length) return "Nessuna lezione trovata.";

  const grouped = new Map<string, typeof resp.lessons>();
  for (const l of resp.lessons) {
    if (!grouped.has(l.evtDate)) grouped.set(l.evtDate, []);
    grouped.get(l.evtDate)!.push(l);
  }

  const SEP = "──────────────────";
  const lines: string[] = [];
  let first = true;
  for (const [date, lessons] of [...grouped.entries()].sort()) {
    if (!first) lines.push("");
    first = false;
    lines.push(`📅 <b>${e(formatDateIT(date))}</b>`);
    lines.push(SEP);
    for (const l of lessons.sort((a, b) => a.evtHPos - b.evtHPos)) {
      const ora = l.evtHPos ? `${l.evtHPos}ª ` : "";
      lines.push(`<b>${ora}${e(l.subjectDesc)}</b>  <i>${e(l.authorName)}</i>`);
      if (l.lessonArg) lines.push(`   ${e(l.lessonArg)}`);
    }
  }

  lines.push(`\n<i>Totale: ${resp.lessons.length} lezioni</i>`);
  return lines.join("\n");
}

export function formatVoti(resp: VotiResponse): string {
  if (!resp.grades.length) return "Nessun voto trovato.";

  // Raggruppa per materia e periodo
  const bySubject = new Map<string, typeof resp.grades>();
  for (const v of resp.grades) {
    if (!bySubject.has(v.subjectDesc)) bySubject.set(v.subjectDesc, []);
    bySubject.get(v.subjectDesc)!.push(v);
  }

  const lines: string[] = [];
  for (const [subject, grades] of [...bySubject.entries()].sort()) {
    const numerici = grades
      .map((g) => g.decimalValue)
      .filter((n) => n > 0 && n <= 10);
    const media = numerici.length
      ? (numerici.reduce((a, b) => a + b, 0) / numerici.length).toFixed(2)
      : "—";
    const votiStr = grades.map((g) => e(g.displayValue)).join(", ");
    lines.push(`<b>${e(subject)}</b>  <i>media: ${media}</i>\n  ${votiStr}`);
  }
  return lines.join("\n\n");
}

export function formatAssenze(resp: AssenzeResponse): string {
  if (!resp.events.length) return "Nessuna assenza trovata.";

  const TIPO: Record<string, string> = {
    ABA0: "Assenza",
    ABR0: "Ritardo",
    ABU0: "Uscita anticipata",
  };

  const SEP = "──────────────────";
  const lines: string[] = [`📊 <b>Assenze (${resp.events.length})</b>`, SEP];

  resp.events
    .sort((a, b) => a.evtDate.localeCompare(b.evtDate))
    .forEach((ev) => {
      const tipo = TIPO[ev.evtCode] ?? e(ev.evtCode);
      const stato = ev.isJustified ? "✅ giustificata" : "⏳ da giustificare";
      lines.push(`<b>${e(formatDateIT(ev.evtDate))}</b>  ${tipo}  ${stato}`);
    });

  return lines.join("\n");
}

export function formatAgenda(resp: AgendaResponse): string {
  if (!resp.agenda.length) return "Nessun evento in agenda.";

  const TIPO: Record<string, string> = {
    AGNT: "📝 Compito",
    AGVC: "📋 Verifica",
    AGRE: "📌 Promemoria",
  };

  const SEP = "──────────────────";

  // Raggruppa per data
  const grouped = new Map<string, typeof resp.agenda>();
  for (const ev of resp.agenda) {
    const date = ev.evtDatetimeBegin.slice(0, 10);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(ev);
  }

  const lines: string[] = [];
  let first = true;
  for (const [date, events] of [...grouped.entries()].sort()) {
    if (!first) lines.push("");
    first = false;
    lines.push(`🗓 <b>${e(formatDateIT(date))}</b>`);
    lines.push(SEP);
    for (const ev of events) {
      const tipo = TIPO[ev.evtCode] ?? "📌";
      const materia = ev.subjectDesc ? `<b>${e(ev.subjectDesc)}</b>` : "";
      const testo = ev.evtText || ev.notes || "";
      lines.push(`${tipo}${materia ? "  " + materia : ""}`);
      if (testo) lines.push(`   ${e(testo)}`);
    }
  }

  return lines.join("\n");
}

export function formatMaterie(resp: MaterieResponse): string {
  if (!resp.subjects.length) return "Nessuna materia trovata.";

  return resp.subjects
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const docenti = m.teachers
        .map((t) => `${e(t.teacherFirstName)} ${e(t.teacherLastName)}`)
        .join(", ");
      return `• <b>${e(m.description)}</b>${docenti ? `\n  <i>${docenti}</i>` : ""}`;
    })
    .join("\n");
}

export function formatCompiti(resp: CompitiEstrattiResponse): string {
  if (!resp.compiti.length)
    return "Nessun compito trovato nelle lezioni analizzate.";

  const oggi = new Date().toISOString().split("T")[0];
  const SEP = "──────────────────";

  const byData = new Map<string, typeof resp.compiti>();
  for (const c of resp.compiti) {
    const key = c.scadenza || "—";
    if (!byData.has(key)) byData.set(key, []);
    byData.get(key)!.push(c);
  }

  const lines: string[] = [
    `📚 <b>Compiti trovati (${resp.metadata.totale_compiti})</b>`,
  ];

  for (const [data, compiti] of [...byData.entries()].sort()) {
    const scadutaLabel = data < oggi ? " ⚠️" : data === oggi ? " 🔴" : "";
    lines.push("");
    lines.push(`🗓 <b>${e(formatDateIT(data))}${scadutaLabel}</b>`);
    lines.push(SEP);
    for (let i = 0; i < compiti.length; i++) {
      const c = compiti[i];
      lines.push(`<b>${e(c.materia)}</b>`);
      lines.push(e(c.testo));
      if (i < compiti.length - 1) lines.push("");
    }
  }
  return lines.join("\n");
}
