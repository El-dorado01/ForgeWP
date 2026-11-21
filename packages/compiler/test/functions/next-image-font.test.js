import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import { scanAssetGraph } from '../../lib/assets/asset-graph.js';
import {
  packageNextAssets,
  rewriteNextMediaUrlsInMarkup,
} from '../../lib/next-export-experimental.js';
import { withForgeWP } from '../../../react/src/next.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureNodeModules = path.join(
  repoRoot,
  'projects',
  'nextjs-adapter-fixture',
  'node_modules',
);

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

describe('Next.js next/image & next/font native WordPress packaging', () => {
  it('enables images.unoptimized in withForgeWP() only during FORGEWP_NATIVE_EXPORT=1 in native mode', () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_DEPLOYMENT_MODE;

      // Dev / non-export mode leaves images untouched
      const devCfg = withForgeWP({});
      expect(devCfg.images).toBeUndefined();

      // Decoupled mode leaves images untouched
      const decoupledCfg = withForgeWP({}, { deploymentMode: 'decoupled' });
      expect(decoupledCfg.images).toBeUndefined();

      // Native export sets images.unoptimized = true while preserving user image config
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const nativeCfg = withForgeWP({
        images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
      });
      expect(nativeCfg.images).toEqual({
        remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }],
        unoptimized: true,
      });

      // Custom loader is respected and not overridden
      const customLoaderCfg = withForgeWP({
        images: { loader: 'custom', loaderFile: './img-loader.js' },
      });
      expect(customLoaderCfg.images.unoptimized).toBeUndefined();
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
      else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    }
  });

  it('scans next/image usages (public paths and static ES imports) in AssetGraph and matches hashed Next.js media URLs', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-img-graph-'));
    try {
      mkdirSync(path.join(tmp, 'app'), { recursive: true });
      mkdirSync(path.join(tmp, 'assets'), { recursive: true });
      const bannerPath = path.join(tmp, 'assets', 'banner.png');
      writeFileSync(bannerPath, 'fake-png');
      writeFileSync(
        path.join(tmp, 'app', 'page.tsx'),
        `import Image from 'next/image';
import bannerImg from '../assets/banner.png';

export default function Home() {
  return (
    <main>
      <Image src="/hero.jpg" width={1200} height={600} priority sizes="100vw" alt="Hero" />
      <Image src={bannerImg} alt="Banner" />
    </main>
  );
}
`,
      );

      const graph = scanAssetGraph(tmp);
      const hero = graph.getAsset('/hero.jpg');
      expect(hero).toBeTruthy();
      expect(hero.priority).toBe(true);
      expect(hero.width).toBe(1200);
      expect(hero.height).toBe(600);
      expect(hero.sizes).toBe('100vw');

      const banner = graph.getAsset('../assets/banner.png');
      expect(banner).toBeTruthy();
      expect(banner.resolvedPath).toBe(bannerPath);

      // Hashed Next.js media URL matches back to the Sharp AssetNode
      expect(graph.getAsset('/assets/media/banner.a1b2c3d4.png')).toBe(banner);
      expect(graph.getAsset('/_next/static/media/banner.a1b2c3d4.png')).toBe(banner);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('copies next/font .woff2 and static media from out/_next/static/media/ into assets/fonts/ and assets/media/ and rewrites CSS & HTML URLs', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-font-css-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outExport = path.join(appDir, 'out');
      const themeOut = path.join(tmp, 'theme');
      mkdirSync(path.join(outExport, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outExport, '_next', 'static', 'media'), { recursive: true });
      mkdirSync(path.join(outExport, 'about'), { recursive: true });

      writeFileSync(path.join(outExport, '_next', 'static', 'media', 'inter-latin.woff2'), 'WOF2');
      writeFileSync(path.join(outExport, '_next', 'static', 'media', 'pattern.12ab34cd.png'), 'PNG');

      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'shared.css'),
        `@font-face{font-family:Inter;src:url(/_next/static/media/inter-latin.woff2) format("woff2");}\n.bg{background:url(../media/pattern.12ab34cd.png);}`,
      );
      writeFileSync(
        path.join(outExport, '_next', 'static', 'css', 'about.css'),
        `@font-face{font-family:InterRoute;src:url(../media/inter-latin.woff2) format("woff2");}`,
      );
      writeFileSync(
        path.join(outExport, 'index.html'),
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/shared.css"/><link rel="preload" as="font" href="/_next/static/media/inter-latin.woff2"/></head><body><main><img src="/_next/static/media/pattern.12ab34cd.png" alt="Pattern"/></main></body></html>',
      );
      writeFileSync(
        path.join(outExport, 'about', 'index.html'),
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/shared.css"/><link rel="stylesheet" href="/_next/static/css/about.css"/></head><body><main>About</main></body></html>',
      );

      const packaged = packageNextAssets(appDir, themeOut);
      expect(packaged.fontFiles).toEqual(['assets/fonts/inter-latin.woff2']);
      expect(packaged.mediaFiles).toEqual(['assets/media/pattern.12ab34cd.png']);
      expect(existsSync(path.join(themeOut, 'assets', 'fonts', 'inter-latin.woff2'))).toBe(true);
      expect(existsSync(path.join(themeOut, 'assets', 'media', 'pattern.12ab34cd.png'))).toBe(true);

      const sharedCss = readFileSync(path.join(themeOut, 'assets', 'shared.css'), 'utf8');
      expect(sharedCss).toContain('url(./fonts/inter-latin.woff2)');
      expect(sharedCss).toContain('url(./media/pattern.12ab34cd.png)');
      expect(sharedCss).not.toContain('_next/static/media');

      const aboutCss = readFileSync(path.join(themeOut, 'assets', 'css', 'about.css'), 'utf8');
      expect(aboutCss).toContain('url(../fonts/inter-latin.woff2)');
      expect(aboutCss).not.toContain('../media/');

      const rewrittenMarkup = rewriteNextMediaUrlsInMarkup({
        headHtml: '<link rel="preload" as="font" href="/_next/static/media/inter-latin.woff2"/>',
        appHtml: '<img src="/_next/static/media/pattern.12ab34cd.png" alt="Pattern"/>',
        routes: [
          {
            path: '/',
            headHtml: '<link rel="preload" as="font" href="/_next/static/media/inter-latin.woff2"/>',
            html: '<img src="/_next/static/media/pattern.12ab34cd.png" alt="Pattern"/>',
          },
        ],
      });
      expect(rewrittenMarkup.headHtml).toContain('/assets/fonts/inter-latin.woff2');
      expect(rewrittenMarkup.appHtml).toContain('/assets/media/pattern.12ab34cd.png');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it(
    'builds and exports a real Next.js app using next/image (public + static import) and next/font/local into Sharp WebP variants and self-hosted assets/fonts/',
    async () => {
      if (!existsSync(path.join(nextFixtureNodeModules, 'next'))) {
        return;
      }

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-img-font-e2e-'));
      const appDir = path.join(tmp, 'app');
      const outDir = path.join(tmp, 'out-theme');

      try {
        mkdirSync(path.join(appDir, 'src', 'app'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'assets'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'fonts'), { recursive: true });
        mkdirSync(path.join(appDir, 'public'), { recursive: true });
        symlinkSync(nextFixtureNodeModules, path.join(appDir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

        // Generate real raster PNGs so Sharp optimizes them into WebP variants
        const heroPng = await sharp({
          create: {
            width: 800,
            height: 400,
            channels: 3,
            background: { r: 22, g: 78, b: 99 },
          },
        })
          .png()
          .toBuffer();
        const cardPng = await sharp({
          create: {
            width: 640,
            height: 360,
            channels: 3,
            background: { r: 30, g: 58, b: 138 },
          },
        })
          .png()
          .toBuffer();

        writeFileSync(path.join(appDir, 'public', 'hero.png'), heroPng);
        writeFileSync(path.join(appDir, 'src', 'assets', 'card.png'), cardPng);
        // Minimal valid WOFF2 signature header for next/font/local bundling
        writeFileSync(
          path.join(appDir, 'src', 'fonts', 'brand.woff2'),
          Buffer.from('wOF2\x00\x01\x00\x00\x00\x00\x00\x30\x00\x00\x00\x00', 'binary'),
        );

        writeFileSync(
          path.join(appDir, 'package.json'),
          JSON.stringify(
            {
              name: 'forgewp-next-img-font-e2e',
              private: true,
              type: 'module',
              scripts: {
                build: 'next build --webpack',
              },
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(appDir, 'tsconfig.json'),
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                lib: ['dom', 'dom.iterable', 'esnext'],
                allowJs: true,
                skipLibCheck: true,
                strict: false,
                noEmit: true,
                esModuleInterop: true,
                module: 'esnext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: 'preserve',
                plugins: [{ name: 'next' }],
                paths: {
                  '@/*': ['./src/*'],
                },
              },
              include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
              exclude: ['node_modules'],
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(appDir, 'next.config.mjs'),
          `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
        );

        writeFileSync(
          path.join(appDir, 'wp.config.ts'),
          `export default {\n  configVersion: 1,\n  name: 'Next Image Font E2E',\n  slug: 'next-image-font-e2e',\n  version: '1.0.0',\n  description: 'Next image and font E2E theme',\n  textDomain: 'next-image-font-e2e',\n  frameworkAdapter: 'nextjs',\n};\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'layout.tsx'),
          `import localFont from 'next/font/local';
const brandFont = localFont({ src: '../fonts/brand.woff2', variable: '--font-brand' });
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={brandFont.variable}>
      <body className={brandFont.className}>
        <header><a href="/">Brand</a></header>
        <main>{children}</main>
        <footer>Footer</footer>
      </body>
    </html>
  );
}
`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'page.tsx'),
          `import Image from 'next/image';
import cardImg from '@/assets/card.png';

export default function HomePage() {
  return (
    <section>
      <h1>Next Image and Font</h1>
      <Image src="/hero.png" width={800} height={400} priority alt="Hero Banner" />
      <Image src={cardImg} alt="Card Graphic" />
    </section>
  );
}
`,
        );

        const result = await exportTheme({
          themeRoot: appDir,
          outDir,
          zip: false,
          validate: true,
          strict: true,
        });

        const themeDir = result.outDir;
        const allFiles = walkFiles(themeDir);

        // 1. next/font/local .woff2 copied into assets/fonts/ and CSS rewritten (no _next/static/media/)
        const exportedFonts = allFiles.filter(
          (f) => f.startsWith('assets/fonts/') && f.endsWith('.woff2'),
        );
        expect(exportedFonts.length).toBeGreaterThan(0);

        const cssFiles = allFiles.filter((f) => f.startsWith('assets/') && f.endsWith('.css'));
        expect(cssFiles.length).toBeGreaterThan(0);
        const allCss = cssFiles
          .map((f) => readFileSync(path.join(themeDir, f), 'utf8'))
          .join('\n');
        expect(allCss).toContain('./fonts/');
        expect(allCss).not.toContain('_next/static/media');

        // 2. Sharp generated responsive WebP variants for next/image assets
        const webpVariants = allFiles.filter(
          (f) => f.startsWith('assets/images/') && f.endsWith('.webp'),
        );
        expect(webpVariants.length).toBeGreaterThan(0);

        // 3. Static public/hero.png fallback & static import media exist in theme
        expect(existsSync(path.join(themeDir, 'hero.png'))).toBe(true);
        const mediaFiles = allFiles.filter((f) => f.startsWith('assets/media/'));
        expect(mediaFiles.length).toBeGreaterThan(0);

        // 4. Exported HTML has zero /_next/image or /_next/static/media/ and uses get_theme_file_uri + WebP srcset
        const contentHtml = readFileSync(
          path.join(themeDir, 'forgewp-static', 'content.html'),
          'utf8',
        );
        expect(contentHtml).not.toContain('/_next/image');
        expect(contentHtml).not.toContain('/_next/static/media/');
        expect(contentHtml).toContain('get_theme_file_uri(');
        expect(contentHtml).toContain('.webp');
        expect(contentHtml).toContain('srcset=');

        // 5. All emitted PHP files lint cleanly
        const phpFiles = allFiles.filter((f) => f.endsWith('.php'));
        expect(phpFiles.length).toBeGreaterThan(0);
        for (const rel of phpFiles) {
          const lint = spawnSync('php', ['-l', path.join(themeDir, rel)], {
            encoding: 'utf8',
          });
          expect(lint.status, `${rel}: ${lint.stderr}`).toBe(0);
        }
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
    180_000, // full Next.js build + export; slow under parallel load on Windows
  );
});
