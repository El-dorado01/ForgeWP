import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GITIGNORE,
  ensureGitignore,
} from '../../../create-forgewp/lib/gitignore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createForgewpDir = path.resolve(__dirname, '../../../create-forgewp');
const normalize = (text) => text.replace(/\r\n/g, '\n').trim();

let tmp;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe('create-forgewp .gitignore (npm strips it from published packages)', () => {
  it('keeps the fallback defaults identical to the templates’ own .gitignore files', () => {
    for (const [adapter, folder] of [['react', 'template'], ['nextjs', 'template-nextjs']]) {
      const templateFile = path.join(createForgewpDir, folder, '.gitignore');
      expect(normalize(fs.readFileSync(templateFile, 'utf8')), adapter).toBe(
        normalize(DEFAULT_GITIGNORE[adapter]),
      );
    }
  });

  it('writes the adapter default only when the scaffold has no .gitignore', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-gitignore-'));
    expect(ensureGitignore(tmp, 'nextjs')).toBe(true);
    expect(fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8')).toContain('.next/');

    fs.writeFileSync(path.join(tmp, '.gitignore'), 'custom\n');
    expect(ensureGitignore(tmp, 'nextjs')).toBe(false);
    expect(fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8')).toBe('custom\n');
  });

  it('scaffolds every adapter with a .gitignore', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-gitignore-cli-'));
    for (const adapter of ['react', 'html', 'nextjs']) {
      const name = `app-${adapter}`;
      const run = spawnSync(
        process.execPath,
        [path.join(createForgewpDir, 'index.js'), name, '--adapter', adapter, '--yes', '--no-install'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(run.status, `${adapter}: ${run.stderr}\n${run.stdout}`).toBe(0);
      const gitignore = fs.readFileSync(path.join(tmp, name, '.gitignore'), 'utf8');
      expect(gitignore, adapter).toContain('node_modules');
    }
  }, 120_000);
});
