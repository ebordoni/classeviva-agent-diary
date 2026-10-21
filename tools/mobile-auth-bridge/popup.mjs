import { sendActiveToken } from "./bridge.mjs";
import { enableUi, findUi } from "./setup.mjs";

const enable = document.getElementById('enable');
const setupResult = document.getElementById('setup-result');
let candidate;
findUi().then(ui => {
  candidate = ui;
  document.getElementById('destination').textContent = ui?.origin ?? 'Apri prima la UI Classeviva';
  enable.disabled = !ui;
}).catch(() => { document.getElementById('destination').textContent = 'Apri la UI Classeviva, poi riapri l’estensione.'; });
enable.addEventListener('click', async () => {
  if (!candidate) return;
  const operation = enableUi(candidate);
  enable.disabled = true;
  try {
    const response = await operation;
    setupResult.textContent = response?.ok ? 'Collegamento abilitato. Torna alla UI e premi Accedi con SPID / CIE. Puoi chiudere questo riquadro.' : 'Permessi non concessi o collegamento non completato. Riprova dalla UI.';
  } catch { setupResult.textContent = 'Collegamento non completato. Ricarica la UI e riprova.'; }
  finally { enable.disabled = false; }
});

const button = document.getElementById("send");
const result = document.getElementById("result");
button.addEventListener("click", async () => {
  const input = document.getElementById("pairing");
  const code = input.value.trim();
  input.value = "";
  button.disabled = true;
  result.textContent = "Verifica in corso. Mantieni aperto questo riquadro…";
  try { result.textContent = JSON.stringify(await sendActiveToken(code), null, 2); }
  catch { result.textContent = "Collegamento non completato. Controlla che il test locale sia avviato e la scheda corretta sia attiva."; }
  finally { button.disabled = false; }
});
