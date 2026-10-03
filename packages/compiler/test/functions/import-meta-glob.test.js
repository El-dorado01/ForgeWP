/**
 * import.meta.glob is a Vite API. The SSR loader rewrites it to a require
 * map. The options object is often written with a trailing comma, and the
 * rewrite must stop there instead of consuming the rest of the module.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { load } from '../../lib/asset-loader.js';

const temps = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('SSR loader import.meta.glob', () => {
  it('stops at a trailing comma and leaves the rest of the module intact', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'forgewp-glob-'));
    temps.push(root);
    const appDir = path.join(root, 'src', 'app');
    mkdirSync(path.join(appDir, 'layouts'), { recursive: true });
    writeFileSync(
      path.join(appDir, 'layouts', 'default.tsx'),
      'export default function DefaultLayout({ children }) { return children; }\n',
    );
    const routesPath = path.join(appDir, 'routes.tsx');
    writeFileSync(
      routesPath,
      `
import { Route } from '@forgewp/react';
const layoutModules = import.meta.glob<Record<string, any>>(
  './layouts/*.{tsx,jsx,ts,js}',
  { eager: true },
);
export default function AppRoutes() {
  return (
    <Route path="/" component={() => null} />
  );
}
`,
    );

    const loaded = await load(pathToFileURL(routesPath).href, {}, async () => {
      throw new Error('defaultLoad should not run');
    });

    expect(loaded.source).toContain('await import(');
    expect(loaded.source).toContain('layouts/default.tsx');
    expect(loaded.source).not.toContain('__forgewp_require');
    expect(loaded.source).toContain('function AppRoutes');
    expect(loaded.source).toContain('path: "/"');
    expect(loaded.source).not.toMatch(/^\/\s*>/m);
  });
});
