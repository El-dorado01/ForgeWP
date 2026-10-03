import { describe, it, expect } from 'vitest';
import { forgewpVirtualPlugin } from '../../lib/virtual-plugin.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('Virtual Runtime Compatibility', () => {
  it('does not resolve private legacy runtime aliases', () => {
    const plugin = forgewpVirtualPlugin();

    expect(plugin.resolveId('@/wordpress')).toBe(null);
    expect(plugin.resolveId('src/.forgewp/wordpress')).toBe(null);
    expect(plugin.resolveId('../.forgewp/wordpress')).toBe(null);
  });

  it('loads mock database into virtual:forgewp-runtime for dev mode', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-compat-'));
    const cmsDir = path.join(tmpDir, 'cms');
    fs.mkdirSync(cmsDir, { recursive: true });

    fs.writeFileSync(
      path.join(cmsDir, 'mock-data.json'),
      JSON.stringify({ posts: [{ id: 1, title: 'Hello World' }] }),
      'utf8',
    );

    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });
    const virtualId = 'virtual:forgewp-runtime';
    const resolved = plugin.resolveId(virtualId);
    expect(resolved).toBe('\0' + virtualId);

    const code = plugin.load('\0' + virtualId);
    expect(code).toContain("import rawMockData from '/cms/mock-data.json'");
    expect(code).toContain('window._forgeWpMockSiteSettings');
    expect(code).toContain('window._forgeWpMockPosts');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('gracefully handles projects without legacy src/.forgewp directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-clean-'));
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Ensure src/.forgewp does NOT exist
    expect(fs.existsSync(path.join(srcDir, '.forgewp'))).toBe(false);

    const plugin = forgewpVirtualPlugin({ projectRoot: tmpDir });
    const resolved = plugin.resolveId('virtual:forgewp-runtime');
    expect(resolved).toBe('\0virtual:forgewp-runtime');

    const code = plugin.load('\0virtual:forgewp-runtime');
    expect(code).toBeDefined();
    expect(code).toContain('window._forgeWpMockSiteSettings');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
