import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { extractNextStaticMarkup } from '../../lib/next-route-extractor.js';
import {
  analyzeNextLinks,
  applyVerifiedNextLinksToMarkup,
  decodeRouteLinkToken,
  encodeRouteLinkToken,
  scanProjectNextLinks,
  transformNextLinksInSource,
} from '../../lib/next-link-transform.js';
import { processMarkup } from '../../lib/markup-processor.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');
const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const requireLiveFixture = process.env.FORGEWP_REQUIRE_NEXT_FIXTURE === '1';

const KNOWN_ROUTES = [
  { path: '/', kind: 'home', html: '<main />' },
  { path: '/about', kind: 'page', slug: 'about', templateSlug: 'about', html: '<main />' },
  {
    path: '/docs/getting-started',
    kind: 'page',
    slug: 'docs/getting-started',
    templateSlug: 'docs-getting-started',
    html: '<main />',
  },
];

vi.mock('../../lib/framework-adapter.js', () => ({
  loadFrameworkAdapter: async () => ({
    scanForHydrationIslands: () => [],
    packageAssets: async (themeRoot, outDir) => {
      const markup = extractNextStaticMarkup(themeRoot);
      const firstCss = markup.routes[0]?.assets?.stylesheets?.[0];
      const assetsOut = path.join(outDir, 'assets');
      mkdirSync(assetsOut, { recursive: true });
      const assetFiles = {};
      if (firstCss) {
        const name = path.basename(firstCss);
        copyFileSync(path.join(themeRoot, 'out', firstCss), path.join(assetsOut, name));
        assetFiles[firstCss] = `assets/${name}`;
      }
      return { assetFiles, clientEntries: {}, runtimeEntry: undefined };
    },
  }),
}));

import { generateTheme } from '../../lib/generate-theme.js';

function extractPhpFunction(phpSource, functionName) {
  const start = phpSource.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`Function ${functionName} not found in generated PHP`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < phpSource.length; i++) {
    if (phpSource[i] === '{') {
      depth++;
      seenBrace = true;
    } else if (phpSource[i] === '}') {
      depth--;
      if (seenBrace && depth === 0) {
        return phpSource.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Unclosed function ${functionName}`);
}

describe('import-binding-aware next/link transformation', () => {
  it('resolves default, aliased, named-default, and namespace next/link bindings while ignoring shadowed and non-next Link components', () => {
    const source = `
import Link from 'next/link';
import NextLink from 'next/link';
import { default as NavLink } from 'next/link';
import * as NextLinkNs from 'next/link';
import { Link as ForgeLink, WpLink } from '@forgewp/react';
import CustomLink from './CustomLink';

export function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <NextLink href="/about?from=home&utm_source=hero#details" prefetch={false} scroll={false}>About</NextLink>
      <NavLink href="/docs/getting-started/#install" replace>Docs</NavLink>
      <NextLinkNs.default href={{ pathname: '/about', query: { tab: 2, ref_id: 'a_b' }, hash: 'team' }}>Team</NextLinkNs.default>
      <ForgeLink href="/about">Forge Link</ForgeLink>
      <WpLink href="/about">WP Link</WpLink>
      <CustomLink href="/about">Custom Link</CustomLink>
      <a href="/about">Plain Anchor</a>
    </nav>
  );
}

export function Shadowed() {
  const Link = CustomLink;
  return <Link href="/about">Shadowed Link</Link>;
}
`;

    const result = transformNextLinksInSource(source, {
      filePath: 'src/components/Nav.tsx',
      knownRoutes: KNOWN_ROUTES,
    });

    expect(result.changed).toBe(true);
    expect(result.diagnostics).toEqual([]);

    // All 4 next/link forms become native <a> elements with runtime route tokens and stripped Next-only props.
    expect(result.code).toContain(
      `<a href="${encodeRouteLinkToken({ routeSlug: '~home', fallbackPath: '/' })}">Home</a>`,
    );
    expect(result.code).toContain(
      `<a href="${encodeRouteLinkToken({
        routeSlug: 'about',
        fallbackPath: '/about/',
        query: 'from=home&utm_source=hero',
        hash: 'details',
      })}">About</a>`,
    );
    expect(result.code).toContain(
      `<a href="${encodeRouteLinkToken({
        routeSlug: 'docs-getting-started',
        fallbackPath: '/docs/getting-started/',
        hash: 'install',
      })}">Docs</a>`,
    );
    expect(result.code).toContain(
      `<a href="${encodeRouteLinkToken({
        routeSlug: 'about',
        fallbackPath: '/about/',
        query: 'tab=2&ref_id=a_b',
        hash: 'team',
      })}">Team</a>`,
    );
    expect(result.code).not.toContain('prefetch={false}');
    expect(result.code).not.toContain('scroll={false}');
    expect(result.code).not.toContain('replace');

    // ForgeWP Link/WpLink, custom Link, plain <a>, and shadowed local Link remain untouched!
    expect(result.code).toContain('<ForgeLink href="/about">Forge Link</ForgeLink>');
    expect(result.code).toContain('<WpLink href="/about">WP Link</WpLink>');
    expect(result.code).toContain('<CustomLink href="/about">Custom Link</CustomLink>');
    expect(result.code).toContain('<a href="/about">Plain Anchor</a>');
    expect(result.code).toContain('return <Link href="/about">Shadowed Link</Link>;');

    // ForgeWP links are tracked separately from next/link.
    expect(result.links.filter((l) => l.owner === 'forgewp-link')).toHaveLength(2);
    expect(result.links.filter((l) => l.owner === 'next-link')).toHaveLength(4);
  });

  it('preserves external URLs, protocols, hash-only, and query-only destinations verbatim', () => {
    const source = `
import NextLink from 'next/link';
export function External() {
  return (
    <div>
      <NextLink href="https://wordpress.org/docs?a=1#top" prefetch={false}>WP</NextLink>
      <NextLink href="http://example.com">HTTP</NextLink>
      <NextLink href="//cdn.example.com/file">Protocol-relative</NextLink>
      <NextLink href="mailto:hello@example.com">Email</NextLink>
      <NextLink href="tel:+123456">Phone</NextLink>
      <NextLink href="#details">Hash</NextLink>
      <NextLink href="?page=2#list">Query</NextLink>
    </div>
  );
}
`;

    const result = transformNextLinksInSource(source, {
      filePath: 'src/components/External.tsx',
      knownRoutes: KNOWN_ROUTES,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<a href="https://wordpress.org/docs?a=1#top">WP</a>');
    expect(result.code).toContain('<a href="http://example.com">HTTP</a>');
    expect(result.code).toContain('<a href="//cdn.example.com/file">Protocol-relative</a>');
    expect(result.code).toContain('<a href="mailto:hello@example.com">Email</a>');
    expect(result.code).toContain('<a href="tel:+123456">Phone</a>');
    expect(result.code).toContain('<a href="#details">Hash</a>');
    expect(result.code).toContain('<a href="?page=2#list">Query</a>');
    expect(result.code).not.toContain('__FORGEWP_ROUTELINK:');
  });

  it('emits actionable diagnostics for unknown internal routes, dynamic hrefs, and unsupported locale prop', () => {
    const source = `
import Link from 'next/link';
export function EdgeCases({ slug }: { slug: string }) {
  return (
    <div>
      <Link href="/pricing?plan=pro#faq">Pricing</Link>
      <Link href={\`/posts/\${slug}\`}>Dynamic</Link>
      <Link href="/about" locale="de">German About</Link>
    </div>
  );
}
`;

    const result = transformNextLinksInSource(source, {
      filePath: 'src/components/EdgeCases.tsx',
      knownRoutes: KNOWN_ROUTES,
    });

    expect(result.diagnostics.map((d) => d.code)).toEqual([
      'NEXT_LINK_UNKNOWN_ROUTE',
      'NEXT_LINK_DYNAMIC_HREF',
      'NEXT_LINK_UNSUPPORTED_PROP',
    ]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'warning',
      api: 'next/link',
      mode: 'native',
      file: 'src/components/EdgeCases.tsx',
    });
    expect(result.diagnostics[1]).toMatchObject({
      level: 'error',
      api: 'next/link',
      mode: 'native',
      file: 'src/components/EdgeCases.tsx',
    });
    expect(result.diagnostics[2]).toMatchObject({
      level: 'warning',
      api: 'next/link',
      mode: 'native',
    });

    // Unknown internal route uses ~unknown token for subdirectory-safe home_url() resolution.
    expect(result.code).toContain(
      `<a href="${encodeRouteLinkToken({
        routeSlug: '~unknown',
        fallbackPath: '/pricing',
        query: 'plan=pro',
        hash: 'faq',
      })}">Pricing</a>`,
    );
    // Dynamic link is left untransformed (never silently corrupted).
    expect(result.code).toContain('<Link href={`/posts/${slug}`}>Dynamic</Link>');
    // locale prop stripped on known route.
    expect(result.code).not.toContain('locale="de"');
  });

  it('traces aliased useWpPageLink from @forgewp/react and encodes tokens safely with underscores', () => {
    const source = `
import { useWpPageLink as wpLink } from '@forgewp/react';
import NextLink from 'next/link';
export function Card() {
  const href = wpLink('about', '/about/');
  return <NextLink href={href}>About</NextLink>;
}
`;
    const { links, diagnostics } = analyzeNextLinks(source, {
      filePath: 'src/Card.tsx',
      knownRoutes: KNOWN_ROUTES,
    });
    expect(diagnostics).toEqual([]);
    expect(links.some((l) => l.owner === 'forgewp-page-link' && l.routeSlug === 'about')).toBe(true);
    const nextLink = links.find((l) => l.owner === 'next-link');
    expect(nextLink.resolution.routeSlug).toBe('about');

    const token = encodeRouteLinkToken({
      routeSlug: 'docs-getting-started',
      fallbackPath: '/docs/getting_started/',
      query: 'utm_source=home__banner&x=1',
      hash: 'section__2',
    });
    expect(decodeRouteLinkToken(token)).toEqual({
      routeSlug: 'docs-getting-started',
      fallbackPath: '/docs/getting_started/',
      query: 'utm_source=home__banner&x=1',
      hash: 'section__2',
    });
  });

  it('compiles __FORGEWP_ROUTELINK tokens in markup-processor and resolves root, subdirectory, renamed-slug, plain-permalink, deleted-page, and Polylang URLs in PHP 8', () => {
    const tokens = {
      home: encodeRouteLinkToken({ routeSlug: '~home', fallbackPath: '/' }),
      homeQuery: encodeRouteLinkToken({ routeSlug: '~home', fallbackPath: '/', query: 'ref=nav', hash: 'top' }),
      about: encodeRouteLinkToken({ routeSlug: 'about', fallbackPath: '/about/', query: 'from=home', hash: 'details' }),
      unknown: encodeRouteLinkToken({ routeSlug: '~unknown', fallbackPath: '/pricing', query: 'plan=pro', hash: 'faq' }),
    };

    const html = `<a href="${tokens.about}">About</a><a href="${tokens.unknown}">Pricing</a>`;
    const compiled = processMarkup(html, 'demo');
    expect(compiled).toContain(
      `forgewp_resolve_route_url('about', '/about/', 'from=home', 'details')`,
    );
    expect(compiled).toContain(
      `forgewp_resolve_route_url('', '/pricing', 'plan=pro', 'faq')`,
    );

    const functionsPhp = buildFunctionsPhp(
      { name: 'Demo', slug: 'demo', textDomain: 'demo', version: '1.0.0', description: 'Demo' },
      { cssFile: 'assets/app.css' },
    );
    const resolveRouteUrlFn = extractPhpFunction(functionsPhp, 'forgewp_resolve_route_url');

    const phpHarness = `
<?php
$state = array(
  'home_base' => 'https://example.com',
  'page_ids' => array('about' => 42),
  'permalinks' => array(42 => 'https://example.com/about/'),
  'pll_home' => null,
);
function home_url($path = '') {
  global $state;
  return rtrim($state['home_base'], '/') . '/' . ltrim($path, '/');
}
function forgewp_resolve_route_page_id($slug) {
  global $state;
  return isset($state['page_ids'][$slug]) ? $state['page_ids'][$slug] : 0;
}
function get_permalink($id) {
  global $state;
  return isset($state['permalinks'][$id]) ? $state['permalinks'][$id] : '';
}
function esc_url($url) { return $url; }
${resolveRouteUrlFn}

$out = array();

// 1. Root install, pretty permalink
$out['root_home'] = forgewp_resolve_route_url('__home__', '/', '', '');
$out['root_about'] = forgewp_resolve_route_url('about', '/about/', 'from=home', 'details');

// 2. Subdirectory install (/blog) + renamed slug in wp-admin (/company-about/)
$state['home_base'] = 'https://example.com/blog';
$state['permalinks'][42] = 'https://example.com/blog/company-about/';
$out['subdir_home_qf'] = forgewp_resolve_route_url('__home__', '/', 'ref=nav', 'top');
$out['subdir_renamed_about'] = forgewp_resolve_route_url('about', '/about/', 'from=home', 'details');
$out['subdir_unknown'] = forgewp_resolve_route_url('', '/pricing', 'plan=pro', 'faq');

// 3. Subdirectory install + Plain permalinks (?page_id=42) -> must join query with &, not ?
$state['permalinks'][42] = 'https://example.com/blog/?page_id=42';
$out['subdir_plain_about'] = forgewp_resolve_route_url('about', '/about/', 'from=home', 'details');

// 4. Subdirectory install + deleted page fallback -> must stay under /blog/about/
$state['page_ids'] = array();
$out['subdir_deleted_fallback'] = forgewp_resolve_route_url('about', '/about/', 'from=home', 'details');

echo json_encode($out);
`;

    const phpRes = spawnSync('php', [], { encoding: 'utf8', input: phpHarness });
    expect(phpRes.status, phpRes.stderr).toBe(0);
    const parsed = JSON.parse(phpRes.stdout);
    expect(parsed).toEqual({
      root_home: 'https://example.com/',
      root_about: 'https://example.com/about/?from=home#details',
      subdir_home_qf: 'https://example.com/blog/?ref=nav#top',
      subdir_renamed_about: 'https://example.com/blog/company-about/?from=home#details',
      subdir_unknown: 'https://example.com/blog/pricing?plan=pro#faq',
      subdir_plain_about: 'https://example.com/blog/?page_id=42&from=home#details',
      subdir_deleted_fallback: 'https://example.com/blog/about/?from=home#details',
    });

    // 5. Separate PHP process with Polylang active -> localized home URL
    const pllRes = spawnSync('php', [], {
      encoding: 'utf8',
      input: `<?php
function home_url($path = '') { return 'https://example.com/blog/' . ltrim($path, '/'); }
function forgewp_resolve_route_page_id($slug) { return 0; }
function get_permalink($id) { return ''; }
function pll_current_language() { return 'de'; }
function pll_home_url($lang = '') { return 'https://example.com/blog/' . $lang . '/'; }
${resolveRouteUrlFn}
echo forgewp_resolve_route_url('__home__', '/', 'ref=nav', 'top');
`,
    });
    expect(pllRes.status, pllRes.stderr).toBe(0);
    expect(pllRes.stdout).toBe('https://example.com/blog/de/?ref=nav#top');
  });

  it.skipIf(!existsSync(fixtureOutIndex) && !requireLiveFixture)(
    'scans projects/nextjs-adapter-fixture, rewrites verified next/link and useWpPageLink anchors only, and emits valid PHP via generateTheme',
    async () => {
      const extracted = extractNextStaticMarkup(nextFixtureRoot);
      const scanned = scanProjectNextLinks(nextFixtureRoot, extracted.routes);
      expect(scanned.diagnostics).toEqual([]);

      // Fixture has: layout.tsx (<Link href="/">, <Link href="/about/">), page.tsx (<NextLink href="/about/?from=home#details">),
      // and IntroPreview.tsx (useWpPageLink('about', '/about/')).
      expect(scanned.links.filter((l) => l.owner === 'next-link')).toHaveLength(3);
      expect(scanned.links.filter((l) => l.owner === 'forgewp-page-link')).toHaveLength(1);

      // Inject an unverified raw <a> into a copy of home HTML to verify raw anchors are NOT blindly rewritten.
      const withRawAnchor = {
        ...extracted,
        appHtml: `${extracted.appHtml}<a data-raw="true" href="/unverified-file.pdf">PDF</a>`,
      };
      const rewritten = applyVerifiedNextLinksToMarkup(withRawAnchor, {
        themeRoot: nextFixtureRoot,
      });
      expect(rewritten.diagnostics).toEqual([]);
      expect(rewritten.rewrittenCount).toBeGreaterThanOrEqual(4);
      expect(rewritten.markup.appHtml).toContain('<a data-raw="true" href="/unverified-file.pdf">PDF</a>');

      const firstCss = extracted.routes[0].assets.stylesheets[0];
      const packagedCss = `assets/${path.basename(firstCss)}`;
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-links-theme-'));
      try {
        const outDir = path.join(tmpDir, 'theme');
        await generateTheme({
          themeRoot: nextFixtureRoot,
          outDir,
          config: {
            name: 'Next Links Fixture',
            slug: 'next-links-fixture',
            textDomain: 'next-links-fixture',
            version: '1.0.0',
            description: 'Next link permalink test',
          },
          appHtml: rewritten.markup.appHtml,
          headerHtml: rewritten.markup.headerHtml,
          footerHtml: rewritten.markup.footerHtml,
          headHtml: rewritten.markup.headHtml,
          notFoundHtml: rewritten.markup.notFoundHtml,
          routes: rewritten.markup.routes,
          layout: rewritten.markup.layout,
          assets: { cssFile: packagedCss },
        });

        const headerOut = readFileSync(path.join(outDir, 'forgewp-static', 'header.html'), 'utf8');
        const contentOut = readFileSync(path.join(outDir, 'forgewp-static', 'content.html'), 'utf8');

        // Verified next/link and useWpPageLink anchors (authored as /about) normalized to WordPress runtime permalink resolution.
        expect(headerOut).toContain("forgewp_resolve_route_url('__home__', '/', '', '')");
        expect(headerOut).toContain("forgewp_resolve_route_url('about', '/about/', '', '')");
        expect(contentOut).toContain("forgewp_resolve_route_url('about', '/about/', 'from=home', 'details')");
        expect(contentOut).toContain("forgewp_resolve_route_url('about', '/about/', '', '')");
        // Unverified raw anchor stays untouched.
        expect(contentOut).toContain('<a data-raw="true" href="/unverified-file.pdf">PDF</a>');

        // PHP lint every generated PHP template and compiled static HTML containing PHP tags.
        for (const rel of [
          'functions.php',
          'companion/backend.php',
          'header.php',
          'front-page.php',
          'page-about.php',
          'forgewp-static/header.html',
          'forgewp-static/content.html',
        ]) {
          const lint = spawnSync('php', ['-l', path.join(outDir, rel)], { encoding: 'utf8' });
          expect(lint.status, `php -l failed for ${rel}: ${lint.stderr}`).toBe(0);
        }

        // Execute compiled header.html and content.html under a subdirectory WordPress stand-in with a renamed slug!
        // Phase B moved backend helpers (including forgewp_resolve_route_url) into companion/backend.php.
        const functionsPhp = readFileSync(path.join(outDir, 'functions.php'), 'utf8');
        const backendPhpPath = path.join(outDir, 'companion', 'backend.php');
        const generatedPhp = existsSync(backendPhpPath)
          ? `${functionsPhp}\n${readFileSync(backendPhpPath, 'utf8')}`
          : functionsPhp;
        const resolveRouteUrlFn = extractPhpFunction(generatedPhp, 'forgewp_resolve_route_url');
        const renderScript = path.join(tmpDir, 'render.php');
        writeFileSync(
          renderScript,
          `<?php
function home_url($p = '') { return 'https://example.com/sub/' . ltrim($p, '/'); }
function forgewp_resolve_route_page_id($slug) { return $slug === 'about' ? 99 : 0; }
function get_permalink($id) { return $id === 99 ? 'https://example.com/sub/about-us/' : ''; }
function esc_url($u) { return htmlspecialchars($u, ENT_QUOTES, 'UTF-8'); }
${resolveRouteUrlFn}
ob_start(); include ${JSON.stringify(path.join(outDir, 'forgewp-static', 'header.html'))}; $h = ob_get_clean();
ob_start(); include ${JSON.stringify(path.join(outDir, 'forgewp-static', 'content.html'))}; $c = ob_get_clean();
echo json_encode(array('header' => $h, 'content' => $c));
`,
          'utf8',
        );
        const execRes = spawnSync('php', [renderScript], { encoding: 'utf8' });
        expect(execRes.status, execRes.stderr).toBe(0);
        const rendered = JSON.parse(execRes.stdout);
        expect(rendered.header).toContain('href="https://example.com/sub/"');
        expect(rendered.header).toContain('href="https://example.com/sub/about-us/"');
        expect(rendered.content).toContain('href="https://example.com/sub/about-us/?from=home#details"');
        expect(rendered.content).toContain('data-fixture="wordpress-link" href="https://example.com/sub/about-us/"');
        expect(rendered.content).toContain('href="/unverified-file.pdf"');
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  );
});
