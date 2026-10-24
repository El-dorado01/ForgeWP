import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectCptRouteDiagnostics, buildCptRewriteRefreshPhp } from '../../lib/functions/cpt-routing.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { collectFallbackPageRoutes } from '../../lib/collect-static-routes.js';
import { generatePhpMarkupFromJsx } from '../../lib/blocks/php-transpiler.js';
import { loadConfig } from '../../lib/load-config.js';

let root;
const base = { name: 'Routes', slug: 'routes', version: '1.0.0', textDomain: 'routes', description: '', configVersion: 1 };
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-cpt-routing-'));
  fs.mkdirSync(path.join(root, 'cms'));
});
afterEach(() => {
  vi.restoreAllMocks();
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('forgewp-cpt-routing-')) throw new Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
function php(source) {
  const file = path.join(root, 'check.php');
  fs.writeFileSync(file, source);
  const result = spawnSync('php', [file], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
describe('CPT routing diagnostics and refresh', () => {
  it('detects exact archive/Page collisions for configured and inferred CPTs', () => {
    const config = { postTypes: { project: { rewrite: { slug: 'work/projects', withFront: false } } } };
    const messages = collectCptRouteDiagnostics(config, ['project', 'review'], [{ slug: '/work/projects/' }, { slug: 'review' }]);
    expect(messages.filter((entry) => entry.level === 'warning').map((entry) => entry.postType)).toEqual(['project', 'review']);
    expect(messages[0].message).toContain('export does not create redirects or delete saved Pages');
  });
  it.each([{ hasArchive: false }, { rewrite: false }])('does not report an archive collision when unavailable: %j', (entry) => {
    expect(collectCptRouteDiagnostics({ postTypes: { project: entry } }, ['project'], [{ slug: 'project' }]).filter((message) => message.level === 'warning')).toEqual([]);
  });
  it('still checks non-public types that reserve archive rewrite rules', () => {
    expect(collectCptRouteDiagnostics({ postTypes: { project: { public: false } } }, ['project'], [{ slug: 'project' }]).some((entry) => entry.level === 'warning')).toBe(true);
  });
  it('does not confuse a different or descendant Page path with the archive path', () => {
    expect(collectCptRouteDiagnostics({}, ['project'], [{ slug: 'projects' }, { slug: 'project/team' }])).toEqual([]);
  });
  it('reports collisions through the actual functions generator using collected routes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pages = collectFallbackPageRoutes({ routesSource: '<Route path="/projects" component={Projects} />' });
    buildFunctionsPhp({ ...base, postTypes: { project: { rewrite: { slug: 'projects', withFront: false } } } }, { cssFile: 'assets/app.css' }, [], root, pages);
    expect(warn.mock.calls.flat().join('\n')).toContain('CPT "project" archive /projects also names a configured Page route');
  });
  it('refreshes only when effective settings change, including reverting and removing the last CPT', () => {
    const configs = [
      [{}, ['project']], [{}, ['project']],
      [{ postTypes: { project: { rewrite: { slug: 'work', withFront: false } } } }, ['project']],
      [{ postTypes: { project: { rewrite: { slug: 'work', withFront: false } } } }, ['project']],
      [{}, ['project']], [{}, []], [{}, []],
    ];
    const steps = configs.map(([config, types]) => {
      const fragment = buildCptRewriteRefreshPhp({ ...base, ...config }, types);
      const body = fragment.match(/function [^(]+\(\) \{([\s\S]*?)\n\}\nadd_action/)?.[1];
      expect(body).toBeTruthy();
      return `$step = function() {${body}\n}; $step(); $counts[] = $flushes;`;
    }).join('\n');
    const result = php(`<?php
$options = array(); $flushes = 0; $counts = array();
function get_option($key) { global $options; return $options[$key] ?? false; }
function update_option($key, $value, $autoload) { global $options; $options[$key] = $value; }
function flush_rewrite_rules($hard) { global $flushes; if ($hard !== false) throw new Exception('Expected soft flush'); $flushes++; }
${steps}
echo json_encode($counts);`);
    expect(result).toEqual([1, 1, 2, 2, 3, 4, 4]);
  });
  it('does not refresh for equivalent defaults or reordered post-type declarations', () => {
    expect(buildCptRewriteRefreshPhp(base, ['project', 'review'])).toBe(buildCptRewriteRefreshPhp({ ...base, postTypes: { review: { rewrite: { withFront: true, slug: 'review' } }, project: { hasArchive: true } } }, ['review', 'project']));
  });
  it('emits permalink reads rather than baking in a post slug', () => {
    const markup = generatePhpMarkupFromJsx('<a href={useWpPermalink()}>Details</a>', { attributes: {} }, {});
    expect(markup).toContain('get_permalink(');
    const rendered = php(`<?php
$url = '/work/old-name/';
function get_permalink(...$args) { global $url; return $url; }
function esc_url($value) { return $value; }
ob_start(); ?>${markup}<?php $first = ob_get_clean();
$url = '/work/new-name/'; ob_start(); ?>${markup}<?php
echo json_encode(array($first, ob_get_clean()));`);
    expect(rendered[0]).toContain('/work/old-name/');
    expect(rendered[1]).toContain('/work/new-name/');
  });
  it.each([true, 'work', [], { slug: '' }, { slug: 7 }, { slug: 'https://example.com/work' }, { slug: 'work?x=1' }, { withFront: 'false' }])('rejects invalid rewrite settings at config loading: %j', async (rewrite) => {
    fs.writeFileSync(path.join(root, 'wp.config.ts'), 'export default ' + JSON.stringify({ ...base, postTypes: { project: { rewrite } } }));
    await expect(loadConfig(root)).rejects.toThrow(/rewrite/);
  });
});
