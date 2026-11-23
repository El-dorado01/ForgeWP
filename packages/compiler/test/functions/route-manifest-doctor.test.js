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
import {
  buildRouteCapabilityManifest,
  evaluateTargetCompatibility,
  matchesHybridRoute,
  writeRouteCapabilityManifest,
} from '../../lib/route-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const doctorBin = path.resolve(__dirname, '../../bin/doctor.js');

function scaffoldNextProject(root, { wpConfigExtra = '', hybridRoutes = null, forms = null } = {}) {
  mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
  mkdirSync(path.join(root, 'cms'), { recursive: true });

  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'manifest-demo' }));
  writeFileSync(
    path.join(root, 'next.config.ts'),
    `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
  );
  writeFileSync(path.join(root, 'cms', 'mock-data.ts'), 'export default { posts: [] };\n');
  writeFileSync(
    path.join(root, 'src', 'app', 'layout.tsx'),
    `export default function RootLayout({ children }: any) { return <html><body>{children}</body></html>; }\n`,
  );
  writeFileSync(path.join(root, 'src', 'app', 'globals.css'), 'body { margin: 0; }\n');
  writeFileSync(
    path.join(root, 'src', 'app', 'page.tsx'),
    `import { useWpOption } from '@forgewp/react';\nexport default function Home() { const title = useWpOption('blogname'); return <main>{title}</main>; }\n`,
  );

  const extraFields = [
    hybridRoutes ? `hybridRoutes: ${JSON.stringify(hybridRoutes)},` : '',
    forms ? `forms: ${JSON.stringify(forms)},` : '',
    wpConfigExtra,
  ]
    .filter(Boolean)
    .join('\n  ');

  writeFileSync(
    path.join(root, 'wp.config.ts'),
    `export default {
  configVersion: 1,
  name: 'Manifest Demo',
  slug: 'manifest-demo',
  version: '0.1.0',
  description: 'demo',
  textDomain: 'manifest-demo',
  frameworkAdapter: 'nextjs',
  ${extraFields}
};\n`,
  );
}

describe('Phase A Assignment 5: Route Capability Manifest & forgewp doctor --target', () => {
  it('matches exact, wildcard, and dynamic hybridRoutes patterns', () => {
    expect(matchesHybridRoute('/contact', ['/contact'])).toBe(true);
    expect(matchesHybridRoute('/contact/', ['/contact'])).toBe(true);
    expect(matchesHybridRoute('/events/summer-gala', ['/events/*'])).toBe(true);
    expect(matchesHybridRoute('/events', ['/events/*'])).toBe(true);
    expect(matchesHybridRoute('/events/[slug]', ['/events/[slug]'])).toBe(true);
    expect(matchesHybridRoute('/about', ['/contact', '/events/*'])).toBe(false);
  });

  it('builds manifest with transitive <WpShortcode>, capabilities, and Next.js server-only diagnostics', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-manifest-unit-'));
    try {
      scaffoldNextProject(tmp);
      mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'contact'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'api', 'revalidate'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', '(marketing)', 'about'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'server', 'plugin'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'server', 'theme'), { recursive: true });

      // Child component containing <WpShortcode> imported by /contact
      writeFileSync(
        path.join(tmp, 'src', 'components', 'BookingWidget.tsx'),
        `import { WpShortcode } from '@forgewp/react';\nexport function BookingWidget() { return <WpShortcode code="[contact-form-7 id='42']" />; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'contact', 'page.tsx'),
        `import { BookingWidget } from '../../components/BookingWidget';\nexport default function Contact() { return <main><BookingWidget /></main>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', '(marketing)', 'about', 'page.tsx'),
        `import { useWpMenu } from '@forgewp/react';\nexport default function About() { useWpMenu('primary'); return <main>About</main>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'api', 'revalidate', 'route.ts'),
        `export async function POST() { return Response.json({ ok: true }); }\n`,
      );
      writeFileSync(path.join(tmp, 'src', 'server', 'plugin', 'rest.php'), '<?php // plugin\n');
      writeFileSync(path.join(tmp, 'src', 'server', 'theme', 'filters.php'), '<?php // theme\n');

      const manifest = buildRouteCapabilityManifest(tmp, {
        config: {
          name: 'Manifest Demo',
          slug: 'manifest-demo',
          frameworkAdapter: 'nextjs',
        },
      });

      expect(manifest.schemaVersion).toBe(1);
      expect(Object.keys(manifest.routes)).toEqual(
        expect.arrayContaining(['/', '/about', '/contact', '/api/revalidate']),
      );
      expect(manifest.routes['/'].uses).toContain('site-settings');
      expect(manifest.routes['/about'].uses).toContain('menus:primary');
      expect(manifest.routes['/about'].pinned).toBeNull();
      expect(manifest.routes['/contact'].uses).toContain('shortcode:contact-form-7');
      expect(manifest.routes['/contact'].pinned).toBe('native');
      expect(manifest.routes['/api/revalidate'].uses).toContain('route-handler');
      expect(manifest.routes['/api/revalidate'].pinned).toBe('decoupled');
      expect(manifest.suggestedHybridRoutes).toEqual(['/contact']);
      expect(manifest.global.serverPhpFiles.plugin).toEqual(['src/server/plugin/rest.php']);
      expect(manifest.global.serverPhpFiles.theme).toEqual(['src/server/theme/filters.php']);

      // --target native fails on /api/revalidate route handler, allows /contact shortcode
      const nativeEval = evaluateTargetCompatibility(manifest, 'native');
      expect(nativeEval.compatible).toBe(false);
      expect(nativeEval.errors.some((e) => e.code === 'NEXT_NATIVE_ROUTE_HANDLER')).toBe(true);
      expect(nativeEval.errors.some((e) => e.code === 'SHORTCODE_NATIVE_PINNED')).toBe(false);

      // --target decoupled fails HARD on /contact <WpShortcode> when hybridRoutes is empty
      const decoupledEval = evaluateTargetCompatibility(manifest, 'decoupled');
      expect(decoupledEval.compatible).toBe(false);
      expect(decoupledEval.errors.some((e) => e.code === 'SHORTCODE_NATIVE_PINNED')).toBe(true);
      expect(decoupledEval.warnings.some((w) => w.code === 'THEME_PHP_DECOUPLED_SKIPPED')).toBe(true);

      // Adding /contact to hybridRoutes resolves both decoupled and hybrid targets cleanly
      const hybridManifest = buildRouteCapabilityManifest(tmp, {
        config: {
          name: 'Manifest Demo',
          slug: 'manifest-demo',
          frameworkAdapter: 'nextjs',
          hybridRoutes: ['/contact'],
        },
      });
      const decoupledWithHybrid = evaluateTargetCompatibility(hybridManifest, 'decoupled');
      expect(decoupledWithHybrid.compatible).toBe(true);
      expect(decoupledWithHybrid.hybridDelegatedRoutes).toEqual(['/contact']);

      const hybridEval = evaluateTargetCompatibility(hybridManifest, 'hybrid');
      expect(hybridEval.compatible).toBe(true);
      expect(hybridEval.hybridDelegatedRoutes).toEqual(['/contact']);

      // Putting a decoupled-only route handler into hybridRoutes triggers a conflict error
      const conflictManifest = buildRouteCapabilityManifest(tmp, {
        config: {
          name: 'Manifest Demo',
          slug: 'manifest-demo',
          frameworkAdapter: 'nextjs',
          hybridRoutes: ['/contact', '/api/revalidate'],
        },
      });
      const conflictEval = evaluateTargetCompatibility(conflictManifest, 'hybrid');
      expect(conflictEval.compatible).toBe(false);
      expect(conflictEval.errors.some((e) => e.code === 'HYBRID_ROUTE_DECOUPLED_CONFLICT')).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('hard-blocks mode: "shortcode" forms and root-layout <WpShortcode> in decoupled mode unless delegated', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-manifest-forms-'));
    try {
      scaffoldNextProject(tmp);
      mkdirSync(path.join(tmp, 'src', 'app', 'booking'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'booking', 'page.tsx'),
        `import { WpShortcode, useWpOption } from '@forgewp/react';
export default function Booking() {
  return <WpShortcode code={useWpOption('form_booking_shortcode', '[em_booking]')} />;
}\n`,
      );

      const forms = {
        booking: { mode: 'shortcode', shortcode: '[em_booking]' },
      };

      // Without hybridRoutes -> hard error
      const m1 = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'nextjs', forms },
      });
      const e1 = evaluateTargetCompatibility(m1, 'decoupled');
      expect(e1.compatible).toBe(false);
      expect(m1.routes['/booking'].shortcodeForms).toContain('booking');

      // With hybridRoutes: ['/booking'] -> passes
      const m2 = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'nextjs', forms, hybridRoutes: ['/booking'] },
      });
      const e2 = evaluateTargetCompatibility(m2, 'decoupled');
      expect(e2.compatible).toBe(true);

      // Undeclared-route shortcode form -> still hard error
      const m3 = buildRouteCapabilityManifest(tmp, {
        config: {
          frameworkAdapter: 'nextjs',
          forms: {
            booking: { mode: 'shortcode', shortcode: '[em_booking]' },
            orphan: { mode: 'shortcode', shortcode: '[wpforms id="9"]' },
          },
          hybridRoutes: ['/booking'],
        },
      });
      const e3 = evaluateTargetCompatibility(m3, 'decoupled');
      expect(e3.compatible).toBe(false);
      expect(e3.errors.some((err) => err.code === 'SHORTCODE_FORM_NATIVE_PINNED' && err.form === 'orphan')).toBe(true);

      // Root layout <WpShortcode> -> hard error in both decoupled and hybrid
      writeFileSync(
        path.join(tmp, 'src', 'app', 'layout.tsx'),
        `import { WpShortcode } from '@forgewp/react';\nexport default function Layout({ children }: any) { return <html><body><WpShortcode code="[global_banner]" />{children}</body></html>; }\n`,
      );
      const m4 = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'nextjs', hybridRoutes: ['/booking'] },
      });
      expect(evaluateTargetCompatibility(m4, 'decoupled').errors.some((e) => e.code === 'SHORTCODE_LAYOUT_NATIVE_PINNED')).toBe(true);
      expect(evaluateTargetCompatibility(m4, 'hybrid').errors.some((e) => e.code === 'SHORTCODE_LAYOUT_NATIVE_PINNED')).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('surfaces Vite React CSR decoupled trade-off warning while enforcing shortcode blocking', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-manifest-vite-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'pages'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'pages', 'Home.tsx'),
        `export default function Home() { return <main>Home</main>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'pages', 'Events.tsx'),
        `import { WpShortcode } from '@forgewp/react';\nexport default function Events() { return <WpShortcode code="[events_list]" />; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'routes.tsx'),
        `import Home from './pages/Home';
import Events from './pages/Events';
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events" element={<Events />} />
    </Routes>
  );
}\n`,
      );

      const mBlocked = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'react' },
      });
      const evalBlocked = evaluateTargetCompatibility(mBlocked, 'decoupled');
      expect(evalBlocked.compatible).toBe(false);
      expect(evalBlocked.errors.some((e) => e.code === 'SHORTCODE_NATIVE_PINNED' && e.route === '/events')).toBe(true);
      expect(evalBlocked.warnings.some((w) => w.code === 'VITE_DECOUPLED_CSR_TRADEOFF')).toBe(true);

      const mHybrid = buildRouteCapabilityManifest(tmp, {
        config: { frameworkAdapter: 'react', hybridRoutes: ['/events'] },
      });
      const evalHybrid = evaluateTargetCompatibility(mHybrid, 'decoupled');
      expect(evalHybrid.compatible).toBe(true);
      expect(evalHybrid.warnings.some((w) => w.code === 'VITE_DECOUPLED_CSR_TRADEOFF')).toBe(true);

      const outPath = writeRouteCapabilityManifest(tmp, mHybrid);
      expect(existsSync(outPath)).toBe(true);
      const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
      expect(parsed.routes['/events'].hybrid).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('runs forgewp doctor CLI with --target native|decoupled|hybrid, --json, and --write-manifest', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-doctor-cli-'));
    try {
      scaffoldNextProject(tmp);
      mkdirSync(path.join(tmp, 'src', 'app', 'contact'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'api', 'health'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'contact', 'page.tsx'),
        `import { WpShortcode } from '@forgewp/react';\nexport default function Contact() { return <WpShortcode code="[contact-form-7 id='1']" />; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'api', 'health', 'route.ts'),
        `export async function GET() { return new Response('ok'); }\n`,
      );

      // 1. --target native --json -> fails on route handler
      const nativeRun = spawnSync(
        process.execPath,
        [doctorBin, '--target', 'native', '--json'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(nativeRun.status).toBe(1);
      const nativeJson = JSON.parse(nativeRun.stdout);
      expect(nativeJson.ok).toBe(false);
      expect(nativeJson.compatible).toBe(false);
      expect(nativeJson.target).toBe('native');
      expect(nativeJson.targetCompatibility.errors.some((e) => e.code === 'NEXT_NATIVE_ROUTE_HANDLER')).toBe(true);

      // 2. --target decoupled --json (without hybridRoutes) -> fails on <WpShortcode>
      const decoupledFail = spawnSync(
        process.execPath,
        [doctorBin, '--target=decoupled', '--json'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(decoupledFail.status).toBe(1);
      const decoupledFailJson = JSON.parse(decoupledFail.stdout);
      expect(decoupledFailJson.ok).toBe(false);
      expect(decoupledFailJson.compatible).toBe(false);
      expect(decoupledFailJson.targetCompatibility.errors.some((e) => e.code === 'SHORTCODE_NATIVE_PINNED')).toBe(true);
      expect(decoupledFailJson.targetCompatibility.suggestedHybridRoutes).toEqual(['/contact']);

      // 3. Add hybridRoutes: ['/contact'] -> both --target decoupled and --target hybrid pass & write manifest
      scaffoldNextProject(tmp, { hybridRoutes: ['/contact'] });
      const hybridPass = spawnSync(
        process.execPath,
        [doctorBin, '--target', 'hybrid', '--json', '--write-manifest'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(hybridPass.status, hybridPass.stdout + hybridPass.stderr).toBe(0);
      const hybridJson = JSON.parse(hybridPass.stdout);
      expect(hybridJson.ok).toBe(true);
      expect(hybridJson.compatible).toBe(true);
      expect(hybridJson.manifestPath).toBe('.forgewp/forgewp-manifest.json');
      expect(existsSync(path.join(tmp, '.forgewp', 'forgewp-manifest.json'))).toBe(true);

      const decoupledPass = spawnSync(
        process.execPath,
        [doctorBin, '--target', 'decoupled', '--json'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(decoupledPass.status, decoupledPass.stdout + decoupledPass.stderr).toBe(0);
      expect(JSON.parse(decoupledPass.stdout).compatible).toBe(true);

      // 4. Invalid --target value returns clean JSON error + exit 1
      const invalidRun = spawnSync(
        process.execPath,
        [doctorBin, '--target', 'serverless', '--json'],
        { cwd: tmp, encoding: 'utf8' },
      );
      expect(invalidRun.status).toBe(1);
      const invalidJson = JSON.parse(invalidRun.stdout);
      expect(invalidJson.ok).toBe(false);
      expect(invalidJson.error).toContain('Invalid --target');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
