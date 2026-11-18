import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';

const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const viteRequire = createRequire(fs.realpathSync(path.join(packages, 'starter/node_modules/vite/package.json')));
const { buildSync } = viteRequire('esbuild');
const user = { id: 7, username: 'member', email: 'member@example.test', displayName: 'Member', roles: ['subscriber'], avatarUrl: '' };

function runtime(provider, home = 'https://example.test/members/', explicit, preview, server = false, jwt = null, config = {}) {
  const state = [];
  const effects = [];
  let cursor = 0;
  let initialText;
  let contextValue = null;
  const React = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_type, props) => props,
    jsx: (_type, props) => props, jsxs: (_type, props) => props,
    useContext: () => contextValue,
    useState: (value) => { const index = cursor++; state[index] = value === '' && initialText !== undefined ? initialText : typeof value === 'function' ? value() : value; return [state[index], (next) => { state[index] = next; }]; },
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: (fn) => { if (jwt) effects.push(fn); },
  };
  const storage = new Map();
  if (jwt?.token !== undefined && jwt.token !== null) storage.set('forgewp_jwt_token', jwt.token);
  const window = {
    forgeWpHydration: { currentUser: preview || jwt ? null : user, siteSettings: { options: { home } } },
    location: { reload: vi.fn(), href: '', origin: 'http://localhost:5173' },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: vi.fn((key) => storage.delete(key)) },
    ...(preview ? { _forgeWpAuthPreview: preview, _forgeWpMockUsers: [], _forgeWpMockRoles: { subscriber: ['read'] } } : {}),
    ...(explicit ? { FORGEWP_API_URL: explicit } : {}),
    ...(jwt ? { FORGEWP_JWT_AUTH: true } : {}),
    ...config.browser,
  };
  const fetch = jwt?.fetch || vi.fn().mockResolvedValue({ ok: true });
  const source = buildSync({
    entryPoints: [path.join(packages, 'auth/src', provider ? 'components.tsx' : 'hooks.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react'],
    define: { 'import.meta.env': JSON.stringify({ DEV: Boolean(preview), ...config.vite }) }, logLevel: 'silent',
  }).outputFiles[0].text;
  const context = vm.createContext({ module: { exports: {} }, exports: {}, require: () => React, window: server ? undefined : window, document: { getElementById: () => config.session ? { textContent: config.session } : null }, ...(config.process ? { process: { env: config.process } } : {}), fetch, URL, atob, console, setTimeout: preview ? (fn) => fn() : setTimeout });
  vm.runInContext(source, context);
  const api = context.module.exports;
  const actions = provider ? api.WpAuthProvider({ children: null }).value : api.useWpAuth();
  return { actions, fetch, window, state, effects, api, setInitialText: (value) => { initialText = value; }, setContext: (value) => { contextValue = value; } };
}

it.each(['valid', 'rejected', 'offline'])('synchronizes standalone subscribers when JWT restoration is already %s before effects attach', async (status) => {
  const token = `hdr.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, data: { user: { id: 7, user_login: 'member' } } })).toString('base64url')}.sig`;
  const fetch = status === 'offline' ? vi.fn().mockRejectedValue(new Error('Offline')) : vi.fn().mockResolvedValue({ ok: status === 'valid' });
  const r = runtime(false, undefined, undefined, undefined, false, { token, fetch });
  r.api.useWpUser();
  // Let the request finish before React runs either consumer's subscription effect.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(r.state[0].initializing).toBe(true);
  expect(r.state[1]).toBeNull();
  for (const effect of r.effects) effect();
  expect(r.state[0].initializing).toBe(false);
  expect(r.state[1]?.username || null).toBe(status === 'valid' ? 'member' : null);
  expect(r.state[0].error).toBe(status === 'offline' ? 'Unable to verify session. Check your connection and try again.' : null);
});

describe.each([false, true])('Auth session parity (provider=%s)', (provider) => {
  it('sends cookie logout JSON with the hydrated nonce while preserving same-origin credentials', async () => {
    for (const source of ['global', 'session-script']) {
      const r = runtime(provider, undefined, undefined, undefined, false, null, source === 'session-script' ? { session: JSON.stringify({ user, restNonce: 'fixture-rest-nonce' }) } : {});
      if (source === 'global') r.window.forgeWpHydration.restNonce = 'fixture-rest-nonce';
      await r.actions.logout();
      expect(r.fetch).toHaveBeenCalledWith('/members/wp-json/forgewp/v1/auth/logout', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': 'fixture-rest-nonce' }, body: '{}',
      });
    }
  });

  it('keeps the session on a missing/expired nonce rejection and exposes recovery feedback', async () => {
    const r = runtime(provider);
    r.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Sign in again before signing out.' }) });
    await r.actions.logout();
    expect(provider ? r.state[2] : r.api.useWpUser()).toEqual(user);
    expect(r.window.location.reload).not.toHaveBeenCalled();
    expect(provider ? r.state[5] : r.api.useWpAuth().error).toBe('Sign in again before signing out.');
  });

  it.each([false, true])('rejects unsafe redirects before authenticating (preview=%s)', async (preview) => {
    for (const destination of ['javascript:alert(1)', 'data:text/html,unsafe', '//evil.test/path', 'https://evil.test/path', 'http://localhost:5173@evil.test/', '/\\evil.test/', '/dash\nboard']) {
      const r = runtime(provider, undefined, undefined, preview ? {} : undefined);
      r.window._forgeWpMockUsers = [user];
      expect(await r.actions.login('member', 'password', destination)).toBe(false);
      expect(r.fetch).not.toHaveBeenCalled();
      expect(r.window.location.href).toBe('');
      expect(r.window.location.reload).not.toHaveBeenCalled();
      expect(r.window.localStorage.getItem('forgewp_auth_session')).toBeNull();
    }
  });

  it.each([false, true])('accepts same-origin redirects including paths, queries and fragments (preview=%s)', async (preview) => {
    for (const destination of ['/dashboard?tab=1#account', 'http://localhost:5173/dashboard?tab=1#account']) {
      const r = runtime(provider, undefined, undefined, preview ? {} : undefined);
      r.window._forgeWpMockUsers = [user];
      r.fetch.mockResolvedValue({ ok: true, json: async () => ({ user }) });
      expect(await r.actions.login('member', 'password', destination)).toBe(true);
      expect(r.window.location.href).toBe('http://localhost:5173/dashboard?tab=1#account');
      expect(r.window.location.reload).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['browser wins', { browser: { FORGEWP_API_URL: ' https://browser.test/wp/// ' }, vite: { FORGEWP_API_URL: 'https://vite.test' }, process: { FORGEWP_API_URL: 'https://process.test' } }, 'https://browser.test/wp'],
    ['ForgeWP Vite variable wins', { vite: { FORGEWP_API_URL: 'https://forge.test/wp/', VITE_WP_API_URL: 'https://vite.test' }, process: { FORGEWP_API_URL: 'https://process.test' } }, 'https://forge.test/wp'],
    ['Vite alias wins over process', { vite: { VITE_WP_API_URL: 'https://vite.test/wp/' }, process: { FORGEWP_API_URL: 'https://process.test' } }, 'https://vite.test/wp'],
    ['process ForgeWP alias wins', { process: { FORGEWP_API_URL: 'https://process.test/wp/', NEXT_PUBLIC_WP_API_URL: 'https://next.test', WP_API_URL: 'https://wp.test' } }, 'https://process.test/wp'],
    ['process Next alias wins', { process: { NEXT_PUBLIC_WP_API_URL: 'https://next.test/wp/', WP_API_URL: 'https://wp.test' } }, 'https://next.test/wp'],
    ['process WordPress alias', { process: { WP_API_URL: 'https://wp.test/wp/' } }, 'https://wp.test/wp'],
    ['blank and non-string values fall through', { browser: { FORGEWP_API_URL: 42 }, vite: { FORGEWP_API_URL: '  ', VITE_WP_API_URL: false }, process: { WP_API_URL: 'https://fallback.test/' } }, 'https://fallback.test'],
    ['hydrated home is the final fallback', {}, '/members'],
    ['root-relative explicit base', { browser: { FORGEWP_API_URL: '/wordpress///' } }, '/wordpress'],
  ])('resolves API configuration consistently: %s', async (_name, config, expected) => {
    const r = runtime(provider, undefined, undefined, undefined, false, null, config);
    expect(await r.actions.forgotPassword('member')).toBe(true);
    expect(r.fetch).toHaveBeenCalledWith(`${expected}/wp-json/forgewp/v1/auth/lost-password`, expect.any(Object));
  });

  it('resolves process configuration without browser globals during SSR', async () => {
    const r = runtime(provider, undefined, undefined, undefined, true, null, { process: { NEXT_PUBLIC_WP_API_URL: 'https://ssr.test/wp/' } });
    expect(await r.actions.forgotPassword('member')).toBe(true);
    expect(r.fetch).toHaveBeenCalledWith('https://ssr.test/wp/wp-json/forgewp/v1/auth/lost-password', expect.any(Object));
  });

  it.each([
    ['browser false overrides Vite true', { browser: { FORGEWP_JWT_AUTH: false }, vite: { FORGEWP_JWT_AUTH: 'true' } }, false],
    ['browser true overrides Vite false', { browser: { FORGEWP_JWT_AUTH: true }, vite: { FORGEWP_JWT_AUTH: 'false' } }, true],
    ['Vite false overrides aliases', { vite: { FORGEWP_JWT_AUTH: 'false', VITE_WP_JWT_AUTH: 'true' }, process: { FORGEWP_JWT_AUTH: 'true' } }, false],
    ['Vite true overrides process false', { vite: { VITE_WP_JWT_AUTH: 'true' }, process: { FORGEWP_JWT_AUTH: 'false' } }, true],
    ['process ForgeWP true', { process: { FORGEWP_JWT_AUTH: 'true' } }, true],
    ['process ForgeWP false overrides Next true', { process: { FORGEWP_JWT_AUTH: 'false', NEXT_PUBLIC_WP_JWT_AUTH: 'true' } }, false],
    ['process Next true', { process: { NEXT_PUBLIC_WP_JWT_AUTH: 'true' } }, true],
    ['process WordPress true', { process: { WP_JWT_AUTH: 'true' } }, true],
    ['invalid and empty values fall through', { browser: { FORGEWP_JWT_AUTH: 'invalid' }, vite: { FORGEWP_JWT_AUTH: '' }, process: { WP_JWT_AUTH: 'true' } }, true],
    ['unset defaults to cookies', {}, false],
  ])('resolves JWT configuration consistently: %s', async (_name, config, enabled) => {
    const token = `hdr.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, data: { user: { id: 7, user_login: 'member' } } })).toString('base64url')}.sig`;
    const r = runtime(provider, undefined, undefined, undefined, false, { token }, { ...config, browser: { FORGEWP_JWT_AUTH: undefined, ...config.browser } });
    for (const effect of r.effects) effect();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const validations = r.fetch.mock.calls.filter(([url]) => String(url).includes('/token/validate'));
    expect(validations).toHaveLength(enabled ? 1 : 0);
    expect(r.window.localStorage.getItem('forgewp_jwt_token')).toBe(token);
  });

  it('creates usable recovery links and consumes preview reset tokens once', async () => {
    const r = runtime(provider, undefined, undefined, {});
    r.window._forgeWpMockUsers = [user];
    expect(await r.actions.forgotPassword('member@example.test')).toBe(true);
    const pending = JSON.parse(r.window.localStorage.getItem('forgewp_mock_reset_tokens'));
    const key = Object.keys(pending)[0];
    expect(pending[key]).toBe('member');
    expect(r.fetch.mock.calls.some(([url, init]) => url.endsWith('write-email-log') && JSON.parse(init.body).verification_url.includes('key=' + key))).toBe(true);
    expect(await r.actions.resetPassword('member', key, '')).toBe(false);
    expect(await r.actions.resetPassword('another', key, 'new-password')).toBe(false);
    expect(await r.actions.resetPassword('member', key, 'new-password')).toBe(true);
    expect(await r.actions.resetPassword('member', key, 'new-password')).toBe(false);
  });

  it('passes real recovery/reset requests and server failures through both paths', async () => {
    const r = runtime(provider);
    r.fetch.mockResolvedValue({ ok: true });
    expect(await r.actions.forgotPassword('member')).toBe(true);
    expect(r.fetch.mock.calls[0][0]).toBe('/members/wp-json/forgewp/v1/auth/lost-password');
    expect(JSON.parse(r.fetch.mock.calls[0][1].body)).toEqual({ user_login: 'member' });
    r.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Reset key expired' }) });
    expect(await r.actions.resetPassword('member', 'key', 'new-password')).toBe(false);
    expect(r.fetch.mock.calls[1][0]).toBe('/members/wp-json/forgewp/v1/auth/reset-password');
    expect(provider ? r.state[5] : r.api.useWpAuth().error).toBe('Reset key expired');
    expect(r.window.location.reload).not.toHaveBeenCalled();
  });
  it('shares preview policy, profile metadata, capabilities and auto-login behavior', async () => {
    for (const policy of [{}, { autoLoginAfterSignup: false }, { emailVerification: true }]) {
      const r = runtime(provider, undefined, undefined, { registrationMetaFields: ['first_name'], ...policy });
      expect(await r.actions.register('new-member', 'new@example.test', 'password', { first_name: '<b>Alex</b>' })).toBe(true);
      const account = r.window._forgeWpMockUsers[0];
      expect(account.roles).toEqual(['subscriber']);
      expect(account.capabilities).toEqual(['read']);
      expect(account.metadata.first_name).toBe('Alex');
      expect(Boolean(r.window.localStorage.getItem('forgewp_auth_session'))).toBe(!policy.emailVerification && policy.autoLoginAfterSignup !== false);
      expect(r.fetch.mock.calls.some(([url]) => url.endsWith('write-user'))).toBe(true);
      expect(r.fetch.mock.calls.some(([url]) => url.endsWith('write-email-log'))).toBe(Boolean(policy.emailVerification));
      if (policy.emailVerification) expect(Object.keys(JSON.parse(r.window.localStorage.getItem('forgewp_mock_verification_tokens')))).toHaveLength(1);
    }
  });

  it('rejects disabled registration, duplicate accounts and unapproved metadata in preview', async () => {
    const disabled = runtime(provider, undefined, undefined, { registration: false });
    expect(await disabled.actions.register('member', 'member@example.test', 'password')).toBe(false);
    expect(disabled.window._forgeWpMockUsers).toHaveLength(0);
    const r = runtime(provider, undefined, undefined, {});
    expect(await r.actions.register('member', 'member@example.test', 'password', { roles: 'administrator' })).toBe(false);
    expect(r.window._forgeWpMockUsers).toHaveLength(0);
    expect(await r.actions.register('member', 'member@example.test', 'password')).toBe(true);
    expect(await r.actions.register('MEMBER', 'other@example.test', 'password')).toBe(false);
    expect(await r.actions.register('other', 'MEMBER@example.test', 'password')).toBe(false);
    expect(r.window._forgeWpMockUsers).toHaveLength(1);
  });

  it('generates preview usernames for email-only signup and preserves server-selected roles', async () => {
    const r = runtime(provider, undefined, undefined, { loginField: 'emailOnly', defaultRole: 'member', autoLoginAfterSignup: false, reservedUsernames: ['admin'] });
    r.window._forgeWpMockRoles.member = ['read'];
    expect(await r.actions.register('', 'person@example.test', 'password')).toBe(true);
    expect(await r.actions.register('', 'person@another.test', 'password')).toBe(true);
    expect(r.window._forgeWpMockUsers.map((u) => u.username)).toEqual(['person', 'person1']);
    expect(r.window._forgeWpMockUsers[0].roles).toEqual(['member']);
    expect(await r.actions.register('', 'admin@example.test', 'password')).toBe(false);
    expect(r.window.localStorage.getItem('forgewp_auth_session')).toBeNull();
  });

  it('exposes successful account creation mail feedback without reporting failed registration', async () => {
    const r = runtime(provider);
    r.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, requiresVerification: true, verificationEmailSent: false, message: 'Account created. Request another verification email.' }) });
    expect(await r.actions.register('member', 'member@example.test', 'password')).toBe(true);
    expect(provider ? r.state[6] : r.api.useWpAuth().notice).toContain('Request another verification email');
  });
  it('preserves WordPress subdirectories and normalizes explicit API bases', async () => {
    for (const [home, explicit, expected] of [
      ['https://example.test/members/', undefined, '/members'],
      ['https://example.test/', undefined, ''],
      ['invalid', undefined, ''],
      ['https://example.test/', 'https://backend.test/wordpress/', 'https://backend.test/wordpress'],
    ]) {
      const r = runtime(provider, home, explicit);
      r.fetch.mockResolvedValue({ ok: true, json: async () => ({ user }) });
      expect(await r.actions.login('member', 'password')).toBe(true);
      expect(r.fetch.mock.calls[0][0]).toBe(`${expected}/wp-json/forgewp/v1/auth/login`);
      expect(r.window.location.reload).toHaveBeenCalledOnce();
    }
  });

  it('keeps session state and reports rejected or unreachable logout without reloading', async () => {
    for (const response of [
      { ok: false, json: async () => ({ message: 'Logout denied' }) },
      { ok: false, json: async () => { throw Error('not JSON'); } },
      new Error('Network unavailable'),
    ]) {
      const r = runtime(provider);
      if (response instanceof Error) r.fetch.mockRejectedValue(response);
      else r.fetch.mockResolvedValue(response);
      await r.actions.logout();
      expect(r.window.location.reload).not.toHaveBeenCalled();
      expect(r.window.localStorage.removeItem).not.toHaveBeenCalled();
      expect(r.state.some((value) => typeof value === 'string' && /Logout|Network/.test(value)) || (!provider && r.api.useWpAuth().error)).toBeTruthy();
      expect(provider ? r.state[2] : r.api.useWpUser()).toEqual(user);
    }
  });

  it('clears the session and reloads after successful server logout', async () => {
    const r = runtime(provider);
    r.fetch.mockResolvedValue({ ok: true });
    await r.actions.logout();
    expect(r.fetch.mock.calls[0][0]).toBe('/members/wp-json/forgewp/v1/auth/logout');
    expect(r.window.location.reload).toHaveBeenCalledOnce();
    expect(provider ? r.state[2] : r.api.useWpUser()).toBeNull();
  });

  it('returns false for rejected login without navigation or clearing the current session', async () => {
    const r = runtime(provider);
    r.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Invalid credentials' }) });
    expect(await r.actions.login('member', 'wrong')).toBe(false);
    expect(r.window.location.reload).not.toHaveBeenCalled();
    expect(r.window.location.href).toBe('');
    expect(provider ? r.state[2] : r.api.useWpUser()).toEqual(user);
    expect(provider ? r.state.includes('Invalid credentials') : r.api.useWpAuth().error === 'Invalid credentials').toBe(true);
  });

  it('accepts successful registration without requiring a signed-in user response', async () => {
    for (const requiresVerification of [true, false]) {
      const r = runtime(provider);
      r.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, requiresVerification }) });
      expect(await r.actions.register('new-member', 'new@example.test', 'password')).toBe(true);
      expect(r.window.location.reload).not.toHaveBeenCalled();
      expect(provider ? r.state[2] : r.api.useWpUser()).toEqual(user);
    }
  });

  it('aligns JWT restoration across valid, rejected, expired, malformed and unreachable responses', async () => {
    const sign = (payload) => `hdr.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
    const future = Math.floor(Date.now() / 1000) + 3600;
    const past = Math.floor(Date.now() / 1000) - 60;
    const validToken = sign({ exp: future, data: { user: { id: 7, user_login: 'member', user_email: 'member@example.test', display_name: 'Member', roles: ['subscriber'] } } });
    const expiredToken = sign({ exp: past, data: { user: { id: 7, user_login: 'member' } } });
    const flush = async (r) => {
      for (const fn of r.effects) fn();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    // Malformed & expired: cleared synchronously without calling validation endpoint
    for (const bad of ['not-a-jwt', sign({ data: {} }), expiredToken]) {
      const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      const r = runtime(provider, undefined, undefined, undefined, false, { token: bad, fetch });
      await flush(r);
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/token/validate'))).toBe(false);
      expect(r.window.localStorage.getItem('forgewp_jwt_token')).toBeNull();
      expect(provider ? r.state[2] : r.api.useWpUser()).toBeNull();
      expect(provider ? r.state[3] : r.api.useWpAuth().initializing).toBe(false);
    }

    // Rejected: cleared and user stays null
    {
      const fetch = vi.fn(async (url) => (String(url).includes('/token/validate') ? { ok: false } : { ok: true, json: async () => ({}) }));
      const r = runtime(provider, undefined, undefined, undefined, false, { token: validToken, fetch });
      await flush(r);
      expect(fetch.mock.calls.filter(([url]) => String(url).includes('/token/validate'))).toHaveLength(1);
      expect(r.window.localStorage.getItem('forgewp_jwt_token')).toBeNull();
      expect(provider ? r.state[2] : r.api.useWpUser()).toBeNull();
      expect(provider ? r.state[3] : r.api.useWpAuth().initializing).toBe(false);
    }

    // Unreachable: retains token for retry, fails closed (user=null), exposes error
    {
      const fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const r = runtime(provider, undefined, undefined, undefined, false, { token: validToken, fetch });
      await flush(r);
      expect(fetch.mock.calls.filter(([url]) => String(url).includes('/token/validate'))).toHaveLength(1);
      expect(r.window.localStorage.getItem('forgewp_jwt_token')).toBe(validToken);
      expect(provider ? r.state[2] : r.api.useWpUser()).toBeNull();
      expect(provider ? r.state[3] : r.api.useWpAuth().initializing).toBe(false);
      expect(provider ? r.state[5] : r.api.useWpAuth().error).toContain('Unable to verify session');
    }

    // Valid: restores user and clears error
    {
      const fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
      const r = runtime(provider, undefined, undefined, undefined, false, { token: validToken, fetch });
      await flush(r);
      expect(fetch.mock.calls.filter(([url]) => String(url).includes('/token/validate'))).toHaveLength(1);
      expect(r.window.localStorage.getItem('forgewp_jwt_token')).toBe(validToken);
      expect((provider ? r.state[2] : r.api.useWpUser())?.username).toBe('member');
      expect(provider ? r.state[3] : r.api.useWpAuth().initializing).toBe(false);
      expect(provider ? r.state[5] : r.api.useWpAuth().error).toBeNull();
    }
  });
});


it('the built-in recovery form creates a usable preview reset link through its hook', async () => {
  const r = runtime(true, undefined, undefined, {});
  r.window._forgeWpMockUsers = [user];
  r.setInitialText('member@example.test');
  const form = r.api.WpPasswordResetForm({});
  await form.onSubmit({ preventDefault() {} });
  expect(r.window.localStorage.getItem('forgewp_mock_reset_tokens')).toBeTruthy();
  expect(r.fetch.mock.calls.some(([url]) => url.endsWith('write-email-log'))).toBe(true);
});

it('the recovery form can render without browser globals', () => {
  const r = runtime(true, undefined, undefined, undefined, true);
  expect(() => r.api.WpPasswordResetForm({})).not.toThrow();
});


it('hydrated authentication gates follow the active provider user over stale initial payloads', () => {
  const r = runtime(true);
  r.setContext({ user: null });
  expect(r.api.WpAuthGate({ children: 'member', fallback: 'signed-out' }).children).toBe('signed-out');
  r.window.forgeWpHydration.currentUser = null;
  r.setContext({ user });
  expect(r.api.WpAuthGate({ children: 'member', fallback: 'signed-out' }).children).toBe('member');
});
