/**
 * Regression coverage for the confirmed §7.3 finding in edge-case-audit.md:
 * a JS template literal (backtick string with `${}` interpolation) used to
 * pass straight through translateJsExpressionToPhp's pipeline untouched,
 * producing a PHP backtick (the shell-exec operator, not a string literal) —
 * syntactically valid but semantically wrong PHP with no visible error.
 *
 * Cases below are taken directly from the real, confirmed-live instances:
 * HotelListicles.tsx's href fallback, and HotelsWorkspace.tsx's conditional
 * filter-pill class attribute.
 */
import { describe, it, expect } from 'vitest';
import { translateTemplateLiteral, translateJsExpressionToPhp } from '../../lib/blocks/php-transpiler.js';

describe('translateTemplateLiteral', () => {
  it('converts a plain template literal with no interpolation to a PHP string literal', () => {
    expect(translateTemplateLiteral('`no interpolation here`')).toBe("'no interpolation here'");
  });

  it('converts literal text + one interpolation to PHP concatenation, leaving the interpolated JS untranslated for later passes', () => {
    expect(translateTemplateLiteral('`/hotelvergleich/${l.id}`')).toBe("'/hotelvergleich/' . (l.id)");
  });

  it('handles an interpolation containing a ternary without breaking on its internal braces/quotes', () => {
    expect(translateTemplateLiteral('`filter-pill ${active ? \'active\' : \'\'}`')).toBe(
      "'filter-pill ' . (active ? 'active' : '')",
    );
  });

  it('handles multiple interpolations', () => {
    expect(translateTemplateLiteral('`a${x}b${y}c`')).toBe("'a' . (x) . 'b' . (y) . 'c'");
  });

  it('escapes single quotes in literal text segments', () => {
    expect(translateTemplateLiteral("`it's a test with ${value}`")).toBe("'it\\'s a test with ' . (value)");
  });

  it('leaves non-template-literal text (single/double-quoted strings) untouched', () => {
    expect(translateTemplateLiteral("'plain string' + \"another\"")).toBe("'plain string' + \"another\"");
  });

  it('leaves an unterminated backtick untouched rather than mangling it', () => {
    const input = '`unterminated';
    expect(translateTemplateLiteral(input)).toBe(input);
  });
});

describe('translateJsExpressionToPhp — template literals end-to-end', () => {
  it('translates HotelListicles.tsx\'s href fallback pattern into valid PHP string concatenation, not a shell-exec backtick', () => {
    const result = translateJsExpressionToPhp("l.permalink || `/hotelvergleich/${l.id}`", [], new Set(['l']));
    expect(result).not.toContain('`');
    expect(result).toBe("$l['permalink'] ?: '/hotelvergleich/' . ($l['id'])");
  });

  it('translates HotelsWorkspace.tsx\'s conditional filter-pill className pattern into valid PHP, not a shell-exec backtick', () => {
    const result = translateJsExpressionToPhp(
      "`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${country === c.slug ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`",
      [],
      new Set(['country', 'c']),
    );
    expect(result).not.toContain('`');
    expect(result).toContain("'bg-primary/10 text-primary'");
    expect(result).toContain("'text-slate-600 hover:bg-slate-50'");
    expect(result).toContain("$country");
    expect(result).toContain("$c['slug']");
  });
});
