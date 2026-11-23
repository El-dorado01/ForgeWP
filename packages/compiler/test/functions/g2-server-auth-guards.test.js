import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createWpServerClient,
  WpRequireAuth,
  WpAuthGate,
  guardProtectedPage,
  ForgeWpAuthRedirectError,
  filterForwardedWordPressCookies,
  buildForwardedAuthHeaders,
  normalizeAuthMeResource,
  isAuthMeAllowed,
  createForgeWpRuntime,
} from '../../../react/src/server.ts';
import {
  buildRouteCapabilityManifest,
  evaluateTargetCompatibility,
} from '../../lib/route-manifest.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_WP_URL = process.env.FORGEWP_WP_URL;
const ORIGINAL_NATIVE_EXPORT = process.env.FORGEWP_NATIVE_EXPORT;

function makeJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const ADA_USER = {
  id: 7,
  username: 'ada',
  displayName: 'Ada Lovelace',
  roles: ['editor'],
  capabilities: ['read', 'edit_posts'],
  emailVerified: true,
};

describe('G2: Server-side auth guards (docs/resource-contracts.md §9)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.FORGEWP_WP_URL;
    delete process.env.FORGEWP_NATIVE_EXPORT;
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_WP_URL === undefined) delete process.env.FORGEWP_WP_URL;
    else process.env.FORGEWP_WP_URL = ORIGINAL_WP_URL;
    if (ORIGINAL_NATIVE_EXPORT === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = ORIGINAL_NATIVE_EXPORT;
  });

  it('forwards only WordPress session cookies and extracts JWT HttpOnly cookie as Authorization Bearer without Origin header', () => {
    const rawCookie =
      '_ga=GA1.2.123; wordpress_logged_in_abc=ada%7C123; other_session=secret; wordpress_sec_abc=xyz; forgewp_auth_token=test-session-token-123';

    expect(filterForwardedWordPressCookies(rawCookie)).toBe(
      'wordpress_logged_in_abc=ada%7C123; wordpress_sec_abc=xyz',
    );

    const headersFromCookies = buildForwardedAuthHeaders({ cookie: rawCookie });
    expect(headersFromCookies.Cookie).toBe(
      'wordpress_logged_in_abc=ada%7C123; wordpress_sec_abc=xyz',
    );
    expect(headersFromCookies.Authorization).toBe(
      'Bearer test-session-token-123',
    );
    expect(headersFromCookies.Origin).toBeUndefined();
    expect(headersFromCookies.origin).toBeUndefined();
    expect(headersFromCookies.Cookie).not.toContain('_ga');
    expect(headersFromCookies.Cookie).not.toContain('other_session');

    // Explicit Authorization header takes precedence over JWT cookie
    const headersWithExplicitAuth = buildForwardedAuthHeaders({
      cookie: rawCookie,
      authorization: 'Bearer explicit-token',
    });
    expect(headersWithExplicitAuth.Authorization).toBe('Bearer explicit-token');
  });

  it('wpClient.getAuthMe() calls /auth/me per request with cache: no-store, no Origin header, and fails closed on errors or timeout', async () => {
    const calls = [];
    let nextResponse = () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200);

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        return nextResponse(init);
      },
    });

    // 1. Logged in via WP cookie (no Origin header sent on server-to-server call)
    const res1 = await client.getAuthMe({
      cookie: '_ga=1; wordpress_logged_in_hash=val',
    });
    expect(res1.authenticated).toBe(true);
    expect(res1.user?.username).toBe('ada');
    expect(calls[0].url).toBe('https://wp.example.test/wp-json/forgewp/v1/auth/me');
    expect(calls[0].init.cache).toBe('no-store');
    expect(calls[0].init.headers.Cookie).toBe('wordpress_logged_in_hash=val');
    expect(calls[0].init.headers.Origin).toBeUndefined();

    // 2. Subsequent call is NOT cached — hits /auth/me again for a logged-out visitor
    nextResponse = () => makeJsonResponse({ authenticated: false, user: null }, 200);
    const res2 = await client.getAuthMe({});
    expect(res2).toEqual({ authenticated: false, user: null });
    expect(calls).toHaveLength(2);

    // 3. Non-200 HTTP error -> fails closed
    nextResponse = () => makeJsonResponse({ code: 'error' }, 500);
    const res3 = await client.getAuthMe({});
    expect(res3).toEqual({ authenticated: false, user: null });

    // 4. Network error -> fails closed
    nextResponse = () => {
      throw new Error('ECONNREFUSED');
    };
    const res4 = await client.getAuthMe({});
    expect(res4).toEqual({ authenticated: false, user: null });

    // 5. Timeout -> aborts and fails closed
    nextResponse = (init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('Aborted due to timeout'));
        });
      });
    const res5 = await client.getAuthMe({ timeoutMs: 25 });
    expect(res5).toEqual({ authenticated: false, user: null });

    // 5. Runtime restSource never caches auth-me either
    let restCalls = 0;
    const runtime = createForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
      fetch: async (_url, init) => {
        restCalls += 1;
        expect(init.cache).toBe('no-store');
        return makeJsonResponse({ authenticated: restCalls === 1, user: restCalls === 1 ? ADA_USER : null });
      },
    });
    const rt1 = await runtime.get('auth-me');
    const rt2 = await runtime.get('auth-me');
    expect(rt1?.authenticated).toBe(true);
    expect(rt2?.authenticated).toBe(false);
    expect(restCalls).toBe(2);
  });

  it('WpRequireAuth redirects unauthenticated visitors, returns 403 for disallowed roles, fails closed, and renders children when authorized', async () => {
    // 1. Unauthenticated -> throws ForgeWpAuthRedirectError
    const unauthEl = await WpRequireAuth({
      wpUrl: 'https://wp.example.test',
      redirect: '/sign-in',
      fetch: async () => makeJsonResponse({ authenticated: false, user: null }, 200),
      children: React.createElement('main', null, 'Secret Dashboard'),
    }).catch((err) => err);
    expect(unauthEl).toBeInstanceOf(ForgeWpAuthRedirectError);
    expect(unauthEl.redirectTo).toBe('/sign-in');

    // 2. WordPress unreachable -> fails closed (redirects, never renders children!)
    const errorEl = await WpRequireAuth({
      wpUrl: 'https://wp.example.test',
      redirect: '/login',
      fetch: async () => {
        throw new Error('timeout');
      },
      children: React.createElement('main', null, 'Secret Dashboard'),
    }).catch((err) => err);
    expect(errorEl).toBeInstanceOf(ForgeWpAuthRedirectError);
    expect(errorEl.redirectTo).toBe('/login');

    // 3. Authenticated as editor, but requires manage_options -> 403 Forbidden
    const forbiddenEl = await WpRequireAuth({
      wpUrl: 'https://wp.example.test',
      allowed: 'manage_options',
      fetch: async () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200),
      children: React.createElement('main', null, 'Admin Only'),
    });
    const forbiddenHtml = renderToStaticMarkup(forbiddenEl);
    expect(forbiddenHtml).toContain('403 Forbidden');
    expect(forbiddenHtml).not.toContain('Admin Only');

    // 4. Authenticated as editor, allowed=['administrator', 'edit_posts'] -> renders children!
    const allowedEl = await WpRequireAuth({
      wpUrl: 'https://wp.example.test',
      allowed: ['administrator', 'edit_posts'],
      fetch: async () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200),
      children: React.createElement('main', null, 'Editor Workspace'),
    });
    expect(renderToStaticMarkup(allowedEl)).toBe('<main>Editor Workspace</main>');

    // 5. Production without FORGEWP_WP_URL -> fails closed!
    process.env.NODE_ENV = 'production';
    const prodUnconfigured = await WpRequireAuth({
      redirect: '/login',
      children: React.createElement('main', null, 'Protected'),
    }).catch((err) => err);
    expect(prodUnconfigured).toBeInstanceOf(ForgeWpAuthRedirectError);
  });

  it('WpAuthGate renders fallback when unauthenticated, disallowed, or on error, and renders children when authorized', async () => {
    const guestEl = await WpAuthGate({
      wpUrl: 'https://wp.example.test',
      fallback: React.createElement('p', null, 'Please log in'),
      fetch: async () => makeJsonResponse({ authenticated: false, user: null }, 200),
      children: React.createElement('p', null, 'Member Content'),
    });
    expect(renderToStaticMarkup(guestEl)).toBe('<p>Please log in</p>');

    const errorEl = await WpAuthGate({
      wpUrl: 'https://wp.example.test',
      fallback: React.createElement('p', null, 'Fallback on error'),
      fetch: async () => makeJsonResponse({}, 503),
      children: React.createElement('p', null, 'Member Content'),
    });
    expect(renderToStaticMarkup(errorEl)).toBe('<p>Fallback on error</p>');

    const allowedEl = await WpAuthGate({
      wpUrl: 'https://wp.example.test',
      allowed: 'editor',
      fallback: React.createElement('p', null, 'Nope'),
      fetch: async () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200),
      children: React.createElement('p', null, 'Member Content'),
    });
    expect(renderToStaticMarkup(allowedEl)).toBe('<p>Member Content</p>');
  });

  it('guardProtectedPage() enforces pageConfig.protected with fail-closed redirect and 403 status', async () => {
    await expect(
      guardProtectedPage(
        { protected: true, loginRedirect: '/account/login' },
        {
          wpUrl: 'https://wp.example.test',
          fetch: async () => makeJsonResponse({ authenticated: false, user: null }, 200),
        },
      ),
    ).rejects.toMatchObject({
      code: 'FORGEWP_AUTH_REDIRECT',
      redirectTo: '/account/login',
    });

    const forbidden = await guardProtectedPage(
      { protected: 'manage_options' },
      {
        wpUrl: 'https://wp.example.test',
        fetch: async () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200),
      },
    );
    expect(forbidden.allowed).toBe(false);
    expect(forbidden.status).toBe(403);

    const allowed = await guardProtectedPage(
      { protected: ['administrator', 'editor'] },
      {
        wpUrl: 'https://wp.example.test',
        fetch: async () => makeJsonResponse({ authenticated: true, user: ADA_USER }, 200),
      },
    );
    expect(allowed.allowed).toBe(true);
    expect(allowed.status).toBe(200);
    expect(allowed.auth?.user?.username).toBe('ada');

    // Helper sanity check
    expect(normalizeAuthMeResource(null)).toEqual({ authenticated: false, user: null });
    expect(isAuthMeAllowed({ authenticated: true, user: ADA_USER }, 'edit_posts')).toBe(true);
    expect(isAuthMeAllowed({ authenticated: true, user: ADA_USER }, 'manage_options')).toBe(false);
  });

  it('forgewp doctor --target decoupled warns when protected routes lack same-domain routing or JWT', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'forgewp-g2-doctor-'));
    try {
      mkdirSync(path.join(tmpDir, 'src', 'app', 'dashboard'), { recursive: true });
      mkdirSync(path.join(tmpDir, 'src', 'app', 'account'), { recursive: true });
      writeFileSync(
        path.join(tmpDir, 'src', 'app', 'layout.tsx'),
        `export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }\n`,
      );
      writeFileSync(
        path.join(tmpDir, 'src', 'app', 'dashboard', 'page.tsx'),
        `import { WpRequireAuth } from '@forgewp/react';
export default function Dashboard() {
  return <WpRequireAuth allowed="editor"><main>Dashboard</main></WpRequireAuth>;
}
`,
      );
      writeFileSync(
        path.join(tmpDir, 'src', 'app', 'account', 'page.tsx'),
        `import { definePageConfig } from '@forgewp/react';
export const pageConfig = definePageConfig({ protected: true });
export default function Account() { return <main>Account</main>; }
`,
      );

      // 1. Neither auth backend nor session transport configured -> both warnings fire
      const manifestUnconfigured = buildRouteCapabilityManifest(tmpDir, {
        frameworkAdapter: 'nextjs',
      });
      expect(manifestUnconfigured.routes['/dashboard'].uses).toContain('auth');
      expect(manifestUnconfigured.routes['/account'].uses).toContain('auth');
      const diagUnconfigured = evaluateTargetCompatibility(manifestUnconfigured, 'decoupled');
      const backendWarn = diagUnconfigured.warnings.find(
        (w) => w.code === 'AUTH_BACKEND_MISSING',
      );
      expect(backendWarn).toBeDefined();
      expect(backendWarn.routes).toEqual(['/account', '/dashboard']);
      const authWarn = diagUnconfigured.warnings.find(
        (w) => w.code === 'AUTH_CROSS_ORIGIN_SESSION_UNCONFIGURED',
      );
      expect(authWarn).toBeDefined();
      expect(authWarn.routes).toEqual(['/account', '/dashboard']);

      // 2. JWT backend configured -> both AUTH_BACKEND_MISSING and cross-origin warnings clear
      const manifestJwt = buildRouteCapabilityManifest(tmpDir, {
        frameworkAdapter: 'nextjs',
        config: { auth: { backend: 'jwt' } },
      });
      const diagJwt = evaluateTargetCompatibility(manifestJwt, 'decoupled');
      expect(
        diagJwt.warnings.find((w) => w.code === 'AUTH_BACKEND_MISSING'),
      ).toBeUndefined();
      expect(
        diagJwt.warnings.find((w) => w.code === 'AUTH_CROSS_ORIGIN_SESSION_UNCONFIGURED'),
      ).toBeUndefined();

      // 3. Same-domain Next.js rewrite for /wp-json -> warning clears
      writeFileSync(
        path.join(tmpDir, 'next.config.ts'),
        `export default { async rewrites() { return [{ source: '/wp-json/:path*', destination: 'https://wp.internal/wp-json/:path*' }]; } };\n`,
      );
      const manifestSameDomain = buildRouteCapabilityManifest(tmpDir, {
        frameworkAdapter: 'nextjs',
      });
      const diagSameDomain = evaluateTargetCompatibility(manifestSameDomain, 'decoupled');
      expect(
        diagSameDomain.warnings.find((w) => w.code === 'AUTH_CROSS_ORIGIN_SESSION_UNCONFIGURED'),
      ).toBeUndefined();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
