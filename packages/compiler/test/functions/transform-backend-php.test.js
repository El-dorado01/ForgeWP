/**
 * R8: config.plugins[].transformBackendPhp changes the backend half (the
 * Companion Plugin and the theme's embedded copy); transformFunctionsPhp keeps
 * changing only the theme half.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { generateTheme } from '../../lib/generate-theme.js';
import { loadConfig } from '../../lib/load-config.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;

async function exportWith(plugins, serverPluginPhp) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-r8-'));
  fs.mkdirSync(path.join(root, 'dist/assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/assets/main.js'), 'console.log("r8");');
  fs.writeFileSync(path.join(root, 'dist/assets/app.css'), 'body{}');
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(
    path.join(root, 'wp.config.ts'),
    `export default {configVersion:1,name:'R8 Fixture',slug:'r8-fixture',version:'1.2.3',description:'R8',textDomain:'r8-fixture'};`,
  );
  if (serverPluginPhp) {
    fs.mkdirSync(path.join(root, 'src/server/plugin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/server/plugin/own.php'), serverPluginPhp);
  }
  const config = { ...(await loadConfig(root)), plugins };
  const outDir = path.join(root, 'out', 'r8-fixture');
  await generateTheme({ themeRoot: root, outDir, config, appHtml: '<main>R8</main>', assets: { cssFile: 'assets/app.css', jsFile: 'assets/main.js' } });
  const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
  return {
    root,
    functionsPhp: read(outDir, 'functions.php'),
    embedded: read(outDir, 'companion', 'backend.php'),
    plugin: read(root, 'out', 'r8-fixture-companion', 'includes', 'backend.php'),
    files: [path.join(outDir, 'functions.php'), path.join(outDir, 'companion', 'backend.php'), path.join(root, 'out', 'r8-fixture-companion', 'includes', 'backend.php')],
  };
}

describe('transformBackendPhp (R8)', () => {
  it('adds code to the Companion Plugin and the embedded copy, not to functions.php', async () => {
    const seen = {};
    const out = await exportWith(
      [
        {
          name: 'r8-test',
          transformBackendPhp(php, config, themeRoot, { fs: f, path: p }) {
            seen.args = { slug: config.slug, root: typeof themeRoot, fs: typeof f.existsSync, path: typeof p.join, sawOwn: php.includes('forgewp_r8_own_marker') };
            return php + "\nadd_action('init', function () { do_action('forgewp_r8_backend_marker'); });\n";
          },
          transformFunctionsPhp(php) {
            return php + "\nadd_action('wp_head', function () { do_action('forgewp_r8_theme_marker'); });\n";
          },
        },
      ],
      "<?php\nfunction forgewp_r8_own_marker() {}\n",
    );
    try {
      expect(seen.args).toEqual({ slug: 'r8-fixture', root: 'string', fs: 'function', path: 'function', sawOwn: true });
      for (const backend of [out.embedded, out.plugin]) {
        expect(backend).toContain('forgewp_r8_backend_marker');
        expect(backend).not.toContain('forgewp_r8_theme_marker');
      }
      expect(out.functionsPhp).toContain('forgewp_r8_theme_marker');
      expect(out.functionsPhp).not.toContain('forgewp_r8_backend_marker');
      if (hasPhp) {
        for (const f of out.files) {
          const lint = spawnSync('php', ['-l', f], { encoding: 'utf8' });
          expect(lint.status, lint.stdout + lint.stderr).toBe(0);
        }
      }
    } finally {
      fs.rmSync(out.root, { recursive: true, force: true });
    }
  });

  it('runs plugins in order, each one getting the previous result', async () => {
    const out = await exportWith([
      { name: 'a', transformBackendPhp: (php) => php + '\n// r8-first\n' },
      { name: 'b', transformBackendPhp: (php) => php.replace('// r8-first', '// r8-first // r8-second') },
    ]);
    try {
      expect(out.plugin).toContain('// r8-first // r8-second');
    } finally {
      fs.rmSync(out.root, { recursive: true, force: true });
    }
  });

  it('fails the export with a clear message when a plugin forgets to return the PHP', async () => {
    await expect(exportWith([{ name: 'broken-plugin', transformBackendPhp: () => undefined }])).rejects.toThrow(
      /broken-plugin.*transformBackendPhp must return the PHP as a string/,
    );
  });
});
