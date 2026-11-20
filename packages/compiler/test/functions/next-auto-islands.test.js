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
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import {
  isInteractiveNextClientFile,
  scanNextAutoHydrationIslands,
} from '../../lib/next-islands.js';
import { withForgeWP } from '../../../react/src/next.ts';

const require = createRequire(import.meta.url);
const {
  isInteractiveClientFile,
  transformAutoHydrateSource,
} = require('../../../react/src/next-auto-hydrate-loader.cjs');

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

describe('Next.js auto-detected hydration islands (withForgeWP autoHydrate)', () => {
  it('classifies interactive vs static, server, block, and opt-out components accurately', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-auto-island-scan-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'blocks'), { recursive: true });

      const counterFile = path.join(tmp, 'src', 'components', 'CounterWidget.tsx');
      writeFileSync(
        counterFile,
        `'use client';\nimport { useState } from 'react';\nexport function CounterWidget() { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>{n}</button>; }\n`,
      );

      const browserFile = path.join(tmp, 'src', 'components', 'ViewportBadge.tsx');
      writeFileSync(
        browserFile,
        `'use client';\nexport function ViewportBadge() { return <span>{typeof window !== 'undefined' ? window.innerWidth : 0}</span>; }\n`,
      );

      const staticClientFile = path.join(tmp, 'src', 'components', 'StaticBadge.tsx');
      writeFileSync(
        staticClientFile,
        `'use client';\nexport function StaticBadge({ text }: { text: string }) { return <span className="badge">{text}</span>; }\n`,
      );

      const serverFile = path.join(tmp, 'src', 'components', 'ServerCard.tsx');
      writeFileSync(
        serverFile,
        `export function ServerCard({ title }: { title: string }) { return <article><h2>{title}</h2></article>; }\n`,
      );

      const optOutFile = path.join(tmp, 'src', 'components', 'OptOutWidget.tsx');
      writeFileSync(
        optOutFile,
        `'use client';\n/* @forgewp-no-hydrate */\nimport { useState } from 'react';\nexport function OptOutWidget() { const [v] = useState(1); return <span>{v}</span>; }\n`,
      );

      const defineBlockFile = path.join(tmp, 'src', 'components', 'HeroBlock.tsx');
      writeFileSync(
        defineBlockFile,
        `'use client';\nimport { useState } from 'react';\nexport const HeroBlock = defineBlock({ name: 'forgewp/hero', render() { const [x] = useState(0); return <div>{x}</div>; } });\n`,
      );

      const blockDirFile = path.join(tmp, 'src', 'blocks', 'IntroPreview.tsx');
      writeFileSync(
        blockDirFile,
        `'use client';\nimport { useState } from 'react';\nexport function IntroPreview() { const [x] = useState(0); return <div>{x}</div>; }\n`,
      );

      for (const check of [isInteractiveClientFile, isInteractiveNextClientFile]) {
        expect(check(counterFile)).toBe(true);
        expect(check(browserFile)).toBe(true);
        expect(check(staticClientFile)).toBe(false);
        expect(check(serverFile)).toBe(false);
        expect(check(optOutFile)).toBe(false);
        expect(check(defineBlockFile)).toBe(false);
        expect(check(blockDirFile)).toBe(false);
      }

      const scanned = scanNextAutoHydrationIslands(tmp);
      expect(scanned).toEqual([
        { id: 'counter-widget', file: 'src/components/CounterWidget.tsx' },
        { id: 'viewport-badge', file: 'src/components/ViewportBadge.tsx' },
      ]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('transforms unwrapped interactive client components while preserving explicit <Hydrate> boundaries', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-auto-island-xform-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });

      writeFileSync(
        path.join(tmp, 'src', 'components', 'CounterWidget.tsx'),
        `'use client';\nimport { useState } from 'react';\nexport function CounterWidget({ initialCount = 0 }: { initialCount?: number }) { const [c, setC] = useState(initialCount); return <button onClick={() => setC(c + 1)}>{c}</button>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'components', 'ClickWidget.tsx'),
        `'use client';\nimport { useState } from 'react';\nexport function ClickWidget() { const [c, setC] = useState(0); return <button onClick={() => setC(c + 1)}>{c}</button>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'components', 'StaticBadge.tsx'),
        `'use client';\nexport function StaticBadge() { return <span>Static</span>; }\n`,
      );

      const pagePath = path.join(tmp, 'src', 'app', 'page.tsx');
      const source = `import { Hydrate } from '@forgewp/react/server';
import { CounterWidget } from '@/components/CounterWidget';
import { ClickWidget } from '../components/ClickWidget';
import { StaticBadge } from '@/components/StaticBadge';

export default function HomePage() {
  return (
    <main>
      <CounterWidget initialCount={5} />
      <Hydrate trigger="click">
        <ClickWidget />
      </Hydrate>
      <StaticBadge />
    </main>
  );
}
`;

      const { code, wrapped } = transformAutoHydrateSource(source, pagePath, {
        projectRoot: tmp,
        defaultTrigger: 'idle',
      });

      expect(wrapped).toEqual(['counter-widget']);
      expect(code).toContain(
        `import { Hydrate as __ForgeWPAutoHydrate } from '@forgewp/react/server';`,
      );
      expect(code).toContain(
        `<__ForgeWPAutoHydrate id="counter-widget" trigger="idle"><CounterWidget initialCount={5} /></__ForgeWPAutoHydrate>`,
      );
      // Explicit <Hydrate> must not be double-wrapped, and gets inferred id="click-widget"
      expect(code).not.toContain(`<__ForgeWPAutoHydrate id="click-widget"`);
      expect(code).toContain(
        `<Hydrate id="click-widget" trigger="click">\n        <ClickWidget />\n      </Hydrate>`,
      );
      // Static 'use client' component must not be wrapped
      expect(code).not.toContain(`id="static-badge"`);

      // Non-app files are untouched
      const compResult = transformAutoHydrateSource(
        source,
        path.join(tmp, 'src', 'components', 'Wrapper.tsx'),
        { projectRoot: tmp },
      );
      expect(compResult.wrapped).toEqual([]);
      expect(compResult.code).toBe(source);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('injects the auto-hydrate webpack loader in withForgeWP() only during FORGEWP_NATIVE_EXPORT=1 in native mode', () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_DEPLOYMENT_MODE;

      // Without FORGEWP_NATIVE_EXPORT=1 -> zero overhead (no rule added)
      const devCfg = withForgeWP({}, { autoHydrate: true });
      const devWebpack = devCfg.webpack({ resolve: {}, module: { rules: [] } }, { dir: '/tmp/app' });
      expect(devWebpack.module.rules).toHaveLength(0);

      // With FORGEWP_NATIVE_EXPORT=1 in native mode -> pre-loader injected
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const exportCfg = withForgeWP(
        {},
        { autoHydrate: { defaultTrigger: 'interaction' } },
      );
      const exportWebpack = exportCfg.webpack(
        { resolve: {}, module: { rules: [] } },
        { dir: '/tmp/app' },
      );
      expect(exportWebpack.module.rules).toHaveLength(1);
      expect(exportWebpack.module.rules[0].enforce).toBe('pre');
      expect(exportWebpack.module.rules[0].use[0].loader).toContain(
        'next-auto-hydrate-loader.cjs',
      );
      expect(exportWebpack.module.rules[0].use[0].options).toEqual({
        projectRoot: '/tmp/app',
        defaultTrigger: 'interaction',
      });

      // In decoupled mode -> never injected even if FORGEWP_NATIVE_EXPORT=1
      const decoupledCfg = withForgeWP(
        {},
        { deploymentMode: 'decoupled', autoHydrate: true },
      );
      const decoupledWebpack = decoupledCfg.webpack(
        { resolve: {}, module: { rules: [] } },
        { dir: '/tmp/app' },
      );
      expect(decoupledWebpack.module.rules).toHaveLength(0);
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
      else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    }
  });

  it(
    'builds and exports a real Next.js app with autoHydrate: true, bundling unwrapped interactive islands and skipping static/opt-out components',
    async () => {
      if (!existsSync(path.join(nextFixtureNodeModules, 'next'))) {
        return;
      }

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-auto-e2e-'));
      const appDir = path.join(tmp, 'app');
      const outDir = path.join(tmp, 'out-theme');

      try {
        mkdirSync(path.join(appDir, 'src', 'app'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'components'), { recursive: true });
        symlinkSync(nextFixtureNodeModules, path.join(appDir, 'node_modules'), 'dir');

        writeFileSync(
          path.join(appDir, 'package.json'),
          JSON.stringify(
            {
              name: 'forgewp-auto-islands-e2e',
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
          `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({}, { autoHydrate: true });\n`,
        );

        writeFileSync(
          path.join(appDir, 'wp.config.ts'),
          `export default {\n  configVersion: 1,\n  name: 'Auto Islands E2E',\n  slug: 'auto-islands-e2e',\n  version: '1.0.0',\n  description: 'Auto islands E2E test theme',\n  textDomain: 'auto-islands-e2e',\n  frameworkAdapter: 'nextjs',\n};\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'components', 'CounterWidget.tsx'),
          `'use client';\nimport { useState } from 'react';\nexport default function CounterWidget({ initialCount = 0 }: { initialCount?: number }) {\n  const [count, setCount] = useState(initialCount);\n  return <button type="button" onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'components', 'ClickWidget.tsx'),
          `'use client';\nimport { useState } from 'react';\nexport function ClickWidget({ label = 'Tap' }: { label?: string }) {\n  const [taps, setTaps] = useState(0);\n  return <button type="button" onClick={() => setTaps((t) => t + 1)}>{label}: {taps}</button>;\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'components', 'StaticBadge.tsx'),
          `'use client';\nexport function StaticBadge({ text }: { text: string }) {\n  return <span className="static-badge">{text}</span>;\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'components', 'OptOutWidget.tsx'),
          `'use client';\n/* @forgewp-no-hydrate */\nimport { useState } from 'react';\nexport function OptOutWidget() {\n  const [ready] = useState(true);\n  return <span className="opt-out">{ready ? 'StaticOnly' : ''}</span>;\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'layout.tsx'),
          `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <header><a href="/">Auto Islands</a></header>\n        <main>{children}</main>\n        <footer>Footer</footer>\n      </body>\n    </html>\n  );\n}\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'page.tsx'),
          `import { Hydrate } from '@forgewp/react/server';\nimport CounterWidget from '@/components/CounterWidget';\nimport { ClickWidget } from '@/components/ClickWidget';\nimport { StaticBadge } from '@/components/StaticBadge';\nimport { OptOutWidget } from '@/components/OptOutWidget';\n\nexport default function HomePage() {\n  return (\n    <section>\n      <h1>Auto Islands Home</h1>\n      <CounterWidget initialCount={5} />\n      <Hydrate trigger="click">\n        <ClickWidget label="Tap" />\n      </Hydrate>\n      <StaticBadge text="Pure" />\n      <OptOutWidget />\n    </section>\n  );\n}\n`,
        );

        const result = await exportTheme({
          themeRoot: appDir,
          outDir,
          zip: false,
          validate: true,
          strict: true,
        });

        const themeDir = result.outDir;

        const contentHtml = readFileSync(
          path.join(themeDir, 'forgewp-static', 'content.html'),
          'utf8',
        );

        // Auto-wrapped CounterWidget
        expect(contentHtml).toContain('data-forgewp-hydrate="counter-widget"');
        expect(contentHtml).toContain('data-forgewp-trigger="visible"');
        expect(contentHtml).toContain('&quot;initialCount&quot;:5');

        // Explicit <Hydrate trigger="click"> preserved without double-wrapping
        expect(contentHtml).toContain('data-forgewp-hydrate="click-widget"');
        expect(contentHtml).toContain('data-forgewp-trigger="click"');
        const clickMatches = contentHtml.match(/data-forgewp-hydrate="click-widget"/g) || [];
        expect(clickMatches).toHaveLength(1);

        // Static and opt-out components were NOT wrapped
        expect(contentHtml).not.toContain('data-forgewp-hydrate="static-badge"');
        expect(contentHtml).not.toContain('data-forgewp-hydrate="opt-out-widget"');
        expect(contentHtml).toContain('Pure');
        expect(contentHtml).toContain('StaticOnly');

        // Island bundles & hydrator runtime emitted only for active islands
        expect(existsSync(path.join(themeDir, 'assets', 'forgewp-hydrator.js'))).toBe(true);
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'react-runtime.js'))).toBe(true);
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'counter-widget.js'))).toBe(true);
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'click-widget.js'))).toBe(true);
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'static-badge.js'))).toBe(false);
        expect(existsSync(path.join(themeDir, 'assets', 'islands', 'opt-out-widget.js'))).toBe(false);

        // PHP lint all emitted PHP files
        const phpFiles = walkFiles(themeDir).filter((f) => f.endsWith('.php'));
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
    120_000,
  );
});
