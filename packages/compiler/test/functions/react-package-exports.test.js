import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const react = path.join(packages, 'react');
const consumer = path.join(packages, 'starter');

it('preserves both package entry points for runtime and TypeScript consumers', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(react, 'package.json'), 'utf8'));
  const require = createRequire(path.join(consumer, 'package.json'));
  for (const [subpath, source] of [['', 'index.ts'], ['/config', 'config.ts']]) {
    const conditions = pkg.exports[subpath ? './config' : '.'];
    expect(Object.keys(conditions)[0]).toBe('types');
    for (const condition of ['types', 'import', 'require', 'default']) expect(conditions[condition]).toBe(`./src/${source}`);
    expect(require.resolve(`@forgewp/react${subpath}`)).toBe(path.join(react, 'src', source));
    for (const moduleResolution of [ts.ModuleResolutionKind.NodeNext, ts.ModuleResolutionKind.Bundler]) {
      const resolved = ts.resolveModuleName(`@forgewp/react${subpath}`, path.join(consumer, 'consumer.ts'), { moduleResolution, module: ts.ModuleKind.ESNext }, ts.sys);
      expect(resolved.resolvedModule?.resolvedFileName).toBe(path.join(react, 'src', source).replaceAll('\\', '/'));
    }
  }
});

it('bundles BlockArea and config helpers for the browser without export-condition warnings', async () => {
  const viteRequire = createRequire(fs.realpathSync(path.join(consumer, 'node_modules/vite/package.json')));
  const { build } = viteRequire('esbuild');
  const result = await build({
    stdin: { contents: `export { BlockArea, definePageConfig } from '@forgewp/react'; export { definePageConfig as configHelper } from '@forgewp/react/config';`, resolveDir: consumer, loader: 'ts' },
    bundle: true, platform: 'browser', format: 'esm', write: false, logLevel: 'silent', metafile: true,
  });
  expect(result.warnings).toEqual([]);
  const inputs = Object.keys(result.metafile.inputs).map((file) => file.replaceAll('\\', '/'));
  expect(inputs.some((file) => file.endsWith('react/src/index.ts'))).toBe(true);
  expect(inputs.some((file) => file.endsWith('react/src/config.ts'))).toBe(true);
  expect(result.outputFiles[0].text).toContain('BlockArea');
});
