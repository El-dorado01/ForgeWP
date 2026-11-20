import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildAssets,
  clearNextExtractionCache,
  packageAssets,
  readBuildAssets,
  renderStaticMarkup,
} from '../../lib/next-adapter.js';
import {
  injectRouteScopedStylesheetLinks,
  packageNextAssets,
  partitionNextStylesheets,
} from '../../lib/next-export-experimental.js';
import { extractNextStaticMarkup } from '../../lib/next-route-extractor.js';
import {
  applyVerifiedNextLinksToMarkup,
  scanProjectNextLinks,
} from '../../lib/next-link-transform.js';
import {
  findNextIslandComponentPath,
  scanNextHydrationIslandMappings,
} from '../../lib/next-islands.js';
import { withForgeWP } from '../../../react/src/next.ts';

const require = createRequire(import.meta.url);
const {
  tagNextLinkIdentityInSource,
} = require('../../../react/src/next-link-identity-loader.cjs');

describe('Next.js adapter hardening: mode guards, CSS cascade/scoping, root app/ links, link & island identity, single-pass extraction', () => {
  it('Fix 1: rejects conflicting deploymentMode/output during FORGEWP_NATIVE_EXPORT=1 and prevents reading stale out/', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
    try {
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      delete process.env.FORGEWP_DEPLOYMENT_MODE;

      // Explicit deploymentMode: 'decoupled' conflicts with native export
      expect(() =>
        withForgeWP({}, { deploymentMode: 'decoupled' }),
      ).toThrow(/FORGEWP_NEXT_MODE_CONFLICT/);

      // Explicit non-export output conflicts with native export
      expect(() => withForgeWP({ output: 'standalone' })).toThrow(
        /FORGEWP_NEXT_OUTPUT_CONFLICT/,
      );

      // Even if FORGEWP_DEPLOYMENT_MODE=decoupled lingers in env, withForgeWP forces native export
      process.env.FORGEWP_DEPLOYMENT_MODE = 'decoupled';
      const forcedCfg = withForgeWP({});
      expect(forcedCfg.output).toBe('export');

      // buildAssets() rejects FORGEWP_DEPLOYMENT_MODE=decoupled up front
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-mode-guard-'));
      try {
        mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
        writeFileSync(
          path.join(tmp, 'src', 'app', 'layout.tsx'),
          'export default function L({ children }: any) { return <html><body>{children}</body></html>; }',
        );
        await expect(buildAssets(tmp)).rejects.toThrow(/FORGEWP_NEXT_MODE_CONFLICT/);

        // Stale out/ is removed before build and missing fresh out/index.html fails loudly
        delete process.env.FORGEWP_DEPLOYMENT_MODE;
        mkdirSync(path.join(tmp, 'out'), { recursive: true });
        writeFileSync(
          path.join(tmp, 'out', 'index.html'),
          '<!doctype html><html><body>Stale</body></html>',
        );
        writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({
            name: 'stale-out-test',
            scripts: {
              build: 'node -e "process.exit(0)"',
            },
          }),
        );

        await expect(
          buildAssets(tmp, { packageManager: 'npm' }),
        ).rejects.toThrow(/FORGEWP_NEXT_STATIC_EXPORT_MISSING/);
        // Stale out/ must have been cleaned before the no-op build
        expect(existsSync(path.join(tmp, 'out', 'index.html'))).toBe(false);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
      else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    }
  });

  it('Fix 2: preserves exact Next.js <head> CSS cascade order and scopes route-only stylesheets per route', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-css-order-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outExport = path.join(appDir, 'out');
      const themeOut = path.join(tmp, 'theme');
      mkdirSync(path.join(outExport, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outExport, 'about'), { recursive: true });

      // Intentionally reverse-alphabetical shared stylesheets: z-base.css MUST precede a-override.css
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'z-base.css'),
        '.btn{color:red}',
      );
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'a-override.css'),
        '.btn{color:green}',
      );
      // Route-specific stylesheets with overlapping `.hero` selector
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'home-only.css'),
        '.hero{background:navy}',
      );
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'about-only.css'),
        '.hero{background:purple}',
      );

      writeFileSync(
        path.join(outExport, 'index.html'),
        '<!DOCTYPE html><html><head>' +
          '<link rel="stylesheet" href="/_next/static/css/z-base.css"/>' +
          '<link rel="stylesheet" href="/_next/static/css/a-override.css"/>' +
          '<link rel="stylesheet" href="/_next/static/css/home-only.css"/>' +
          '<title>Home</title></head><body>' +
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main class="hero">Home</main><footer>Footer</footer></body></html>',
      );
      writeFileSync(
        path.join(outExport, 'about', 'index.html'),
        '<!DOCTYPE html><html><head>' +
          '<link rel="stylesheet" href="/_next/static/css/z-base.css"/>' +
          '<link rel="stylesheet" href="/_next/static/css/a-override.css"/>' +
          '<link rel="stylesheet" href="/_next/static/css/about-only.css"/>' +
          '<title>About</title></head><body>' +
          '<header><nav><a href="/">Home</a></nav></header>' +
          '<main class="hero">About</main><footer>Footer</footer></body></html>',
      );

      const extracted = extractNextStaticMarkup(appDir);
      const { sharedStylesheets, routeOnlyByPath } = partitionNextStylesheets(
        extracted.routes,
      );

      // Shared stylesheets preserve exact <head> order (z-base before a-override)
      expect(sharedStylesheets).toEqual([
        '_next/static/css/z-base.css',
        '_next/static/css/a-override.css',
      ]);
      expect(routeOnlyByPath.get('/')).toEqual(['_next/static/css/home-only.css']);
      expect(routeOnlyByPath.get('/about')).toEqual(['_next/static/css/about-only.css']);

      const packaged = packageNextAssets(appDir, themeOut, {
        routes: extracted.routes,
      });
      expect(packaged.cssFile).toBe('assets/next-bundle.css');
      const bundleCss = readFileSync(path.join(themeOut, 'assets', 'next-bundle.css'), 'utf8');
      expect(bundleCss.indexOf('z-base.css')).toBeLessThan(
        bundleCss.indexOf('a-override.css'),
      );
      // Route-specific CSS must NOT leak into global bundle
      expect(bundleCss).not.toContain('home-only.css');
      expect(bundleCss).not.toContain('about-only.css');
      expect(existsSync(path.join(themeOut, 'assets', 'css', 'home-only.css'))).toBe(true);
      expect(existsSync(path.join(themeOut, 'assets', 'css', 'about-only.css'))).toBe(true);

      // Scoped <link> tags appear ONLY in their respective route's headHtml
      const scoped = injectRouteScopedStylesheetLinks(extracted);
      const homeRoute = scoped.routes.find((r) => r.path === '/');
      const aboutRoute = scoped.routes.find((r) => r.path === '/about');
      expect(homeRoute.headHtml).toContain('assets/css/home-only.css');
      expect(homeRoute.headHtml).not.toContain('assets/css/about-only.css');
      expect(aboutRoute.headHtml).toContain('assets/css/about-only.css');
      expect(aboutRoute.headHtml).not.toContain('assets/css/home-only.css');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Fix 3: scans root-level app/ projects (without src/) for next/link usages', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-root-app-links-'));
    try {
      mkdirSync(path.join(tmp, 'app'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'app', 'page.tsx'),
        `import Link from 'next/link';\nexport default function Home() {\n  return <main><Link href="/about">About Us</Link></main>;\n}\n`,
      );

      const scanned = scanProjectNextLinks(tmp, [
        { path: '/', templateSlug: 'home', kind: 'home' },
        { path: '/about', templateSlug: 'about', kind: 'page' },
      ]);

      expect(scanned.diagnostics).toEqual([]);
      expect(scanned.links).toHaveLength(1);
      expect(scanned.links[0].owner).toBe('next-link');
      expect(scanned.links[0].resolution.routeSlug).toBe('about');
      expect(scanned.links[0].filePath).toBe('app/page.tsx');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Fix 4: preserves <Link href="/about"> vs raw <a href="/about"> identity without rewriting raw anchors', () => {
    const source = `import Link from 'next/link';
import NextLink from 'next/link';
export default function Page() {
  return (
    <nav>
      <Link href="/about">Verified Link</Link>
      <NextLink href="/about" className="cta">Aliased Link</NextLink>
      <a href="/about">Raw Anchor</a>
    </nav>
  );
}
`;
    const { code, taggedCount } = tagNextLinkIdentityInSource(source);
    expect(taggedCount).toBe(2);
    expect(code).toContain('<Link data-forgewp-next-link="1" href="/about">');
    expect(code).toContain('<NextLink data-forgewp-next-link="1" href="/about" className="cta">');
    expect(code).toContain('<a href="/about">Raw Anchor</a>');

    const markup = {
      headerHtml: '',
      footerHtml: '',
      appHtml:
        '<nav>' +
        '<a data-forgewp-next-link="1" href="/about">Verified Link</a>' +
        '<a href="/about">Raw Anchor</a>' +
        '</nav>',
      routes: [
        {
          path: '/',
          templateSlug: 'home',
          kind: 'home',
          html:
            '<nav>' +
            '<a data-forgewp-next-link="1" href="/about">Verified Link</a>' +
            '<a href="/about">Raw Anchor</a>' +
            '</nav>',
        },
        {
          path: '/about',
          templateSlug: 'about',
          kind: 'page',
          html: '<main>About</main>',
        },
      ],
    };

    const { markup: rewritten } = applyVerifiedNextLinksToMarkup(markup, {
      links: [
        {
          owner: 'next-link',
          renderedHrefs: ['/about', '/about/'],
          resolution: {
            routeSlug: 'about',
            token: '__FORGEWP_ROUTELINK:about|/about||__',
          },
        },
      ],
    });

    // Verified next/link anchor is rewritten and internal marker is stripped
    expect(rewritten.appHtml).toContain(
      '<a href="__FORGEWP_ROUTELINK:about|/about||__">Verified Link</a>',
    );
    expect(rewritten.appHtml).not.toContain('data-forgewp-next-link');
    // Raw <a> with the exact same href="/about" is untouched!
    expect(rewritten.appHtml).toContain('<a href="/about">Raw Anchor</a>');
  });

  it('Fix 5: resolves aliased <Hydrate> imports and custom id->component file mappings, and diagnoses conflicts & parse errors', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-island-identity-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });

      const fancyBtnPath = path.join(tmp, 'src', 'components', 'FancyButton.tsx');
      writeFileSync(
        fancyBtnPath,
        `'use client';\nexport default function FancyButton() { return <button>Go</button>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'page.tsx'),
        `import { Hydrate as Island } from '@forgewp/react/server';\nimport FancyButton from '@/components/FancyButton';\nexport default function Page() { return <Island id="hero-cta"><FancyButton /></Island>; }\n`,
      );

      const scanned = scanNextHydrationIslandMappings(tmp);
      expect(scanned.islands).toEqual(['hero-cta']);
      expect(scanned.mappings.get('hero-cta')?.filePath).toBe(fancyBtnPath);
      expect(findNextIslandComponentPath(tmp, 'hero-cta')).toBe(fancyBtnPath);

      // Conflicting island id mapping to a second component throws FORGEWP_NEXT_ISLAND_CONFLICT
      writeFileSync(
        path.join(tmp, 'src', 'components', 'OtherWidget.tsx'),
        `'use client';\nexport default function OtherWidget() { return <div />; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'other.tsx'),
        `import { Hydrate } from '@forgewp/react/server';\nimport OtherWidget from '@/components/OtherWidget';\nexport default function Other() { return <Hydrate id="hero-cta"><OtherWidget /></Hydrate>; }\n`,
      );
      expect(() => scanNextHydrationIslandMappings(tmp)).toThrow(
        /FORGEWP_NEXT_ISLAND_CONFLICT/,
      );

      // Unparseable file referencing Hydrate throws FORGEWP_NEXT_ISLAND_PARSE_ERROR
      rmSync(path.join(tmp, 'src', 'app', 'other.tsx'));
      writeFileSync(
        path.join(tmp, 'src', 'app', 'broken.tsx'),
        `import { Hydrate } from '@forgewp/react/server';\nexport default function Broken( { return <Hydrate><div /></Hydrate>; }\n`,
      );
      expect(() => scanNextHydrationIslandMappings(tmp)).toThrow(
        /FORGEWP_NEXT_ISLAND_PARSE_ERROR/,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Fix 6: shares a single validated out/ extraction inventory across readBuildAssets, renderStaticMarkup, and packageAssets', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-single-pass-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outExport = path.join(appDir, 'out');
      const themeOut = path.join(tmp, 'theme');
      mkdirSync(path.join(appDir, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(outExport, '_next', 'static', 'css'), { recursive: true });
      writeFileSync(
        path.join(appDir, 'src', 'app', 'layout.tsx'),
        'export default function L({ children }: any) { return <html><body>{children}</body></html>; }',
      );
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'shared.css'),
        'body{margin:0}',
      );
      writeFileSync(
        path.join(outExport, 'index.html'),
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/shared.css"/><title>Home</title></head><body><main>Hello</main></body></html>',
      );

      clearNextExtractionCache(appDir);
      const buildAssetsResult = await readBuildAssets(appDir);
      const markupResult = await renderStaticMarkup(appDir);
      const packagedResult = await packageAssets(appDir, themeOut);

      expect(buildAssetsResult.cssFile).toBe('assets/shared.css');
      expect(markupResult.routes).toHaveLength(1);
      expect(packagedResult.assetFiles['_next/static/css/shared.css']).toBe(
        'assets/shared.css',
      );
    } finally {
      clearNextExtractionCache();
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
