import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

vi.mock('../../lib/framework-adapter.js', () => ({
  loadFrameworkAdapter: async () => ({
    scanForHydrationIslands: () => ['counter'],
    packageAssets: async (_root, out) => {
      mkdirSync(path.join(out, 'client'), { recursive: true });
      writeFileSync(path.join(out, 'client', 'counter.js'), 'export default function Counter() {}');
      return {
        assetFiles: { 'src/hero.png': 'media/hero.png' },
        clientEntries: { counter: 'client/counter.js' },
        runtimeEntry: 'client/runtime.js',
      };
    },
  }),
}));
import { generateTheme } from '../../lib/generate-theme.js';

it('generates hydration from adapter mappings without a dist folder or Vite manifest', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-custom-packaging-'));
  try {
    mkdirSync(path.join(root, 'src'), { recursive: true });
    const out = path.join(root, 'output');
    await generateTheme({
      themeRoot: root, outDir: out,
      config: { name: 'Packaging fixture', slug: 'packaging-fixture', textDomain: 'packaging-fixture', version: '1.0.0' },
      appHtml: '<img src="__FORGEWP_ASSET__src/hero.png" />',
      assets: { cssFile: 'client/style.css', jsFile: 'client/runtime.js' },
    });
    const runtime = readFileSync(path.join(out, 'assets', 'forgewp-hydrator.js'), 'utf8');
    // Parse the emitted JavaScript, including template-literal escaping.
    expect(() => new vm.Script(runtime)).not.toThrow();
    const urls = [];
    const element = { parentElement: null, getAttribute: (name) => ({
      'data-forgewp-hydrate': 'counter', 'data-forgewp-preload': 'near-visible', 'data-forgewp-trigger': 'load',
    })[name] || null, hasAttribute: () => false };
    const context = {
      window: { addEventListener: () => {}, forgeWpHydration: { themeUri: '/wp-content/themes/demo', manifest: { counter: 'client/counter.js' } } },
      IntersectionObserver: class {
        constructor(callback) { this.callback = callback; }
        observe(target) { this.callback([{ isIntersecting: true, target }]); }
        unobserve() {}
      },
      document: {
        querySelectorAll: () => [element],
        querySelector: () => null,
        createElement: () => ({}),
        head: { appendChild: (link) => urls.push(link.href) },
        readyState: 'loading',
        addEventListener: () => {},
      },
      console,
    };
    vm.runInNewContext(runtime, context);
    expect(urls).toContain('/wp-content/themes/demo/client/counter.js');
    const php = readFileSync(path.join(out, 'functions.php'), 'utf8');
    expect(php).toContain("'/client/runtime.js'");
    expect(php).toContain("'/client/style.css'");
    expect(php).not.toContain('/assets/client/');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
