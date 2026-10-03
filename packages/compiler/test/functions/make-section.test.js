import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
const cliPath = path.join(repoRoot, 'packages/compiler/bin/cli.js');

test('make:section scaffolds a dual-host editable section without overwriting files', () => {
  const themeRoot = mkdtempSync(path.join(tmpdir(), 'forgewp-section-'));

  try {
    const srcDir = path.join(themeRoot, 'src');
    mkdirSync(srcDir, { recursive: true });
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        'make:section',
        'HeroSection',
        '--page=front-page',
        '--block',
        '--fields=title:text,description:richText,showImage:boolean',
      ],
      { cwd: themeRoot, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(srcDir));

    const component = readFileSync(
      path.join(themeRoot, 'src/components/HeroSection.tsx'),
      'utf8',
    );
    const pageSchema = readFileSync(
      path.join(themeRoot, 'cms/editables/front-page.ts'),
      'utf8',
    );

    assert.match(component, /@forgewp-block/);
    assert.match(component, /pickEditable\(pageEditable/);
    assert.match(component, /'hero_title'/);
    assert.match(component, /useWpMeta\('hero_title'/);
    assert.match(pageSchema, /pageEditableSections/);
    assert.match(pageSchema, /prefix: 'hero_'/);

    const duplicate = spawnSync(
      process.execPath,
      [cliPath, 'make:section', 'HeroSection'],
      { cwd: themeRoot, encoding: 'utf8' },
    );

    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /File already exists/);
  } finally {
    rmSync(themeRoot, { recursive: true, force: true });
  }
});
