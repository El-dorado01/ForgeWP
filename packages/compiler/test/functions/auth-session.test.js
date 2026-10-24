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

function runtime(provider, home = 'https://example.test/members/', explicit, preview, server = false) {
  const state = [];
  let cursor = 0;
  let initialText;
  let contextValue = null;
  const React = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_type, props) => props,
    jsx: (_type, props) => props, jsxs: (_type, props) => props,
    useContext: () => contextValue,
    useState: (value) => { const index = cursor++; state[index] = value === '' && initialText !== undefined ? initialText : typeof value === 'function' ? value() : value; return [state[index], (next) => { state[index] = next; }]; },
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: () => {},
  };
  const storage = new Map();
  const window = {
    forgeWpHydration: { currentUser: preview ? null : user, siteSettings: { options: { home } } },
    location: { reload: vi.fn(), href: '', origin: 'http://localhost:5173' },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: vi.fn((key) => storage.delete(key)) },
    ...(preview ? { _forgeWpAuthPreview: preview, _forgeWpMockUsers: [], _forgeWpMockRoles: { subscriber: ['read'] } } : {}),
    ...(explicit ? { FORGEWP_API_URL: explicit } : {}),
  };
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  const source = buildSync({
    entryPoints: [path.join(packages, 'auth/src', provider ? 'components.tsx' : 'hooks.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react'],
    define: { 'import.meta.env': JSON.stringify({ DEV: Boolean(preview) }) }, logLevel: 'silent',
  }).outputFiles[0].text;
  const context = vm.createContext({ module: { exports: {} }, exports: {}, require: () => React, window: server ? undefined : window, document: { getElementById: () => null }, fetch, URL, console, setTimeout: preview ? (fn) => fn() : setTimeout });
  vm.runInContext(source, context);
  const api = context.module.exports;
  const actions = provider ? api.WpAuthProvider({ children: null }).value : api.useWpAuth();
  return { actions, fetch, window, state, api, setInitialText: (value) => { initialText = value; }, setContext: (value) => { contextValue = value; } };
}

describe.each([false, true])('Auth session parity (provider=%s)', (provider) => {
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
