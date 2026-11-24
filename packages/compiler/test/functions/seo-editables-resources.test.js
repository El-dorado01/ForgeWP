/**
 * R4 / R5 PHP (resource-contracts.md §13, §14): head parsing, robots,
 * frontend-origin rewriting (page URLs only, never media), path validation,
 * and editables normalization per field type. Executes the generated PHP.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSeoResourcePhp } from '../../lib/functions/seo-resource.js';
import { buildEditablesResourcePhp, compactEditableSchemas } from '../../lib/functions/editables-resource.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;

const STUBS = `<?php
function add_action(...$a) {} function add_filter(...$a) {} function apply_filters($n, $v) { return $n === 'forgewp_editables_image_source' ? forgewp_resolve_image_source($v) : $v; }
function wp_strip_all_tags($s) { return strip_tags((string) $s); }
function forgewp_frontend_origins() { return $GLOBALS['frontend']; }
function forgewp_origin_of($u) { $p = parse_url($u); return $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : ''); }
function forgewp_raw_home_url() { return 'https://wp.example.com/'; }
function wp_get_upload_dir() { return array('baseurl' => 'https://wp.example.com/wp-content/uploads'); }
function wpautop($s) { return '<p>' . str_replace("\\n\\n", "</p>\\n<p>", trim($s)) . "</p>\\n"; }
function wp_kses_post($s) { return preg_replace('#<script.*?</script>#s', '', (string) $s); }
function get_post_type($id) { return $id == 88 ? 'attachment' : 'post'; }
function wp_get_attachment_image_src($id, $size) { return array('https://wp.example.com/wp-content/uploads/a.jpg', 1600, 900); }
function wp_get_attachment_image_srcset($id, $size) { return ''; }
function get_post_meta($id, $k, $single) { return $k === '_wp_attachment_image_alt' ? 'Alt text' : ''; }
function forgewp_resolve_image_source($v) { return strpos($v, '/assets/') === 0 ? 'https://wp.example.com/wp-content/themes/t' . $v : $v; }
$GLOBALS['frontend'] = array();
`;

function php(body, script) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-r4r5-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `${STUBS}${body}\n${script}`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const HEAD = `<title>Contact &amp; More — Site</title>
<meta name="description" content="Talk to us &quot;today&quot;">
<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="https://wp.example.com/en/contact/">
<meta property="og:title" content="OG title">
<meta property="og:image" content="https://wp.example.com/wp-content/uploads/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@site">
<link rel="alternate" hreflang="de" href="https://wp.example.com/kontakt/">
<link rel="alternate" hreflang="x-default" href="https://wp.example.com/kontakt/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":"https://wp.example.com/en/contact/","url":"https://wp.example.com/en/contact/","image":{"@type":"ImageObject","url":"https://wp.example.com/wp-content/uploads/og.jpg"}}]}</script>`;

describe('seo resource PHP', () => {
  it.skipIf(!hasPhp)('parses head tags into the contract pieces', () => {
    const r = php(buildSeoResourcePhp(), `$h = forgewp_seo_parse_head(${JSON.stringify(HEAD)}); echo json_encode(array('head' => $h, 'robots' => forgewp_seo_robots($h['robots'])));`);
    expect(r.head.title).toBe('Contact & More — Site');
    expect(r.head.description).toBe('Talk to us "today"');
    expect(r.head.canonical).toBe('https://wp.example.com/en/contact/');
    expect(r.head.ogImages).toEqual([{ url: 'https://wp.example.com/wp-content/uploads/og.jpg', width: 1200, height: 630 }]);
    expect(r.head.languages).toEqual({ de: 'https://wp.example.com/kontakt/', 'x-default': 'https://wp.example.com/kontakt/' });
    expect(r.head.jsonLd[0]['@graph'][0]['@type']).toBe('WebPage');
    expect(r.robots).toEqual({ index: false, follow: true, maxSnippet: -1, maxImagePreview: 'large', maxVideoPreview: -1 });
  });

  it.skipIf(!hasPhp)('moves page URLs to FORGEWP_FRONTEND_ORIGIN, never media', () => {
    const r = php(buildSeoResourcePhp(), `$GLOBALS['frontend'] = array('https://example.com');
$h = forgewp_seo_parse_head(${JSON.stringify(HEAD)});
echo json_encode(array('canonical' => forgewp_seo_rewrite_url($h['canonical']), 'media' => forgewp_seo_rewrite_url($h['ogImages'][0]['url']), 'ld' => forgewp_seo_rewrite_json_ld($h['jsonLd'][0])));`);
    expect(r.canonical).toBe('https://example.com/en/contact/');
    expect(r.media).toBe('https://wp.example.com/wp-content/uploads/og.jpg');
    expect(r.ld['@graph'][0]['@id']).toBe('https://example.com/en/contact/');
    expect(r.ld['@graph'][0].image.url).toBe('https://wp.example.com/wp-content/uploads/og.jpg');
  });

  it.skipIf(!hasPhp)('rewrites every page URL in structured data, including arrays and search targets, never lookalike domains', () => {
    const ld = {
      '@graph': [{
        '@type': 'WebSite',
        potentialAction: [{ '@type': 'SearchAction', target: ['https://wp.example.com/?s={search_term_string}'] }],
        sameAs: ['https://wp.example.com/about/', 'https://twitter.com/site'],
        logo: 'https://wp.example.com/wp-content/uploads/logo.png',
        decoy: 'https://wp.example.com.evil.test/x',
        name: 'Plain text stays',
      }],
    };
    const r = php(buildSeoResourcePhp(), `$GLOBALS['frontend'] = array('https://example.com');
echo json_encode(forgewp_seo_rewrite_json_ld(json_decode(${JSON.stringify(JSON.stringify(ld))}, true)));`);
    const node = r['@graph'][0];
    expect(node.potentialAction[0].target[0]).toBe('https://example.com/?s={search_term_string}');
    expect(node.sameAs).toEqual(['https://example.com/about/', 'https://twitter.com/site']);
    expect(node.logo).toBe('https://wp.example.com/wp-content/uploads/logo.png');
    expect(node.decoy).toBe('https://wp.example.com.evil.test/x');
    expect(node.name).toBe('Plain text stays');
  });

  it.skipIf(!hasPhp)('accepts only site-relative paths', () => {
    const r = php(buildSeoResourcePhp(), `echo json_encode(array_map('forgewp_seo_norm_path', array('/', '/en/contact', '/a/?x=1#y', 'https://evil.test/', '//evil.test/x', '/a/../b', 'javascript:alert(1)', '')));`);
    expect(r).toEqual(['/', '/en/contact/', '/a/', null, null, null, null, null]);
  });
});

describe('editables resource PHP', () => {
  const schemas = {
    about: {
      tagline: { type: 'text', label: 'Tagline', default: 'Default tagline' },
      intro: { type: 'richText', default: 'Default intro' },
      founded: { type: 'number', default: 2021 },
      hiring: { type: 'boolean', default: true },
      hero: { type: 'image', default: '/assets/hero.jpg' },
      secret: { type: 'text', private: true, default: 'never' },
      team: { type: 'repeater', fields: { name: { type: 'text', default: '' }, photo: { type: 'image' } }, default: [{ name: 'Default' }] },
    },
  };

  it('compacts schemas to what PHP needs and drops unsafe keys', () => {
    const compact = compactEditableSchemas({ about: { ...schemas.about, 'bad key': { type: 'text' } } });
    expect(compact.about.tagline).toEqual({ type: 'text', default: 'Default tagline' });
    expect(compact.about['bad key']).toBeUndefined();
    expect(compact.about.secret.private).toBe(true);
  });

  it.skipIf(!hasPhp)('normalizes each field type, with schema defaults for empty values', () => {
    const r = php(buildEditablesResourcePhp(schemas), `$s = forgewp_editable_schemas()['about'];
$v = function ($k, $raw) use ($s) { return forgewp_editables_value($s[$k], $raw); };
echo json_encode(array(
  'text' => $v('tagline', 'Stored'), 'textEmpty' => $v('tagline', ''),
  'rich' => $v('intro', "One\\n\\nTwo<script>x()</script>"), 'richEmpty' => $v('intro', null),
  'num' => $v('founded', '1999'), 'numBad' => $v('founded', 'abc'),
  'boolFalse' => $v('hiring', '0'), 'boolMissing' => $v('hiring', false),
  'imageId' => $v('hero', 88), 'imageDefault' => $v('hero', ''),
  'repeater' => $v('team', array(array('name' => 'Ada', 'photo' => 88))), 'repeaterEmpty' => $v('team', ''),
));`);
    expect(r.text).toBe('Stored');
    expect(r.textEmpty).toBe('Default tagline');
    expect(r.rich).toBe('<p>One</p>\n<p>Two</p>\n');
    expect(r.richEmpty).toBe('Default intro');
    expect(r.num).toBe(1999);
    expect(r.numBad).toBe(2021);
    expect(r.boolFalse).toBe(false);
    expect(r.boolMissing).toBe(true);
    expect(r.imageId).toEqual({ id: 88, url: 'https://wp.example.com/wp-content/uploads/a.jpg', alt: 'Alt text', width: 1600, height: 900 });
    expect(r.imageDefault).toEqual({ id: 0, url: 'https://wp.example.com/wp-content/themes/t/assets/hero.jpg', alt: '' });
    expect(r.repeater).toEqual([{ name: 'Ada', photo: { id: 88, url: 'https://wp.example.com/wp-content/uploads/a.jpg', alt: 'Alt text', width: 1600, height: 900 } }]);
    expect(r.repeaterEmpty).toEqual([{ name: 'Default', photo: null }]);
  });
});

describe('editables routeId lookup by language', () => {
  const lookup = (polylang, lang) =>
    php(buildEditablesResourcePhp({}), `${polylang ? `function pll_get_post_language($id) { return array(26 => 'de', 74 => 'en', 90 => 'fr')[$id] ?? ''; }
function pll_get_post($id, $lang) { return array('en' => 74, 'de' => 26, 'fr' => 90)[$lang] ?? 0; }` : ''}
function get_posts($args) { return $args['meta_value'] === 'front-page' ? array(26, 90) : array(); }
function has_filter($n) { return false; }
echo json_encode(array(forgewp_editables_route_post_id('front-page', ${JSON.stringify(lang)}), forgewp_editables_route_post_id('nope', ${JSON.stringify(lang)})));`);

  it.skipIf(!hasPhp)('picks the page tagged in the requested language', () => {
    expect(lookup(true, 'fr')).toEqual([90, 0]);
  });
  it.skipIf(!hasPhp)('follows the translation when only another language carries the route id', () => {
    expect(lookup(true, 'en')).toEqual([74, 0]);
  });
  it.skipIf(!hasPhp)('uses the first tagged page on single-language sites', () => {
    expect(lookup(false, '')).toEqual([26, 0]);
  });
});

describe('native SEO head capture', () => {
  // Runs the real add_action() wiring: wp_head with an optional nested buffer
  // opened by another plugin/theme at priority 1 and closed at PHP_INT_MAX
  // (registered after ours, like a theme file), then body output, then wp_footer.
  const capture = (nested) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-headcap-'));
    try {
      const f = path.join(dir, 'run.php');
      writeFileSync(f, `<?php
$actions = array();
function add_action($hook, $cb, $prio = 10) { global $actions; $actions[$hook][$prio][] = $cb; }
function add_filter(...$a) {} function apply_filters($n, $v) { return $v; }
function do_action($hook) { global $actions; if (empty($actions[$hook])) return; ksort($actions[$hook]); foreach ($actions[$hook] as $cbs) { foreach ($cbs as $cb) { $cb(); } } }
function is_admin() { return false; } function is_feed() { return false; } function wp_doing_ajax() { return false; }
function is_front_page() { return false; } function is_home() { return false; } function is_singular() { return false; } function is_category() { return false; } function is_tag() { return false; } function is_tax() { return false; } function is_post_type_archive() { return false; } function get_queried_object() { return null; }
${buildSeoResourcePhp()}
${nested ? "add_action('wp_head', function () { ob_start(); }, 1); add_action('wp_head', function () { $h = ob_get_clean(); echo $h . '<meta name=\"description\" content=\"from theme\">'; }, PHP_INT_MAX);" : ''}
add_action('wp_head', function () { echo '<title>Kontakt</title>'; }, 1);
ob_start();
echo '<html><head>';
do_action('wp_head');
echo '</head><body><script type="application/ld+json">{"body":true}</script>';
do_action('wp_footer');
echo '</body></html>';
$page = ob_get_clean();
echo json_encode(array('head' => $GLOBALS['forgewp_seo_head_html'] ?? null, 'level' => ob_get_level(), 'page' => $page));`);
      const out = spawnSync('php', [f], { encoding: 'utf8' });
      expect(out.status, out.stderr + out.stdout).toBe(0);
      return JSON.parse(out.stdout);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it.skipIf(!hasPhp)('captures the head when no other buffer is open', () => {
    const r = capture(false);
    expect(r.head).toBe('<title>Kontakt</title>');
    expect(r.page).toBe('<html><head><title>Kontakt</title></head><body><script type="application/ld+json">{"body":true}</script></body></html>');
    expect(r.level).toBe(0);
  });

  it.skipIf(!hasPhp)('still captures when a theme buffer closes after ours, without body content or changed output', () => {
    const r = capture(true);
    expect(r.head).toContain('<title>Kontakt</title>');
    expect(r.head).toContain('content="from theme"');
    expect(r.head).not.toContain('body');
    expect(r.page).toBe('<html><head><title>Kontakt</title><meta name="description" content="from theme"></head><body><script type="application/ld+json">{"body":true}</script></body></html>');
    expect(r.level).toBe(0);
  });
});

describe('SEO loopback head', () => {
  const loop = (script) =>
    php(buildSeoResourcePhp(), `$GLOBALS['t'] = array(); $GLOBALS['calls'] = array();
const MINUTE_IN_SECONDS = 60;
function wp_parse_url($u) { return parse_url($u); }
function get_transient($k) { return $GLOBALS['t'][$k] ?? false; }
function set_transient($k, $v, $e) { $GLOBALS['t'][$k] = $v; }
class WP_Error {} function is_wp_error($v) { return $v instanceof WP_Error; }
function wp_remote_get($url, $args) { $GLOBALS['calls'][] = $url; return $GLOBALS['reply']; }
function wp_remote_retrieve_response_code($r) { return $r['code']; }
function wp_remote_retrieve_body($r) { return $r['body']; }
${script}`);

  it.skipIf(!hasPhp)('returns only the head of this site\'s own page', () => {
    const r = loop(`$GLOBALS['reply'] = array('code' => 200, 'body' => '<html lang="en"><head class="x"><title>T</title></head><body><script type="application/ld+json">{}</script></body></html>');
echo json_encode(array(forgewp_seo_loopback_head('https://wp.example.com/contact/'), $GLOBALS['calls']));`);
    expect(r).toEqual(['<title>T</title>', ['https://wp.example.com/contact/']]);
  });

  it.skipIf(!hasPhp)('never fetches another host', () => {
    const r = loop(`$GLOBALS['reply'] = array('code' => 200, 'body' => '<head>x</head>');
echo json_encode(array(forgewp_seo_loopback_head('https://evil.test/'), forgewp_seo_loopback_head('https://wp.example.com.evil.test/'), $GLOBALS['calls']));`);
    expect(r).toEqual(['', '', []]);
  });

  it.skipIf(!hasPhp)('remembers a failing loopback and stops trying', () => {
    const r = loop(`$GLOBALS['reply'] = new WP_Error();
echo json_encode(array(forgewp_seo_loopback_head('https://wp.example.com/a/'), forgewp_seo_loopback_head('https://wp.example.com/b/'), count($GLOBALS['calls']), (bool) get_transient('forgewp_seo_loopback_down')));`);
    expect(r).toEqual(['', '', 1, true]);
  });

  it.skipIf(!hasPhp)('ignores non-200 pages without marking the loopback as down', () => {
    const r = loop(`$GLOBALS['reply'] = array('code' => 404, 'body' => '<head>x</head>');
echo json_encode(array(forgewp_seo_loopback_head('https://wp.example.com/a/'), (bool) get_transient('forgewp_seo_loopback_down')));`);
    expect(r).toEqual(['', false]);
  });
});

