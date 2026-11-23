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
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';
import { initNextProject, wrapNextConfigSource } from '../../lib/next-init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compilerBinDir = path.resolve(__dirname, '../../bin');

describe('Next.js DX tooling: forgewp init, adapter-aware doctor/repair/clean, and make:* hooks', () => {
  it('wraps ESM and CJS Next.js config files idempotently with withForgeWP()', () => {
    const esm = `import type { NextConfig } from 'next';\nconst nextConfig: NextConfig = { images: { unoptimized: true } };\nexport default nextConfig;\n`;
    const wrappedEsm = wrapNextConfigSource(esm, 'next.config.ts');
    expect(wrappedEsm.changed).toBe(true);
    expect(wrappedEsm.code).toContain("import { withForgeWP } from '@forgewp/react/next';");
    expect(wrappedEsm.code).toContain('export default withForgeWP(nextConfig);');

    // Idempotent second pass
    const secondPass = wrapNextConfigSource(wrappedEsm.code, 'next.config.ts');
    expect(secondPass.changed).toBe(false);
    expect(secondPass.reason).toBe('already-wrapped');

    // CJS support
    const cjs = `const nextConfig = { reactStrictMode: true };\nmodule.exports = nextConfig;\n`;
    const wrappedCjs = wrapNextConfigSource(cjs, 'next.config.cjs');
    expect(wrappedCjs.changed).toBe(true);
    expect(wrappedCjs.code).toContain("const { withForgeWP } = require('@forgewp/react/next');");
    expect(wrappedCjs.code).toContain('module.exports = withForgeWP(nextConfig);');
  });

  it('audits an existing Next.js repo with forgewp init (--dry-run and write mode) and recommends native vs decoupled mode', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-init-'));
    try {
      // 1. Existing marketing Next.js app (native-compatible)
      const marketingApp = path.join(tmp, 'marketing-app');
      mkdirSync(path.join(marketingApp, 'src', 'app'), { recursive: true });
      writeFileSync(
        path.join(marketingApp, 'package.json'),
        JSON.stringify({ name: 'acme-marketing', scripts: { dev: 'next dev' } }, null, 2),
      );
      writeFileSync(
        path.join(marketingApp, 'next.config.ts'),
        `const nextConfig = { reactStrictMode: true };\nexport default nextConfig;\n`,
      );
      writeFileSync(
        path.join(marketingApp, 'src', 'app', 'layout.tsx'),
        `export default function Layout({ children }: any) { return <html><body>{children}</body></html>; }\n`,
      );
      writeFileSync(
        path.join(marketingApp, 'src', 'app', 'page.tsx'),
        `export default function Home() { return <main>Hello</main>; }\n`,
      );

      // Dry-run makes zero filesystem mutations
      const dryReport = initNextProject(marketingApp, { dryRun: true });
      expect(dryReport.compatibility.ok).toBe(true);
      expect(dryReport.recommendedMode).toBe('native');
      expect(existsSync(path.join(marketingApp, 'wp.config.ts'))).toBe(false);
      expect(existsSync(path.join(marketingApp, 'cms', 'mock-data.ts'))).toBe(false);

      // Real run writes non-destructively
      const applied = initNextProject(marketingApp);
      expect(applied.compatibility.ok).toBe(true);
      expect(existsSync(path.join(marketingApp, 'wp.config.ts'))).toBe(true);
      expect(existsSync(path.join(marketingApp, 'cms', 'mock-data.ts'))).toBe(true);
      expect(existsSync(path.join(marketingApp, 'src', 'lib', 'content.ts'))).toBe(true);
      expect(existsSync(path.join(marketingApp, '.env.example'))).toBe(true);

      const nextCfg = readFileSync(path.join(marketingApp, 'next.config.ts'), 'utf8');
      expect(nextCfg).toContain("import { withForgeWP } from '@forgewp/react/next';");
      expect(nextCfg).toContain('export default withForgeWP(nextConfig);');

      const pkg = JSON.parse(readFileSync(path.join(marketingApp, 'package.json'), 'utf8'));
      expect(pkg.scripts.dev).toBe('next dev');
      expect(pkg.scripts.export).toBe('forgewp export');
      expect(pkg.scripts.doctor).toBe('forgewp doctor');
      expect(pkg.scripts['wp:doctor']).toBe('forgewp doctor');
      expect(pkg.scripts['dev:decoupled']).toContain('FORGEWP_DEPLOYMENT_MODE');
      expect(pkg.scripts['dev:decoupled']).toContain('decoupled');
      expect(pkg.scripts['dev:decoupled']).not.toContain('--webpack');

      // 2. Existing full-stack Next.js app (middleware + API route + dynamic segment) -> decoupled recommendation
      const fullstackApp = path.join(tmp, 'fullstack-app');
      mkdirSync(path.join(fullstackApp, 'src', 'app', 'api', 'users'), { recursive: true });
      mkdirSync(path.join(fullstackApp, 'src', 'app', 'blog', '[slug]'), { recursive: true });
      writeFileSync(path.join(fullstackApp, 'package.json'), JSON.stringify({ name: 'saas-app' }));
      writeFileSync(path.join(fullstackApp, 'src', 'middleware.ts'), 'export function middleware() {}');
      writeFileSync(
        path.join(fullstackApp, 'src', 'app', 'api', 'users', 'route.ts'),
        'export async function GET() { return new Response("ok"); }',
      );
      writeFileSync(
        path.join(fullstackApp, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
        'export default function Post() { return null; }',
      );

      const cliDryRun = spawnSync(
        process.execPath,
        [path.join(compilerBinDir, 'init.js'), '--dry-run'],
        { cwd: fullstackApp, encoding: 'utf8' },
      );
      expect(cliDryRun.status, cliDryRun.stderr).toBe(0);
      expect(cliDryRun.stdout).toContain('NEXT_NATIVE_MIDDLEWARE');
      expect(cliDryRun.stdout).toContain('NEXT_NATIVE_ROUTE_HANDLER');
      expect(cliDryRun.stdout).toContain('NEXT_NATIVE_DYNAMIC_ROUTE');
      expect(cliDryRun.stdout).toContain('Recommended mode: Decoupled Next.js');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('runs adapter-aware forgewp doctor, repair, clean, and make:block / make:page / make:island on a Next.js project', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-cli-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(tmp, '.next'), { recursive: true });
      mkdirSync(path.join(tmp, 'out'), { recursive: true });
      writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'next-cli-demo' }));
      writeFileSync(
        path.join(tmp, 'next.config.ts'),
        `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
      );
      writeFileSync(
        path.join(tmp, 'wp.config.ts'),
        `export default { configVersion: 1, name: 'Next CLI Demo', slug: 'next-cli-demo', version: '0.1.0', description: 'demo', textDomain: 'next-cli-demo', frameworkAdapter: 'nextjs' };\n`,
      );
      writeFileSync(path.join(tmp, 'src', 'app', 'layout.tsx'), 'export default () => null;');
      writeFileSync(path.join(tmp, 'src', 'app', 'globals.css'), 'body { margin: 0; }');
      writeFileSync(path.join(tmp, 'src', 'app', 'page.tsx'), 'export default () => <main>Hi</main>;');

      // 1. repair.js skips Vite SYSTEM_BLUEPRINTS but restores missing cms/mock-data.ts
      const repair = spawnSync(process.execPath, [path.join(compilerBinDir, 'repair.js')], {
        cwd: tmp,
        encoding: 'utf8',
      });
      expect(repair.status, repair.stderr).toBe(0);
      expect(existsSync(path.join(tmp, 'cms', 'mock-data.ts'))).toBe(true);
      expect(existsSync(path.join(tmp, 'cms', 'menus.json'))).toBe(false);
      expect(existsSync(path.join(tmp, 'cms', 'products.json'))).toBe(false);

      // 2. doctor.js passes cleanly on Next.js without Vite blueprints or dist/.vite/manifest.json
      const doctor = spawnSync(process.execPath, [path.join(compilerBinDir, 'doctor.js')], {
        cwd: tmp,
        encoding: 'utf8',
      });
      expect(doctor.status, doctor.stdout + doctor.stderr).toBe(0);
      expect(doctor.stdout).toContain('Next.js Config & Native Compatibility');
      expect(doctor.stdout).toContain('Project healthy');

      // 3. clean.js removes .next and out
      const clean = spawnSync(process.execPath, [path.join(compilerBinDir, 'clean.js')], {
        cwd: tmp,
        encoding: 'utf8',
      });
      expect(clean.status, clean.stderr).toBe(0);
      expect(existsSync(path.join(tmp, '.next'))).toBe(false);
      expect(existsSync(path.join(tmp, 'out'))).toBe(false);

      // 4. make:block creates a valid Next.js 'use client' block that compiles via compileBlocks()
      const makeBlock = spawnSync(
        process.execPath,
        [path.join(compilerBinDir, 'make-block.js'), 'FeatureCard', '--attributes=heading,summary'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(makeBlock.status, makeBlock.stderr).toBe(0);
      const blockPath = path.join(tmp, 'src', 'blocks', 'FeatureCard.tsx');
      expect(existsSync(blockPath)).toBe(true);
      const blockSrc = readFileSync(blockPath, 'utf8');
      expect(blockSrc).toContain("'use client';");
      expect(blockSrc).toContain("name: \"feature-card\"");

      const blockOut = path.join(tmp, 'block-out');
      mkdirSync(blockOut, { recursive: true });
      const compiled = compileBlocks(tmp, blockOut, { strict: true });
      expect(compiled.some((b) => b.name === 'forgewp/feature-card')).toBe(true);
      expect(existsSync(path.join(blockOut, 'blocks', 'feature-card', 'block.json'))).toBe(true);
      expect(existsSync(path.join(blockOut, 'blocks', 'feature-card', 'render.php'))).toBe(true);

      // 5. make:page creates an App Router page in src/app/contact-us/page.tsx
      const makePage = spawnSync(
        process.execPath,
        [path.join(compilerBinDir, 'make-page.js'), 'ContactUs'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(makePage.status, makePage.stderr).toBe(0);
      const pagePath = path.join(tmp, 'src', 'app', 'contact-us', 'page.tsx');
      expect(existsSync(pagePath)).toBe(true);
      expect(readFileSync(pagePath, 'utf8')).toContain("from '@forgewp/react'");

      // 6. make:island creates a 'use client' island in src/components/NewsletterSignup.tsx
      const makeIsland = spawnSync(
        process.execPath,
        [path.join(compilerBinDir, 'make-island.js'), 'NewsletterSignup'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(makeIsland.status, makeIsland.stderr).toBe(0);
      const islandPath = path.join(tmp, 'src', 'components', 'NewsletterSignup.tsx');
      expect(existsSync(islandPath)).toBe(true);
      expect(readFileSync(islandPath, 'utf8')).toContain("'use client';");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 120_000);
});
