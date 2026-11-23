/**
 * Phase C PHP resources (docs/resource-contracts.md §5–§7 + approved
 * amendments): menus, routes, i18n builders shared by REST and native
 * hydration. Executes the generated PHP with WordPress stand-ins.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPhaseCResourcesPhp } from '../../lib/functions/phase-c-resources.js';

function run(php, script) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-phase-c-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
class WP_Error { public $code; public $data; function __construct($c, $m, $d) { $this->code = $c; $this->data = $d; } }
function add_action() {}
function sanitize_key($k) { return preg_replace('/[^a-z0-9_-]/', '', strtolower($k)); }
function get_locale() { return 'en_US'; }
function home_url($p = '/') { return 'https://site.test' . $p; }
function wp_parse_url($u, $c = -1) { return parse_url($u, $c); }
function wp_strip_all_tags($s) { return strip_tags($s); }
function get_registered_nav_menus() { return array(); }
function get_nav_menu_locations() { return array('primary' => 7, 'primary___de' => 8); }
function wp_get_nav_menu_items($id) {
  if ($id !== 7) return array();
  return array(
    (object) array('ID' => 1, 'menu_item_parent' => 0, 'title' => 'About', 'url' => 'https://site.test/about/', 'target' => '', 'classes' => array(''), 'description' => 'Who we are', 'attr_title' => 'About us'),
    (object) array('ID' => 2, 'menu_item_parent' => 0, 'title' => 'Partner', 'url' => 'https://partner.example/offer', 'target' => '_blank', 'classes' => array()),
  );
}
${php}
${script}
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('menus resource', () => {
  const php = buildPhaseCResourcesPhp({}, '', ['primary', 'footer'], []);
  it('keys the collection by declared, registered and assigned locations (never language variants)', () => {
    const out = run(php, `echo json_encode(forgewp_menus_resource('en'));`);
    expect(out.lang).toBe('en');
    expect(Object.keys(out.menus).sort()).toEqual(['footer', 'primary']);
    expect(out.menus.footer).toEqual([]);
  });
  it('returns contract fields and marks external links, keeping their full URL as path', () => {
    const out = run(php, `echo json_encode(forgewp_menu_resource('primary', 'en'));`);
    expect(out.items[0]).toEqual({
      id: 1, title: 'About', url: 'https://site.test/about/', path: '/about/', external: false,
      target: '', classes: [], description: 'Who we are', attrTitle: 'About us', children: [],
    });
    expect(out.items[1]).toMatchObject({ path: 'https://partner.example/offer', external: true, description: '', attrTitle: '' });
  });
  it('returns an empty list, not an error, for an unknown location', () => {
    expect(run(php, `echo json_encode(forgewp_menu_resource('sidebar', 'en'));`)).toEqual({ location: 'sidebar', lang: 'en', items: [] });
  });
});

describe('i18n resource and ?lang= rule', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'forgewp-phase-c-root-'));
  mkdirSync(path.join(root, 'cms'));
  writeFileSync(path.join(root, 'cms', 'translations.json'), JSON.stringify({ de: { Home: 'Startseite' }, en: { Home: 'Home' } }));
  const config = { i18n: { locales: ['en', 'de'], defaultLocale: 'en', provider: 'local' } };
  const php = buildPhaseCResourcesPhp(config, root, [], ['Home', 'Contact']);

  it('embeds the dictionary and falls back to the key for missing translations', () => {
    const out = run(php, `echo json_encode(forgewp_i18n_resource('de', '/de/about/'));`);
    expect(out.currentLanguage).toBe('de');
    expect(out.defaultLocale).toBe('en');
    expect(out.locales).toEqual(['en', 'de']);
    expect(out.translations).toEqual({ Home: 'Startseite', Contact: 'Contact' });
  });
  it('builds path-prefixed switcher URLs for the current path', () => {
    const out = run(php, `echo json_encode(forgewp_i18n_resource('de', '/de/about/'));`);
    expect(out.urls).toEqual({ en: '/about/', de: '/de/about/' });
    expect(out.homeUrls).toEqual({ en: '/', de: '/de/' });
  });
  it('rejects an unknown ?lang= with FORGEWP_LOCALE_NOT_FOUND on multilingual sites', () => {
    const out = run(php, `$r = forgewp_resource_lang('fr'); echo json_encode($r instanceof WP_Error ? array($r->code, $r->data['status']) : $r);`);
    expect(out).toEqual(['FORGEWP_LOCALE_NOT_FOUND', 404]);
    expect(run(php, `echo json_encode(forgewp_resource_lang('DE'));`)).toBe('de');
    expect(run(php, `echo json_encode(forgewp_resource_lang(null));`)).toBe('en');
  });
  it('ignores ?lang= on single-language sites and returns empty switcher maps', () => {
    const single = buildPhaseCResourcesPhp({}, '', [], []);
    expect(run(single, `echo json_encode(forgewp_resource_lang('fr'));`)).toBe('en');
    const out = run(single, `echo json_encode(forgewp_i18n_resource('en', '/'));`);
    expect(out).toMatchObject({ currentLanguage: 'en', locales: ['en'], urls: {}, homeUrls: {}, translations: {} });
  });
  rmSync(root, { recursive: true, force: true });
});
