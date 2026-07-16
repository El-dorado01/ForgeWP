/**
 * Tier 1 — already-golden fixtures, promoted directly from scratch/ scripts
 * that already carried known expected output. Baseline against the current
 * regex/string-scanning engine (packages/compiler/lib/blocks/*.js).
 *
 * Source: scratch/verify_transpile.js, scratch/test-strip-types.mjs
 */
import { describe, it, expect } from 'vitest';
import {
  transpileTernaries,
  transpileLoops,
  transpileConditionals,
  translateJsExpressionToPhp,
} from '../../lib/blocks/php-transpiler.js';
import { stripTypeScriptSyntax, rewriteAttrRefsSafely } from '../../lib/blocks/source-sanitize.js';

describe('php-transpiler: nested ternaries + loops + conditionals', () => {
  it('transpiles a nested ternary containing a loop into if/elseif/else PHP', () => {
    const input = `{listiclesLoading ? (
  <div className="loading">Loading...</div>
) : matchingListicles.length > 0 ? (
  <div className="list">
    {matchingListicles.map((l) => (
      <div key={l.id}>{l.title}</div>
    ))}
  </div>
) : (
  <div className="empty">No listicles found.</div>
)}`;

    let phpMarkup = input;
    phpMarkup = transpileLoops(phpMarkup);
    phpMarkup = transpileConditionals(phpMarkup, ['listiclesLoading', 'matchingListicles']);
    phpMarkup = transpileTernaries(phpMarkup, ['listiclesLoading', 'matchingListicles']);

    // Current engine nests the second condition as an `if` inside the first
    // `else` rather than flattening to `elseif` — captured as the Phase 1
    // baseline, not the flattened shape the original scratch comment assumed.
    expect(phpMarkup).toContain('<?php if');
    expect(phpMarkup).toContain('<?php else');
    expect(phpMarkup).toContain('<?php endif');
    expect((phpMarkup.match(/<\?php if/g) || []).length).toBe(2);
    expect((phpMarkup.match(/<\?php endif/g) || []).length).toBe(2);
    expect(phpMarkup).toContain('foreach');
    // className→class is a later PHP-markup pass, not part of these three steps.
    expect(phpMarkup).toContain('className="loading"');
    expect(phpMarkup).toContain('className="list"');
    expect(phpMarkup).toContain('className="empty"');
  });

  it('translates JSON.parse(x || fallback) to json_decode reading the block attribute', () => {
    const input = "JSON.parse(rawSomething || '{}')";
    const out = translateJsExpressionToPhp(input, ['rawSomething']);

    expect(out).toContain('json_decode');
    expect(out).not.toContain('$JSON');
    expect(out).toBe("json_decode(($attributes['rawSomething'] ?? null) ?: '{}', true)");
  });
});

describe('source-sanitize: stripTypeScriptSyntax', () => {
  it('leaves a destructured-and-renamed map callback untouched', () => {
    const input = `.map(({ icon: Icon, label, value }) => (`;
    const out = stripTypeScriptSyntax(input);
    expect(out.replace(/\s+/g, ' ').trim()).toBe(input.replace(/\s+/g, ' ').trim());
  });

  it('strips a union-typed parameter with a default value and stays parseable', () => {
    const input = `const editText = (value: string, key: keyof Props, className: string, tagName: 'span' | 'p' | 'h2' | 'h3' | 'div' = 'span') =>`;
    const out = stripTypeScriptSyntax(input);
    expect(() => new Function(out + ' {}')).not.toThrow();
  });

  it('strips simple parameter type annotations', () => {
    const input = `(value: string, n?: number) => value`;
    const out = stripTypeScriptSyntax(input);
    expect(out.replace(/\s+/g, ' ').trim()).toBe('(value, n) => value');
  });
});

describe('source-sanitize: rewriteAttrRefsSafely', () => {
  it('rewrites a bare identifier read but not the same name inside a string literal', () => {
    const input = `const authority = useDual(authorityProp, 'authority');\nconst x = authority;`;
    const out = rewriteAttrRefsSafely(input, ['authority']);

    expect(out).not.toContain("'attributes.authority'");
    expect(out).toContain('attributes.authority');
  });
});
