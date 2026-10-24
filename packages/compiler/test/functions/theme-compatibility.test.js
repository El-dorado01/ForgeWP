import { describe, expect, it } from 'vitest';
import { buildStyleCss } from '../../lib/php-builders.js';
import { resolveThemeCompatibility } from '../../lib/theme-compatibility.js';

describe('generated compatibility headers', () => {
  it('uses the theme.json v3 minimum without claiming a tested release', () => {
    const css = buildStyleCss({ name: 'Example' });
    expect(css).toContain('Requires at least: 6.6\n');
    expect(css).toContain('Requires PHP: 7.4\n');
    expect(css).not.toContain('Tested up to:');
  });
  it('emits project requirements and the explicitly tested version', () => {
    const css = buildStyleCss({ compatibility: {
      requiresWordPress: '6.8', requiresPhp: '8.2', testedUpTo: '6.10',
    } });
    expect(css).toContain('Requires at least: 6.8\nTested up to: 6.10\nRequires PHP: 8.2\n');
  });
  it.each([
    null, [], '6.6', { unknown: '6.6' }, { requiresWordPress: '6.5' },
    { requiresPhp: '7.3' }, { requiresWordPress: 6.6 },
    { testedUpTo: '6.6\nInjected: value' }, { testedUpTo: '6.5' },
    { requiresPhp: undefined },
  ])('rejects invalid or contradictory metadata: %j', (compatibility) => {
    expect(() => resolveThemeCompatibility({ compatibility })).toThrow();
  });
});
