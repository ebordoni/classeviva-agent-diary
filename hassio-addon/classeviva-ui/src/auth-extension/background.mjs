import { createAuthController } from './auth-controller.mjs';

const controller = createAuthController(chrome);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.channel !== 'classeviva-extension-v2') return;
  controller.handleMessage(message, sender).then(sendResponse).catch(() => sendResponse({ ok: false, error: 'Collegamento non disponibile. Riprova.' }));
  return true;
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'complete') void controller.capture(tabId).catch(() => {});
});
chrome.tabs.onRemoved.addListener(tabId => { void controller.tabRemoved(tabId).catch(() => {}); });
