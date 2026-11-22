import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { afterEach, describe, expect, it } from 'vitest';
import { linkWorkspaceForgeWPPackages } from './helpers/workspace-node-modules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREATE = path.resolve(__dirname, '../../../create-forgewp/index.js');
const FRESH = path.resolve(__dirname, '../../bin/fresh.js');
const norm = (text) => text.replace(/\r\n/g, '\n');

let tmp;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

function scaffold(name, extra = []) {
  const run = spawnSync(process.execPath, [CREATE, name, '--yes', '--no-install', ...extra], { cwd: tmp, encoding: 'utf8' });
  expect(run.status, run.stderr || run.stdout).toBe(0);
  return path.join(tmp, name);
}

/** Relative paths of every file under src/ and cms/ (generated hydration folders excluded). */
function tree(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.forgewp-islands' || entry.name === 'generated') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).replaceAll('\\', '/'));
    }
  };
  for (const top of ['src', 'cms']) if (fs.existsSync(path.join(root, top))) walk(path.join(root, top));
  return out.sort();
}

function write(root, rel, content = 'export default {};\n') {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function runFresh(root, args = ['--force']) {
  return spawnSync(process.execPath, [FRESH, ...args], { cwd: root, encoding: 'utf8', input: '' });
}

describe('forgewp fresh', () => {
  for (const language of ['ts', 'js']) {
    it(`returns a used ${language.toUpperCase()} React project to exactly the scaffolded starter`, () => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), `forgewp-fresh-${language}-`));
      const flags = language === 'js' ? ['--js'] : [];
      const pristine = scaffold('pristine', flags);
      const used = scaffold('used', flags);
      linkWorkspaceForgeWPPackages(used);
      const x = language === 'js' ? 'jsx' : 'tsx';
      const s = language === 'js' ? 'js' : 'ts';

      // Typical generated work plus edits to starter files.
      for (const rel of [
        `src/app/pages/About.${x}`, `src/blocks/Promo.${x}`, `src/components/Counter.${x}`,
        `src/loops/Grid.${x}`, `src/app/single-portfolio.${x}`, `src/app/archive-portfolio.${x}`,
        `cms/forms/contact.${s}`, `cms/editables/about-page.${s}`, `cms/editables/sections/hero.${s}`,
      ]) write(used, rel);
      write(used, 'cms/mail/receipt.json', '{}\n');
      write(used, 'cms/users.json', '[]\n');
      fs.appendFileSync(path.join(used, `src/app/page.${x}`), '\n// edited\n');
      fs.appendFileSync(path.join(used, `cms/mock-data.${s}`), '\n// edited\n');
      fs.rmSync(path.join(used, `src/components/brand-logos.${x}`));

      const result = runFresh(used);
      expect(result.status, result.stdout + result.stderr).toBe(0);

      expect(tree(used)).toEqual(tree(pristine));
      for (const rel of tree(pristine).filter((f) => /\.(tsx|ts|jsx|js)$/.test(f))) {
        const restored = norm(fs.readFileSync(path.join(used, rel), 'utf8'));
        // fresh and create-forgewp share one TS->JS converter, so even JS output matches exactly.
        expect(restored, rel).toBe(norm(fs.readFileSync(path.join(pristine, rel), 'utf8')));
        if (language === 'js') {
          expect(() => parse(restored, { sourceType: 'module', plugins: ['jsx'] }), rel).not.toThrow();
          if (rel.startsWith('src/app/page.')) expect(restored).toContain('src/app/page.jsx');
        }
      }
      expect(fs.existsSync(path.join(used, 'components.json'))).toBe(true);
    }, 120_000);
  }

  it('refuses without deleting anything when the adapter cannot restore its starter', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-fresh-next-'));
    const project = scaffold('next-app', ['--adapter', 'nextjs']);
    linkWorkspaceForgeWPPackages(project);
    const before = tree(project);

    const result = runFresh(project);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Nothing was changed');
    expect(tree(project)).toEqual(before);
  }, 120_000);

  it('lists your files and deletes nothing without --force in a non-interactive shell', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-fresh-guard-'));
    const project = scaffold('guarded');
    linkWorkspaceForgeWPPackages(project);
    write(project, 'src/loops/Grid.tsx');

    const result = runFresh(project, []);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/fresh would delete 1 file you created/);
    expect(fs.existsSync(path.join(project, 'src/loops/Grid.tsx'))).toBe(true);
  }, 120_000);
});
