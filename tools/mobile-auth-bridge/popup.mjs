import { sendActiveToken } from "./bridge.mjs";

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
