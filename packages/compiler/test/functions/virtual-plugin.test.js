import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { forgewpVirtualPlugin } from '../../lib/virtual-plugin.js';

describe('forgewpVirtualPlugin (Zero-Clutter Virtual Runtime)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-virtual-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test-theme',
        dependencies: {
          '@forgewp/react': 'workspace:*',
          '@forgewp/woocommerce': 'workspace:*',
        },
      })
    );
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('resolves virtual runtime ID and legacy aliases', () => {
    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });

    expect(plugin.resolveId('virtual:forgewp-runtime')).toBe('\0virtual:forgewp-runtime');
    expect(plugin.resolveId('@/wordpress')).toBe('\0virtual:forgewp-legacy-wordpress');
    expect(plugin.resolveId('src/.forgewp/wordpress')).toBe('\0virtual:forgewp-legacy-wordpress');
    expect(plugin.resolveId('../.forgewp/wordpress')).toBe('\0virtual:forgewp-legacy-wordpress');
    expect(plugin.resolveId('other-package')).toBe(null);
  });

  it('generates virtual runtime code referencing local cms/*.ts files', () => {
    fs.writeFileSync(path.join(tmpDir, 'cms', 'mock-data.ts'), 'export const mockData = { post: [{ id: 1, title: "Hello" }] };');
    fs.writeFileSync(path.join(tmpDir, 'cms', 'products.ts'), 'export const products = [{ id: 101, name: "Chair" }];');
    fs.writeFileSync(path.join(tmpDir, 'cms', 'menus.ts'), 'export const menus = { primary: [] };');

    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });
    const code = plugin.load('\0virtual:forgewp-runtime');

    expect(code).toContain("import * as rawMockData from '/cms/mock-data.ts';");
    expect(code).toContain("import * as rawProductsData from '/cms/products.ts';");
    expect(code).toContain("import * as rawMenusData from '/cms/menus.ts';");
    expect(code).toContain('window._forgeWpMockPosts');
    expect(code).toContain('window._forgeWpMockMenus');
  });

  it('generates legacy backwards-compatibility wrapper', () => {
    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });
    const code = plugin.load('\0virtual:forgewp-legacy-wordpress');

    expect(code).toContain("import 'virtual:forgewp-runtime';");
    expect(code).toContain("export * from '@forgewp/react';");
    expect(code).toContain("export * from '@forgewp/woocommerce';");
  });

  it('automatically injects virtual runtime into application entry file via transform hook', () => {
    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });
    const rawCode = `import * as React from 'react';\nconsole.log('App started');`;
    const result = plugin.transform(rawCode, `${tmpDir}/src/main.tsx`);

    expect(result).not.toBeNull();
    expect(result.code).toBe(`import 'virtual:forgewp-runtime';\n` + rawCode);
  });
});
