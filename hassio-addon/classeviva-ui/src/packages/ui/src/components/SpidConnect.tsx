import { useEffect, useRef, useState } from "react";
import { authApi } from "../api.ts";

const LOCAL = "http://127.0.0.1:18765";

export default function SpidConnect({ onConnected }: { onConnected: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);

  async function connect() {
    cleanup.current();
    const popup = window.open("about:blank", "_blank");
    if (!popup) { setMessage("Consenti l’apertura della finestra di collegamento e riprova."); return; }
    setPending(true);
    setMessage("Avvio del collegamento…");
    let stopped = false;
    let busy = false;
    let ready = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let listener: ((event: MessageEvent) => void) | undefined;
    const stop = () => {
      stopped = true;
      clearInterval(timer); clearTimeout(timeout);
      if (listener) window.removeEventListener("message", listener);
    };
    cleanup.current = stop;
    const fail = (text: string) => {
      stop(); setPending(false); setMessage(text);
      void authApi.cancelSpid().catch(() => {});
    };
    try {
      const { nonce, expiresAt } = await authApi.startSpid();
      if (stopped) { popup.close(); return; }
      listener = async (event: MessageEvent) => {
        if (stopped || event.origin !== LOCAL || event.source !== popup || event.data?.nonce !== nonce) return;
        if (event.data.type === "classeviva:spid-ready") {
          ready = true;
          setMessage("Segui le istruzioni nella finestra di collegamento. Mantieni aperta questa pagina.");
        }
        if (event.data.type !== "classeviva:spid-pa" || busy || typeof event.data.paToken !== "string") return;
        busy = true;
        clearInterval(timer); clearTimeout(timeout);
        setMessage("Collegamento dell’account in corso…");
        try {
          await authApi.completeSpid(nonce, event.data.paToken);
          popup.postMessage({ type: "classeviva:spid-finished", nonce, ok: true }, LOCAL);
          stop(); setPending(false);
          await onConnected();
        } catch (error) {
          popup.postMessage({ type: "classeviva:spid-finished", nonce, ok: false }, LOCAL);
          fail(error instanceof Error ? error.message : "Collegamento non riuscito. Riprova.");
        } finally { event.data.paToken = null; }
      };
      window.addEventListener("message", listener);
      popup.location.href = `${LOCAL}/link#${new URLSearchParams({ origin: window.location.origin, nonce })}`;
      const started = Date.now();
      timer = setInterval(() => {
        if (popup.closed) return fail("Finestra chiusa. Avvia nuovamente il collegamento.");
        if (!ready && Date.now() - started > 10_000) {
          fail("Programma locale non raggiungibile. Avvialo sul PC, poi riprova da Chrome. Usa la UI Home Assistant nel browser, mantenendo aperte entrambe le finestre.");
        }
      }, 500);
      timeout = setTimeout(() => fail("Collegamento scaduto. Avvialo nuovamente."), Math.max(0, expiresAt - Date.now()));
    } catch (error) {
      popup.close(); fail(error instanceof Error ? error.message : "Impossibile avviare il collegamento.");
    }
  }

  return <section className="space-y-3">
    <button onClick={connect} disabled={pending} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg">
      {pending ? "Collegamento in corso…" : "Collega con SPID / CIE"}
    </button>
    {pending && <button className="text-sm text-indigo-700" onClick={() => { cleanup.current(); setPending(false); setMessage(""); void authApi.cancelSpid().catch(() => {}); }}>Annulla collegamento</button>}
    {message && <p role="status" className="text-sm rounded-lg bg-indigo-50 text-indigo-900 p-3">{message}</p>}
    <p className="text-sm text-gray-600">Per il primo collegamento usa Chrome sul PC e conferma SPID/CIE dal telefono. Poi potrai consultare il diario anche da iPhone.</p>
    <details className="text-sm text-gray-600">
      <summary className="cursor-pointer font-medium">Preparazione sul PC</summary>
      <ol className="list-decimal pl-5 space-y-2 mt-3">
        <li>Nel progetto aggiornato esegui <code className="break-all">node scripts/link-home-assistant.mjs</code> e lascia il terminale aperto.</li>
        <li>Carica in Chrome l’estensione locale <code>tools/mobile-auth-bridge</code>, come descritto nella <a className="text-indigo-700 underline" href="https://github.com/ebordoni/classeviva-agent-diary/blob/main/docs/spid-cie.md" target="_blank" rel="noreferrer">guida SPID/CIE</a>.</li>
        <li>Premi il pulsante di collegamento e segui le istruzioni nella nuova finestra.</li>
      </ol>
      <p className="mt-3">Home Assistant conserva la sessione cifrata e ne gestisce il rinnovo. Se il rinnovo scade o viene revocato dovrai ricollegare l’account.</p>
    </details>
  </section>;
}
