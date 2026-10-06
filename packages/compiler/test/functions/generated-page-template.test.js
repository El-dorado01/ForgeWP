import { describe, expect, it } from 'vitest';
import { buildGeneratedPageTemplateContentPhp } from '../../lib/php-builders.js';

describe('buildGeneratedPageTemplateContentPhp()', () => {
  it('uses the Builder canvas when selected and retains the generated layout otherwise', () => {
    const php = buildGeneratedPageTemplateContentPhp(
      'forgewp-static/template-checkout-single-license.html',
    );

    expect(php).toContain(
      "get_page_template_slug(get_the_ID()) === 'template-forgewp-builder.php'",
    );
    expect(php).toContain('echo \'<main class="forgewp-builder-canvas">\';');
    expect(php).toContain('the_content();');
    expect(php).toContain(
      "get_template_directory() . '/forgewp-static/template-checkout-single-license.html'",
    );
    expect(php.indexOf("'template-forgewp-builder.php'")).toBeLessThan(
      php.indexOf('template-checkout-single-license.html'),
    );
  });
});
