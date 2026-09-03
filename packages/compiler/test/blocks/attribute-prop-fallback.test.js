/**
 * Regression coverage for a confirmed live bug: dual-host block components
 * (e.g. HeroSection.tsx) read a block attribute via a renamed destructured
 * parameter — `{ title: titleProp }`, fed in from the compiled editor's
 * `<HeroSection {...props.attributes} />` — then fall back to a page-level
 * meta value when unset: `const title = titleProp ?? titleMeta;`.
 *
 * `titleProp` itself never appears in blockAttrKeys (only `title` does), so
 * translateJsExpressionToPhp's bare-identifier pass had no way to connect
 * the two — it fell through to the generic case and emitted `($titleProp ??
 * null)`, a PHP variable that's never actually assigned anywhere, so it's
 * always null. The block's own attribute value (edited and saved in the
 * block editor) was silently discarded on every page render, permanently
 * falling back to the *Meta (useWpMeta / ACF) value instead — confirmed
 * live: editing a block attribute persisted correctly (visible on editor
 * reload) but never appeared on the front end, for every block using this
 * pattern (16 components in hotelchecker24 alone).
 */
import { describe, it, expect } from 'vitest';
import { translateJsExpressionToPhp } from '../../lib/blocks/php-transpiler.js';

describe('translateJsExpressionToPhp — "XProp" resolves to $attributes[\'X\']', () => {
  it('a bare "titleProp" identifier resolves to $attributes[\'title\'], not an unassigned $titleProp', () => {
    const result = translateJsExpressionToPhp('titleProp ?? titleMeta', ['title'], new Set(['titleMeta']));
    expect(result).toBe("($attributes['title'] ?? null) ?? ($titleMeta ?? null)");
  });

  it('does not fire when the stripped name isn\'t actually a declared block attribute', () => {
    // "startupProp" strips to "startup", which isn't a real attribute here —
    // must fall through to the ordinary bare-identifier ($var ?? null) case,
    // not be silently misinterpreted as $attributes['startup'].
    const result = translateJsExpressionToPhp('startupProp ?? fallback', ['title'], new Set(['fallback']));
    expect(result).toBe('($startupProp ?? null) ?? ($fallback ?? null)');
  });

  it('does not override an identifier that is itself already a real localVar (e.g. a genuine loop var happening to end in "Prop")', () => {
    const result = translateJsExpressionToPhp('cardProp.name', ['card'], new Set(['cardProp']));
    expect(result).toBe("$cardProp['name']");
  });

  it('property access on a resolved XProp attribute produces $attributes[\'X\'][\'key\'], guarded against a missing intermediate key', () => {
    const result = translateJsExpressionToPhp('mediaProp.url', ['media'], new Set());
    expect(result).toBe("($attributes['media']['url'] ?? null)");
  });
});
