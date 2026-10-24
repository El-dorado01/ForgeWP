import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { generateTheme } from '../lib/generate-theme.js';
import { loadConfig } from '../lib/load-config.js';

// Run with the chosen Node runtime. Everything written belongs to this fixture.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-node-smoke-'));
try {
  const compilerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const cli = spawnSync(process.execPath, [path.join(compilerRoot, 'bin/cli.js'), '--help'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /make:mail/);
  fs.mkdirSync(path.join(root, 'dist/assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/assets/main.js'), 'console.log("fixture");');
  fs.writeFileSync(path.join(root, 'dist/assets/app.css'), 'body { color: black; }');
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(root, 'wp.config.ts'), `export default {configVersion:1,name:'Runtime Fixture',slug:'runtime-fixture',version:'1.0.0',description:'Node runtime smoke fixture',textDomain:'runtime-fixture'};`);
  const config = await loadConfig(root);
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).webp().toBuffer();
  assert.ok(image.length > 0);
  const outDir = path.join(root, 'output');
  await generateTheme({ themeRoot: root, outDir, config, appHtml: '<main><h1>Runtime fixture</h1></main>', assets: { cssFile: 'assets/app.css', jsFile: 'assets/main.js' } });
  for (const file of ['style.css', 'functions.php', 'index.php', 'front-page.php']) assert.ok(fs.existsSync(path.join(outDir, file)), file);
  assert.match(fs.readFileSync(path.join(outDir, 'forgewp-static/content.html'), 'utf8'), /Runtime fixture/);
  console.log(`Node ${process.versions.node}: CLI, config loading, Sharp and theme generation passed.`);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
