/**
 * Phase A `forms` resource + cross-origin/proxy rules
 * (docs/resource-contracts.md §2, §4.3). Verified live in the cloud sandbox:
 * REST and native payloads deep-equal; allowed-origin submit stored + mailed;
 * other origins 403 without CORS headers; trusted-proxy X-Forwarded-For used
 * for the stored IP hash.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildFormsPhp } from '../../lib/functions/forms.js';

const config = {
  textDomain: 'demo',
  forms: {
    contact: { mailTo: 'admin', subject: 'Hi', fields: { email: { type: 'email', label: 'Email', required: true } } },
    legacy: { mode: 'shortcode', shortcode: '[contact-form-7 id="5"]' },
  },
};

function extract(php, start) {
  const i = php.indexOf(start);
  expect(i).toBeGreaterThan(-1);
  return php.slice(i);
}

function runHelpers(script, { server = {}, constants = {} } = {}) {
  const php = buildFormsPhp(config);
  const helpers = extract(php, "if (!function_exists('forgewp_origin_of')) {");
  const block = helpers.slice(0, helpers.indexOf("if (!function_exists('forgewp_forms_rate_limit_ok')) {"));
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-net-'));
  try {
    const file = path.join(dir, 'run.php');
    writeFileSync(file, `<?php
function wp_parse_url($u) { return parse_url($u); }
function home_url() { return 'https://site.test/'; }
function site_url() { return 'https://site.test/'; }
${Object.entries(constants).map(([k, v]) => `define('${k}', ${JSON.stringify(v)});`).join('\n')}
$_SERVER = array_merge($_SERVER, json_decode(${JSON.stringify(JSON.stringify(server))}, true));
${block}
${script}
`);
    const out = spawnSync('php', [file], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('forms resource routes', () => {
  const php = buildFormsPhp(config);
  it('registers GET /forms and /forms/<name> built on the hydration payload', () => {
    expect(php).toContain("register_rest_route('forgewp/v1', '/forms', array(");
    expect(php).toContain("register_rest_route('forgewp/v1', '/forms/(?P<name>[A-Za-z0-9_-]+)'");
    expect(php).toContain('foreach (forgewp_forms_hydration_payload($requested_lang) as $name => $entry)');
    expect(php).toContain("'submitUrl'   => esc_url_raw(rest_url('forgewp/v1/forms/' . $name . '/submit'))");
  });
  it('answers shortcode forms with 400 and unknown forms with 404', () => {
    expect(php).toContain("in_array($name, array('legacy'), true)");
    expect(php).toContain("'FORGEWP_FORM_SHORTCODE_ONLY'");
    expect(php).toContain("'FORGEWP_FORM_NOT_FOUND'");
  });
  it('rejects submissions from disallowed origins before rate limiting', () => {
    const handler = extract(php, 'function forgewp_handle_form_contact(');
    expect(handler.indexOf("forgewp_origin_allowed($request_origin)")).toBeLessThan(handler.indexOf('forgewp_forms_rate_limit_ok()'));
  });
});

describe('origin allowlist', () => {
  it('allows every origin when FORGEWP_FRONTEND_ORIGIN is not configured (WordPress default)', () => {
    expect(runHelpers(`echo json_encode(forgewp_origin_allowed('https://anything.example'));`)).toBe(true);
  });
  it('allows configured origins and the site itself, and nothing else', () => {
    const out = runHelpers(
      `echo json_encode(array(forgewp_origin_allowed('https://app.test'), forgewp_origin_allowed('http://localhost:3000/'), forgewp_origin_allowed('https://site.test'), forgewp_origin_allowed('https://evil.example')));`,
      { constants: { FORGEWP_FRONTEND_ORIGIN: 'https://app.test, http://localhost:3000' } },
    );
    expect(out).toEqual([true, true, true, false]);
  });
});

describe('client IP', () => {
  it('ignores X-Forwarded-For from untrusted peers', () => {
    expect(runHelpers(`echo json_encode(forgewp_client_ip());`, {
      server: { REMOTE_ADDR: '198.51.100.7', HTTP_X_FORWARDED_FOR: '1.2.3.4' },
    })).toBe('198.51.100.7');
  });
  it('uses the right-most untrusted hop behind trusted proxies (IPv4 CIDR)', () => {
    expect(runHelpers(`echo json_encode(forgewp_client_ip());`, {
      server: { REMOTE_ADDR: '172.18.0.1', HTTP_X_FORWARDED_FOR: '1.2.3.4, 203.0.113.9, 172.18.0.5' },
      constants: { FORGEWP_TRUSTED_PROXIES: '172.16.0.0/12' },
    })).toBe('203.0.113.9');
  });
  it('trusts a peer presenting the shared proxy secret, and supports IPv6 CIDRs', () => {
    expect(runHelpers(`echo json_encode(forgewp_client_ip());`, {
      server: { REMOTE_ADDR: '10.9.9.9', HTTP_X_FORWARDED_FOR: '2001:db8::7', HTTP_X_FORGEWP_PROXY_SECRET: 's3cret' },
      constants: { FORGEWP_PROXY_SECRET: 's3cret' },
    })).toBe('2001:db8::7');
    expect(runHelpers(`echo json_encode(forgewp_client_ip());`, {
      server: { REMOTE_ADDR: '2001:db8:1::1', HTTP_X_FORWARDED_FOR: '2001:db8:ffff::9' },
      constants: { FORGEWP_TRUSTED_PROXIES: '2001:db8:1::/48' },
    })).toBe('2001:db8:ffff::9');
  });
  it('rejects a wrong proxy secret', () => {
    expect(runHelpers(`echo json_encode(forgewp_client_ip());`, {
      server: { REMOTE_ADDR: '10.9.9.9', HTTP_X_FORWARDED_FOR: '1.2.3.4', HTTP_X_FORGEWP_PROXY_SECRET: 'guess' },
      constants: { FORGEWP_PROXY_SECRET: 's3cret' },
    })).toBe('10.9.9.9');
  });
});

describe('shared network helpers', () => {
  it('can be emitted by both forms and auth in one functions.php without redeclaring', async () => {
    const { buildNetworkHelpersPhp } = await import('../../lib/functions/network-helpers.js');
    const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-net-twice-'));
    try {
      const file = path.join(dir, 'run.php');
      writeFileSync(file, `<?php\nfunction wp_parse_url($u) { return parse_url($u); }\n${buildNetworkHelpersPhp()}\n${buildNetworkHelpersPhp()}\necho 'ok';`);
      const out = spawnSync('php', [file], { encoding: 'utf8' });
      expect(out.status, out.stderr + out.stdout).toBe(0);
      expect(out.stdout).toBe('ok');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
