import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameworkAdapter } from '../../lib/framework-adapter.js';

describe('adapter asset packaging', () => {
  it.each(['react', 'html'])('%s packages public files and resolves client entries', async (name) => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-packaging-'));
    try {
      const out = path.join(root, 'output');
      mkdirSync(path.join(root, 'dist', 'assets'), { recursive: true });
      mkdirSync(path.join(root, 'dist', '.vite'), { recursive: true });
      writeFileSync(path.join(root, 'dist', 'index.html'), 'excluded');
      writeFileSync(path.join(root, 'dist', 'robots.txt'), 'public');
      for (const file of ['main.js', 'counter.js', 'main.css']) {
        writeFileSync(path.join(root, 'dist', 'assets', file), file);
      }
      const manifest = {
        'index.html': { isEntry: true, file: 'assets/main.js' },
        counter: { isEntry: true, file: 'assets/counter.js' },
        'src/style.css': { file: 'assets/main.css' },
      };
      const adapter = await loadFrameworkAdapter(name);
      for (const manifestPath of [path.join(root, 'dist', '.vite', 'manifest.json'), path.join(root, 'dist', 'manifest.json')]) {
        writeFileSync(manifestPath, JSON.stringify(manifest));
        const result = await adapter.packageAssets(root, out, { islands: ['counter', 'missing'] });
        expect(result.runtimeEntry).toBe('assets/main.js');
        expect(result.clientEntries).toEqual({ counter: 'assets/counter.js' });
        expect(result.assetFiles['src/style.css']).toBe('assets/main.css');
        expect(readFileSync(path.join(out, 'robots.txt'), 'utf8')).toBe('public');
        expect(existsSync(path.join(out, 'index.html'))).toBe(false);
        expect(existsSync(path.join(out, '.vite'))).toBe(false);
        expect(existsSync(path.join(out, 'assets', 'counter.js'))).toBe(true);
        rmSync(manifestPath);
      }
      // Static themes keep CSS/public files but discard unused top-level JS.
      await adapter.packageAssets(root, out);
      expect(existsSync(path.join(out, 'assets', 'main.js'))).toBe(false);
      expect(existsSync(path.join(out, 'assets', 'main.css'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
