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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');
const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const requireLiveFixture = process.env.FORGEWP_REQUIRE_NEXT_FIXTURE === '1';

vi.mock('../../lib/framework-adapter.js', () => ({
  loadFrameworkAdapter: async () => ({
    scanForHydrationIslands: () => [],
    packageAssets: async (themeRoot, outDir) => {
      const markup = extractNextStaticMarkup(themeRoot);
      const stylesheets = markup.routes.flatMap((route) => route.assets?.stylesheets || []);
      const firstCss = stylesheets[0];
      const assetsOut = path.join(outDir, 'assets');
      mkdirSync(assetsOut, { recursive: true });
      const assetFiles = {};
      if (firstCss) {
        const packagedName = path.basename(firstCss);
        copyFileSync(
          path.join(themeRoot, 'out', firstCss),
          path.join(assetsOut, packagedName),
        );
        assetFiles[firstCss] = `assets/${packagedName}`;
      }
      return {
        assetFiles,
        clientEntries: {},
        runtimeEntry: undefined,
      };
    },
  }),
}));

import { generateTheme } from '../../lib/generate-theme.js';
import { validateExport } from '../../lib/validate-export.js';

describe('adapter-owned routes integration with generateTheme', () => {
  it('generates native WordPress theme files for fixed nested routes without Vite dist or .forgewp templates', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'forgewp-synth-next-routes-'));
    try {
      const themeRoot = path.join(tmpDir, 'app');
      const outExportDir = path.join(themeRoot, 'out');
      mkdirSync(path.join(outExportDir, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outExportDir, 'docs', 'getting-started'), { recursive: true });
      writeFileSync(path.join(outExportDir, '_next', 'static', 'css', 'site.css'), 'body{margin:0}');

      const head =
        '<meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
        '<link rel="stylesheet" href="/_next/static/css/site.css"/>' +
        '<script src="/_next/static/chunks/main.js" async=""></script>';
      const tail =
        '<script src="/_next/static/chunks/webpack.js" id="_R_" async=""></script>' +
        '<script>(self.__next_f=self.__next_f||[]).push([0])</script>';

      writeFileSync(
        path.join(outExportDir, 'index.html'),
        `<!DOCTYPE html><html lang="en"><head>${head}<title>Synthetic Home</title></head><body>` +
          '<header data-shell="top"><nav><a href="/">Home</a></nav></header>' +
          '<main><h1>Home Heading</h1></main>' +
          `<footer>Shared Footer</footer>${tail}</body></html>`,
      );
      writeFileSync(
        path.join(outExportDir, 'docs', 'getting-started', 'index.html'),
        `<!DOCTYPE html><html lang="en"><head>${head}<title>Getting Started</title></head><body>` +
          '<header data-shell="top"><nav><a href="/">Home</a></nav></header>' +
          '<main id="guide"><h1>Start Here</h1></main>' +
          `<footer>Shared Footer</footer>${tail}</body></html>`,
      );

      const markup = extractNextStaticMarkup(themeRoot);
      const outDir = path.join(tmpDir, 'theme');
      const config = {
        name: 'Synthetic Next Theme',
        slug: 'synthetic-next-theme',
        textDomain: 'synthetic-next-theme',
        version: '1.0.0',
        description: 'Synthetic nested route check',
      };

      await generateTheme({
        themeRoot,
        outDir,
        config,
        appHtml: markup.appHtml,
        headerHtml: markup.headerHtml,
        footerHtml: markup.footerHtml,
        headHtml: markup.headHtml,
        notFoundHtml: markup.notFoundHtml,
        routes: markup.routes,
        layout: markup.layout,
        assets: { cssFile: 'assets/site.css' },
      });

      const docsPhp = readFileSync(path.join(outDir, 'page-docs-getting-started.php'), 'utf8');
      const docsHtml = readFileSync(
        path.join(outDir, 'forgewp-static', 'template-docs-getting-started.html'),
        'utf8',
      );
      const docsHead = readFileSync(
        path.join(outDir, 'forgewp-static', 'template-docs-getting-started-head.html'),
        'utf8',
      );
      const functionsPhp = readFileSync(path.join(outDir, 'functions.php'), 'utf8');

      expect(docsPhp).toContain('forgewp-static/template-docs-getting-started.html');
      expect(docsHtml).toContain('<main id="guide"><h1>Start Here</h1></main>');
      expect(docsHtml).not.toContain('self.__next_f');
      expect(docsHead).toContain('<title>Getting Started</title>');
      expect(functionsPhp).toMatch(/'slug'\s*=>\s*'docs\/getting-started'/);
      expect(functionsPhp).toMatch(/'template'\s*=>\s*'page-docs-getting-started\.php'/);
      expect(functionsPhp).toMatch(/'title'\s*=>\s*'Getting Started'/);

      const validation = await validateExport({
        themeRoot,
        outDir,
        assets: { cssFile: 'assets/site.css' },
        config,
        routes: markup.routes,
      });
      expect(validation.missing).toEqual([]);
      expect(validation.warnings).toEqual([]);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it.skipIf(!existsSync(fixtureOutIndex) && !requireLiveFixture)(
    'generates native WordPress theme files for / and /about/ from the Next.js fixture without Vite dist or .forgewp templates',
    async () => {
      const markup = extractNextStaticMarkup(nextFixtureRoot);
      const firstCss = markup.routes[0].assets.stylesheets[0];
      const packagedCss = `assets/${path.basename(firstCss)}`;
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-routes-out-'));

      try {
        const outDir = path.join(tmpDir, 'theme');
        const config = {
          name: 'Next Fixture Theme',
          slug: 'next-fixture-theme',
          textDomain: 'next-fixture-theme',
          version: '1.0.0',
          description: 'Integration check for Next.js fixed-route markup contract',
        };

        await generateTheme({
          themeRoot: nextFixtureRoot,
          outDir,
          config,
          appHtml: markup.appHtml,
          headerHtml: markup.headerHtml,
          footerHtml: markup.footerHtml,
          headHtml: markup.headHtml,
          notFoundHtml: markup.notFoundHtml,
          routes: markup.routes,
          layout: markup.layout,
          assets: { cssFile: packagedCss },
        });

        expect(existsSync(path.join(outDir, 'front-page.php'))).toBe(true);
        expect(existsSync(path.join(outDir, 'page-about.php'))).toBe(true);
        expect(existsSync(path.join(outDir, 'header.php'))).toBe(true);
        expect(existsSync(path.join(outDir, 'footer.php'))).toBe(true);
        expect(existsSync(path.join(outDir, '404.php'))).toBe(true);

        const headerStatic = readFileSync(path.join(outDir, 'forgewp-static', 'header.html'), 'utf8');
        const footerStatic = readFileSync(path.join(outDir, 'forgewp-static', 'footer.html'), 'utf8');
        const homeStatic = readFileSync(path.join(outDir, 'forgewp-static', 'content.html'), 'utf8');
        const homeHead = readFileSync(path.join(outDir, 'forgewp-static', 'head.html'), 'utf8');
        const aboutStatic = readFileSync(path.join(outDir, 'forgewp-static', 'template-about.html'), 'utf8');
        const aboutHead = readFileSync(path.join(outDir, 'forgewp-static', 'template-about-head.html'), 'utf8');
        const aboutPhp = readFileSync(path.join(outDir, 'page-about.php'), 'utf8');
        const functionsPhp = readFileSync(path.join(outDir, 'functions.php'), 'utf8');

        expect(headerStatic).toContain('data-fixture="shared-layout"');
        expect(headerStatic).toContain('href="/about"');
        expect(footerStatic).toContain('Next.js adapter research; native export not yet supported.');

        expect(homeStatic).toContain('<main><h1>A standard Next.js app</h1>');
        expect(homeStatic).toContain('An editable introduction');
        expect(homeStatic).toContain('href="/about?from=home#details"');
        expect(homeStatic).not.toContain('data-fixture="shared-layout"');
        expect(homeStatic).not.toContain('self.__next_f');
        expect(homeStatic).not.toContain('_next/static/chunks');

        // /about/ route preserves <main id="details"> and wires PHP template.
        expect(aboutStatic).toContain('<main id="details"><h1>About the adapter fixture</h1>');
        expect(aboutStatic).not.toContain('data-fixture="shared-layout"');
        expect(aboutStatic).not.toContain('self.__next_f');
        expect(aboutPhp).toContain('Template Name: About');
        expect(aboutPhp).toContain('get_header();');
        expect(aboutPhp).toContain('forgewp-static/template-about.html');
        expect(aboutPhp).toContain('get_footer();');

        // Per-route head metadata preserved without Next runtime scripts or broken /_next/static/css links.
        expect(homeHead).toContain('<title>ForgeWP Next.js research fixture</title>');
        expect(aboutHead).toContain('<title>ForgeWP Next.js research fixture</title>');
        expect(aboutHead).not.toContain('_next/static/');

        // functions.php provisions /about -> page-about.php, enqueues packaged CSS,
        // and does NOT enqueue forgewp-hydrator.js or Next client chunks as a fake WordPress runtime.
        expect(functionsPhp).toMatch(/'slug'\s*=>\s*'about'/);
        expect(functionsPhp).toMatch(/'title'\s*=>\s*'About the adapter fixture'/);
        expect(functionsPhp).toMatch(/'template'\s*=>\s*'page-about\.php'/);
        expect(functionsPhp).toContain(`'/${packagedCss}'`);
        expect(functionsPhp).not.toContain('forgewp-hydrator.js');
        expect(functionsPhp).not.toContain('_next/static/chunks');

        const validation = await validateExport({
          themeRoot: nextFixtureRoot,
          outDir,
          assets: { cssFile: packagedCss },
          config,
          routes: markup.routes,
        });
        expect(validation.missing).toEqual([]);
        expect(validation.warnings).toEqual([]);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  );
});
