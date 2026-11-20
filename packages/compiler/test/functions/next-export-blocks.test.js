import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  exportNextExperimentalTheme,
  packageNextAssets,
} from '../../lib/next-export-experimental.js';
import { processMarkup } from '../../lib/markup-processor.js';
import { BlockArea } from '../../../react/src/components/BlockArea.tsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');
const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const requireLiveFixture = process.env.FORGEWP_REQUIRE_NEXT_FIXTURE === '1';

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

function findNodeByType(node, typeName) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === typeName) return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeByType(child, typeName);
      if (found) return found;
    }
  }
  return null;
}

function extractPhpFunction(phpSource, functionName) {
  const start = phpSource.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`Function ${functionName} not found`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < phpSource.length; i++) {
    if (phpSource[i] === '{') {
      depth++;
      seenBrace = true;
    } else if (phpSource[i] === '}') {
      depth--;
      if (seenBrace && depth === 0) return phpSource.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${functionName}`);
}

describe('Next.js experimental native export: Gutenberg blocks, WpEditable, and BlockArea', () => {
  it('emits <forgewp-block-area> in Node/SSR when FORGEWP_NATIVE_EXPORT=1 and compiles it to the_content()', () => {
    const prev = process.env.FORGEWP_NATIVE_EXPORT;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      const devHtml = renderToStaticMarkup(React.createElement(BlockArea, { name: 'main' }));
      expect(devHtml).toContain('Gutenberg Block Area');
      expect(devHtml).not.toContain('forgewp-block-area');

      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const exportHtml = renderToStaticMarkup(React.createElement(BlockArea, { name: 'main' }));
      expect(exportHtml).toBe('<forgewp-block-area data-name="main"></forgewp-block-area>');
      expect(processMarkup(exportHtml, 'demo')).toBe('<?php the_content(); ?>');
    } finally {
      if (prev === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prev;
    }
  });

  it('bundles multiple Next CSS files and wires matching block.json editorStyle without copying Next JS chunks', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-multi-css-'));
    try {
      const appRoot = path.join(tmp, 'app');
      const outExport = path.join(appRoot, 'out');
      mkdirSync(path.join(outExport, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outExport, '_next', 'static', 'chunks'), { recursive: true });
      mkdirSync(path.join(appRoot, 'src', 'blocks'), { recursive: true });

      writeFileSync(path.join(outExport, '_next', 'static', 'css', 'a.css'), '.a{color:red}');
      writeFileSync(path.join(outExport, '_next', 'static', 'css', 'b.css'), '.b{color:blue}');
      writeFileSync(path.join(outExport, '_next', 'static', 'chunks', 'main.js'), 'console.log(1);');
      writeFileSync(
        path.join(outExport, 'index.html'),
        '<!DOCTYPE html><html lang="en"><head>' +
          '<link rel="stylesheet" href="/_next/static/css/a.css"/>' +
          '<link rel="stylesheet" href="/_next/static/css/b.css"/>' +
          '<script src="/_next/static/chunks/main.js" async=""></script>' +
          '<title>Multi CSS</title></head><body>' +
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main><forgewp-block-area data-name="main"></forgewp-block-area></main>' +
          '<footer>Footer</footer>' +
          '<script>(self.__next_f=self.__next_f||[]).push([0])</script>' +
          '</body></html>',
      );
      writeFileSync(
        path.join(appRoot, 'src', 'blocks', 'HeroBlock.tsx'),
        `'use client';
import { defineBlock, WpEditable } from '@forgewp/react';
export default defineBlock({
  name: 'next-hero',
  title: 'Next Hero',
  category: 'text',
  attributes: { headline: { type: 'string', default: 'Default Headline' } },
  edit: ({ attributes, setAttributes }) => (
    <section><WpEditable tagName="h1" value={attributes.headline} onChange={(v) => setAttributes({ headline: v })} /></section>
  ),
  save: ({ attributes }) => <section><h1>{attributes.headline}</h1></section>,
});
`,
      );

      const themeOut = path.join(tmp, 'theme');
      const res = await exportNextExperimentalTheme({
        themeRoot: appRoot,
        outDir: themeOut,
        config: {
          name: 'Multi CSS Next',
          slug: 'multi-css-next',
          textDomain: 'multi-css-next',
          version: '1.0.0',
          description: 'Multi CSS test',
        },
        strict: true,
      });

      expect(res.assets.cssFile).toBe('assets/next-bundle.css');
      const bundledCss = readFileSync(path.join(themeOut, 'assets', 'next-bundle.css'), 'utf8');
      expect(bundledCss).toContain('.a{color:red}');
      expect(bundledCss).toContain('.b{color:blue}');
      expect(res.packaged.skippedClientScripts).toEqual(['_next/static/chunks/main.js']);

      // BlockArea compiled to live WordPress the_content().
      const homeStatic = readFileSync(path.join(themeOut, 'forgewp-static', 'content.html'), 'utf8');
      expect(homeStatic).toBe('<main><?php the_content(); ?></main>');

      // Block metadata preserves identity and points editorStyle to the bundled CSS.
      expect(res.blocks).toHaveLength(1);
      expect(res.blocks[0]).toMatchObject({
        slug: 'next-hero',
        name: 'forgewp/next-hero',
        editorStyle: 'file:../../assets/next-bundle.css',
        editorStyleExists: true,
        renderPhpExists: true,
      });

      // No Next JS runtime chunks were packaged.
      const emittedFiles = walkFiles(themeOut);
      expect(emittedFiles.some((f) => f.includes('_next/'))).toBe(false);
      expect(emittedFiles.some((f) => f.endsWith('main.js'))).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it.skipIf(!existsSync(fixtureOutIndex) && !requireLiveFixture)(
    'exports projects/nextjs-adapter-fixture into a validated WordPress theme ZIP with working Gutenberg RichText edit callback and live PHP render without rebuilding',
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-exp-export-'));
      try {
        const outDir = path.join(tmp, 'next-fixture-theme');
        const zipPath = path.join(tmp, 'next-fixture-theme.zip');

        const res = await exportNextExperimentalTheme({
          themeRoot: nextFixtureRoot,
          outDir,
          zipPath,
          config: {
            name: 'ForgeWP Next Fixture',
            slug: 'forgewp-next-fixture',
            textDomain: 'forgewp-next-fixture',
            version: '1.0.0',
            description: 'Experimental Next.js native WordPress export verification',
          },
          strict: true,
        });

        // 1. Installable ZIP created, validation passed, and fixture src/ stayed clean.
        expect(existsSync(zipPath)).toBe(true);
        expect(statSync(zipPath).size).toBeGreaterThan(1000);
        expect(res.validation.missing).toEqual([]);
        expect(res.validation.warnings).toEqual([]);
        expect(existsSync(path.join(nextFixtureRoot, 'src', 'blocks', 'generated'))).toBe(false);

        // 2. Next client chunks were explicitly skipped (not packaged as fake native runtime).
        expect(res.packaged.skippedClientScripts.length).toBeGreaterThan(0);
        const themeFiles = walkFiles(outDir);
        expect(themeFiles.some((f) => f.includes('_next/'))).toBe(false);
        expect(themeFiles.some((f) => f.includes('forgewp-hydrator.js'))).toBe(false);

        // 3. Block identity, attribute schema, and real Next CSS editorStyle preserved.
        expect(res.blocks).toHaveLength(1);
        expect(res.blocks[0]).toMatchObject({
          slug: 'next-intro',
          name: 'forgewp/next-intro',
          title: 'Next Intro',
          editorStyleExists: true,
          renderPhpExists: true,
        });
        expect(res.blocks[0].attributes.heading).toEqual({
          type: 'string',
          default: 'An editable introduction',
        });
        expect(res.blocks[0].editorStyle).toBe(`file:../../${res.assets.cssFile}`);

        // 4. Execute the real generated assets/forgewp-editor.js with the real window.forgeWpBlocks
        // localized by generated functions.php to verify Gutenberg RichText inline editing.
        const functionsPhp = readFileSync(path.join(outDir, 'functions.php'), 'utf8');
        const localizedMatch = functionsPhp.match(
          /<<<'FORGEWP_BLOCKS'\r?\n([\s\S]*?)\r?\nFORGEWP_BLOCKS/,
        );
        expect(localizedMatch, 'Expected functions.php to localize forgeWpBlocks').toBeTruthy();
        const localizedBlocks = JSON.parse(localizedMatch[1]);
        expect(localizedBlocks.some((b) => b.name === 'forgewp/next-intro')).toBe(true);

        const editorJs = readFileSync(path.join(outDir, 'assets', 'forgewp-editor.js'), 'utf8');
        const registeredBlocks = {};
        const createElement = (type, props, ...children) => ({
          type,
          props: props || {},
          children: children.flat(),
        });
        const vmContext = {
          window: { forgeWpBlocks: localizedBlocks },
          console,
          wp: {
            blocks: {
              registerBlockType: (name, settings) => {
                registeredBlocks[name] = settings;
              },
            },
            element: {
              createElement,
              useState: (initial) => [initial, () => {}],
              Fragment: 'Fragment',
            },
            blockEditor: {
              InspectorControls: 'InspectorControls',
              useBlockProps: () => ({ className: 'wp-block-forgewp-next-intro' }),
              MediaUpload: 'MediaUpload',
              URLInput: 'URLInput',
              InnerBlocks: 'InnerBlocks',
              useInnerBlocksProps: () => ({}),
              RichText: 'RichText',
            },
            components: {
              PanelBody: 'PanelBody',
              TextControl: 'TextControl',
              ToggleControl: 'ToggleControl',
              SelectControl: 'SelectControl',
              RangeControl: 'RangeControl',
              Placeholder: 'Placeholder',
              Spinner: 'Spinner',
              Button: 'Button',
              ColorPalette: 'ColorPalette',
              BaseControl: 'BaseControl',
              Popover: 'Popover',
            },
            serverSideRender: 'ServerSideRender',
          },
        };
        vm.runInNewContext(editorJs, vmContext);

        const nextIntro = registeredBlocks['forgewp/next-intro'];
        expect(nextIntro).toBeDefined();
        const patches = [];
        const editTree = nextIntro.edit({
          attributes: { heading: 'Saved heading' },
          setAttributes: (patch) => patches.push(patch),
        });
        const richTextNode = findNodeByType(editTree, 'RichText');
        expect(richTextNode).toBeTruthy();
        expect(richTextNode.props.value).toBe('Saved heading');
        richTextNode.props.onChange('Edited inline in Gutenberg');
        expect(patches).toEqual([{ heading: 'Edited inline in Gutenberg' }]);

        // 5. Lint every generated PHP file and compiled static template with php -l.
        const phpFiles = themeFiles.filter(
          (f) => f.endsWith('.php') || f.startsWith('forgewp-static/'),
        );
        for (const rel of phpFiles) {
          const lint = spawnSync('php', ['-l', path.join(outDir, rel)], { encoding: 'utf8' });
          expect(lint.status, `php -l failed for ${rel}: ${lint.stderr}`).toBe(0);
        }

        // 6. Execute blocks/next-intro/render.php in PHP 8 simulating Gutenberg edits reflected live without rebuilding.
        expect(functionsPhp).toContain("'next-intro'");
        expect(functionsPhp).toContain("register_block_type(__DIR__ . '/blocks/' . $block)");
        const paddingFn = extractPhpFunction(functionsPhp, 'forgewp_padding_classes');
        const renderPhpPath = path.join(outDir, 'blocks', 'next-intro', 'render.php');

        const phpDriver = path.join(tmp, 'verify-block-render.php');
        writeFileSync(
          phpDriver,
          `<?php
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function get_block_wrapper_attributes($extra = array()) {
  $cls = isset($extra['class']) ? ' class="' . esc_attr($extra['class']) . '"' : '';
  return $cls;
}
${paddingFn}
function render_intro($attributes) {
  $content = '';
  $block = null;
  ob_start();
  include ${JSON.stringify(renderPhpPath)};
  return trim(ob_get_clean());
}
echo json_encode(array(
  'initial' => render_intro(array('heading' => 'An editable introduction')),
  'edited'  => render_intro(array('heading' => 'Edited inline in Gutenberg')),
  'escaped' => render_intro(array('heading' => '<script>x</script>')),
));
`,
          'utf8',
        );
        const phpRun = spawnSync('php', [phpDriver], { encoding: 'utf8' });
        expect(phpRun.status, phpRun.stderr).toBe(0);
        const rendered = JSON.parse(phpRun.stdout);
        expect(rendered.initial).toContain('An editable introduction');
        expect(rendered.edited).toContain('Edited inline in Gutenberg');
        expect(rendered.edited).not.toContain('An editable introduction');
        expect(rendered.escaped).toContain('&lt;script&gt;x&lt;/script&gt;');
        expect(rendered.escaped).not.toContain('<script>');
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
  );
});
