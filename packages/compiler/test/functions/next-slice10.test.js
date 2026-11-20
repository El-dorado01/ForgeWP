import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  exportTheme,
  loadFrameworkAdapter,
  resolveFrameworkAdapter,
} from '../../lib/index.js';
import { withForgeWP } from '../../../react/src/next.ts';
import { withForgeWP as withForgeWPFromConfig } from '../../../react/src/config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const createForgewpBin = path.join(repoRoot, 'packages', 'create-forgewp', 'index.js');
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

describe('Slice 10: Public Next.js adapter registration, withForgeWP(), and create-forgewp scaffolding', () => {
  it('resolves and loads the registered nextjs framework adapter publicly', async () => {
    expect(resolveFrameworkAdapter('nextjs')).toBe('./next-adapter.js');
    const adapter = await loadFrameworkAdapter('nextjs');
    expect(typeof adapter.getCriticalFiles).toBe('function');
    expect(typeof adapter.buildAssets).toBe('function');
    expect(typeof adapter.readBuildAssets).toBe('function');
    expect(typeof adapter.renderStaticMarkup).toBe('function');
    expect(typeof adapter.packageAssets).toBe('function');
    expect(typeof adapter.scanForHydrationIslands).toBe('function');
    expect(typeof adapter.findComponentPath).toBe('function');
    expect(typeof adapter.getHydrationRollupInputs).toBe('function');
  });

  it('configures native static export, decoupled server mode, transpilePackages, and webpack extensionAlias via withForgeWP()', () => {
    expect(withForgeWPFromConfig).toBe(withForgeWP);

    const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
    try {
      delete process.env.FORGEWP_DEPLOYMENT_MODE;
      let userWebpackCalled = false;
      const nativeCfg = withForgeWP(
        {
          images: { unoptimized: true },
          transpilePackages: ['custom-pkg'],
          webpack(cfg) {
            userWebpackCalled = true;
            cfg.customFlag = true;
            return cfg;
          },
        },
        { transpilePackages: ['@forgewp/ui'] },
      );

      expect(nativeCfg.output).toBe('export');
      expect(nativeCfg.images).toEqual({ unoptimized: true });
      expect(nativeCfg.transpilePackages).toEqual([
        '@forgewp/react',
        'custom-pkg',
        '@forgewp/ui',
      ]);

      const webpackResult = nativeCfg.webpack({ resolve: {} }, {});
      expect(userWebpackCalled).toBe(true);
      expect(webpackResult.customFlag).toBe(true);
      expect(webpackResult.resolve.extensionAlias['.js']).toEqual([
        '.ts',
        '.tsx',
        '.js',
      ]);
      expect(webpackResult.resolve.extensionAlias['.jsx']).toEqual([
        '.tsx',
        '.jsx',
      ]);

      // Decoupled mode via env omits output: 'export'
      process.env.FORGEWP_DEPLOYMENT_MODE = 'decoupled';
      const decoupledCfg = withForgeWP({});
      expect(decoupledCfg.output).toBeUndefined();
      expect(decoupledCfg.transpilePackages).toEqual(['@forgewp/react']);

      // Explicit deploymentMode option overrides env
      const forcedNative = withForgeWP({}, { deploymentMode: 'native' });
      expect(forcedNative.output).toBe('export');
    } finally {
      if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
      else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    }
  });

  it(
    'scaffolds a clean Next.js project via create-forgewp --adapter nextjs and exports it into a validated native WordPress theme ZIP via wp.config.ts',
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-create-nextjs-'));
      try {
        const projectDir = path.join(tmp, 'my-next-theme');
        const scaffold = spawnSync(
          process.execPath,
          [createForgewpBin, projectDir, '--adapter', 'nextjs', '--yes', '--no-install'],
          { cwd: tmp, encoding: 'utf8' },
        );
        expect(scaffold.status, scaffold.stderr || scaffold.stdout).toBe(0);

        // Verify scaffolded project files and config
        expect(existsSync(path.join(projectDir, 'index.html'))).toBe(false);
        expect(existsSync(path.join(projectDir, 'next.config.ts'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'wp.config.ts'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'cms', 'mock-data.ts'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'src', 'lib', 'content.ts'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'src', 'blocks', 'IntroBlock.tsx'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'src', 'app', 'layout.tsx'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'src', 'app', 'page.tsx'))).toBe(true);
        expect(existsSync(path.join(projectDir, 'src', 'app', 'about', 'page.tsx'))).toBe(true);

        const wpConfigSrc = readFileSync(path.join(projectDir, 'wp.config.ts'), 'utf8');
        expect(wpConfigSrc).toContain('frameworkAdapter: "nextjs"');
        expect(wpConfigSrc).toContain('slug: "my-next-theme"');

        const nextConfigSrc = readFileSync(path.join(projectDir, 'next.config.ts'), 'utf8');
        expect(nextConfigSrc).toContain("from '@forgewp/react/next'");
        expect(nextConfigSrc).toContain('withForgeWP');

        const layoutSrc = readFileSync(
          path.join(projectDir, 'src', 'app', 'layout.tsx'),
          'utf8',
        );
        expect(layoutSrc).toContain('My Next Theme');

        // Reuse installed workspace Next.js + React + @forgewp/react + @forgewp/compiler dependencies
        if (existsSync(nextFixtureNodeModules)) {
          const projectNodeModules = path.join(projectDir, 'node_modules');
          const { mkdirSync } = await import('node:fs');
          mkdirSync(path.join(projectNodeModules, '@forgewp'), { recursive: true });
          const linkType = process.platform === 'win32' ? 'junction' : 'dir';
          for (const entry of readdirSync(nextFixtureNodeModules)) {
            if (entry === '@forgewp') continue;
            symlinkSync(
              path.join(nextFixtureNodeModules, entry),
              path.join(projectNodeModules, entry),
              linkType,
            );
          }
          symlinkSync(
            path.join(repoRoot, 'packages', 'react'),
            path.join(projectNodeModules, '@forgewp', 'react'),
            linkType,
          );
          symlinkSync(
            path.join(repoRoot, 'packages', 'compiler'),
            path.join(projectNodeModules, '@forgewp', 'compiler'),
            linkType,
          );

          // Call exportTheme() with ONLY themeRoot + packageManager: 'npm' —
          // no explicit adapter or config override! It must load wp.config.ts,
          // resolve frameworkAdapter: 'nextjs', run `next build --webpack` with
          // FORGEWP_NATIVE_EXPORT=1, compile blocks, rewrite links, validate, and zip.
          const result = await exportTheme({
            themeRoot: projectDir,
            packageManager: 'npm',
            validate: true,
            strict: true,
            zip: true,
          });

          expect(result.config.frameworkAdapter).toBe('nextjs');
          expect(result.config.slug).toBe('my-next-theme');
          expect(result.zipPath && existsSync(result.zipPath)).toBe(true);
          expect(statSync(result.zipPath).size).toBeGreaterThan(1000);

          // Static routes, 404, live WP bindings, BlockArea, compiled Gutenberg block, and esbuild island present
          expect(existsSync(path.join(result.outDir, 'front-page.php'))).toBe(true);
          expect(existsSync(path.join(result.outDir, 'page-about.php'))).toBe(true);
          expect(existsSync(path.join(result.outDir, '404.php'))).toBe(true);
          expect(existsSync(path.join(result.outDir, 'blocks', 'hero-intro', 'block.json'))).toBe(true);
          expect(existsSync(path.join(result.outDir, 'blocks', 'hero-intro', 'render.php'))).toBe(true);
          expect(existsSync(path.join(result.outDir, 'assets', 'forgewp-hydrator.js'))).toBe(true);
          expect(existsSync(path.join(result.outDir, 'assets', 'islands', 'counter-island.js'))).toBe(true);

          const homeStatic = readFileSync(
            path.join(result.outDir, 'forgewp-static', 'content.html'),
            'utf8',
          );
          expect(homeStatic).toContain('get_the_title()');
          expect(homeStatic).toContain('<?php the_content(); ?>');
          expect(homeStatic).toContain("forgewp_resolve_route_url('about'");

          // Lint all generated PHP & static templates with php -l
          const files = walkFiles(result.outDir).filter(
            (f) => f.endsWith('.php') || f.startsWith('forgewp-static/'),
          );
          expect(files.length).toBeGreaterThan(5);
          for (const rel of files) {
            const lint = spawnSync('php', ['-l', path.join(result.outDir, rel)], {
              encoding: 'utf8',
            });
            expect(lint.status, `php -l failed on ${rel}: ${lint.stderr}`).toBe(0);
          }
        }
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
