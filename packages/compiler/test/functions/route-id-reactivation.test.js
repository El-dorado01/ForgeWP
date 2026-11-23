/**
 * Regression (R1 LocalWP report §3.1): re-activating hotelchecker24 overwrote the
 * English contact page's real route id (`kontakt-page`) with `placeholder`.
 * Fallback "Coming next" entries built from menu links carry the placeholder
 * template; when one matched a real page by slug, the self-healing route tag
 * downgraded it. A placeholder entry must never touch a page that already has a
 * real route id or a real template.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildRoutingPhp } from '../../lib/functions/routing.js';

const hasPhp = (() => {
  try {
    execFileSync('php', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const PAGES_PHP = `
        array('slug' => 'kontakt', 'title' => 'Kontakt', 'template' => 'page-kontakt-page.php', 'description' => ''),
        array('slug' => 'contact', 'title' => 'Contact', 'template' => 'page-placeholder.php', 'description' => ''),
        array('slug' => 'about', 'title' => 'About', 'template' => 'page-placeholder.php', 'description' => ''),`;

function provisioningLoop() {
  const php = buildRoutingPhp({ textDomain: 'test_theme' }, PAGES_PHP, '', '', '', []);
  const start = php.indexOf('    $pages = array(');
  const end = php.indexOf('        // Phase 3:');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return `${php.slice(start, end)}\n    }\n`;
}

function run({ pages, meta, hasRun }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-routeid-'));
  const file = path.join(dir, 'run.php');
  fs.writeFileSync(
    file,
    `<?php
const OBJECT = 'OBJECT';
$state = json_decode(${JSON.stringify(JSON.stringify({ pages, meta }))}, true);
function get_posts($a) { global $state; $out = array(); foreach ($state['pages'] as $p) { if (($state['meta'][$p['ID']][$a['meta_key']] ?? '') === $a['meta_value']) $out[] = (object) $p; } return $out; }
function get_page_by_path($path) { global $state; foreach ($state['pages'] as $p) { if ($p['post_name'] === $path) return (object) $p; } return null; }
function wp_insert_post($args) { global $state; $id = 100 + count($state['pages']); $state['pages'][] = array_merge($args, array('ID' => $id)); return $id; }
function wp_update_post($args) { global $state; foreach ($state['pages'] as &$p) { if ($p['ID'] === $args['ID']) $p = array_merge($p, $args); } }
function is_wp_error($v) { return false; }
function get_post_meta($id, $k) { global $state; return $state['meta'][$id][$k] ?? ''; }
function update_post_meta($id, $k, $v) { global $state; $state['meta'][$id][$k] = $v; }
$has_run = ${hasRun ? 'true' : 'false'};
${provisioningLoop()}
echo json_encode($state);
`,
  );
  try {
    return JSON.parse(execFileSync('php', [file], { encoding: 'utf8' }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const englishContact = () => ({
  pages: [
    { ID: 12, post_name: 'kontakt', post_title: 'Kontakt' },
    { ID: 17, post_name: 'contact', post_title: 'Contact us' },
  ],
  meta: {
    12: { forgewp_route_id: 'kontakt-page', _wp_page_template: 'page-kontakt-page.php' },
    17: { forgewp_route_id: 'kontakt-page', _wp_page_template: 'page-kontakt-page.php' },
  },
});

describe('route id survives theme re-activation', () => {
  for (const hasRun of [false, true]) {
    it.skipIf(!hasPhp)(`keeps a real route id and template when a placeholder entry matches by slug (has_run=${hasRun})`, () => {
      const state = run({ ...englishContact(), hasRun });
      expect(state.meta[17].forgewp_route_id).toBe('kontakt-page');
      expect(state.meta[17]._wp_page_template).toBe('page-kontakt-page.php');
      expect(state.pages.find((p) => p.ID === 17).post_title).toBe('Contact us');
      expect(state.meta[12].forgewp_route_id).toBe('kontakt-page');
    });
  }

  it.skipIf(!hasPhp)('keeps a real template even without a route id', () => {
    const s = englishContact();
    s.meta[17] = { _wp_page_template: 'page-kontakt-page.php' };
    const state = run({ ...s, hasRun: false });
    expect(state.meta[17].forgewp_route_id).toBeUndefined();
    expect(state.meta[17]._wp_page_template).toBe('page-kontakt-page.php');
  });

  it.skipIf(!hasPhp)('still creates and tags placeholder pages for unrouted menu links', () => {
    const state = run({ ...englishContact(), hasRun: false });
    const about = state.pages.find((p) => p.post_name === 'about');
    expect(about).toBeTruthy();
    expect(state.meta[about.ID]._wp_page_template).toBe('page-placeholder.php');
    expect(state.meta[about.ID].forgewp_route_id).toBe('placeholder');
  });

  it.skipIf(!hasPhp)('still upgrades an existing placeholder-tagged page when it matches by slug', () => {
    const state = run({
      pages: [{ ID: 30, post_name: 'about', post_title: 'About' }],
      meta: { 30: { forgewp_route_id: 'placeholder', _wp_page_template: 'page-placeholder.php' } },
      hasRun: false,
    });
    expect(state.meta[30].forgewp_route_id).toBe('placeholder');
    expect(state.meta[30]._wp_page_template).toBe('page-placeholder.php');
  });
});
