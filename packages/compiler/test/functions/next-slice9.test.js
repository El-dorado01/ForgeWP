import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildIndexPhp } from '../../lib/php-builders.js';
import { processMarkup } from '../../lib/markup-processor.js';
import { exportTheme } from '../../lib/export-theme.js';
import * as nextAdapter from '../../lib/next-adapter.js';
import {
  bundleNextIslands,
  scanNextHydrationIslands,
} from '../../lib/next-islands.js';
import {
  createWpServerClient,
  isNativeWordPressExport,
} from '../../../react/src/server.ts';
import {
  WpEditable,
  WpEditablePreviewProvider,
} from '../../../react/src/components/WpEditable.tsx';
import {
  WpIcon,
  clearIconProviders,
  registerIconProvider,
} from '../../../react/src/components/WpIcon.tsx';
import fixtureMockData from '../../../../projects/nextjs-adapter-fixture/cms/mock-data.ts';

describe('Slice 9: static front-page loop, @forgewp/react/server live bindings, Next hydration islands, and shared-framework fixes', () => {
  it('initializes the_post() in front-page.php on static front pages without duplicating content.html on posts-index front pages', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-front-page-loop-'));
    try {
      const themeDir = path.join(tmp, 'theme');
      mkdirSync(path.join(themeDir, 'forgewp-static'), { recursive: true });
      writeFileSync(
        path.join(themeDir, 'front-page.php'),
        buildIndexPhp(),
        'utf8',
      );
      writeFileSync(
        path.join(themeDir, 'front-page-shell.php'),
        buildIndexPhp({ ownsShell: true }),
        'utf8',
      );
      writeFileSync(
        path.join(themeDir, 'forgewp-static', 'content.html'),
        '<main><h1><?php echo esc_html(get_the_title()); ?></h1><?php the_content(); ?></main>',
        'utf8',
      );

      for (const rel of ['front-page.php', 'front-page-shell.php']) {
        const lint = spawnSync('php', ['-l', path.join(themeDir, rel)], { encoding: 'utf8' });
        expect(lint.status, lint.stderr).toBe(0);
      }

      const driver = path.join(tmp, 'driver.php');
      writeFileSync(
        driver,
        `<?php
$state = array(
  'is_page' => true,
  'posts' => array(array('ID' => 7, 'title' => 'Static Home Live Title', 'content' => '<section class="intro"><h2>Live Block On Home</h2></section>')),
  'idx' => -1,
  'the_post_calls' => 0,
  'current' => null,
);
function get_header() {}
function get_footer() {}
function wp_head() {}
function wp_footer() {}
function wp_body_open() {}
function language_attributes() { echo 'lang="en"'; }
function bloginfo($k) { echo 'UTF-8'; }
function body_class() { echo 'class="home"'; }
function forgewp_seo_plugin_active() { return true; }
function get_template_directory() { return ${JSON.stringify(themeDir)}; }
function is_front_page() { return true; }
function is_page() { global $state; return $state['is_page']; }
function get_queried_object_id() { return 7; }
function get_page_template_slug($id) { return ''; }
function have_posts() { global $state; return ($state['idx'] + 1) < count($state['posts']); }
function the_post() { global $state; $state['idx']++; $state['the_post_calls']++; $state['current'] = $state['posts'][$state['idx']]; }
function get_the_title() { global $state; return $state['current'] ? $state['current']['title'] : ''; }
function the_content() { global $state; echo $state['current'] ? $state['current']['content'] : ''; }
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

ob_start();
include ${JSON.stringify(path.join(themeDir, 'front-page.php'))};
$static_home_html = ob_get_clean();
$static_calls = $state['the_post_calls'];

// Now simulate default posts-index front page with 3 posts -> content.html must render once without looping.
$state['is_page'] = false;
$state['idx'] = -1;
$state['the_post_calls'] = 0;
$state['current'] = null;
$state['posts'] = array(
  array('ID' => 1, 'title' => 'P1', 'content' => 'C1'),
  array('ID' => 2, 'title' => 'P2', 'content' => 'C2'),
  array('ID' => 3, 'title' => 'P3', 'content' => 'C3'),
);
ob_start();
include ${JSON.stringify(path.join(themeDir, 'front-page.php'))};
$posts_index_html = ob_get_clean();
$posts_index_calls = $state['the_post_calls'];

echo json_encode(array(
  'static_home_html' => $static_home_html,
  'static_calls' => $static_calls,
  'posts_index_main_count' => substr_count($posts_index_html, '<main>'),
  'posts_index_calls' => $posts_index_calls,
));
`,
        'utf8',
      );
      const run = spawnSync('php', [driver], { encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      const res = JSON.parse(run.stdout);
      expect(res.static_calls).toBe(1);
      expect(res.static_home_html).toContain('Static Home Live Title');
      expect(res.static_home_html).toContain('Live Block On Home');
      expect(res.posts_index_main_count).toBe(1);
      expect(res.posts_index_calls).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('provides unified local-fixture, decoupled-REST, and native-PHP-token bindings in @forgewp/react/server', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevWpUrl = process.env.FORGEWP_WP_URL;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_WP_URL;

      // 1. Local fixture mode (zero WordPress)
      const localClient = createWpServerClient({
        fixtures: fixtureMockData,
        siteOptions: { tagline: 'Local Tagline' },
        meta: { hero_eyebrow: 'Local Eyebrow' },
      });
      expect(localClient.getMode()).toBe('fixture');
      expect(isNativeWordPressExport()).toBe(false);
      const localHome = await localClient.getLivePage('home');
      expect(localHome).toMatchObject({
        slug: 'home',
        title: 'A standard Next.js app',
        mode: 'fixture',
      });
      expect(localClient.getOption('tagline', 'Fallback')).toBe('Local Tagline');
      expect(localClient.getField('hero_eyebrow', 'Fallback')).toBe('Local Eyebrow');

      // 2. Native WordPress export mode -> emits ForgeWP tokens that compile to valid PHP
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      expect(localClient.getMode()).toBe('native');
      const nativePage = await localClient.getLivePage('about');
      expect(nativePage).toMatchObject({
        title: '__FORGEWP_THE_TITLE__',
        content: '__FORGEWP_THE_CONTENT__',
        contentHtml: '__FORGEWP_THE_CONTENT__',
        excerpt: '__FORGEWP_THE_EXCERPT__',
        mode: 'native',
      });
      const nativeOption = localClient.getOption('tagline', 'Hello World');
      const nativeField = localClient.getField('hero_eyebrow', 'Default Eyebrow');
      const compiledPhp = processMarkup(
        `<main><h1>${nativePage.title}</h1><p>${nativeField}</p><span>${nativeOption}</span><div>${nativePage.contentHtml}</div></main>`,
        'demo',
      );
      expect(compiledPhp).toContain('get_the_title()');
      expect(compiledPhp).toContain('the_content()');
      expect(compiledPhp).toContain('forgewp_get_meta');
      expect(compiledPhp).toContain('get_option');

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-server-php-lint-'));
      try {
        const phpFile = path.join(tmp, 'template.php');
        writeFileSync(phpFile, compiledPhp, 'utf8');
        const lint = spawnSync('php', ['-l', phpFile], { encoding: 'utf8' });
        expect(lint.status, lint.stderr).toBe(0);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }

      // 3. Decoupled mode -> live WordPress REST + renamed slug routeId fallback + preview auth guard
      delete process.env.FORGEWP_NATIVE_EXPORT;
      const decoupledClient = createWpServerClient({
        wpUrl: 'https://cms.example.com/blog',
        fixtures: fixtureMockData,
        fetch: async (url) => {
          if (url.endsWith('/wp-json/wp/v2/pages?slug=about')) {
            return new Response('[]', { status: 200 });
          }
          if (url.endsWith('/wp-json/forgewp/v1/routes')) {
            return new Response(
              JSON.stringify({
                homeUrl: 'https://cms.example.com/blog/',
                basePath: '/blog',
                routes: [
                  {
                    routeId: 'about',
                    id: 19,
                    slug: 'story',
                    title: 'Story',
                    path: '/story/',
                    permalink: 'https://cms.example.com/blog/story/',
                  },
                ],
              }),
              { status: 200 },
            );
          }
          if (url.endsWith('/wp-json/wp/v2/pages/19')) {
            return new Response(
              JSON.stringify({
                id: 19,
                slug: 'story',
                forgewp_route_id: 'about',
                link: 'https://cms.example.com/blog/story/',
                title: { rendered: 'Our Live Story' },
                content: { rendered: '<p>Live WP body</p>' },
                forgewp_blocks: [{ blockName: 'forgewp/next-intro', attrs: { heading: 'Live' } }],
              }),
              { status: 200 },
            );
          }
          return new Response('Not found', { status: 404 });
        },
      });
      expect(decoupledClient.getMode()).toBe('decoupled');
      const liveAbout = await decoupledClient.getLivePage('about');
      expect(liveAbout).toMatchObject({
        id: 19,
        slug: 'story',
        routeId: 'about',
        title: 'Our Live Story',
        path: '/story/',
        mode: 'decoupled',
      });
      expect(liveAbout.blocks[0]).toMatchObject({
        blockName: 'forgewp/next-intro',
        attrs: { heading: 'Live' },
      });
      expect(
        await decoupledClient.getRouteHref('about', '/about', { query: 'x=1', fragment: 'top' }),
      ).toBe('/story/?x=1#top');
      await expect(decoupledClient.getLivePage('draft', { preview: true })).rejects.toThrow(
        /FORGEWP_PREVIEW_AUTH_REQUIRED/,
      );
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevWpUrl === undefined) delete process.env.FORGEWP_WP_URL;
      else process.env.FORGEWP_WP_URL = prevWpUrl;
    }
  });

  it('bundles explicit Next.js <Hydrate> islands via esbuild through exportTheme(nextAdapter) without shipping _next chunks', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-islands-'));
    try {
      const appRoot = path.join(tmp, 'next-island-app');
      mkdirSync(path.join(appRoot, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(appRoot, 'src', 'components'), { recursive: true });
      mkdirSync(path.join(appRoot, 'out', '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(appRoot, 'out', '_next', 'static', 'chunks'), { recursive: true });

      writeFileSync(path.join(appRoot, 'package.json'), '{"name":"next-island-demo"}');
      writeFileSync(path.join(appRoot, 'next.config.ts'), 'export default { output: "export" };');
      writeFileSync(
        path.join(appRoot, 'src', 'app', 'layout.tsx'),
        'export default function Layout({ children }: any) { return <html><body>{children}</body></html>; }',
      );
      writeFileSync(
        path.join(appRoot, 'src', 'app', 'page.tsx'),
        `import { Hydrate } from '@forgewp/react';
import { CounterWidget } from '@/components/CounterWidget';
export default function Home() {
  return <main><Hydrate><CounterWidget initial={3} /></Hydrate></main>;
}
`,
      );
      writeFileSync(
        path.join(appRoot, 'src', 'components', 'CounterWidget.tsx'),
        `'use client';
import { useState } from 'react';
export function CounterWidget({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return <button type="button" onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}
export default CounterWidget;
`,
      );
      writeFileSync(path.join(appRoot, 'out', '_next', 'static', 'css', 'app.css'), 'button{color:teal}');
      writeFileSync(path.join(appRoot, 'out', '_next', 'static', 'chunks', 'main.js'), 'console.log("next");');
      writeFileSync(
        path.join(appRoot, 'out', 'index.html'),
        '<!DOCTYPE html><html lang="en"><head><link rel="stylesheet" href="/_next/static/css/app.css"/><script src="/_next/static/chunks/main.js"></script><title>Islands</title></head><body>' +
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main><div data-forgewp-hydrate="counter-widget" data-forgewp-trigger="visible" data-forgewp-props="{&quot;initial&quot;:3}" style="display:contents"><button type="button">Count: 3</button></div></main>' +
          '<footer>Footer</footer>' +
          '<script>(self.__next_f=self.__next_f||[]).push([0])</script></body></html>',
      );

      expect(scanNextHydrationIslands(appRoot)).toEqual(['counter-widget']);

      const result = await exportTheme({
        themeRoot: appRoot,
        adapter: nextAdapter,
        config: {
          name: 'Next Island Theme',
          slug: 'next-island-theme',
          textDomain: 'next-island-theme',
          version: '1.0.0',
          description: 'Next.js hydration island test',
        },
        skipBuild: true,
        validate: true,
        strict: true,
        zip: false,
      });

      const runtimeFile = path.join(result.outDir, 'assets', 'islands', 'react-runtime.js');
      const islandFile = path.join(result.outDir, 'assets', 'islands', 'counter-widget.js');
      const hydratorFile = path.join(result.outDir, 'assets', 'forgewp-hydrator.js');
      expect(existsSync(runtimeFile)).toBe(true);
      expect(existsSync(islandFile)).toBe(true);
      expect(existsSync(hydratorFile)).toBe(true);
      expect(existsSync(path.join(result.outDir, '_next'))).toBe(false);

      const functionsPhp = readFileSync(path.join(result.outDir, 'functions.php'), 'utf8');
      expect(functionsPhp).toContain('assets/islands/react-runtime.js');
      expect(functionsPhp).toContain('assets/islands/counter-widget.js');
      expect(functionsPhp).toContain('forgewp-hydrator.js');
      const lint = spawnSync('php', ['-l', path.join(result.outDir, 'functions.php')], {
        encoding: 'utf8',
      });
      expect(lint.status, lint.stderr).toBe(0);

      // Dynamically import the bundled ESM island chunk against globalThis.React and render it!
      const prevReact = globalThis.React;
      try {
        globalThis.React = React;
        const mod = await import(pathToFileURL(islandFile).href);
        const Counter = mod.CounterWidget || mod.default;
        const rendered = renderToStaticMarkup(React.createElement(Counter, { initial: 3 }));
        expect(rendered).toBe('<button type="button">Count: 3</button>');
      } finally {
        if (prevReact === undefined) delete globalThis.React;
        else globalThis.React = prevReact;
      }

      // Reject server-only imports inside client hydration islands.
      writeFileSync(
        path.join(appRoot, 'src', 'components', 'BadIsland.tsx'),
        `import 'server-only';\nexport default function BadIsland() { return null; }\n`,
      );
      await expect(bundleNextIslands(appRoot, result.outDir, ['bad-island'])).rejects.toThrow(
        /FORGEWP_ISLAND_SERVER_IMPORT/,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('keeps WpEditable SSR-hydration safe and supports bundler-safe registerIconProvider on WpIcon', () => {
    // 1. WpEditable SSR output never sets contenteditable="true" (server & initial client agree).
    const ssrEditable = renderToStaticMarkup(
      React.createElement(
        WpEditablePreviewProvider,
        { enabled: true },
        React.createElement(WpEditable, { tagName: 'h2', value: 'Hello', previewEditable: true }),
      ),
    );
    expect(ssrEditable).toContain('<h2 class="forgewp-editable">Hello</h2>');
    expect(ssrEditable).not.toContain('contenteditable');

    // 2. WpIcon SSR emits <forgewp-icon-placeholder> and registerIconProvider accepts explicit loaders.
    clearIconProviders();
    registerIconProvider('lucide', () => ({
      Star: (props) => React.createElement('svg', { ...props, 'data-icon': 'star' }),
    }));
    const ssrIcon = renderToStaticMarkup(
      React.createElement(WpIcon, { name: 'star', provider: 'lucide', className: 'w-4 h-4' }),
    );
    expect(ssrIcon).toContain('<forgewp-icon-placeholder');
    expect(ssrIcon).toContain('name="star"');
    clearIconProviders();
  });
});
