/**
 * Declarative redirects (Phase B). Verified live: hotelchecker24's /kontakt
 * (ifNotFound) redirects with its query string, both with the native theme
 * and with only the Companion Plugin under twentytwentyfive.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildRedirectsPhp, validateRedirects } from '../../lib/functions/redirects.js';

function run(rules, { uri, home = 'https://site.test/', is404 = false }) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-redirects-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
class Done extends Exception {}
$_SERVER['REQUEST_URI'] = ${JSON.stringify(uri)};
function apply_filters($h, $v) { return $v; }
function add_action() {}
function is_admin() { return false; } function wp_doing_ajax() { return false; }
function is_404() { return ${is404 ? 'true' : 'false'}; }
function wp_parse_url($u, $c = -1) { return parse_url($u, $c); }
function home_url($p = '') { return rtrim(${JSON.stringify(home)}, '/') . $p; }
function wp_safe_redirect($t, $s) { echo json_encode(array('to' => $t, 'status' => $s, 'safe' => true)); throw new Done(); }
function wp_redirect($t, $s) { echo json_encode(array('to' => $t, 'status' => $s, 'safe' => false)); throw new Done(); }
${buildRedirectsPhp(rules)}
try { forgewp_apply_redirects(); echo 'null'; } catch (Done $e) {}
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('declarative redirects', () => {
  const rules = [
    { from: '/kontakt', to: '/contact/', ifNotFound: true },
    { from: '/studie/', to: '/studie/hospitality-2035/', status: 302 },
    { from: '/away', to: 'https://example.org/new?x=1' },
  ];
  it('redirects matching paths, keeps the query and ignores a trailing slash', () => {
    expect(run(rules, { uri: '/studie?utm=a' })).toEqual({ to: 'https://site.test/studie/hospitality-2035/?utm=a', status: 302, safe: true });
  });
  it('honors ifNotFound', () => {
    expect(run(rules, { uri: '/kontakt/' })).toBeNull();
    expect(run(rules, { uri: '/kontakt/', is404: true })).toEqual({ to: 'https://site.test/contact/', status: 301, safe: true });
  });
  it('supports external targets and WordPress subdirectory installs', () => {
    expect(run(rules, { uri: '/away?y=2' })).toEqual({ to: 'https://example.org/new?x=1&y=2', status: 301, safe: false });
    expect(run(rules, { uri: '/blog/studie', home: 'https://site.test/blog/' }).to).toBe('https://site.test/blog/studie/hospitality-2035/');
  });
  it('emits nothing without redirects and rejects invalid rules', () => {
    expect(buildRedirectsPhp(undefined)).toBe('');
    expect(() => validateRedirects([{ from: 'kontakt', to: '/c' }])).toThrow(/from/);
    expect(() => validateRedirects([{ from: '/a?b', to: '/c' }])).toThrow(/query/);
    expect(() => validateRedirects([{ from: '/a', to: '//evil.example' }])).toThrow(/to/);
    expect(() => validateRedirects([{ from: '/a', to: '/b', status: 200 }])).toThrow(/status/);
    expect(() => validateRedirects([{ from: '/a', to: '/b' }, { from: '/a/', to: '/c' }])).toThrow(/twice/);
    expect(() => validateRedirects([{ from: '/a', to: '/a/' }])).toThrow(/itself/);
  });
});
