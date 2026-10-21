// No cookies, history, persistent scripts or credential storage.
const LOCAL_RECEIVER = "http://127.0.0.1:18765/bridge/probe";

export function isMobileCallback(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://web.spaggiari.eu" && !url.username && !url.password &&
      url.pathname === "/home/app/default/mspidauth.php";
  } catch { return false; }
}

// Executed once in the active tab after the user presses the send button.
// Keep self-contained: chrome.scripting serializes this function.
export function readMobileToken(describe = false) {
  if (location.origin !== "https://web.spaggiari.eu" ||
      location.pathname !== "/home/app/default/mspidauth.php") return null;
  if (!document.getElementById("mspidauth-ok")) {
    if (!describe) return null;
    const profileLinks = Array.from(document.querySelectorAll('a[href]')).some(link => {
      try {
        const url = new URL(link.getAttribute('href'), location.href);
        return url.origin === location.origin && url.pathname === location.pathname;
      } catch { return false; }
    });
    return { state: profileLinks ? 'profile-selection' : 'waiting' };
  }
  const inputs = document.querySelectorAll('input[name="spid-patoken"]');
  if (inputs.length !== 1) return describe ? { state: 'waiting' } : null;
  const token = inputs[0].value;
  if (!token || token.length > 32_768 || /^(?:\[redacted\]|<redacted>|\*+)$/i.test(token)) return describe ? { state: 'waiting' } : null;
  return describe ? { state: 'token', paToken: token } : token;
}

export async function sendActiveToken(pairingCode, chromeApi = chrome, request = fetch) {
  if (!/^[a-f0-9]{48}$/i.test(pairingCode)) return { error: "Incolla il codice di collegamento mostrato dalla prova locale." };
  const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isMobileCallback(tab.url)) return { error: "Apri la scheda Spaggiari con “loading… please wait”, poi premi l’estensione da quella scheda." };
  const results = await chromeApi.scripting.executeScript({ target: { tabId: tab.id }, func: readMobileToken });
  let paToken = results.length === 1 ? results[0].result : null;
  if (typeof paToken !== "string" || !paToken || paToken.length > 32_768 ||
      /^(?:\[redacted\]|<redacted>|\*+)$/i.test(paToken)) return { error: "Token mobile assente nella pagina corrente. Nessun dato inviato." };
  try {
    const response = await request(LOCAL_RECEIVER, {
      method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", "X-Bridge-Code": pairingCode },
      body: JSON.stringify({ paToken }), signal: AbortSignal.timeout(90_000),
    });
    // The receiver returns only sanitized diagnostic results.
    return await response.json();
  } finally { paToken = null; }
}
