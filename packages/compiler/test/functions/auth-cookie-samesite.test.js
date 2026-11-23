/**
 * SameSite on WordPress login cookies (security review follow-up). Verified
 * live: wp-login.php and REST /auth/login set SameSite=Lax on the three
 * WordPress auth cookies (not on wordpress_test_cookie); 'None' adds Secure;
 * 'off' leaves them untouched; login keeps working.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildAuthCookieSameSitePhp } from '../../lib/functions/auth-cookies.js';

function mode(constant) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-samesite-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
function apply_filters($h, $v) { return $v; } function add_action() {}
${constant === undefined ? '' : `define('FORGEWP_AUTH_COOKIE_SAMESITE', ${JSON.stringify(constant)});`}
${buildAuthCookieSameSitePhp()}
echo json_encode(forgewp_auth_cookie_samesite());
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('auth cookie SameSite', () => {
  it('defaults to Lax and normalizes configured values', () => {
    expect(mode(undefined)).toBe('Lax');
    expect(mode('strict')).toBe('Strict');
    expect(mode('NONE')).toBe('None');
  });
  it('is disabled by off or an unknown value', () => {
    expect(mode('off')).toBe('');
    expect(mode('nonsense')).toBe('');
  });
  it('only touches WordPress auth cookies and hooks just before core sets them', () => {
    const php = buildAuthCookieSameSitePhp();
    expect(php).toContain("preg_match('/^wordpress_(?:logged_in_|sec_)?[a-f0-9]{32}=/i', $line)");
    expect(php).toContain("add_action('set_auth_cookie', 'forgewp_schedule_auth_cookie_samesite');");
    expect(php).toContain("add_action('set_logged_in_cookie', 'forgewp_schedule_auth_cookie_samesite');");
    expect(php).toContain("$line .= '; Secure';");
  });
});
