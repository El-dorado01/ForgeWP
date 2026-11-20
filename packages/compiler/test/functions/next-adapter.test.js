import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import { validateCriticalFiles } from '../../lib/validate.js';
import * as reactAdapter from '../../lib/react-adapter.js';
import * as nextAdapter from '../../lib/next-adapter.js';
import { diagnoseNextNativeCompatibility } from '../../lib/next-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');
const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const requireLiveFixture = process.env.FORGEWP_REQUIRE_NEXT_FIXTURE === '1';

describe('Next.js adapter contract, adapter-aware preflight, and native compatibility diagnostics', () => {
  it('routes validateCriticalFiles through adapter.getCriticalFiles without requiring Vite files for custom/Next adapters', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-adapter-preflight-'));
    try {
      // A Next.js project has NO index.html, src/main.tsx, or src/app/routes.tsx.
      const nextApp = path.join(tmp, 'next-app');
      mkdirSync(path.join(nextApp, 'src', 'app'), { recursive: true });
      writeFileSync(path.join(nextApp, 'package.json'), '{"name":"demo-next"}');
      writeFileSync(path.join(nextApp, 'next.config.ts'), 'export default {};');
      writeFileSync(path.join(nextApp, 'src', 'app', 'layout.tsx'), 'export default () => null;');

      expect(() => validateCriticalFiles(nextApp, { adapter: nextAdapter })).not.toThrow();
      // Must NOT restore Vite blueprints into the Next.js project.
      expect(existsSync(path.join(nextApp, 'cms', 'menus.json'))).toBe(false);
      expect(existsSync(path.join(nextApp, 'src', 'lib', 'wordpress.tsx'))).toBe(false);

      // Missing layout throws actionable error for the adapter's declared file.
      rmSync(path.join(nextApp, 'src', 'app', 'layout.tsx'));
      expect(() => validateCriticalFiles(nextApp, { adapter: nextAdapter })).toThrow(
        /src\/app\/layout\.tsx/,
      );

      // React/Vite preflight stays unchanged and still requires index.html / routes.tsx.
      const reactApp = path.join(tmp, 'react-app');
      mkdirSync(path.join(reactApp, 'src', 'app'), { recursive: true });
      writeFileSync(path.join(reactApp, 'wp.config.ts'), 'export default {};');
      writeFileSync(path.join(reactApp, 'package.json'), '{"name":"demo-react"}');
      expect(() => validateCriticalFiles(reactApp, { adapter: reactAdapter })).toThrow(
        /index\.html/,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('reports actionable diagnostics for unsupported native Next.js features (dynamic routes, middleware, route handlers, Server Actions, next/headers, ISR)', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-diag-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'blog', '[slug]'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'api', 'hello'), { recursive: true });
      writeFileSync(path.join(tmp, 'src', 'middleware.ts'), 'export function middleware() {}');
      writeFileSync(
        path.join(tmp, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
        'export default function Post() { return null; }',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'api', 'hello', 'route.ts'),
        'export async function GET() { return new Response("ok"); }',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'actions.ts'),
        "'use server';\nexport async function saveForm() {}\n",
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'page.tsx'),
        `import { cookies } from 'next/headers';\nexport const revalidate = 60;\nexport default function Home() { cookies(); return null; }\n`,
      );

      const report = diagnoseNextNativeCompatibility(tmp);
      expect(report.ok).toBe(false);
      const errorCodes = report.errors.map((e) => e.code);
      expect(errorCodes).toContain('NEXT_NATIVE_MIDDLEWARE');
      expect(errorCodes).toContain('NEXT_NATIVE_DYNAMIC_ROUTE');
      expect(errorCodes).toContain('NEXT_NATIVE_ROUTE_HANDLER');
      expect(errorCodes).toContain('NEXT_NATIVE_SERVER_ACTION');
      expect(errorCodes).toContain('NEXT_NATIVE_DYNAMIC_RUNTIME_API');
      expect(report.warnings.map((w) => w.code)).toContain('NEXT_NATIVE_ISR_REVALIDATE');

      // Attempting native build asset read or render fails loudly with structured codes.
      await expect(nextAdapter.readBuildAssets(tmp)).rejects.toThrow(/NEXT_NATIVE_MIDDLEWARE/);
      await expect(nextAdapter.renderStaticMarkup(tmp)).rejects.toThrow(/NEXT_NATIVE_SERVER_ACTION/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it.skipIf(!existsSync(fixtureOutIndex) && !requireLiveFixture)(
    'runs the real exportTheme() pipeline end-to-end with next-adapter on projects/nextjs-adapter-fixture without mutating app source',
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-export-theme-'));
      try {
        const fixtureCopy = path.join(tmp, 'fixture');
        cpSync(nextFixtureRoot, fixtureCopy, {
          recursive: true,
          filter: (src) => {
            const base = path.basename(src);
            return base !== 'node_modules' && base !== '.next' && base !== '.forgewp';
          },
        });

        // Clean fixed-route fixture passes native compatibility diagnostics.
        const diag = diagnoseNextNativeCompatibility(fixtureCopy);
        expect(diag.ok).toBe(true);
        expect(diag.errors).toEqual([]);

        const result = await exportTheme({
          themeRoot: fixtureCopy,
          adapter: nextAdapter,
          config: {
            name: 'ForgeWP Next Adapter Theme',
            slug: 'forgewp-next-adapter-theme',
            textDomain: 'forgewp-next-adapter-theme',
            version: '1.0.0',
            description: 'Exported through real exportTheme() with next-adapter',
          },
          skipBuild: true,
          validate: true,
          strict: true,
          zip: true,
        });

        expect(result.zipPath && existsSync(result.zipPath)).toBe(true);
        expect(statSync(result.zipPath).size).toBeGreaterThan(1000);
        expect(existsSync(path.join(result.outDir, 'page-about.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'blocks', 'next-intro', 'block.json'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'blocks', 'next-intro', 'render.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, result.assets.cssFile))).toBe(true);

        // App source stayed clean: no Vite blueprints or generated block wrappers injected.
        expect(existsSync(path.join(fixtureCopy, 'src', 'blocks', 'generated'))).toBe(false);
        expect(existsSync(path.join(fixtureCopy, 'src', 'lib', 'wordpress.tsx'))).toBe(false);
        expect(existsSync(path.join(fixtureCopy, 'cms', 'menus.json'))).toBe(false);

        const contentHtml = readFileSync(
          path.join(result.outDir, 'forgewp-static', 'content.html'),
          'utf8',
        );
        expect(contentHtml).toContain("forgewp_resolve_route_url('about', '/about/', 'from=home', 'details')");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
  );
});
