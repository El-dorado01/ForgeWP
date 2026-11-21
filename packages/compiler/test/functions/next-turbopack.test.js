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

describe('Next.js 16 Turbopack compatibility (without --webpack)', () => {
  it('configures turbopack alongside webpack in withForgeWP() with zero dev overhead and native-export loaders', () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_DEPLOYMENT_MODE;

      // Dev mode: turbopack rules include next-ts-ext-loader.cjs, zero native-export loaders
      const devCfg = withForgeWP({}, { autoHydrate: true });
      expect(devCfg.turbopack.rules['*.ts'].loaders).toHaveLength(1);
      expect(devCfg.turbopack.rules['*.ts'].loaders[0].loader).toContain(
        'next-ts-ext-loader.cjs',
      );
      expect(devCfg.turbopack.rules['*.tsx'].loaders).toHaveLength(1);
      expect(devCfg.turbopack.rules['*.jsx']).toBeUndefined();

      // Decoupled mode: preserves user turbopack options, zero native-export loaders
      const decoupledCfg = withForgeWP(
        { turbopack: { resolveAlias: { foo: 'bar' } } },
        { deploymentMode: 'decoupled', autoHydrate: true },
      );
      expect(decoupledCfg.turbopack.resolveAlias).toEqual({ foo: 'bar' });
      expect(decoupledCfg.turbopack.rules['*.tsx'].loaders).toHaveLength(1);

      // Native export mode: attaches ts-ext + link-identity + auto-hydrate loaders to *.tsx
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const exportCfg = withForgeWP(
        {},
        { autoHydrate: { defaultTrigger: 'idle' } },
      );
      expect(exportCfg.turbopack.rules['*.tsx'].loaders).toHaveLength(3);
      expect(exportCfg.turbopack.rules['*.tsx'].loaders[0].loader).toContain(
        'next-ts-ext-loader.cjs',
      );
      expect(exportCfg.turbopack.rules['*.tsx'].loaders[1].loader).toContain(
        'next-link-identity-loader.cjs',
      );
      expect(exportCfg.turbopack.rules['*.tsx'].loaders[2].loader).toContain(
        'next-auto-hydrate-loader.cjs',
      );
      expect(exportCfg.turbopack.rules['*.tsx'].loaders[2].options.defaultTrigger).toBe(
        'idle',
      );
      expect(exportCfg.turbopack.rules['*.jsx'].loaders).toHaveLength(2);
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
      else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    }
  });

  it(
    'builds and exports a real Next.js 16 app using Turbopack (plain `next build` without `--webpack`) with @forgewp/react, autoHydrate, Link vs <a> identity, and next/image',
    async () => {
      if (!existsSync(path.join(nextFixtureNodeModules, 'next'))) {
        return;
      }

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-turbopack-e2e-'));
      const appDir = path.join(tmp, 'app');
      const outDir = path.join(tmp, 'out-theme');

      try {
        mkdirSync(path.join(appDir, 'src', 'app', 'about'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'components'), { recursive: true });
        mkdirSync(path.join(appDir, 'public'), { recursive: true });
        symlinkSync(nextFixtureNodeModules, path.join(appDir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

        const heroPng = await sharp({
          create: {
            width: 800,
            height: 400,
            channels: 3,
            background: { r: 15, g: 23, b: 42 },
          },
        })
          .png()
          .toBuffer();
        writeFileSync(path.join(appDir, 'public', 'hero.png'), heroPng);

        // Plain `next build` — uses Next.js 16 Turbopack by default (NO --webpack flag!)
        writeFileSync(
          path.join(appDir, 'package.json'),
          JSON.stringify(
            {
              name: 'forgewp-turbopack-e2e',
              private: true,
              type: 'module',
              scripts: {
                build: 'next build',
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
          `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({ turbopack: { root: ${JSON.stringify(path.parse(repoRoot).root)} } }, { autoHydrate: true });\n`,
        );

        writeFileSync(
          path.join(appDir, 'wp.config.ts'),
          `export default {\n  configVersion: 1,\n  name: 'Turbopack E2E',\n  slug: 'turbopack-e2e',\n  version: '1.0.0',\n  description: 'Next.js 16 Turbopack E2E theme',\n  textDomain: 'turbopack-e2e',\n  frameworkAdapter: 'nextjs',\n};\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'components', 'CounterWidget.tsx'),
          `'use client';\nimport { useState } from 'react';\nexport default function CounterWidget({ initialCount = 0 }: { initialCount?: number }) {\n  const [count, setCount] = useState(initialCount);\n  return <button type="button" onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'layout.tsx'),
          `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <header><a href="/">Turbopack</a></header>\n        <main>{children}</main>\n        <footer>Footer</footer>\n      </body>\n    </html>\n  );\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'page.tsx'),
          `import Link from 'next/link';\nimport Image from 'next/image';\nimport { BlockArea } from '@forgewp/react/server';\nimport CounterWidget from '@/components/CounterWidget';\n\nexport default function HomePage() {\n  return (\n    <section>\n      <h1>Turbopack Native Export</h1>\n      <Link href="/about">Verified Link</Link>\n      <a href="/about">Raw Anchor</a>\n      <Image src="/hero.png" width={800} height={400} priority alt="Hero" />\n      <BlockArea name="main" />\n      <CounterWidget initialCount={7} />\n    </section>\n  );\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'about', 'page.tsx'),
          `export default function AboutPage() {\n  return <section><h1>About Turbopack</h1></section>;\n}\n`,
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
        const contentHtml = readFileSync(
          path.join(themeDir, 'forgewp-static', 'content.html'),
          'utf8',
        );

        // 1. Auto-hydrate loader ran under Turbopack
        expect(contentHtml).toContain('data-forgewp-hydrate="counter-widget"');
        expect(contentHtml).toContain('&quot;initialCount&quot;:7');
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'counter-widget.js'))).toBe(true);
        expect(existsSync(path.join(themeDir, 'assets', 'forgewp-hydrator.js'))).toBe(true);

        // 2. Link identity loader ran under Turbopack: <Link> rewritten, raw <a> untouched!
        expect(contentHtml).toContain("forgewp_resolve_route_url('about'");
        expect(contentHtml).toContain('<a href="/about">Raw Anchor</a>');
        expect(contentHtml).not.toContain('data-forgewp-next-link');

        // 3. BlockArea + next/image Sharp WebP worked under Turbopack
        expect(contentHtml).toContain('the_content()');
        expect(allFiles.some((f) => f.startsWith('assets/images/') && f.endsWith('.webp'))).toBe(true);

        // 4. All PHP files lint cleanly
        for (const rel of allFiles.filter((f) => f.endsWith('.php'))) {
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
