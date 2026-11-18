// Mounted React lifecycle checks against a local stand-in API, not live WordPress.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { openChrome } from './chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(path.join(root, 'packages/starter/package.json'));
const { buildSync } = createRequire(fs.realpathSync(require.resolve('vite/package.json')))('esbuild');
const output = path.join(root, '.forgewp/browser-qa');
fs.mkdirSync(output, { recursive: true });
const user = { id: 7, username: 'member', email: 'member@example.test', displayName: 'Member', roles: ['subscriber'], capabilities: ['read'], avatarUrl: '' };
const token = `hdr.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, data: { user: { id: 7, user_login: 'member', roles: ['subscriber'] } } })).toString('base64url')}.sig`;
const entry = `
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { WpAuthProvider, WpAuthGate, useWpAuth, useWpUser, useWpCapability } from ${JSON.stringify(path.join(root, 'packages/auth/src/index.ts'))};
function Account() {
  const auth = useWpAuth(); const user = useWpUser(); const canRead = useWpCapability('read');
  return <main><h1>Auth lifecycle check</h1>
    <output id="state">{JSON.stringify({ user: user?.username || null, canRead, loading: auth.loading, initializing: auth.initializing, error: auth.error })}</output>
    <WpAuthGate fallback={<p id="signed-out">Signed out</p>}><p id="signed-in">Signed in</p></WpAuthGate>
    <button id="login" onClick={() => auth.login('member', 'fixture-password')}>Sign in</button>
    <button id="unsafe-login" onClick={() => auth.login('member', 'fixture-password', 'javascript:window.__unsafe=true')}>Unsafe destination</button>
    <button id="logout" onClick={() => auth.logout()}>Sign out</button>
  </main>;
}
export function App({ provider }) {
  React.useEffect(() => { document.getElementById('root').dataset.mounted = 'true'; }, []);
  return provider ? <WpAuthProvider><Account /></WpAuthProvider> : <Account />;
}
if (typeof window !== 'undefined') {
  const app = <React.StrictMode><App provider={new URLSearchParams(location.search).get('provider') === 'true'} /></React.StrictMode>;
  const root = document.getElementById('root');
  if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);
}
`;
const options = { stdin: { contents: entry, loader: 'tsx', resolveDir: root }, bundle: true,
  alias: { react: path.dirname(require.resolve('react/package.json')), 'react-dom': path.dirname(require.resolve('react-dom/package.json')) },
  define: { 'import.meta.env': JSON.stringify({ DEV: false }) }, logLevel: 'silent' };
const browserBundle = buildSync({ ...options, platform: 'browser', format: 'iife', write: false }).outputFiles[0].text;
const previewBundle = buildSync({ ...options, define: { 'import.meta.env': JSON.stringify({ DEV: true }) }, platform: 'browser', format: 'iife', write: false }).outputFiles[0].text;
const serverFile = path.join(output, 'auth-ssr.cjs');
buildSync({ ...options, stdin: { ...options.stdin, contents: entry + `
import { renderToString } from 'react-dom/server';
export function render() { return renderToString(<WpAuthProvider><Account /></WpAuthProvider>); }
` }, platform: 'node', format: 'cjs', outfile: serverFile });
const { render } = createRequire(import.meta.url)(serverFile);
let session = false;
let jwtMode = false;
let previewMode = false;
let response = 'valid';
let loginFail = false;
let logoutFail = false;
const requests = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(previewMode ? previewBundle : browserBundle); return; }
  if (url.pathname.includes('/wp-json/')) {
    requests.push({ path: url.pathname, authorization: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    if (url.pathname.endsWith('/token/validate')) {
      if (response === 'offline') { req.socket.destroy(); return; }
      await new Promise((resolve) => setTimeout(resolve, 250));
      send(response === 'valid' ? 200 : 403, {}); return;
    }
    if (url.pathname.endsWith('/config')) { send(200, { loginField: 'usernameAndEmail', emailVerificationEnabled: false }); return; }
    if (url.pathname.endsWith('/login')) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (loginFail) { send(403, { message: 'Fixture login rejected' }); return; }
      session = true; send(200, { user }); return;
    }
    if (url.pathname.endsWith('/logout')) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (req.headers['x-wp-nonce'] !== 'fixture-rest-nonce' || req.headers['content-type'] !== 'application/json') {
        send(403, { message: 'Fixture logout nonce missing' }); return;
      }
      if (logoutFail) { send(503, { message: 'Fixture logout rejected' }); return; }
      session = false; send(200, { success: true }); return;
    }
    send(404, {}); return;
  }
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  // Cookie SSR uses the same account snapshot as the generated session script.
  globalThis.window = { forgeWpHydration: { currentUser: session ? user : null } };
  globalThis.document = { getElementById: () => ({ textContent: JSON.stringify({ user: session ? user : null }) }) };
  const markup = jwtMode || previewMode ? '' : render();
  delete globalThis.window;
  delete globalThis.document;
  const prelude = `window.FORGEWP_API_URL='/members/';window.FORGEWP_JWT_AUTH=${jwtMode};window._forgeWpMockUsers=${JSON.stringify([user])};window._forgeWpMockRoles={subscriber:['read']};window.forgeWpHydration=${JSON.stringify({ currentUser: session ? user : null, restNonce: 'fixture-rest-nonce', siteSettings: { options: { home: 'https://example.test/members/' } } })};`;
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <script>${prelude}</script>${jwtMode ? '' : `<script id="forgewp-session" type="application/json">${JSON.stringify({ user: session ? user : null, restNonce: 'fixture-rest-nonce' })}</script>`}
    <div id="root" data-run="${url.searchParams.get('run')}">${markup}</div><script src="/bundle.js"></script></body></html>`);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let chrome;
const results = [];
try {
  chrome = await openChrome();
  const { call, evaluate, wait } = chrome;
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
  const state = () => evaluate(`document.getElementById('state') ? JSON.parse(document.getElementById('state').textContent) : null`);
  const click = async (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const navigate = async (provider) => {
    const run = String(Date.now());
    await call('Page.navigate', { url: `${origin}/members/?provider=${provider}&run=${run}` });
    await wait(() => evaluate(`document.getElementById('root')?.dataset.run === ${JSON.stringify(run)} && document.getElementById('root')?.dataset.mounted === 'true'`), 'React mount');
    await wait(async () => { const s = await state(); return s && !s.initializing && s; }, 'account initialization');
  };
  for (const provider of [false, true]) {
    jwtMode = false; session = false; loginFail = false; logoutFail = false;
    await navigate(provider);
    assert.equal((await state()).user, null);
    const beforeUnsafe = requests.length;
    await click('unsafe-login');
    await wait(async () => (await state())?.error === 'Choose a login destination on this site.', 'unsafe redirect rejection');
    assert.equal(requests.length, beforeUnsafe);
    assert.equal(await evaluate('window.__unsafe === true'), false);
    loginFail = true;
    await click('login');
    await wait(async () => (await state())?.error === 'Fixture login rejected', 'rejected login feedback');
    assert.equal((await state()).user, null);
    loginFail = false;
    await click('login');
    await wait(async () => (await state())?.user === 'member' && !(await state()).loading, 'successful login');
    await wait(() => evaluate(`Boolean(document.getElementById('signed-in'))`), 'live signed-in gate');
    await navigate(provider);
    assert.equal((await state()).user, 'member');
    logoutFail = true;
    await click('logout');
    await wait(async () => (await state())?.error?.includes('logout'), 'rejected logout feedback');
    assert.equal((await state()).user, 'member');
    logoutFail = false;
    await click('logout');
    await wait(async () => (await state())?.user === null && !(await state()).loading, 'successful logout');
    await wait(() => evaluate(`Boolean(document.getElementById('signed-out'))`), 'live signed-out gate');
    await navigate(provider);
    assert.equal((await state()).user, null);
    await chrome.screenshot(path.join(output, `auth-cookie-${provider ? 'provider' : 'standalone'}.png`));
    results.push({ provider, cookie: 'SSR hydration, rejected/successful login and logout, gate updates and reload passed' });

    jwtMode = true;
    for (const mode of ['valid', 'rejected', 'offline', 'expired', 'malformed']) {
      response = mode;
      await call('Network.setBlockedURLs', { urls: mode === 'offline' ? ['*/wp-json/jwt-auth/v1/token/validate'] : [] });
      const stored = mode === 'expired' ? `hdr.${Buffer.from(JSON.stringify({ exp: 1, data: { user: { id: 7 } } })).toString('base64url')}.sig` : mode === 'malformed' ? 'invalid-token' : token;
      await evaluate(`localStorage.setItem('forgewp_jwt_token', ${JSON.stringify(stored)})`);
      const before = requests.length;
      await navigate(provider);
      const current = await state();
      assert.equal(current.user, mode === 'valid' ? 'member' : null, `${provider}: ${mode} user`);
      assert.equal(await evaluate(`localStorage.getItem('forgewp_jwt_token')`), ['valid', 'offline'].includes(mode) ? stored : null);
      if (mode === 'offline') assert.match(current.error, /Unable to verify session/);
      const validations = requests.slice(before).filter((r) => r.path.endsWith('/token/validate'));
      if (['offline', 'expired', 'malformed'].includes(mode)) assert.equal(validations.length, 0);
      else assert.ok(validations.length >= 1 && validations.length <= (provider ? 2 : 1), 'StrictMode may replay provider effects');
      if (validations.length) assert.equal(validations[0].authorization, `Bearer ${stored}`);
      if (mode === 'offline') {
        response = 'valid';
        await call('Network.setBlockedURLs', { urls: [] });
        await navigate(provider);
        assert.equal((await state()).user, 'member', 'Retained token restores after reload when validation recovers');
        assert.equal((await state()).error, null);
      }
      if (mode === 'valid') {
        await click('logout');
        await wait(async () => (await state())?.user === null, 'JWT local logout');
        assert.equal(await evaluate(`localStorage.getItem('forgewp_jwt_token')`), null);
      }
      results.push({ provider, jwt: mode, passed: true });
    }
  }
  previewMode = true; jwtMode = false; session = false;
  for (const provider of [false, true]) {
    await evaluate(`localStorage.removeItem('forgewp_auth_session')`);
    await navigate(provider);
    assert.equal((await state()).user, null);
    await click('login');
    await wait(async () => (await state())?.user === 'member' && !(await state()).loading, 'preview login');
    assert.equal((await state()).canRead, true);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('forgewp_auth_session')).username`), 'member');
    await navigate(provider);
    assert.equal((await state()).user, 'member');
    assert.equal((await state()).canRead, true);
    await click('logout');
    await wait(async () => (await state())?.user === null && !(await state()).loading, 'preview logout');
    await navigate(provider);
    assert.equal((await state()).user, null);
    assert.equal((await state()).canRead, false);
    assert.equal(await evaluate(`localStorage.getItem('forgewp_auth_session')`), null);
    results.push({ provider, preview: 'login, capabilities, persisted session, logout and reload passed' });
  }
  const errors = chrome.events.filter((e) => e.method === 'Runtime.exceptionThrown' ||
    (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  assert.deepEqual(errors, [], 'Unexpected browser exceptions or React hydration errors');
  assert.ok(requests.every((r) => r.path.startsWith('/members/wp-json/')));
  fs.writeFileSync(path.join(output, 'auth-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(JSON.stringify({ requests, state: await chrome?.evaluate(`document.getElementById('state')?.textContent`), errors: chrome?.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')).map((e) => e.params.exceptionDetails?.text || e.params.args?.map((arg) => arg.value)) }, null, 2));
  throw error;
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
