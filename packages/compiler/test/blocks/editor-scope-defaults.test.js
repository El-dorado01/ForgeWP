import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildEditorScopeInjections } from '../../lib/blocks/editor-scope.js';

let tempRoot;

afterEach(() => {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

function writeTheme() {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-editor-scope-'));
  const themeRoot = path.join(tempRoot, 'theme');
  const editablesDir = path.join(themeRoot, 'cms', 'editables', 'sections');
  const componentsDir = path.join(themeRoot, 'src', 'components');
  fs.mkdirSync(editablesDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(editablesDir, 'hero.ts'),
    `import { defineEditable, getEditableDefaults, text, url } from '@forgewp/react';
export const editable = defineEditable({
  eyebrow: text({ label: 'Eyebrow', default: 'Hero eyebrow' }),
  buyUrl: url({ label: 'Buy URL', default: '#buy' }),
});
export const defaults = getEditableDefaults(editable);
`,
  );
  const componentFile = path.join(componentsDir, 'HeroSection.tsx');
  return { themeRoot, componentFile };
}

describe('editor scope defaults injection', () => {
  it('injects aliased section defaults (defaults as heroDefaults) used by the editor IIFE', () => {
    const { themeRoot, componentFile } = writeTheme();
    const source = `import { useWpMeta } from '@forgewp/react';
import { defaults as heroDefaults } from '../../cms/editables/sections/hero';
export default function HeroSection() { return null; }`;
    const body = `const eyebrowMeta = useWpMeta('hero_eyebrow', heroDefaults.eyebrow);`;

    const { injections, scope } = buildEditorScopeInjections(
      source,
      componentFile,
      themeRoot,
      body,
    );

    expect(scope.heroDefaults).toEqual({ eyebrow: 'Hero eyebrow', buyUrl: '#buy' });
    expect(injections).toContain('var heroDefaults = {');
    // The executed snippet must no longer throw "heroDefaults is not defined".
    const run = new Function('useWpMeta', `${injections}\n${body}\nreturn eyebrowMeta;`);
    expect(run((_key, fallback) => fallback)).toBe('Hero eyebrow');
  });

  it('still injects an unaliased defaults import', () => {
    const { themeRoot, componentFile } = writeTheme();
    const source = `import { defaults } from '../../cms/editables/sections/hero';
export default function HeroSection() { return null; }`;
    const { scope } = buildEditorScopeInjections(
      source,
      componentFile,
      themeRoot,
      'return defaults.eyebrow;',
    );
    expect(scope.defaults).toEqual({ eyebrow: 'Hero eyebrow', buyUrl: '#buy' });
  });
});
