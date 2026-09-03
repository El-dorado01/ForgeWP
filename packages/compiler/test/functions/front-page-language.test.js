/**
 * Regression coverage for the confirmed live bug: on a Polylang site, the
 * front page's "ForgeWP Builder" template switch (set per-language, since
 * each language's homepage is a separate WP post) was being detected by
 * reading get_option('page_on_front') directly — a single, raw post ID with
 * no guarantee of reflecting the language actually being viewed. Switching
 * the English homepage's template had no effect while viewing /en/; the
 * page silently fell back to the static baked-in markup (compile-time
 * defaults) instead of the dynamic Builder canvas.
 *
 * Three call sites shared this bug and are covered here:
 *  - buildIndexPhp() (front-page.php / index.php): "am I on the front page,
 *    and what's ITS OWN template" — fixed to use get_queried_object_id(),
 *    WordPress's own resolution of what's actually being displayed.
 *  - processMarkup()'s postId="front" token (a value sourced from the front
 *    page while viewing a DIFFERENT page) and the hydration-enqueuer's
 *    equivalent payload — both fixed to go through the new
 *    forgewp_resolve_front_page_id(), which explicitly resolves the raw
 *    page_on_front anchor to its Polylang translation for the current
 *    language, mirroring forgewp_resolve_route_page_id()'s established
 *    pattern for named routes.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildIndexPhp } from '../../lib/php-builders.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('buildIndexPhp — front page template detection is language-aware', () => {
  const php = buildIndexPhp();

  it('resolves the currently-displayed post via get_queried_object_id(), not by reading the raw page_on_front option', () => {
    expect(php).toContain('$front_id = get_queried_object_id();');
    // Only an explanatory comment may still mention the option by name —
    // no line may actually assign $front_id from it.
    expect(php).not.toMatch(/\$front_id\s*=\s*\(int\)\s*get_option\(\s*'page_on_front'\s*\)/);
  });

  it('still gates the Builder canvas on that post\'s own template slug', () => {
    expect(php).toContain('get_page_template_slug($front_id)');
    expect(php).toContain("$tpl === 'template-forgewp-builder.php'");
  });
});

describe('forgewp_resolve_front_page_id()', () => {
  const ASSETS = { cssFile: 'assets/app.css', jsFile: 'assets/main.js' };
  const config = {
    name: 'Test Theme',
    slug: 'testtheme',
    version: '1.0.0',
    description: 'test',
    textDomain: 'testtheme',
    i18n: { locales: ['en', 'de'], defaultLocale: 'en' },
  };
  const php = buildFunctionsPhp(config, ASSETS, [], process.cwd(), [], {}, { mapping: {}, mainJsFile: 'assets/main.js' }, [], {}, [], []);

  it('is defined, anchored on page_on_front, and resolved to the current language via pll_get_post', () => {
    const fnStart = php.indexOf('function forgewp_resolve_front_page_id()');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = php.slice(fnStart, fnStart + 800);
    expect(fnBody).toContain("get_option('page_on_front')");
    expect(fnBody).toContain('pll_get_post($anchor_id, $current_lang)');
  });
});

describe('markup-processor.js — the "_POST_front_" meta token resolves through the language-aware helper', () => {
  // Source-text check rather than a processMarkup() round-trip: the
  // __FORGEWP_META_key_POST_front_DEFAULT_val__ token's regex has a
  // pre-existing (unrelated to this fix) greedy-matching quirk where the
  // optional _POST_(front|[0-9]+) group is never actually reachable — group
  // 1's [a-zA-Z0-9_-]+ always swallows it first, for front AND numeric IDs
  // alike, since skipping the optional group still yields a valid overall
  // match. No encoder in this codebase currently emits this token shape
  // either (grepped), so it isn't exercisable end-to-end today regardless
  // of this fix — noted as a separate, pre-existing latent issue, out of
  // scope here. What matters for THIS fix is that both call sites in the
  // replace callbacks emit the language-aware helper instead of the raw
  // option, which is a direct source-text guarantee.
  const src = readFileSync(path.join(__dirname, '../../lib/markup-processor.js'), 'utf8');

  it('both postId==="front" branches emit forgewp_resolve_front_page_id(), not the raw page_on_front option', () => {
    const matches = [...src.matchAll(/postId\.toLowerCase\(\)\s*===\s*'front'\)\s*\?\s*'([^']+)'/g)];
    expect(matches.length).toBe(2);
    for (const m of matches) {
      expect(m[1]).toBe('forgewp_resolve_front_page_id()');
    }
    expect(src).not.toContain("get_option('page_on_front')");
  });
});
