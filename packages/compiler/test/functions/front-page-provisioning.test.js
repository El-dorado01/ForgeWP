/**
 * Regression coverage (cloud E2E, WordPress 7.1, Next.js starter): on a fresh
 * install WordPress defaults to show_on_front = 'posts'. ForgeWP never
 * provisioned a static front page, so front-page.php's the_content() printed
 * the newest blog post ("Welcome to WordPress. This is your first post...")
 * inside the starter hero, editors had no page to edit, and decoupled
 * getLivePage('home') found nothing. Activation now provisions a `home` page
 * tagged forgewp_route_id=front-page and sets it as the static front page —
 * only on first activation and only when no static front page is configured.
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

function provisioningBlock(seed) {
  const php = buildRoutingPhp({ textDomain: 'test_theme' }, '', '', '', '', [], seed);
  const start = php.indexOf("if (!$has_run && get_option('show_on_front') === 'posts'");
  const end = php.indexOf('if (!$has_run) {\n        update_option($activated_option');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return php.slice(start, end);
}

function runProvisioning({ seed = null, options = {}, pages = [], hasRun = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-frontpage-'));
  const file = path.join(dir, 'run.php');
  const state = { options: { show_on_front: 'posts', page_on_front: 0, ...options }, pages, meta: {} };
  fs.writeFileSync(
    file,
    `<?php
const OBJECT = 'OBJECT';
$state = json_decode(${JSON.stringify(JSON.stringify(state))}, true);
$state['meta'] = array();
function get_option($k) { global $state; return $state['options'][$k] ?? false; }
function update_option($k, $v) { global $state; $state['options'][$k] = $v; return true; }
function get_page_by_path($path) { global $state; foreach ($state['pages'] as $p) { if ($p['post_name'] === $path) return (object) $p; } return null; }
function wp_insert_post($args) { global $state; $id = 100 + count($state['pages']); $state['pages'][] = array_merge($args, array('ID' => $id)); return $id; }
function is_wp_error($v) { return false; }
function get_post_meta($id, $k) { global $state; return $state['meta'][$id][$k] ?? ''; }
function update_post_meta($id, $k, $v) { global $state; $state['meta'][$id][$k] = $v; }
function forgewp_resolve_route_page_id($route) { global $state; foreach ($state['meta'] as $id => $m) { if (($m['forgewp_route_id'] ?? '') === $route) return $id; } return 0; }
$has_run = ${hasRun ? 'true' : 'false'};
${provisioningBlock(seed)}
echo json_encode($state);
`,
  );
  try {
    return JSON.parse(execFileSync('php', [file], { encoding: 'utf8' }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('static front page provisioning on activation', () => {
  it('embeds seed content safely (base64) and only runs on first activation', () => {
    const block = provisioningBlock({ title: "It's <b>home</b>", content: "<p>Quote ' and \\ slash</p>" });
    expect(block).toContain("(int) get_option('page_on_front') <= 0");
    expect(block).toContain("update_option('show_on_front', 'page')");
    expect(block).not.toContain("It's <b>home</b>");
  });

  it.skipIf(!hasPhp)('creates a seeded home page and sets it as the static front page on a fresh install', () => {
    const state = runProvisioning({
      seed: { title: "Welcome ' home", content: '<p>Hero copy with "quotes" & \\ backslash</p>' },
    });
    expect(state.options.show_on_front).toBe('page');
    const home = state.pages.find((p) => p.post_name === 'home');
    expect(home).toBeTruthy();
    expect(home.post_title).toBe("Welcome ' home");
    expect(home.post_content).toBe('<p>Hero copy with "quotes" & \\ backslash</p>');
    expect(state.options.page_on_front).toBe(home.ID);
    expect(state.meta[home.ID].forgewp_route_id).toBe('front-page');
  });

  it.skipIf(!hasPhp)('reuses an existing `home` page instead of creating a duplicate', () => {
    const state = runProvisioning({
      pages: [{ ID: 7, post_name: 'home', post_title: 'Existing', post_content: '<p>Mine</p>' }],
    });
    expect(state.pages).toHaveLength(1);
    expect(state.options.page_on_front).toBe(7);
    expect(state.meta[7].forgewp_route_id).toBe('front-page');
  });

  it.skipIf(!hasPhp)('never overrides a site that already has a static front page', () => {
    const state = runProvisioning({ options: { show_on_front: 'page', page_on_front: 42 } });
    expect(state.pages).toHaveLength(0);
    expect(state.options.page_on_front).toBe(42);
  });

  it.skipIf(!hasPhp)('does nothing after the first activation', () => {
    const state = runProvisioning({ hasRun: true });
    expect(state.pages).toHaveLength(0);
    expect(state.options.show_on_front).toBe('posts');
  });
});
