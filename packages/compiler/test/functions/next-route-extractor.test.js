import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractNextStaticMarkup } from '../../lib/next-route-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');

function writeNextHtml(outDir, relPath, { head = '', body = '', lang = 'en' }) {
  const fullPath = path.join(outDir, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(
    fullPath,
    `<!DOCTYPE html><html lang="${lang}"><head>${head}</head><body>${body}</body></html>`,
    'utf8',
  );
}

const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const requireLiveFixture = process.env.FORGEWP_REQUIRE_NEXT_FIXTURE === '1';

describe('extractNextStaticMarkup', () => {
  it.skipIf(!existsSync(fixtureOutIndex) && !requireLiveFixture)(
    'extracts /, /about/, shared layout, head metadata, CSS, and stripped RSC/runtime inventory from projects/nextjs-adapter-fixture',
    () => {
      expect(
        existsSync(fixtureOutIndex),
        `Expected Next fixture static export at ${fixtureOutIndex}. Run "pnpm --filter @forgewp/nextjs-adapter-fixture build" first.`,
      ).toBe(true);

    const markup = extractNextStaticMarkup(nextFixtureRoot);

    expect(markup.layout).toEqual({
      lang: 'en',
      sharedHeaderDetected: true,
      sharedFooterDetected: true,
    });

    // Shared layout chrome extracted once and not duplicated into route bodies.
    expect(markup.headerHtml).toContain('data-fixture="shared-layout"');
    expect(markup.headerHtml).toContain('<a href="/">Home</a>');
    expect(markup.headerHtml).toContain('<a href="/about">About</a>');
    expect(markup.footerHtml).toContain('Next.js adapter research; native export not yet supported.');

    expect(markup.routes.map((route) => [route.kind, route.path])).toEqual([
      ['home', '/'],
      ['page', '/about'],
      ['not-found', '/404'],
    ]);

    const home = markup.routes.find((route) => route.path === '/');
    const about = markup.routes.find((route) => route.path === '/about');
    const notFound = markup.routes.find((route) => route.kind === 'not-found');

    expect(home.html).toBe(markup.appHtml);
    expect(home.html).toContain('A standard Next.js app');
    expect(home.html).toContain('An editable introduction');
    expect(home.html).toContain('href="/about?from=home#details"');
    expect(home.html).not.toContain('data-fixture="shared-layout"');
    expect(home.html).not.toContain('<footer>');
    expect(home.html).not.toContain('self.__next_f');
    expect(home.html).not.toContain('_next/static/');
    expect(home.layoutExtracted).toBe(true);
    expect(home.sourceFile).toBe('out/index.html');

    expect(about.slug).toBe('about');
    expect(about.templateSlug).toBe('about');
    expect(about.title).toBe('About the adapter fixture');
    expect(about.html).toContain('<main id="details">');
    expect(about.html).toContain('About the adapter fixture');
    expect(about.html).not.toContain('data-fixture="shared-layout"');
    expect(about.html).not.toContain('<footer>');
    expect(about.html).not.toContain('self.__next_f');
    expect(about.html).not.toContain('_next/static/');
    expect(about.layoutExtracted).toBe(true);
    expect(about.sourceFile).toBe('out/about.html');

    // Head metadata preserves title & favicon while stripping duplicate viewport/charset and Next scripts/CSS links.
    expect(markup.headHtml).toContain('<title>ForgeWP Next.js research fixture</title>');
    expect(markup.headHtml).toContain('rel="icon"');
    expect(markup.headHtml).not.toContain('_next/static/');
    expect(markup.headHtml).not.toContain('name="viewport"');
    expect(markup.headHtml).not.toContain('charSet');
    expect(about.headHtml).toContain('<title>ForgeWP Next.js research fixture</title>');
    expect(about.headHtml).not.toContain('_next/static/');

    // Explicitly accounts for CSS, client chunks, and stripped RSC flight payloads without treating chunks as native WP runtime.
    for (const route of [home, about]) {
      expect(route.assets.stylesheets.length).toBeGreaterThan(0);
      for (const cssPath of route.assets.stylesheets) {
        expect(cssPath).toMatch(/^_next\/static\/css\/.+\.css$/);
        expect(existsSync(path.join(nextFixtureRoot, 'out', cssPath))).toBe(true);
      }
      expect(route.assets.clientScripts.length).toBeGreaterThan(0);
      expect(route.assets.clientScripts.every((s) => s.startsWith('_next/static/'))).toBe(true);
      expect(route.assets.otherAssets).toContain('favicon.ico');
      expect(route.assets.strippedRuntime.rscPayloadCount).toBeGreaterThan(0);
      expect(route.assets.strippedRuntime.scriptCount).toBeGreaterThan(0);
    }

    expect(notFound.html).toContain('404');
    expect(notFound.html).not.toContain('self.__next_f');
    expect(notFound.headHtml).toContain('<title>404: This page could not be found.</title>');
    // Duplicate <title> emitted by Next's default 404 is collapsed to the primary title.
    expect(notFound.headHtml.match(/<title>/gi)?.length).toBe(1);
  });

  it('supports trailingSlash: false, nested routes, JSON-LD preservation, and custom per-route titles', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-extract-'));
    try {
      const outDir = path.join(root, 'out');
      mkdirSync(path.join(outDir, '_next', 'static', 'css'), { recursive: true });
      writeFileSync(path.join(outDir, '_next', 'static', 'css', 'app.css'), 'body { color: #111; }');

      const sharedHead =
        '<meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
        '<link rel="stylesheet" href="/_next/static/css/app.css"/>' +
        '<link rel="preload" as="script" href="/_next/static/chunks/webpack.js"/>' +
        '<script src="/_next/static/chunks/main.js" async=""></script>';
      const rscTail =
        '<script src="/_next/static/chunks/webpack.js" id="_R_" async=""></script>' +
        '<script>(self.__next_f=self.__next_f||[]).push([0])</script>';

      writeNextHtml(outDir, 'index.html', {
        head:
          sharedHead +
          '<title>Site Home</title>' +
          '<meta name="description" content="Home description"/>' +
          '<script type="application/ld+json">{"@type":"WebSite"}</script>',
        body:
          '<div hidden=""><!--$--><!--/$--></div>' +
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main><h1>Welcome</h1></main>' +
          '<footer>Footer copy</footer>' +
          rscTail,
      });

      writeNextHtml(outDir, 'docs/getting-started.html', {
        head: sharedHead + '<title>Getting Started Guide</title>',
        body:
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main><article><header><h2>Nested article header</h2></header><h1>Start here</h1></article></main>' +
          '<footer>Footer copy</footer>' +
          rscTail,
      });

      const markup = extractNextStaticMarkup(root);
      expect(markup.headHtml).toContain('<meta name="description" content="Home description"/>');
      expect(markup.headHtml).toContain('<script type="application/ld+json">{"@type":"WebSite"}</script>');
      expect(markup.layout.sharedHeaderDetected).toBe(true);
      expect(markup.layout.sharedFooterDetected).toBe(true);

      const docs = markup.routes.find((r) => r.path === '/docs/getting-started');
      expect(docs).toMatchObject({
        kind: 'page',
        slug: 'docs/getting-started',
        templateSlug: 'docs-getting-started',
        title: 'Getting Started Guide',
        layoutExtracted: true,
        sourceFile: 'out/docs/getting-started.html',
      });
      // Nested <header> inside <article> is preserved intact.
      expect(docs.html).toContain('<article><header><h2>Nested article header</h2></header>');
      expect(docs.assets.stylesheets).toEqual(['_next/static/css/app.css']);
      expect(docs.assets.clientScripts).toEqual([
        '_next/static/chunks/main.js',
        '_next/static/chunks/webpack.js',
      ]);
      expect(docs.assets.strippedRuntime).toEqual({
        rscPayloadCount: 1,
        scriptCount: 2,
        preloadCount: 1,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not falsely extract a shared header when routes render different header markup', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-diff-header-'));
    try {
      const outDir = path.join(root, 'out');
      writeNextHtml(outDir, 'index.html', {
        head: '<title>Home</title>',
        body: '<header><a href="/" aria-current="page">Home</a></header><main>Home</main><footer>Same</footer>',
      });
      writeNextHtml(outDir, 'about/index.html', {
        head: '<title>About</title>',
        body: '<header><a href="/about/" aria-current="page">About</a></header><main>About</main><footer>Same</footer>',
      });

      const markup = extractNextStaticMarkup(root);
      expect(markup.layout.sharedHeaderDetected).toBe(false);
      expect(markup.layout.sharedFooterDetected).toBe(true);
      expect(markup.headerHtml).toBe('');
      expect(markup.footerHtml).toBe('<footer>Same</footer>');
      expect(markup.appHtml).toContain('aria-current="page">Home</a>');
      expect(markup.routes[1].html).toContain('aria-current="page">About</a>');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails visibly for missing out/index.html, missing stylesheet files, dynamic segments, and templateSlug collisions', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-errors-'));
    try {
      expect(() => extractNextStaticMarkup(root)).toThrow('Next.js static export output not found');

      const outDir = path.join(root, 'out');
      writeNextHtml(outDir, 'index.html', {
        head: '<link rel="stylesheet" href="/_next/static/css/missing.css"/>',
        body: '<main>Home</main>',
      });
      expect(() => extractNextStaticMarkup(root)).toThrow('missing.css');

      writeNextHtml(outDir, 'index.html', { head: '<title>Home</title>', body: '<main>Home</main>' });
      writeNextHtml(outDir, 'posts/[slug]/index.html', { head: '<title>Post</title>', body: '<main>Post</main>' });
      expect(() => extractNextStaticMarkup(root)).toThrow('does not support dynamic route segment');
      rmSync(path.join(outDir, 'posts'), { recursive: true, force: true });

      writeNextHtml(outDir, 'a/b/index.html', { head: '<title>A B</title>', body: '<main>AB</main>' });
      writeNextHtml(outDir, 'a-b/index.html', { head: '<title>A-B</title>', body: '<main>A-B</main>' });
      expect(() => extractNextStaticMarkup(root)).toThrow('colliding templateSlug "a-b"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves <html class>, <body class>, and author <head> scripts while still stripping Next runtime & RSC payloads', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-head-classes-'));
    try {
      const outDir = path.join(root, 'out');
      mkdirSync(path.join(outDir, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outDir, 'js'), { recursive: true });
      writeFileSync(path.join(outDir, '_next', 'static', 'css', 'app.css'), 'body{margin:0}');
      writeFileSync(path.join(outDir, 'js', 'consent.js'), 'window.__consent = true;');

      const authorInlineScript =
        `<script>try{var t=localStorage.getItem('fwp-theme');if(t)document.documentElement.classList.add(t);}catch(e){}</script>`;
      const authorExternalScript = `<script src="/js/consent.js" defer=""></script>`;
      const nextPolyfillScript = `<script src="/_next/static/chunks/polyfills.js" noModule=""></script>`;
      const nextHeadFlightScript = `<script>(self.__next_f=self.__next_f||[]).push([1,"head"])</script>`;

      writeFileSync(
        path.join(outDir, 'index.html'),
        `<!DOCTYPE html>` +
          `<html lang="en" class="__variable_sans font-sans">` +
          `<head>` +
          `<meta charSet="utf-8"/>` +
          `<link rel="stylesheet" href="/_next/static/css/app.css"/>` +
          `<title>Starter</title>` +
          authorInlineScript +
          authorExternalScript +
          nextPolyfillScript +
          nextHeadFlightScript +
          `<script type="application/ld+json">{"@type":"WebSite"}</script>` +
          `</head>` +
          `<body class="fwp-page antialiased">` +
          `<main><h1>Hello</h1></main>` +
          `<script src="/_next/static/chunks/main.js" id="_R_" async=""></script>` +
          `<script>(self.__next_f=self.__next_f||[]).push([0])</script>` +
          `</body></html>`,
        'utf8',
      );

      const markup = extractNextStaticMarkup(root);
      expect(markup.layout).toEqual({
        lang: 'en',
        htmlClass: '__variable_sans font-sans',
        bodyClass: 'fwp-page antialiased',
        sharedHeaderDetected: false,
        sharedFooterDetected: false,
      });

      expect(markup.headHtml).toContain(authorInlineScript);
      expect(markup.headHtml).toContain(authorExternalScript);
      expect(markup.headHtml).toContain('<script type="application/ld+json">{"@type":"WebSite"}</script>');
      expect(markup.headHtml).not.toContain('polyfills.js');
      expect(markup.headHtml).not.toContain('self.__next_f');

      const homeRoute = markup.routes.find((r) => r.path === '/');
      expect(homeRoute.assets.clientScripts).toEqual([
        '_next/static/chunks/main.js',
        '_next/static/chunks/polyfills.js',
      ]);
      expect(homeRoute.assets.otherAssets).toContain('js/consent.js');
      expect(homeRoute.assets.strippedRuntime).toEqual({
        rscPayloadCount: 2,
        scriptCount: 2,
        preloadCount: 0,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
