import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAdapterAssets } from '../../lib/adapter-build.js';

describe('existing Vite adapter compatibility', () => {
  it.each(['react', 'html'])('runs the project build script for %s', async (adapter) => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-adapter-build-'));
    try {
      writeFileSync(path.join(root, 'package.json'), JSON.stringify({
        private: true,
        scripts: { build: 'node build.cjs' },
      }));
      writeFileSync(path.join(root, 'build.cjs'), `
        const fs = require('node:fs');
        fs.mkdirSync('dist/.vite', { recursive: true });
        fs.writeFileSync('dist/.vite/manifest.json', JSON.stringify({
          'index.html': { isEntry: true, file: 'assets/built.js', css: ['assets/built.css'] }
        }));
      `);
      expect(await buildAdapterAssets(root, adapter, { packageManager: 'npm' })).toEqual({
        cssFile: 'assets/built.css', jsFile: 'assets/built.js',
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(['react', 'html'])('reads both supported manifest locations for %s', async (adapter) => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-adapter-build-'));
    try {
      const manifestDir = path.join(root, 'dist', '.vite');
      mkdirSync(manifestDir, { recursive: true });
      const manifest = JSON.stringify({ 'index.html': { isEntry: true, file: 'assets/main.js', css: ['assets/main.css'] } });
      for (const manifestPath of [path.join(manifestDir, 'manifest.json'), path.join(root, 'dist', 'manifest.json')]) {
        writeFileSync(manifestPath, manifest);
        expect(await buildAdapterAssets(root, adapter, { skipBuild: true })).toEqual({ cssFile: 'assets/main.css', jsFile: 'assets/main.js' });
        rmSync(manifestPath);
      }
      await expect(buildAdapterAssets(root, adapter, { skipBuild: true })).rejects.toThrow('Build manifest not found');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
