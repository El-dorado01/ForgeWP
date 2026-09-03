import { describe, it, expect } from 'vitest';
import {
  synthesizeNamedExportsFromDefault,
  sourceLooksLikeEsm,
} from '../../lib/asset-loader.js';

describe('synthesizeNamedExportsFromDefault (Vite-compatible SSR interop)', () => {
  it('adds a named export for `export { Foo as default }` (gsap/ScrollTrigger)', () => {
    const source = 'var ScrollTrigger = function() {};\nexport { ScrollTrigger as default };\n';
    const patched = synthesizeNamedExportsFromDefault(source);
    expect(patched).toContain('export { ScrollTrigger as default }');
    expect(patched).toContain('export { ScrollTrigger };');
  });

  it('handles minified `export{Foo as default}`', () => {
    const patched = synthesizeNamedExportsFromDefault('export{Flip as default}');
    expect(patched).toContain('export { Flip };');
  });

  it('adds a named export for `export default Foo`', () => {
    const patched = synthesizeNamedExportsFromDefault(
      'const Plugin = {};\nexport default Plugin;\n',
    );
    expect(patched).toContain('export { Plugin };');
  });

  it('does not duplicate an existing named export', () => {
    const source =
      'function Observer() {}\nexport { Observer as default, Observer };\n';
    expect(synthesizeNamedExportsFromDefault(source)).toBeNull();
  });

  it('re-exports a default function declaration as a named export', () => {
    const patched = synthesizeNamedExportsFromDefault(
      'export default function Widget() {}\n',
    );
    expect(patched).toContain('export { Widget };');
  });

  it('does not duplicate an already-named local export', () => {
    const source = 'const Plugin = {};\nexport { Plugin, Plugin as default };\n';
    expect(synthesizeNamedExportsFromDefault(source)).toBeNull();
  });

  it('returns null when there is no default identifier to re-export', () => {
    expect(synthesizeNamedExportsFromDefault('export default {};')).toBeNull();
    expect(synthesizeNamedExportsFromDefault('export const x = 1;')).toBeNull();
  });

  it('detects ESM source that tsx would otherwise collapse to default-only', () => {
    expect(sourceLooksLikeEsm('import { Observer } from "./Observer.js";\nexport { ScrollTrigger as default };\n')).toBe(true);
    expect(sourceLooksLikeEsm('module.exports = require("./dist/gsap.js");\n')).toBe(false);
  });
});
