/**
 * The link reset is unlayered and printed after wp_head(), so it beats
 * Tailwind's `@layer` utilities. A `text-decoration` shorthand resets
 * text-decoration-color to currentColor and turns `.decoration-*` lines
 * the same color as the text. Only the line may be forced.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildHeaderPhp,
  buildIndexPhp,
  LINK_RESET_CSS,
} from '../../lib/php-builders.js';

const generateThemeSrc = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../lib/generate-theme.js',
  ),
  'utf8',
);

describe('link underline reset', () => {
  it('sets text-decoration-line only, so decoration color survives', () => {
    expect(LINK_RESET_CSS).toContain('text-decoration-line: none');
    expect(LINK_RESET_CSS).toContain(
      'text-decoration-line: underline !important',
    );
    expect(LINK_RESET_CSS).not.toMatch(/text-decoration:\s*(?:none|underline)/);
    expect(buildHeaderPhp({ textDomain: 'demo' })).toContain(LINK_RESET_CSS);
    expect(buildIndexPhp({ ownsShell: true })).toContain(
      'text-decoration-line: underline !important',
    );
    expect(generateThemeSrc).toContain('LINK_RESET_CSS');
    expect(generateThemeSrc).not.toMatch(
      /\.underline\s*\{\s*text-decoration:\s*underline/,
    );
  });
});
