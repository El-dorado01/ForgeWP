import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as runtime from '../../lib/index.js';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const declaration = path.join(root, 'lib/index.d.ts');
const fixture = path.join(root, 'test/public-api-contract.ts');
const options = {
  noEmit: true,
  strict: true,
  skipLibCheck: false,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  types: ['node'],
};

describe('public compiler declarations', () => {
  it('declares exactly the value exports present at runtime', () => {
    const program = ts.createProgram([declaration], options);
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(
      program.getSourceFile(declaration)
    );
    const declared = checker
      .getExportsOfModule(symbol)
      .filter((item) => item.flags & ts.SymbolFlags.Value)
      .map((item) => item.name)
      .sort();
    expect(declared).toEqual(Object.keys(runtime).sort());
  });
  it('accepts valid API contracts and rejects invalid calls through package entry points', () => {
    const program = ts.createProgram([fixture], options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const messages = diagnostics.map(
      (item) =>
        `${item.file?.fileName || ''}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`
    );
    expect(messages).toEqual([]);
  });
  it('keeps both public declaration entry points connected to the same config contract', () => {
    const source = fs.readFileSync(
      path.join(root, 'define-config.d.ts'),
      'utf8'
    );
    expect(source).toContain(
      "export { defineConfig } from './lib/define-config.js'"
    );
    expect(
      fs.readFileSync(path.join(root, 'lib/define-config.d.ts'), 'utf8')
    ).toContain('./index.js');
  });
  it('checks the React settings subset and hooks under NodeNext', () => {
    const program = ts.createProgram([path.join(root, 'test/theme-settings-contract.ts')], {
      ...options,
    });
    expect(ts.getPreEmitDiagnostics(program).map((item) =>
      `${item.file?.fileName || ''}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`
    )).toEqual([]);
  });
});
