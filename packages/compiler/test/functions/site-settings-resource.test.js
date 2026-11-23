/**
 * Phase A `site-settings` resource (docs/resource-contracts.md §1, §4.1).
 * One PHP builder feeds both REST and native hydration; private options are
 * never exposed; empty maps must encode as {} in both paths.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSiteSettingsResourcePhp } from '../../lib/functions/site-settings-resource.js';
import { buildHydrationEnqueuerPhp } from '../../lib/functions/hydration-enqueuer.js';

function runResource(php, { options = {}, mods = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-site-settings-'));
  try {
    const file = path.join(dir, 'run.php');
    writeFileSync(file, `<?php
$__o = json_decode(${JSON.stringify(JSON.stringify(options))}, true);
$__m = json_decode(${JSON.stringify(JSON.stringify(mods))}, true);
function get_option($k, $d = false) { global $__o; return array_key_exists($k, $__o) ? $__o[$k] : $d; }
function get_theme_mod($k, $d = false) { global $__m; return array_key_exists($k, $__m) ? $__m[$k] : $d; }
function wp_get_attachment_image_url($id) { return 'https://cdn.test/logo-' . $id . '.png'; }
function home_url($p = '') { return 'https://site.test' . $p; }
function get_bloginfo($k) { return array('name' => 'Site &amp; Co', 'description' => 'Tag', 'language' => 'en-US')[$k] ?? ''; }
function add_action() {}
${php}
echo json_encode(forgewp_site_settings_resource());
`);
    const out = spawnSync('php', [file], { encoding: 'utf8' });
    expect(out.status, out.stderr).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('site-settings resource', () => {
  const options = [
    { name: 'contact_phone', defaultValue: '+1 555' },
    { name: 'crm_api_key', defaultValue: 'x', private: true },
  ];
  const mods = { custom_logo: '', footer_text: "© It's 2026" };

  it('returns declared public options with saved values or defaults, never private ones', () => {
    const res = runResource(buildSiteSettingsResourcePhp(options, mods), { options: { crm_api_key: 'secret' } });
    expect(res.options).toEqual({ contact_phone: '+1 555' });
    expect(JSON.stringify(res)).not.toContain('secret');
  });

  it('resolves custom_logo to a URL and exposes site identity', () => {
    const res = runResource(buildSiteSettingsResourcePhp(options, mods), { mods: { custom_logo: 42 } });
    expect(res.themeMods).toEqual({ footer_text: "© It's 2026", custom_logo: 'https://cdn.test/logo-42.png' });
    expect(res.site).toEqual({
      name: 'Site & Co', description: 'Tag', url: 'https://site.test/', homeUrl: 'https://site.test/',
      language: 'en-US', logoUrl: 'https://cdn.test/logo-42.png',
    });
  });

  it('encodes empty options and theme mods as objects, not arrays', () => {
    const dir = buildSiteSettingsResourcePhp([], {});
    const res = runResource(dir);
    expect(res.options).toEqual({});
    expect(res.themeMods).toEqual({});
    expect(Array.isArray(res.options)).toBe(false);
  });

  it('registers the REST route with cache headers and feeds native hydration from the same builder', () => {
    const php = buildSiteSettingsResourcePhp(options, mods);
    expect(php).toContain("register_rest_route('forgewp/v1', '/site-settings'");
    expect(php).toContain("'Cache-Control', 'public, max-age=60, stale-while-revalidate=300'");
    const enqueuer = buildHydrationEnqueuerPhp(
      { textDomain: 't' }, { cssFile: 'a.css' }, 'assets/main.js', new Set(), [], '', '', '', '', '', '', '', '', '', 'usernameAndEmail', '',
    );
    expect(enqueuer).toContain("'site-settings' => function_exists('forgewp_site_settings_resource') ? forgewp_site_settings_resource() : null");
  });
});
