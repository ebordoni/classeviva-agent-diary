import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { CHANNEL, LOGIN_URL, SPAGGIARI, createAuthController, hostPattern } from '../tools/mobile-auth-bridge/auth-controller.mjs';
import { enableUi, findUi } from '../tools/mobile-auth-bridge/setup.mjs';

const NOW = 1000;
const origin = 'https://home.example:8123';
const nonce = 'a'.repeat(64);
const sender = { id: 'extension-id', tab: { id: 5 }, frameId: 7, documentId: 'ui-document', url: `${origin}/api/hassio_ingress/PRIVATE_INGRESS/` };
const start = { channel: CHANNEL, type: 'start', nonce, expiresAt: NOW + 300_000 };

function fakeChrome() {
  const stored = { local: { origins: [origin] }, session: {} };
  const effects = { created: [], injected: [], delivered: [], activated: [], removed: [], permissions: [] };
  let granted = true;
  let callback = 'https://web.spaggiari.eu/home/app/default/mspidauth.php?data=PRIVATE_CALLBACK';
  const api = {
    runtime: { id: 'extension-id', getURL: path => `chrome-extension://extension-id/${path}`, sendMessage: async () => ({ ok: true }) },
    storage: Object.fromEntries(['local', 'session'].map(area => [area, {
      get: async key => structuredClone({ [key]: stored[area][key] }),
      set: async value => Object.assign(stored[area], structuredClone(value)),
      remove: async key => { delete stored[area][key]; },
    }])),
    permissions: { contains: async () => granted, request: async value => { effects.permissions.push(value); return granted; } },
    scripting: {
      executeScript: async target => { effects.injected.push(target); return [{ result: 'PRIVATE_PA' }]; },
      unregisterContentScripts: async () => {}, registerContentScripts: async () => {},
    },
    tabs: {
      create: async request => { effects.created.push(request); return { id: 42 }; },
      get: async id => ({ id, url: id === 42 ? callback : sender.url, windowId: 1 }),
      sendMessage: async (id, message, target) => { effects.delivered.push({ id, message, target }); return { ok: true }; },
      update: async (id, value) => effects.activated.push({ id, value }),
      remove: async id => effects.removed.push(id),
    },
    windows: { update: async () => {} },
  };
  return { api, effects, stored, grant: value => { granted = value; }, callback: value => { callback = value; } };
}

test('automatic login opens only the official service, resumes after worker suspension and targets the initiating document', async () => {
  const f = fakeChrome();
  const controller = createAuthController(f.api, () => NOW);
  assert.equal((await controller.handleMessage(start, sender)).ok, true);
  assert.deepEqual(f.effects.created, [{ url: LOGIN_URL, active: true }]);
  assert.equal(JSON.stringify(f.stored).includes('PRIVATE'), false);
  assert.equal((await controller.handleMessage({ ...start, nonce: 'b'.repeat(64) }, sender)).ok, false);
  const resumed = createAuthController(f.api, () => NOW);
  await resumed.capture(13);
  assert.equal(f.effects.injected.length, 0);
  f.callback('https://identity.example/home/app/default/mspidauth.php');
  await resumed.capture(42);
  assert.equal(f.effects.injected.length, 0);
  f.callback('https://web.spaggiari.eu/home/app/default/mspidauth.php?data=PRIVATE_CALLBACK');
  await resumed.capture(42);
  assert.equal(f.effects.injected.length, 1);
  assert.deepEqual(f.effects.injected[0].target, { tabId: 42 });
  const delivery = f.effects.delivered.find(item => item.message.type === 'token');
  assert.equal(delivery.id, 5);
  assert.deepEqual(delivery.target, { documentId: 'ui-document' });
  assert.equal(delivery.message.paToken, 'PRIVATE_PA');
  assert.equal(f.stored.session.pendingLogin, undefined);
  assert.equal(JSON.stringify(f.stored).includes('PRIVATE'), false);
  assert.deepEqual(f.effects.removed, [42]);
  await resumed.capture(42);
  assert.equal(f.effects.injected.length, 1);
});

test('unapproved origins, foreign senders, invalid nonces and expired requests cannot start login', async () => {
  for (const [message, source] of [
    [start, { ...sender, url: 'https://evil.example/' }],
    [start, { ...sender, id: 'another-extension' }],
    [start, { ...sender, documentId: undefined }],
    [{ ...start, nonce: 'invalid' }, sender],
    [{ ...start, expiresAt: NOW }, sender],
    [{ ...start, expiresAt: NOW + 600_000 }, sender],
  ]) {
    const f = fakeChrome();
    const result = await createAuthController(f.api, () => NOW).handleMessage(message, source);
    assert.equal(result.ok, false);
    assert.equal(f.effects.created.length, 0);
  }
  for (const value of ['https://user:password@home.example', 'file:///test', 'https://web.spaggiari.eu', 'https://home.example/path']) assert.throws(() => hostPattern(value));
});

test('cancellation and tab closure invalidate the pending request without reading the callback', async () => {
  const f = fakeChrome();
  const controller = createAuthController(f.api, () => NOW);
  await controller.handleMessage(start, sender);
  await controller.handleMessage({ channel: CHANNEL, type: 'cancel', nonce }, { ...sender, documentId: 'different-document' });
  assert.ok(f.stored.session.pendingLogin);
  await controller.handleMessage({ channel: CHANNEL, type: 'cancel', nonce }, sender);
  await controller.capture(42);
  assert.equal(f.effects.injected.length, 0);
  await controller.handleMessage(start, sender);
  await controller.tabRemoved(42);
  assert.equal(f.stored.session.pendingLogin, undefined);
  assert.ok(f.effects.delivered.some(item => item.message.type === 'error'));
});

test('revoked permissions and expired operations stop capture; a lost UI never receives credentials', async () => {
  for (const mode of ['revoked', 'expired', 'gone']) {
    const f = fakeChrome();
    let now = NOW;
    const controller = createAuthController(f.api, () => now);
    await controller.handleMessage(start, sender);
    if (mode === 'revoked') f.grant(false);
    if (mode === 'expired') now += 300_001;
    if (mode === 'gone') f.api.tabs.sendMessage = async () => { throw Error('No such document'); };
    await controller.capture(42);
    assert.equal(f.effects.injected.length, 0);
    assert.equal(f.stored.session.pendingLogin, undefined);
  }
});

test('an unsuccessful API exchange does not leave credentials or report success', async () => {
  const f = fakeChrome();
  const controller = createAuthController(f.api, () => NOW);
  f.api.tabs.sendMessage = async (_id, message) => ({ ok: message.type !== 'token' });
  await controller.handleMessage(start, sender);
  await controller.capture(42);
  assert.equal(f.stored.session.pendingLogin, undefined);
  assert.equal(f.effects.removed.length, 0);
  assert.equal(JSON.stringify(f.stored).includes('PRIVATE'), false);
});

test('reloading the initiating frame cancels its stale operation and permits a fresh login', async () => {
  const f = fakeChrome();
  const controller = createAuthController(f.api, () => NOW);
  await controller.handleMessage(start, sender);
  const fresh = { ...sender, documentId: 'reloaded-document' };
  await controller.handleMessage({ channel: CHANNEL, type: 'hello' }, fresh);
  assert.equal(f.stored.session.pendingLogin, undefined);
  assert.equal((await controller.handleMessage({ ...start, nonce: 'b'.repeat(64) }, fresh)).ok, true);
});

test('one-time setup requests only the selected Home Assistant and Spaggiari, including iframe discovery', async () => {
  const f = fakeChrome();
  f.api.tabs.query = async () => [{ id: 5 }];
  f.api.scripting.executeScript = async () => [{ frameId: 0, result: null }, { frameId: 7, result: { origin } }];
  const ui = await findUi(f.api);
  assert.deepEqual(ui, { origin, pattern: 'https://home.example/*', tabId: 5 });
  assert.equal((await enableUi(ui, f.api)).ok, true);
  assert.deepEqual(f.effects.permissions, [{ origins: ['https://home.example/*', SPAGGIARI] }]);
  const controller = createAuthController(f.api, () => NOW);
  assert.equal((await controller.handleMessage({ channel: CHANNEL, type: 'configure', origin, tabId: 5 }, sender)).ok, false);
  assert.equal((await controller.handleMessage({ channel: CHANNEL, type: 'configure', origin, tabId: 5 }, {
    id: f.api.runtime.id, url: f.api.runtime.getURL('popup.html'),
  })).ok, true);
});

test('UI bridge validates window, origin, document and nonce and awaits the UI exchange acknowledgement', async () => {
  const source = await readFile(new URL('../tools/mobile-auth-bridge/ui-bridge.js', import.meta.url), 'utf8');
  let windowListener;
  let runtimeListener;
  const posts = [];
  const runtimeRequests = [];
  const window = { addEventListener: (_event, listener) => { windowListener = listener; }, postMessage: data => posts.push(data) };
  const context = { window, location: { origin }, document: { querySelector: () => ({ content: '2' }) }, setTimeout, clearTimeout,
    chrome: { runtime: { id: 'extension-id', sendMessage: async data => { runtimeRequests.push(data); return { ok: true }; }, onMessage: { addListener: listener => { runtimeListener = listener; } } } } };
  runInNewContext(source, context);
  const send = data => windowListener({ source: window, origin, data: { channel: CHANNEL, direction: 'ui', ...data } });
  await windowListener({ source: {}, origin, data: { channel: CHANNEL, direction: 'ui', type: 'start', nonce } });
  assert.equal(runtimeRequests.length, 0);
  await send({ type: 'start', nonce, expiresAt: NOW + 300_000 });
  let acknowledgement;
  assert.equal(runtimeListener({ channel: CHANNEL, type: 'token', nonce: 'b'.repeat(64), paToken: 'PRIVATE_PA' }, { id: 'extension-id' }, () => {}), undefined);
  const keepOpen = runtimeListener({ channel: CHANNEL, type: 'token', nonce, paToken: 'PRIVATE_PA' }, { id: 'extension-id' }, result => { acknowledgement = result; });
  assert.equal(keepOpen, true);
  assert.equal(acknowledgement, undefined);
  assert.equal(posts.at(-1).paToken, 'PRIVATE_PA');
  await send({ type: 'finished', nonce, ok: true });
  assert.equal(acknowledgement.ok, true);
});
