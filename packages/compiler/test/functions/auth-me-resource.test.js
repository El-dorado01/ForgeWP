/**
 * auth-me (docs/resource-contracts.md §9). Verified live: logged out ->
 * { authenticated:false, user:null } with private/no-store; a server-to-server
 * call with the WordPress cookies and no nonce sees the user; the same cookies
 * from a foreign Origin do not; native resources['auth-me'] equals REST.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildRestEndpointsPhp } from '../../lib/functions/rest-endpoints.js';
import { buildNetworkHelpersPhp } from '../../lib/functions/network-helpers.js';

function extract(php, start, end) {
  const a = php.indexOf(start);
  const b = php.indexOf(end, a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return php.slice(a, b);
}

function resolve(origin, frontendOrigins = '') {
  const src = require_rest();
  const fn = extract(src, 'function forgewp_auth_resolve_session_user(', '/** auth-me resource');
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-auth-me-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
const LOGGED_IN_COOKIE = 'wordpress_logged_in_x';
${frontendOrigins ? `define('FORGEWP_FRONTEND_ORIGIN', ${JSON.stringify(frontendOrigins)});` : ''}
$_COOKIE[LOGGED_IN_COOKIE] = 'valid';
${origin ? `$_SERVER['HTTP_ORIGIN'] = ${JSON.stringify(origin)};` : ''}
$current = 0;
class WP_REST_Request { public $h; function __construct($h) { $this->h = $h; } function get_header($k) { return $this->h[$k] ?? ''; } }
function get_current_user_id() { global $current; return $current; }
function wp_set_current_user($id) { global $current; $current = $id; }
function wp_validate_auth_cookie($c, $s) { return $c === 'valid' ? 7 : 0; }
function home_url() { return 'https://site.test/'; } function site_url() { return 'https://site.test/'; }
function wp_parse_url($u) { return parse_url($u); }
${buildNetworkHelpersPhp()}
${fn}
echo json_encode(forgewp_auth_resolve_session_user(new WP_REST_Request(json_decode(${JSON.stringify(JSON.stringify(origin ? { origin } : {}))}, true))));
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let cached;
function require_rest() {
  if (!cached) {
    cached = buildRestEndpointsPhp({ textDomain: 't', auth: true }, [], true, 'Reset', 'Body', 'Verify', 'Body', 'usernameAndEmail', '0', '1', '0', {});
  }
  return cached;
}

describe('auth-me session resolution', () => {
  it('accepts the cookie without a nonce for server-to-server calls (no Origin) and the site itself', () => {
    expect(resolve('')).toBe(7);
    expect(resolve('https://site.test')).toBe(7);
  });
  it('ignores the cookie for foreign origins unless listed in FORGEWP_FRONTEND_ORIGIN', () => {
    expect(resolve('https://evil.example')).toBe(0);
    expect(resolve('https://app.example', 'https://app.example')).toBe(7);
  });
  it('returns authenticated + user and never-cache headers', () => {
    const src = require_rest();
    expect(src).toContain("return array( 'authenticated' => $payload !== null, 'user' => $payload );");
    expect(src).toContain("$response->header( 'Cache-Control', 'private, no-store, max-age=0' );");
    expect(src).toContain("$response->header( 'Vary', 'Cookie, Authorization' );");
  });
});
