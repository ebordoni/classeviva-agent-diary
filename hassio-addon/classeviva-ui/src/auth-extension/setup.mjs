import { CHANNEL, hostPattern, SPAGGIARI } from './auth-controller.mjs';

// Solo metadati della UI; mai cookie, token o URL Ingress.
export function describeUi() {
  if (document.querySelector('meta[name="classeviva-auth-bridge"]')?.content !== '2') return null;
  return { origin: location.origin };
}

export async function findUi(api = chrome) {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!Number.isInteger(tab?.id)) return null;
  const frames = await api.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: describeUi });
  const candidates = frames.filter(frame => frame.result?.origin);
  if (candidates.length !== 1) return null;
  const { origin } = candidates[0].result;
  return { origin, pattern: hostPattern(origin), tabId: tab.id };
}

export async function enableUi(candidate, api = chrome) {
  // Chiamata direttamente dal clic, prima di qualunque await: Chrome richiede
  // un gesto dell'utente per il dialogo dei permessi opzionali.
  const granted = await api.permissions.request({ origins: [candidate.pattern, SPAGGIARI] });
  if (!granted) return { ok: false };
  return api.runtime.sendMessage({ channel: CHANNEL, type: 'configure', origin: candidate.origin, tabId: candidate.tabId });
}
