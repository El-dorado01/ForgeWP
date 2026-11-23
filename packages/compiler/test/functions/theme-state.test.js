/**
 * Theme-independent theme state (docs/resource-contracts.md §4.2). Verified
 * live in the cloud sandbox by switching between two ForgeWP themes; this
 * test executes the generated PHP with minimal WordPress stand-ins.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildThemeStatePhp } from '../../lib/functions/theme-state.js';

function run(script, initialOptions) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-theme-state-'));
  try {
    const file = path.join(dir, 'run.php');
    writeFileSync(file, `<?php
$options = json_decode(${JSON.stringify(JSON.stringify(initialOptions))}, true);
$filters = array(); $actions = array();
function get_option($k, $d = false) { global $options; return array_key_exists($k, $options) ? $options[$k] : $d; }
function update_option($k, $v, $a = null) { global $options; $options[$k] = $v; }
function add_filter($h, $cb) { global $filters; $filters[$h][] = $cb; }
function add_action($h, $cb, $p = 10) { global $actions; $actions[$h][] = $cb; }
function apply_filters($h, $v) { global $filters; foreach ($filters[$h] ?? array() as $cb) { $v = $cb($v); } return $v; }
function do_action($h) { global $actions; foreach ($actions[$h] ?? array() as $cb) { $cb(); } }
function get_theme_mod($k, $d = false) { $mods = get_option('theme_mods_' . get_option('stylesheet'), array()); return apply_filters('theme_mod_' . $k, $mods[$k] ?? $d); }
function set_theme_mod($k, $v) { $opt = 'theme_mods_' . get_option('stylesheet'); $mods = get_option($opt, array()); $mods[$k] = apply_filters('pre_set_theme_mod_' . $k, $v); update_option($opt, $mods); }
${buildThemeStatePhp({ footer_text: '', header_textcolor: '' })}
${script}
`);
    const out = spawnSync('php', [file], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('forgewp_theme_state', () => {
  it('migrates managed keys once from the active theme, ignoring unmanaged mods', () => {
    const out = run(`do_action('init'); echo json_encode(get_option('forgewp_theme_state'));`, {
      stylesheet: 'theme-a',
      'theme_mods_theme-a': { footer_text: 'A footer', nav_menu_locations: { primary: 2 }, background_color: 'fff' },
    });
    expect(out).toEqual({ _migrated_from: 'theme-a', footer_text: 'A footer', nav_menu_locations: { primary: 2 } });
  });

  it('survives a theme switch: the new theme reads state it never stored', () => {
    const out = run(`
do_action('init');
set_theme_mod('footer_text', 'Edited on A');
$options['stylesheet'] = 'theme-b';
do_action('after_switch_theme');
echo json_encode(array('footer' => get_theme_mod('footer_text'), 'menus' => get_theme_mod('nav_menu_locations'), 'bMods' => get_option('theme_mods_theme-b', array())));
`, { stylesheet: 'theme-a', 'theme_mods_theme-a': { nav_menu_locations: { primary: 7 } } });
    expect(out.footer).toBe('Edited on A');
    expect(out.menus).toEqual({ primary: 7 });
    expect(out.bMods).toEqual([]);
  });

  it('never overwrites existing state on a later migration', () => {
    const out = run(`do_action('after_switch_theme'); echo json_encode(get_option('forgewp_theme_state'));`, {
      stylesheet: 'theme-b',
      forgewp_theme_state: { _migrated_from: 'theme-a', footer_text: 'Kept' },
      'theme_mods_theme-b': { footer_text: 'B default' },
    });
    expect(out).toEqual({ _migrated_from: 'theme-a', footer_text: 'Kept' });
  });

  it('still writes the normal theme mod so removing ForgeWP loses nothing', () => {
    const out = run(`do_action('init'); set_theme_mod('header_textcolor', '#111'); echo json_encode(get_option('theme_mods_theme-a'));`, {
      stylesheet: 'theme-a',
    });
    expect(out).toEqual({ header_textcolor: '#111' });
  });
});
