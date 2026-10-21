import { useEffect, useRef, useState } from "react";
import { authApi } from "../api.ts";

const CHANNEL = "classeviva-extension-v2";
const post = (data: Record<string, unknown>) => window.postMessage({ channel: CHANNEL, direction: "ui", ...data }, window.location.origin);
const base = window.location.pathname.endsWith("/") ? window.location.pathname : `${window.location.pathname}/`;

export default function SpidConnect({ onConnected }: { onConnected: () => Promise<void> }) {
  const [available, setAvailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [setup, setSetup] = useState(false);
  const active = useRef<{ nonce: string; expiresAt: number; startedAt: number; acknowledged: boolean } | null>(null);
  const busy = useRef(false);
  const starting = useRef(false);
  const generation = useRef(0);
  const connected = useRef(onConnected);
  connected.current = onConnected;

  useEffect(() => {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join("");
    let stopped = false;
    let lastReady = 0;
    const discover = () => post({ type: "discover", requestId: id });
    async function fail(text: string) {
      const entry = active.current;
      active.current = null;
      if (entry) post({ type: "cancel", nonce: entry.nonce });
      setMessage(text);
      await authApi.cancelSpid().catch(() => {});
      if (!stopped) { setPending(false); busy.current = false; }
    }
    const listener = async (event: MessageEvent) => {
      const data = event.data;
      if (stopped || event.source !== window || event.origin !== window.location.origin || data?.channel !== CHANNEL || data.direction !== "extension") return;
      if (data.type === "ready" && data.requestId === id) { lastReady = Date.now(); setAvailable(true); return; }
      const entry = active.current;
      if (!entry || data.nonce !== entry.nonce) return;
      if (data.type === "started") { entry.acknowledged = true; setMessage("Completa SPID/CIE nella scheda Spaggiari. Il diario si aprirà automaticamente."); return; }
      if (data.type === "error" && !busy.current) { await fail(typeof data.error === "string" ? data.error : "Collegamento non riuscito. Riprova."); return; }
      if (data.type !== "token" || busy.current || typeof data.paToken !== "string" || !data.paToken || data.paToken.length > 32768) return;
      busy.current = true;
      setMessage("Accesso completato. Collegamento dell’account in corso…");
      try {
        await authApi.completeSpid(entry.nonce, data.paToken);
        post({ type: "finished", nonce: entry.nonce, ok: true });
        active.current = null;
        if (!stopped) { setPending(false); await connected.current(); }
      } catch (error) {
        post({ type: "finished", nonce: entry.nonce, ok: false });
        if (!stopped) await fail(error instanceof Error ? error.message : "Collegamento non riuscito. Riprova.");
      } finally { data.paToken = null; busy.current = false; }
    };
    window.addEventListener("message", listener);
    discover();
    const timer = setInterval(() => {
      discover();
      if (lastReady && Date.now() - lastReady > 5000) setAvailable(false);
      if (active.current && !busy.current && Date.now() >= active.current.expiresAt) void fail("Collegamento scaduto. Avvia nuovamente l’accesso.");
      else if (active.current && !busy.current && !active.current.acknowledged && Date.now() - active.current.startedAt > 10_000) void fail("L’estensione non risponde. Ricarica la UI e verifica che il collegamento sia abilitato.");
    }, 1000);
    return () => {
      stopped = true; generation.current++;
      clearInterval(timer); window.removeEventListener("message", listener);
      if (active.current) post({ type: "cancel", nonce: active.current.nonce });
      active.current = null;
    };
  }, []);

  async function connect() {
    if (!available) { setSetup(true); setMessage("Abilita l’estensione su questo Home Assistant seguendo i passaggi qui sotto."); return; }
    if (starting.current || active.current) return;
    starting.current = true; setPending(true); setMessage("Apertura di Spaggiari…");
    const current = generation.current;
    try {
      const entry = await authApi.startSpid();
      if (current !== generation.current) return;
      active.current = { ...entry, startedAt: Date.now(), acknowledged: false };
      post({ type: "start", ...entry });
    } catch (error) { setPending(false); setMessage(error instanceof Error ? error.message : "Avvio non riuscito."); }
    finally { starting.current = false; }
  }
  async function cancel() {
    generation.current++;
    const entry = active.current;
    active.current = null;
    if (entry) post({ type: "cancel", nonce: entry.nonce });
    await authApi.cancelSpid().catch(() => {});
    setPending(false); setMessage("");
  }

  return <section className="space-y-3">
    <button onClick={connect} disabled={pending} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg">
      {pending ? "Accesso in corso…" : "Accedi con SPID / CIE"}
    </button>
    {pending && !busy.current && <button className="text-sm text-indigo-700" onClick={cancel}>Annulla collegamento</button>}
    {message && <p role="status" className="text-sm rounded-lg bg-indigo-50 text-indigo-900 p-3">{message}</p>}
    <p className="text-sm text-gray-600">Completa il primo collegamento da Chrome sul PC, confermando dal telefono. Dopo potrai usare il diario anche da iPhone.</p>
    {available && <p className="text-xs text-green-700">Estensione collegata. Nessun programma locale necessario.</p>}
    <details open={setup || undefined} className="text-sm text-gray-600">
      <summary className="cursor-pointer font-medium">{available ? "Configurazione dell’estensione" : "Prima volta? Prepara l’accesso in pochi passaggi"}</summary>
      <ol className="list-decimal pl-5 space-y-2 mt-3">
        <li><a className="text-indigo-700 underline" href={`${base}classeviva-auth-extension.zip`} download>Scarica l’estensione</a> ed estrai lo ZIP in una cartella sul PC.</li>
        <li>Apri <code>chrome://extensions</code>, attiva <strong>Modalità sviluppatore</strong> e scegli <strong>Carica estensione non pacchettizzata</strong>. Seleziona la cartella estratta. Se usavi la precedente estensione di prova, sostituiscila con questa.</li>
        <li>Torna a questa pagina, apri l’estensione <strong>ClasseViva — accesso SPID/CIE</strong> dal menu Estensioni di Chrome e premi <strong>Abilita su questo Home Assistant</strong>. Verifica la destinazione e autorizza i due siti richiesti.</li>
        <li>Premi <strong>Accedi con SPID / CIE</strong>. Ai successivi collegamenti basterà questo pulsante.</li>
      </ol>
      <p className="mt-3">Non servono terminale, Node.js o codici da copiare. Home Assistant conserva la sessione cifrata e ne gestisce il rinnovo.</p>
    </details>
  </section>;
}
