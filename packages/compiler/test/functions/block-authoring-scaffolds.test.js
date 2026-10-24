import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pc from 'picocolors';
import ts from 'typescript';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { onMakeShell } from '../../lib/react-adapter.js';
import { compileBlocks } from '../../lib/blocks/index.js';
import { parseDefineBlock } from '../../lib/blocks/scanner.js';

const compiler = fileURLToPath(new URL('../../', import.meta.url));
let root;
const run = (command, args = []) => spawnSync(process.execPath, [path.join(compiler, 'bin', command), ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-authoring-')); });
afterEach(() => {
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('forgewp-authoring-')) throw new Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
describe('block authoring CLI and generated source', () => {
  it.each(['cli.js', 'make-block.js', 'make-shell.js'])('%s help works outside a theme without prompting or writing', (command) => {
    const result = run(command, ['--help']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Choose an authoring path');
    expect(result.stdout).toContain('BlockArea');
    expect(result.stdout).toContain('Generators write source files');
    expect(fs.readdirSync(root)).toEqual([]);
  });
  it('scaffolds two independent children and a shell, and compiles PHP/metadata/editor settings', () => {
    fs.mkdirSync(path.join(root, 'src'));
    for (const name of ['IntroCard', 'DetailCard']) {
      const result = run('make-block.js', [name, '--attributes=title,description']);
      expect(result.status, result.stderr).toBe(0);
      const file = path.join(root, 'src/blocks', `${name}.tsx`);
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('BlockArea.previewBlocks');
      const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      expect(parsed.parseDiagnostics).toEqual([]);
    }
    const shell = run('make-shell.js', ['CardRow', '--children=intro-card,detail-card', '--layout=2-col', '--yes']);
    expect(shell.status, shell.stderr).toBe(0);
    const reactRoot = path.resolve(compiler, '../react');
    const program = ts.createProgram(['IntroCard', 'DetailCard', 'CardRow'].map((name) => path.join(root, 'src/blocks', `${name}.tsx`)), {
      noEmit: true, strict: true, skipLibCheck: true,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      baseUrl: compiler, types: [], paths: {
        '@forgewp/react': [path.join(reactRoot, 'src/index.ts')],
        react: [path.join(reactRoot, 'node_modules/@types/react/index.d.ts')],
        'react/*': [path.join(reactRoot, 'node_modules/@types/react/*')],
      },
    });
    expect(ts.getPreEmitDiagnostics(program).map((error) => `${error.file?.fileName}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`)).toEqual([]);
    const out = path.join(root, 'out');
    fs.mkdirSync(out);
    const settings = compileBlocks(root, out);
    for (const name of ['intro-card', 'detail-card', 'card-row']) {
      const metadata = JSON.parse(fs.readFileSync(path.join(out, 'blocks', name, 'block.json'), 'utf8'));
      expect(metadata.name).toBe(`forgewp/${name}`);
      expect(metadata.parent).toBeUndefined();
      expect(spawnSync('php', ['-l', path.join(out, 'blocks', name, 'render.php')], { encoding: 'utf8' }).status).toBe(0);
    }
    const shellPhp = fs.readFileSync(path.join(out, 'blocks/card-row/render.php'), 'utf8');
    expect(shellPhp).toContain('echo $content');
    expect(shellPhp).toContain('forgewp-block-shell__grid');
    const shellSettings = settings.find((block) => block.name === 'forgewp/card-row');
    expect(shellSettings.innerBlocks.allowedBlocks).toEqual(['forgewp/intro-card', 'forgewp/detail-card']);
    expect(shellSettings.innerBlocks.template).toEqual([['forgewp/intro-card', {}], ['forgewp/detail-card', {}]]);
    expect(settings.find((block) => block.name === 'forgewp/intro-card').attributes.title.type).toBe('string');
  }, 40000);
  it.each(['title,title', 'cta-label', 'title:string', '__proto__'])('rejects unusable attributes before creating source: %s', (attributes) => {
    fs.mkdirSync(path.join(root, 'src'));
    const result = run('make-block.js', ['PromoCard', `--attributes=${attributes}`]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Attribute names');
    expect(fs.existsSync(path.join(root, 'src/blocks/PromoCard.tsx'))).toBe(false);
  });
  it('preserves explicit shell starter attributes when generating source', () => {
    onMakeShell(root, {
      pascalCase: 'CardRow', nameSlug: 'card-row', readableTitle: 'Card Row', pc,
      innerBlocks: { allowedBlocks: ['intro-card'], template: [['intro-card', { title: 'First card', enabled: false, count: 0 }]] },
    });
    const source = fs.readFileSync(path.join(root, 'src/blocks/CardRow.tsx'), 'utf8');
    expect(parseDefineBlock(source, 'card-row').innerBlocks.template).toEqual([
      ['intro-card', { title: 'First card', enabled: false, count: 0 }],
    ]);
  });
  it('keeps existing source unchanged when a scaffold already exists', () => {
    fs.mkdirSync(path.join(root, 'src'));
    const first = run('make-block.js', ['PromoCard']);
    expect(first.status, first.stderr).toBe(0);
    const file = path.join(root, 'src/blocks/PromoCard.tsx');
    const before = fs.readFileSync(file, 'utf8');
    expect(run('make-block.js', ['PromoCard']).status).toBe(1);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });
});
