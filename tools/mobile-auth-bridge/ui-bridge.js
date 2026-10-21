(() => {
  const CHANNEL = 'classeviva-extension-v2';
  if (document.querySelector('meta[name="classeviva-auth-bridge"]')?.content !== '2' || window.__classevivaAuthBridge) return;
  window.__classevivaAuthBridge = true;
  let nonce;
  let completing;
  const post = data => window.postMessage({ channel: CHANNEL, direction: 'extension', ...data }, location.origin);
  window.addEventListener('message', async event => {
    const message = event.data;
    if (event.source !== window || event.origin !== location.origin || message?.channel !== CHANNEL || message.direction !== 'ui') return;
    try {
      if (message.type === 'discover') {
        const response = await chrome.runtime.sendMessage({ channel: CHANNEL, type: 'hello' });
        if (response?.ok) post({ type: 'ready', requestId: message.requestId });
      } else if (message.type === 'start' && /^[a-f0-9]{64}$/.test(message.nonce ?? '')) {
        nonce = message.nonce;
        const response = await chrome.runtime.sendMessage({ channel: CHANNEL, type: 'start', nonce, expiresAt: message.expiresAt });
        post({ type: response?.ok ? 'started' : 'error', nonce: message.nonce, error: response?.error || 'Avvio non riuscito. Riprova.' });
      } else if (message.type === 'cancel' && message.nonce === nonce) {
        await chrome.runtime.sendMessage({ channel: CHANNEL, type: 'cancel', nonce });
        nonce = undefined;
        if (completing) { completing({ ok: false }); completing = undefined; }
      } else if (message.type === 'finished' && message.nonce === nonce && completing) {
        completing({ ok: message.ok === true }); completing = undefined; nonce = undefined;
      }
    } catch { post({ type: 'error', nonce, error: 'Estensione aggiornata o non raggiungibile. Ricarica la UI e riprova.' }); }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || message?.channel !== CHANNEL || !nonce || message.nonce !== nonce) return;
    if (message.type === 'waiting') { sendResponse({ ok: true }); return; }
    if (message.type === 'error') { post({ type: 'error', nonce, error: message.error }); nonce = undefined; sendResponse({ ok: true }); return; }
    if (message.type !== 'token' || completing || typeof message.paToken !== 'string' || !message.paToken || message.paToken.length > 32768) return;
    const timer = setTimeout(() => { if (completing === respond) { completing = undefined; sendResponse({ ok: false }); } }, 60_000);
    const respond = result => { clearTimeout(timer); sendResponse(result); };
    completing = respond;
    post({ type: 'token', nonce, paToken: message.paToken });
    return true;
  });
})();
