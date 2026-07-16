/**
 * Tier 3 — real production component fixtures, run through the actual
 * `compileBlocks` pipeline (not the hand-rolled per-function calls Tier 1/2
 * use) against a scratch copy of the real `hotelchecker24` theme. Highest
 * value tier: these are real edge cases, not synthetic ones.
 *
 * `hotelchecker24/` is copied into a temp dir rather than compiled in place
 * — compileBlocks has real write side effects (splitInteractiveIslands writes
 * `.forgewp-islands/`, scanAndGenerateBlocks writes `src/blocks/generated/`)
 * that must not touch the checked-in theme.
 *
 * These 11 blocks originally had dumped compiled-output pairs checked into
 * scratch/ (about-values, impressum-content, contact-details, trust-strip,
 * featured-hotels [nests FeaturedHotelsGrid.tsx], hero-section, destinations,
 * editorial-strip, about-hero, contact-form-section, contact-hero). Two of
 * those dumps (destinations-edit.js, featured-hotels-edit.js) turned out to
 * be known-bad snapshots — `new Function()` on them throws "Unexpected token
 * '<'" because raw JSX (`<DestinationsSkeleton />`, `<>...</>` fragments from
 * the nested Grid component) leaked into what should have been fully
 * `createElement(...)`-compiled output. Re-running against the current engine
 * shows this has since been fixed: interactive nested components like
 * DestinationsGrid/FeaturedHotelsGrid now safely render a
 * "forgewp-editor-island-placeholder" preview box instead of attempting (and
 * failing) to inline their JSX. The old scratch/*-edit.js dumps are stale
 * reference material, not literal expected-output fixtures — the Vitest
 * snapshots captured here from the real, current pipeline are the Phase 1
 * baseline going forward.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const hc24Root = path.join(repoRoot, 'hotelchecker24');

const TARGET_SLUGS = [
  'about-hero',
  'about-values',
  'contact-details',
  'contact-form-section',
  'contact-hero',
  'destinations',
  'editorial-strip',
  'featured-hotels',
  'hero-section',
  'impressum-content',
  'trust-strip',
];

const isMangled = (out) => out.includes('") : ("') || out.includes('`)}`');

let tmpRoot;
let blocksBySlug;
let renderPhpBySlug;

beforeAll(async () => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-tier3-'));
  const themeRoot = path.join(tmpRoot, 'theme');
  const outDir = path.join(tmpRoot, 'out');
  fs.mkdirSync(themeRoot, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // src + cms: cms/editables/* holds the defaults `useWpMeta` calls close over
  // (imported via relative paths like `../../cms/editables/front-page`).
  fs.cpSync(path.join(hc24Root, 'src'), path.join(themeRoot, 'src'), { recursive: true });
  fs.cpSync(path.join(hc24Root, 'cms'), path.join(themeRoot, 'cms'), { recursive: true });
  for (const f of ['wp.config.ts', 'package.json', 'tsconfig.json', 'components.json']) {
    const src = path.join(hc24Root, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(themeRoot, f));
  }
  // resolveIconToSvgHtml spawns a child process that resolves icon packages
  // (lucide-react, …) via `createRequire(themeRoot/package.json)` — without
  // node_modules reachable from themeRoot, every icon-component block (most
  // of them) silently renders blank, a false regression signal unrelated to
  // the compiler itself. Junction rather than copy: real node_modules trees
  // are large and this is read-only lookup.
  const hc24NodeModules = path.join(hc24Root, 'node_modules');
  if (fs.existsSync(hc24NodeModules)) {
    execSync(`cmd /c mklink /j "${path.join(themeRoot, 'node_modules')}" "${hc24NodeModules}"`);
  }

  const { compileBlocks } = await import(
    pathToFileURL(path.join(repoRoot, 'packages/compiler/lib/blocks/index.js')).href
  );
  const blocks = compileBlocks(themeRoot, outDir, {});
  blocksBySlug = new Map(blocks.map((b) => [(b.name || '').replace(/^forgewp\//, ''), b]));

  // render.php is written straight to disk (never returned in-memory the way
  // customEditJsx is on the settings object) — read it back per block so the
  // PHP-markup side of the pipeline has the same snapshot regression coverage
  // as the editor side above.
  renderPhpBySlug = new Map();
  for (const slug of blocksBySlug.keys()) {
    const renderPhpPath = path.join(outDir, 'blocks', slug, 'render.php');
    if (fs.existsSync(renderPhpPath)) {
      renderPhpBySlug.set(slug, fs.readFileSync(renderPhpPath, 'utf8'));
    }
  }
}, 180000);

afterAll(() => {
  if (!tmpRoot) return;
  // Unlink the node_modules junction explicitly before the recursive
  // removal below — junctions point at the real hotelchecker24/node_modules,
  // and an unlink (not a recursive delete) is what removes just the link.
  const themeNodeModules = path.join(tmpRoot, 'theme', 'node_modules');
  if (fs.existsSync(themeNodeModules)) {
    try { fs.rmdirSync(themeNodeModules); } catch { /* not a junction / already gone */ }
  }
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('compileBlocks against real hotelchecker24 components', () => {
  it('compiled all 11 target blocks', () => {
    for (const slug of TARGET_SLUGS) {
      expect(blocksBySlug.has(slug), `missing compiled block for slug "${slug}"`).toBe(true);
    }
  });

  for (const slug of TARGET_SLUGS) {
    it(`"${slug}" customEditJsx parses and contains no mangled-ternary markers`, () => {
      const block = blocksBySlug.get(slug);
      expect(block, `block "${slug}" not found`).toBeTruthy();
      const code = block.customEditJsx;
      expect(code, `block "${slug}" has no customEditJsx`).toBeTruthy();
      expect(isMangled(code), `block "${slug}" customEditJsx looks mangled`).toBe(false);
      expect(() => new Function('return ' + code), `block "${slug}" customEditJsx failed to parse`).not.toThrow();
      expect(code).toMatchSnapshot();
    });
  }
});

describe('render.php (PHP markup) for real hotelchecker24 components', () => {
  for (const slug of TARGET_SLUGS) {
    it(`"${slug}" render.php exists, contains no mangled-ternary markers, and lints as balanced PHP tags`, () => {
      const php = renderPhpBySlug.get(slug);
      expect(php, `block "${slug}" has no render.php`).toBeTruthy();
      expect(isMangled(php), `block "${slug}" render.php looks mangled`).toBe(false);
      // Balanced <?php ... ?> tag count is a cheap, dependency-free sanity
      // check that catches gross corruption (unclosed tag, doubled marker)
      // without needing a real PHP binary in the test environment.
      const opens = (php.match(/<\?php/g) || []).length;
      const closes = (php.match(/\?>/g) || []).length;
      expect(opens, `block "${slug}" render.php has unbalanced <?php/?> tags`).toBe(closes);
      expect(php).toMatchSnapshot();
    });
  }
});
