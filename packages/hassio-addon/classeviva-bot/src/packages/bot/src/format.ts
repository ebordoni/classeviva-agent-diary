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

export function formatLezioni(resp: LezioniResponse): string {
  if (!resp.lessons.length) return "Nessuna lezione trovata.";

  // Raggruppa per data
  const grouped = new Map<string, typeof resp.lessons>();
  for (const l of resp.lessons) {
    if (!grouped.has(l.evtDate)) grouped.set(l.evtDate, []);
    grouped.get(l.evtDate)!.push(l);
  }

  const lines: string[] = [];
  for (const [date, lessons] of [...grouped.entries()].sort()) {
    lines.push(`\n<b>📅 ${e(date)}</b>`);
    for (const l of lessons.sort((a, b) => a.evtHPos - b.evtHPos)) {
      lines.push(`  <b>${e(l.subjectDesc)}</b> — <i>${e(l.authorName)}</i>`);
      if (l.lessonArg) lines.push(`  ${e(l.lessonArg)}`);
    }
  }

  const totale = resp.lessons.length;
  lines.push(`\n<i>Totale: ${totale} lezioni</i>`);
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

  const lines = resp.events
    .sort((a, b) => a.evtDate.localeCompare(b.evtDate))
    .map((ev) => {
      const tipo = TIPO[ev.evtCode] ?? e(ev.evtCode);
      const stato = ev.isJustified ? "✅ giustificata" : "⏳ da giustificare";
      return `<b>${e(ev.evtDate)}</b> — ${tipo} ${stato}`;
    });

  lines.push(`\n<i>Totale: ${resp.events.length}</i>`);
  return lines.join("\n");
}

export function formatAgenda(resp: AgendaResponse): string {
  if (!resp.agenda.length) return "Nessun evento in agenda.";

  const TIPO: Record<string, string> = {
    AGNT: "📝 Compito",
    AGVC: "📋 Verifica",
    AGRE: "📌 Promemoria",
  };

  const lines = resp.agenda
    .sort((a, b) => a.evtDatetimeBegin.localeCompare(b.evtDatetimeBegin))
    .map((ev) => {
      const data = ev.evtDatetimeBegin.slice(0, 10);
      const tipo = TIPO[ev.evtCode] ?? "📌";
      const materia = ev.subjectDesc ? ` <b>${e(ev.subjectDesc)}</b>` : "";
      const testo = ev.evtText || ev.notes || "";
      return `${tipo}${materia} <b>${e(data)}</b>\n  ${e(testo)}`;
    });

  return lines.join("\n\n");
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

  // Raggruppa per data di consegna
  const byData = new Map<string, typeof resp.compiti>();
  for (const c of resp.compiti) {
    const key = c.scadenza || "—";
    if (!byData.has(key)) byData.set(key, []);
    byData.get(key)!.push(c);
  }

  const lines: string[] = [
    `<b>📅 Compiti trovati (${resp.metadata.totale_compiti})</b>\n`,
  ];

  for (const [data, compiti] of [...byData.entries()].sort()) {
    const scadutaLabel =
      data < oggi ? " ⚠️" : data === oggi ? " 🔴" : "";
    lines.push(`\n<b>📆 ${e(data)}${scadutaLabel}</b>`);
    for (const c of compiti) {
      lines.push(`  • <b>${e(c.materia)}</b> — ${e(c.testo)}`);
    }
  }
  return lines.join("\n");
}
