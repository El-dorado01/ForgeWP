import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';

let tempRoot;

afterEach(() => {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

describe('useWpMeta() block fallback defaults', () => {
  it('resolves an aliased section defaults object through the block attribute schema', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-wp-meta-default-'));
    const themeRoot = path.join(tempRoot, 'theme');
    const outDir = path.join(tempRoot, 'out');
    const blocksDir = path.join(themeRoot, 'src', 'blocks');
    const componentsDir = path.join(themeRoot, 'src', 'components');
    const editablesDir = path.join(themeRoot, 'cms', 'editables', 'sections');
    fs.mkdirSync(blocksDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(editablesDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
      path.join(editablesDir, 'hero.ts'),
      `export const defaults = { eyebrow: 'Section fallback' };`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(componentsDir, 'HeroSection.tsx'),
      `import { useWpMeta } from '@forgewp/react';
import { defaults as heroDefaults } from '../../cms/editables/sections/hero';

export default function HeroSection({ eyebrow: eyebrowProp }) {
  const eyebrowMeta = useWpMeta('hero_eyebrow', heroDefaults.eyebrow);
  const eyebrow = eyebrowProp ?? eyebrowMeta;
  return <p>{eyebrow}</p>;
}
`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(blocksDir, 'HeroSection.tsx'),
      `import { defineBlock } from '@forgewp/react';
import HeroSection from '../components/HeroSection';

export default defineBlock({
  name: 'hero-section',
  title: 'Hero Section',
  category: 'theme',
  attributes: {
    eyebrow: { type: 'string', default: 'Schema fallback' },
  },
  edit: () => null,
  save: () => <HeroSection />,
});
`,
      'utf8',
    );

    compileBlocks(themeRoot, outDir, {});

    const renderPhp = fs.readFileSync(
      path.join(outDir, 'blocks', 'hero-section', 'render.php'),
      'utf8',
    );
    expect(renderPhp).toContain(
      "$eyebrowMeta = forgewp_get_meta_value('hero_eyebrow', 'Schema fallback', false, null);",
    );
    expect(renderPhp).not.toContain('heroDefaults');
  });
});
