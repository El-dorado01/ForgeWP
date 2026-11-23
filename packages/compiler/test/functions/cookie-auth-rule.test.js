/**
 * Security: the WordPress logged-in cookie may authenticate a REST request
 * without a nonce only when the request cannot be a cross-site forgery
 * (docs: improvement brief "Security review: cookie fallback"). Applies to
 * /auth/me, the cart/checkout/wishlist routes (forgewp_ensure_wc_cart) and
 * product reviews.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildNetworkHelpersPhp } from '../../lib/functions/network-helpers.js';
import { buildRestEndpointsPhp } from '../../lib/functions/rest-endpoints.js';

function allowed(server, frontend = '') {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-cookie-rule-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
function wp_parse_url($u) { return parse_url($u); }
function home_url() { return 'https://site.test/'; } function site_url() { return 'https://site.test/'; }
${frontend ? `define('FORGEWP_FRONTEND_ORIGIN', ${JSON.stringify(frontend)});` : ''}
$_SERVER = array_merge($_SERVER, json_decode(${JSON.stringify(JSON.stringify(server))}, true));
${buildNetworkHelpersPhp()}
echo json_encode(forgewp_cookie_auth_request_allowed());
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('forgewp_cookie_auth_request_allowed', () => {
  it('allows server-to-server calls (no Origin, no Sec-Fetch-Site)', () => {
    expect(allowed({})).toBe(true);
  });
  it('allows the site itself and same-origin browser requests', () => {
    expect(allowed({ HTTP_ORIGIN: 'https://site.test' })).toBe(true);
    expect(allowed({ HTTP_SEC_FETCH_SITE: 'same-origin' })).toBe(true);
  });
  it('rejects foreign origins, and cross-site requests without an Origin', () => {
    expect(allowed({ HTTP_ORIGIN: 'https://evil.example' })).toBe(false);
    expect(allowed({ HTTP_SEC_FETCH_SITE: 'cross-site' })).toBe(false);
    expect(allowed({ HTTP_ORIGIN: 'null' })).toBe(false);
  });
  it('allows origins listed in FORGEWP_FRONTEND_ORIGIN', () => {
    expect(allowed({ HTTP_ORIGIN: 'https://app.example', HTTP_SEC_FETCH_SITE: 'cross-site' }, 'https://app.example')).toBe(true);
  });
});

describe('generated REST endpoints', () => {
  it('never fall back to the logged-in cookie without the cross-site rule', () => {
    const php = buildRestEndpointsPhp({ textDomain: 't', auth: true }, [], true, 'R', 'B', 'V', 'B', 'usernameAndEmail', '0', '1', '0', {});
    // Every `if (...)` line that reads the logged-in cookie must include the rule.
    const guards = php.match(/if \([^\n]*\$_COOKIE\[ LOGGED_IN_COOKIE \][^\n]*\{/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(5);
    for (const g of guards) expect(g).toContain('forgewp_cookie_auth_request_allowed()');
  });
});
