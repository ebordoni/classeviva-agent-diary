import { isMobileCallback, readMobileToken } from "./bridge.mjs";

export const CHANNEL = "classeviva-extension-v2";
export const LOGIN_URL = "https://web.spaggiari.eu/home/app/default/login_spid.php?mob=on";
export const SPAGGIARI = "https://web.spaggiari.eu/*";

export function hostPattern(origin) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || url.hostname === 'web.spaggiari.eu') throw Error('Destinazione non valida.');
  return `${url.protocol}//${url.hostname}/*`;
}

// Non salvare PA, RF, access token o URL Ingress. Solo destinazioni autorizzate e
// metadati temporanei del collegamento (session storage non sincronizzato).
export function createAuthController(api, now = Date.now) {
  let queue = Promise.resolve();
  let capturing = false;
  const serial = action => {
    const operation = queue.then(action);
    queue = operation.catch(() => {});
    return operation;
  };
  const pending = async () => (await api.storage.session.get('pendingLogin')).pendingLogin;
  const clear = nonce => serial(async () => {
    if ((await pending())?.nonce === nonce) await api.storage.session.remove('pendingLogin');
  });
  const allowed = async origin => {
    const origins = (await api.storage.local.get('origins')).origins ?? [];
    return origins.includes(origin) && await api.permissions.contains({ origins: [hostPattern(origin), SPAGGIARI] });
  };
  function uiSender(sender) {
    try {
      const url = new URL(sender.url);
      hostPattern(url.origin);
      return sender.id === api.runtime.id && Number.isInteger(sender.tab?.id) &&
        Number.isInteger(sender.frameId) && typeof sender.documentId === 'string' ? url.origin : null;
    } catch { return null; }
  }
  const sameDocument = (entry, sender) => entry.uiTabId === sender.tab?.id && entry.documentId === sender.documentId && entry.uiOrigin === uiSender(sender);
  const deliver = (entry, data) => api.tabs.sendMessage(entry.uiTabId,
    { channel: CHANNEL, nonce: entry.nonce, ...data }, { documentId: entry.documentId });

  async function configure(origin, tabId) {
    hostPattern(origin);
    if (!await api.permissions.contains({ origins: [hostPattern(origin), SPAGGIARI] })) return { ok: false };
    const origins = [...new Set([...((await api.storage.local.get('origins')).origins ?? []), origin])];
    if (origins.length > 8) throw Error('Troppe destinazioni.');
    await api.storage.local.set({ origins });
    // Un registro per host: il worker verifica comunque l'origine completa,
    // compresa la porta, prima di accettare messaggi.
    const matches = [...new Set(origins.map(hostPattern))];
    const id = 'classeviva-ui';
    await api.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
    await api.scripting.registerContentScripts([{ id, matches, js: ['ui-bridge.js'], allFrames: true,
      runAt: 'document_idle', persistAcrossSessions: true }]);
    await api.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['ui-bridge.js'] });
    return { ok: true };
  }

  async function handleMessage(message, sender) {
    if (message?.channel !== CHANNEL) return;
    if (message.type === 'configure') {
      if (sender.id !== api.runtime.id || sender.url !== api.runtime.getURL('popup.html')) return { ok: false };
      return configure(message.origin, message.tabId);
    }
    const origin = uiSender(sender);
    if (!origin || !await allowed(origin)) return { ok: false, error: 'Autorizza prima questa UI dall’estensione.' };
    if (message.type === 'hello') {
      const previous = await pending();
      if (previous && previous.uiTabId === sender.tab.id && previous.uiFrameId === sender.frameId &&
        previous.uiOrigin === origin && previous.documentId !== sender.documentId) await clear(previous.nonce);
      return { ok: true, version: '1.0.0' };
    }
    if (message.type === 'cancel') {
      const entry = await pending();
      if (entry && sameDocument(entry, sender) && entry.nonce === message.nonce) await clear(entry.nonce);
      return { ok: true };
    }
    if (message.type !== 'start' || !/^[a-f0-9]{64}$/.test(message.nonce ?? '') ||
      !Number.isFinite(message.expiresAt) || message.expiresAt <= now() || message.expiresAt > now() + 301_000) return { ok: false };
    return serial(async () => {
      const previous = await pending();
      if (previous?.expiresAt > now()) return { ok: false, error: 'Un collegamento è già in corso. Completalo o annullalo nella UI.' };
      const entry = { nonce: message.nonce, expiresAt: message.expiresAt, uiTabId: sender.tab.id,
        uiFrameId: sender.frameId, documentId: sender.documentId, uiOrigin: origin, authTabId: null };
      await api.storage.session.set({ pendingLogin: entry });
      try {
        const tab = await api.tabs.create({ url: LOGIN_URL, active: true });
        entry.authTabId = tab.id;
        await api.storage.session.set({ pendingLogin: entry });
        return { ok: true };
      } catch {
        await api.storage.session.remove('pendingLogin');
        return { ok: false, error: 'Impossibile aprire Spaggiari. Riprova.' };
      }
    });
  }

  async function capture(tabId) {
    const candidate = await pending();
    if (!candidate || candidate.authTabId !== tabId) return;
    if (capturing) return;
    capturing = true;
    let paToken = null;
    let entry;
    try {
      entry = candidate;
      if (entry.expiresAt <= now()) { await clear(entry.nonce); return; }
      if (!await allowed(entry.uiOrigin)) throw Error();
      const tab = await api.tabs.get(tabId);
      if (!isMobileCallback(tab.url)) return;
      // Conferma che il documento originale sia ancora aperto e in attesa.
      const waiting = await deliver(entry, { type: 'waiting' });
      if (!waiting?.ok) throw Error();
      const results = await api.scripting.executeScript({ target: { tabId }, func: readMobileToken });
      paToken = results.length === 1 ? results[0].result : null;
      if (typeof paToken !== 'string' || !paToken || paToken.length > 32768) throw Error();
      const result = await deliver(entry, { type: 'token', paToken });
      if (!result?.ok) throw Error();
      await clear(entry.nonce);
      await api.tabs.update(entry.uiTabId, { active: true }).catch(() => {});
      try { await api.windows.update((await api.tabs.get(entry.uiTabId)).windowId, { focused: true }); } catch { /* UI già collegata. */ }
      await api.tabs.remove(tabId).catch(() => {});
    } catch {
      if (entry) {
        await clear(entry.nonce);
        await deliver(entry, { type: 'error', error: 'Collegamento non completato. Torna alla UI e ripeti il login.' }).catch(() => {});
        await api.tabs.update(entry.uiTabId, { active: true }).catch(() => {});
      }
    } finally { paToken = null; capturing = false; }
  }

  async function tabRemoved(tabId) {
    const entry = await pending();
    if (!entry || ![entry.uiTabId, entry.authTabId].includes(tabId)) return;
    await clear(entry.nonce);
    if (entry.authTabId === tabId) await deliver(entry, { type: 'error', error: 'Scheda di login chiusa. Avvia nuovamente il collegamento.' }).catch(() => {});
  }
  return { handleMessage, capture, tabRemoved };
}
