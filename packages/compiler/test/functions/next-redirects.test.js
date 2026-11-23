import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { toNextRedirects, withForgeWP } from '../../../react/src/next.ts';
import {
  buildRouteCapabilityManifest,
  evaluateTargetCompatibility,
} from '../../lib/route-manifest.js';

describe('Phase B3: Next.js declarative redirects in withForgeWP() and doctor warnings', () => {
  const prevCwd = process.cwd();
  const prevNativeExport = process.env.FORGEWP_NATIVE_EXPORT;

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevNativeExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = prevNativeExport;
  });

  it('maps ForgeWPRedirect rules to Next.js redirects() entries and validates bad rules', () => {
    const { redirects, skippedIfNotFound } = toNextRedirects(
      [
        { from: '/kontakt/', to: '/contact/' },
        { from: '/studie', to: '/studie/hospitality-2035/', status: 302 },
        { from: '/old-promo', to: 'https://example.org/new', status: 308, ifNotFound: true },
        { from: '/about', to: '/company', ifNotFound: true },
      ],
      { appRoutes: ['/about', '/contact'] },
    );

    expect(redirects).toEqual([
      { source: '/kontakt', destination: '/contact/', statusCode: 301 },
      { source: '/studie', destination: '/studie/hospitality-2035/', statusCode: 302 },
      { source: '/old-promo', destination: 'https://example.org/new', statusCode: 308 },
    ]);
    expect(skippedIfNotFound).toEqual([
      { from: '/about', to: '/company', status: 301, ifNotFound: true },
    ]);

    expect(() => toNextRedirects([{ from: 'no-slash', to: '/ok' }])).toThrow(/starting with "\/"/);
    expect(() => toNextRedirects([{ from: '/dup', to: '/a' }, { from: '/dup/', to: '/b' }])).toThrow(/listed twice/);
    expect(() => toNextRedirects([{ from: '/self', to: '/self/' }])).toThrow(/to itself/);
    expect(() => toNextRedirects([{ from: '/bad', to: '/ok', status: 418 }])).toThrow(/301, 302, 307 or 308/);
  });

  it('wires redirects() in decoupled mode, auto-skips ifNotFound matching App Router pages, merges user redirects, and omits in native export', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-b3-redirects-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'about'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'about', 'page.tsx'),
        'export default function About() { return <main>About</main>; }\n',
      );
      process.chdir(tmp);

      const rules = [
        { from: '/kontakt', to: '/contact/' },
        { from: '/about', to: '/company', ifNotFound: true },
        { from: '/legacy-gone', to: '/archive', status: 307, ifNotFound: true },
      ];

      // 1. Decoupled mode wires redirects(), skips /about (matches src/app/about/page.tsx),
      //    keeps /legacy-gone (no matching page), and merges user redirects()
      const decoupledCfg = withForgeWP(
        {
          async redirects() {
            return [{ source: '/custom', destination: '/custom-new', permanent: true }];
          },
        },
        { deploymentMode: 'decoupled', redirects: rules },
      );

      expect(typeof decoupledCfg.redirects).toBe('function');
      const resolved = await decoupledCfg.redirects();
      expect(resolved).toEqual([
        { source: '/kontakt', destination: '/contact/', statusCode: 301 },
        { source: '/legacy-gone', destination: '/archive', statusCode: 307 },
        { source: '/custom', destination: '/custom-new', permanent: true },
      ]);

      // 2. Native export mode does NOT attach redirects() (PHP handles them; avoids output:'export' warning)
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const nativeCfg = withForgeWP({}, { redirects: rules });
      expect(nativeCfg.redirects).toBeUndefined();
    } finally {
      process.chdir(prevCwd);
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('emits REDIRECT_IF_NOT_FOUND_SHADOWED warning in doctor --target decoupled when an ifNotFound redirect matches an app route', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-b3-doctor-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'about'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'page.tsx'),
        'export default function Home() { return <main>Home</main>; }\n',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'about', 'page.tsx'),
        'export default function About() { return <main>About</main>; }\n',
      );

      const manifest = buildRouteCapabilityManifest(tmp, {
        config: {
          frameworkAdapter: 'nextjs',
          redirects: [
            { from: '/about', to: '/company', ifNotFound: true },
            { from: '/removed', to: '/', ifNotFound: true },
          ],
        },
      });

      const decoupledEval = evaluateTargetCompatibility(manifest, 'decoupled');
      expect(decoupledEval.compatible).toBe(true);
      const shadowed = decoupledEval.warnings.filter(
        (w) => w.code === 'REDIRECT_IF_NOT_FOUND_SHADOWED',
      );
      expect(shadowed).toHaveLength(1);
      expect(shadowed[0].route).toBe('/about');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('auto-reads redirects from wp.config.ts inside withForgeWP() without importing wp.config.ts in next.config.ts', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-b3-autoload-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'about'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'about', 'page.tsx'),
        'export default function About() { return <main>About</main>; }\n',
      );
      writeFileSync(
        path.join(tmp, 'wp.config.ts'),
        `import { defineConfig } from '@forgewp/compiler/define-config';

export default defineConfig({
  configVersion: 1,
  name: 'Auto Redirects',
  slug: 'auto-redirects',
  version: '0.1.0',
  description: 'demo',
  textDomain: 'auto-redirects',
  frameworkAdapter: 'nextjs',
  // Declarative redirects shared with Companion Plugin
  redirects: [
    { from: '/kontakt', to: '/contact/' }, // default 301
    { from: '/ext', to: 'https://example.org/docs', status: 302 },
    { from: '/about', to: '/company', ifNotFound: true },
    { from: '/legacy', to: '/new-home', status: 308, ifNotFound: true },
  ],
});
`,
      );
      process.chdir(tmp);

      // No options.redirects passed — withForgeWP() reads wp.config.ts automatically!
      const cfg = withForgeWP({}, { deploymentMode: 'decoupled' });
      expect(typeof cfg.redirects).toBe('function');
      const resolved = await cfg.redirects();
      expect(resolved).toEqual([
        { source: '/kontakt', destination: '/contact/', statusCode: 301 },
        { source: '/ext', destination: 'https://example.org/docs', statusCode: 302 },
        { source: '/legacy', destination: '/new-home', statusCode: 308 },
      ]);
    } finally {
      process.chdir(prevCwd);
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('emits postsArchivePath in forgewp-manifest.json when a blog archive route exists and null otherwise', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-blog-manifest-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'page.tsx'),
        'export default function Home() { return <main>Home</main>; }\n',
      );

      // No blog route -> postsArchivePath: null
      const withoutBlog = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'nextjs' },
      });
      expect(withoutBlog.postsArchivePath).toBeNull();

      // Add /blog archive + /blog/[slug] single -> postsArchivePath: '/blog'
      mkdirSync(path.join(tmp, 'src', 'app', 'blog', '[slug]'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'blog', 'page.tsx'),
        'export default function BlogArchive() { return <main>Blog</main>; }\n',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
        'export async function generateStaticParams() { return [{ slug: "hello" }]; }\nexport default function Post() { return <main>Post</main>; }\n',
      );

      const withBlog = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'nextjs' },
      });
      expect(withBlog.postsArchivePath).toBe('/blog');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
