import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeMockSeedData } from '../../lib/functions/seed-mock-data.js';

const cli = fileURLToPath(new URL('../../bin/seed.js', import.meta.url));
let root;
const fixture = {
  project: [{ id: 7, title: 'Shared facts', content: '<!-- wp:paragraph --><p>Programme</p><!-- /wp:paragraph -->', customFields: { session_date: '2026-11-01' }, featuredImage: '/cover.jpg' }],
  hidden: [{ title: 'Excluded' }],
};
function configure(seed) {
  fs.writeFileSync(path.join(root, 'wp.config.ts'), 'export default ' + JSON.stringify({
    name: 'Preview', slug: 'preview', version: '1.0', description: '', textDomain: 'preview', configVersion: 1, seed,
  }));
}
function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-seed-preview-'));
  fs.mkdirSync(path.join(root, 'cms'));
  fs.writeFileSync(path.join(root, 'cms/mock-data.json'), JSON.stringify(fixture));
});
afterEach(() => {
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('forgewp-seed-preview-')) throw new Error('Unsafe cleanup path');
  fs.rmSync(root, { recursive: true, force: true });
});
describe('mock seed preview CLI', () => {
  it('reports the actual normalized seed records without editing files', () => {
    const seed = { mockData: { project: true }, sideloadImages: false };
    configure(seed);
    const before = fs.readFileSync(path.join(root, 'wp.config.ts'), 'utf8');
    const result = run('mock-data', '--dry-run', '--json');
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ mode: 'preview-only', configChanged: false, databaseConnected: false, developmentOnly: true, sideloadImages: false });
    expect(report.types[0]).toMatchObject({ strategy: 'once', records: normalizeMockSeedData(fixture, seed.mockData).project });
    expect(report.types[0].records[0].content).toBe(fixture.project[0].content);
    expect(report.types[1]).toMatchObject({ postType: 'hidden', strategy: false, records: [] });
    expect(fs.readFileSync(path.join(root, 'wp.config.ts'), 'utf8')).toBe(before);
    expect(fs.readdirSync(root).sort()).toEqual(['cms', 'wp.config.ts']);
  });
  it('does not silently enable disabled seeding', () => {
    configure(undefined);
    const result = run('--dry-run', '--json');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).types.every((type) => type.strategy === false && !type.records.length)).toBe(true);
  });
  it('reports configured force and the disabled debug guard', () => {
    configure({ mockData: 'force', developmentOnly: false });
    const result = run('mock-data', '--dry-run', '--json');
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.developmentOnly).toBe(false);
    expect(report.types.every((type) => type.strategy === 'force')).toBe(true);
  });
  it('rejects unsupported preview targets without writing config', () => {
    configure(undefined);
    const before = fs.readFileSync(path.join(root, 'wp.config.ts'), 'utf8');
    expect(run('products', '--dry-run').status).toBe(1);
    expect(fs.readFileSync(path.join(root, 'wp.config.ts'), 'utf8')).toBe(before);
  });
  it('describes ordinary execution as configuration rather than completed export', () => {
    configure({ mockData: 'once' });
    const result = run('mock-data');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('has not exported PHP or connected to WordPress');
    expect(result.stdout).not.toContain('have been compiled');
  });
});
