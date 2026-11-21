import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';
import { rewriteAttrRefsSafely } from '../../lib/blocks/source-sanitize.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { buildSeedMockDataPhp } from '../../lib/functions/seed-mock-data.js';
import { processMarkup } from '../../lib/markup-processor.js';

let tmpDir;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
  vi.restoreAllMocks();
});

describe('Compiler shared polish (Improvement Brief items)', () => {
  describe('1. Block editor callback shorthand syntax & local binding preservation', () => {
    it('rewriteAttrRefsSafely preserves callback-local bindings while rewriting unbound shorthand & spreads', () => {
      expect(
        rewriteAttrRefsSafely('(heading) => setAttributes({ heading })', ['heading']),
      ).toBe('(heading) => setAttributes({ heading })');

      expect(
        rewriteAttrRefsSafely('(value) => setAttributes({ heading: value })', ['heading']),
      ).toBe('(value) => setAttributes({ heading: value })');

      expect(
        rewriteAttrRefsSafely('() => setAttributes({ heading, items: [...items, "x"] })', [
          'heading',
          'items',
        ]),
      ).toBe('() => setAttributes({ heading: attributes.heading, items: [...attributes.items, "x"] })');

      expect(
        rewriteAttrRefsSafely(
          '<section><h1>{heading}</h1><RichText value={heading} onChange={(heading) => setAttributes({ heading })} /></section>',
          ['heading'],
        ),
      ).toBe(
        '<section><h1>{attributes.heading}</h1><RichText value={attributes.heading} onChange={(heading) => setAttributes({ heading })} /></section>',
      );
    });

    it('compiles both shorthand (heading) => setAttributes({ heading }) and explicit (value) => setAttributes({ heading: value }) without warnings', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-shorthand-cb-'));
      const themeRoot = path.join(tmpDir, 'theme');
      const outDir = path.join(tmpDir, 'out');
      const blocksDir = path.join(themeRoot, 'src', 'blocks');
      fs.mkdirSync(blocksDir, { recursive: true });
      fs.mkdirSync(outDir, { recursive: true });

      fs.writeFileSync(
        path.join(blocksDir, 'ShorthandHero.tsx'),
        `import { defineBlock, WpEditable } from '@forgewp/react';

function ShorthandHero({ heading = 'Hello', setAttributes }: any) {
  return (
    <section>
      <WpEditable tagName="h1" value={heading} onChange={(heading) => setAttributes({ heading })} />
    </section>
  );
}

export default defineBlock({
  name: 'shorthand-hero',
  title: 'Shorthand Hero',
  category: 'theme',
  attributes: { heading: { type: 'string', default: 'Hello' } },
  edit: ({ attributes, setAttributes }) => (
    <ShorthandHero heading={attributes.heading} setAttributes={setAttributes} />
  ),
  save: ({ attributes }) => <ShorthandHero heading={attributes.heading} />,
});
`,
        'utf8',
      );

      fs.writeFileSync(
        path.join(blocksDir, 'ExplicitHero.tsx'),
        `import { defineBlock, WpEditable } from '@forgewp/react';

function ExplicitHero({ heading = 'Hello', setAttributes }: any) {
  return (
    <section>
      <WpEditable tagName="h1" value={heading} onChange={(value) => setAttributes({ heading: value })} />
    </section>
  );
}

export default defineBlock({
  name: 'explicit-hero',
  title: 'Explicit Hero',
  category: 'theme',
  attributes: { heading: { type: 'string', default: 'Hello' } },
  edit: ({ attributes, setAttributes }) => (
    <ExplicitHero heading={attributes.heading} setAttributes={setAttributes} />
  ),
  save: ({ attributes }) => <ExplicitHero heading={attributes.heading} />,
});
`,
        'utf8',
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const compiledBlocks = compileBlocks(themeRoot, outDir, {});
      const blockNames = compiledBlocks.map((b) => b.name);
      expect(blockNames).toContain('forgewp/shorthand-hero');
      expect(blockNames).toContain('forgewp/explicit-hero');

      const parseWarnings = warnSpy.mock.calls
        .map((c) => c.join(' '))
        .filter((msg) => msg.includes('Failed to parse custom edit JSX'));
      expect(parseWarnings).toEqual([]);

      for (const slug of ['shorthand-hero', 'explicit-hero']) {
        const block = compiledBlocks.find((b) => b.name === `forgewp/${slug}`);
        expect(block, `missing compiled block forgewp/${slug}`).toBeTruthy();
        expect(block.customEditJsx, `missing customEditJsx for ${slug}`).toBeTruthy();

        const capturedRichText = [];
        const capturedCalls = [];
        const fakeCreateElement = (type, props, ...children) => {
          if (type === 'RichText') capturedRichText.push(props);
          return { type, props, children };
        };
        const fakeWp = { blockEditor: { RichText: 'RichText' } };
        const fn = new Function(
          'createElement',
          'wp',
          'attributes',
          'setAttributes',
          `return (${block.customEditJsx});`,
        );
        fn(fakeCreateElement, fakeWp, { heading: 'Initial' }, (patch) =>
          capturedCalls.push(patch),
        );

        expect(capturedRichText.length, `expected RichText in ${slug}`).toBeGreaterThan(0);
        expect(capturedRichText[0].value).toBe('Initial');
        expect(typeof capturedRichText[0].onChange).toBe('function');

        capturedRichText[0].onChange('Updated Title');
        expect(capturedCalls).toEqual([{ heading: 'Updated Title' }]);
      }
    });
  });

  describe('2. Subdirectory-safe useWpPageLink / __FORGEWP_PAGELINK_*__ fallback URLs', () => {
    it('normalizes root-relative fallbacks via home_url() on root and subdirectory installs while leaving external and hash URLs verbatim', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-pagelink-subdir-'));

      const functionsPhp = buildFunctionsPhp(
        {
          configVersion: 1,
          name: 'Subdir Test',
          slug: 'subdir-test',
          version: '1.0.0',
          description: 'Subdir fallback test',
          textDomain: 'subdir-test',
        },
        { cssFile: 'assets/index.css' },
      );

      // Extract forgewp_normalize_fallback_url and forgewp_resolve_page_link from generated functions.php
      const fnMatch = functionsPhp.match(
        /if \(!function_exists\('forgewp_normalize_fallback_url'\)\) \{[\s\S]*?function forgewp_resolve_page_link\(\$slug, \$fallback = ''\) \{[\s\S]*?\n\}/,
      );
      expect(fnMatch, 'expected forgewp_normalize_fallback_url + forgewp_resolve_page_link').toBeTruthy();

      const markupRoot = processMarkup(
        '<a href="__FORGEWP_PAGELINK_legal-page_DEFAULT_%2Flegal__">Legal</a>',
        'subdir-test',
      );
      const markupExt = processMarkup(
        '<a href="__FORGEWP_PAGELINK_docs-page_DEFAULT_https%3A%2F%2Fdocs.example.org%2Fguide__">Docs</a>',
        'subdir-test',
      );
      const markupMail = processMarkup(
        '<a href="__FORGEWP_PAGELINK_contact-page_DEFAULT_mailto%3Ahi%40example.com__">Mail</a>',
        'subdir-test',
      );
      const markupHash = processMarkup(
        '<a href="__FORGEWP_PAGELINK_pricing-page_DEFAULT_%23pricing__">Pricing</a>',
        'subdir-test',
      );

      const phpHarness = path.join(tmpDir, 'test-pagelink.php');
      fs.writeFileSync(
        phpHarness,
        `<?php
$GLOBALS['__base_url'] = 'https://example.com';
$GLOBALS['__route_pages'] = array('about-page' => 42);

function home_url($path = '') {
    return rtrim($GLOBALS['__base_url'], '/') . '/' . ltrim((string) $path, '/');
}
function get_permalink($id) {
    return rtrim($GLOBALS['__base_url'], '/') . '/resolved-' . intval($id) . '/';
}
function forgewp_resolve_route_page_id($slug) {
    return isset($GLOBALS['__route_pages'][$slug]) ? $GLOBALS['__route_pages'][$slug] : 0;
}
function esc_url($url) { return (string) $url; }

${fnMatch[0]}

function render_snippet($code) {
    ob_start();
    eval('?>' . $code);
    return ob_get_clean();
}

$results = array();

// Root install checks
$results['root_missing'] = forgewp_resolve_page_link('legal-page', '/legal');
$results['root_existing'] = forgewp_resolve_page_link('about-page', '/about');
$results['root_external'] = forgewp_resolve_page_link('docs-page', 'https://docs.example.org/guide');
$results['root_mailto'] = forgewp_resolve_page_link('contact-page', 'mailto:hi@example.com');
$results['root_proto_rel'] = forgewp_resolve_page_link('cdn-page', '//cdn.example.com/file');
$results['root_hash'] = forgewp_resolve_page_link('pricing-page', '#pricing');

// Subdirectory install checks (/blog)
$GLOBALS['__base_url'] = 'https://example.com/blog';
$results['subdir_missing'] = forgewp_resolve_page_link('legal-page', '/legal');
$results['subdir_existing'] = forgewp_resolve_page_link('about-page', '/about');
$results['subdir_external'] = forgewp_resolve_page_link('docs-page', 'https://docs.example.org/guide');
$results['subdir_mailto'] = forgewp_resolve_page_link('contact-page', 'mailto:hi@example.com');
$results['subdir_hash'] = forgewp_resolve_page_link('pricing-page', '#pricing');

// Markup processor token checks under subdirectory install
$results['markup_root'] = render_snippet(base64_decode('${Buffer.from(markupRoot).toString('base64')}'));
$results['markup_ext'] = render_snippet(base64_decode('${Buffer.from(markupExt).toString('base64')}'));
$results['markup_mail'] = render_snippet(base64_decode('${Buffer.from(markupMail).toString('base64')}'));
$results['markup_hash'] = render_snippet(base64_decode('${Buffer.from(markupHash).toString('base64')}'));

echo json_encode($results);
`,
        'utf8',
      );

      const run = spawnSync('php', [phpHarness], { encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      const out = JSON.parse(run.stdout);

      expect(out.root_missing).toBe('https://example.com/legal');
      expect(out.root_existing).toBe('https://example.com/resolved-42/');
      expect(out.root_external).toBe('https://docs.example.org/guide');
      expect(out.root_mailto).toBe('mailto:hi@example.com');
      expect(out.root_proto_rel).toBe('//cdn.example.com/file');
      expect(out.root_hash).toBe('#pricing');

      expect(out.subdir_missing).toBe('https://example.com/blog/legal');
      expect(out.subdir_existing).toBe('https://example.com/blog/resolved-42/');
      expect(out.subdir_external).toBe('https://docs.example.org/guide');
      expect(out.subdir_mailto).toBe('mailto:hi@example.com');
      expect(out.subdir_hash).toBe('#pricing');

      expect(out.markup_root).toContain('href="https://example.com/blog/legal"');
      expect(out.markup_ext).toContain('href="https://docs.example.org/guide"');
      expect(out.markup_mail).toContain('href="mailto:hi@example.com"');
      expect(out.markup_hash).toContain('href="#pricing"');
    });
  });

  describe('3. Auto-created template Pages vs cms/mock-data page seeding reconciliation', () => {
    it('updates auto-created template stub pages in place via forgewp_route_id, preserves _wp_page_template and forgewp_route_id, and avoids duplicates', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-page-seed-reconcile-'));
      fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });

      const mockData = {
        page: [
          {
            id: 1,
            slug: 'about',
            title: 'About Our Studio',
            content: '<p>Seeded studio story.</p>',
            customFields: { subtitle: 'Crafted in Berlin' },
          },
          {
            id: 2,
            slug: 'contact',
            title: 'Contact Default',
            content: '<p>Default contact copy.</p>',
          },
        ],
      };

      fs.writeFileSync(
        path.join(tmpDir, 'cms', 'mock-data.json'),
        JSON.stringify(mockData, null, 2),
        'utf8',
      );

      const oncePhp = buildSeedMockDataPhp(
        { textDomain: 'reconcile-theme', seed: { mockData: 'once', developmentOnly: false } },
        tmpDir,
      );
      const upsertPhp = buildSeedMockDataPhp(
        { textDomain: 'reconcile-theme', seed: { mockData: 'upsert', developmentOnly: false } },
        tmpDir,
      );

      const runSeederInPhp = (seederCode, label) => {
        const scriptPath = path.join(tmpDir, `run-${label}.php`);
        // Strip hook registrations at the bottom so we invoke forgewp_seed_mock_content() directly
        const fnOnly = seederCode.replace(/\/\/ Hook into theme activation[\s\S]*$/, '');
        fs.writeFileSync(
          scriptPath,
          `<?php
define('OBJECT', 'OBJECT');
define('ABSPATH', '/tmp/');
function media_sideload_image($file, $post_id = 0, $desc = null, $return = 'html') { return 0; }

$GLOBALS['__options'] = array();
$GLOBALS['__posts'] = array(
    10 => (object) array(
        'ID' => 10,
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_name' => 'about-us', // renamed in WP admin, still tracked via forgewp_route_id
        'post_title' => 'About',
        'post_content' => '',
    ),
    11 => (object) array(
        'ID' => 11,
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_name' => 'contact',
        'post_title' => 'Contact Us',
        'post_content' => '<p>User edited content</p>',
    ),
);
$GLOBALS['__meta'] = array(
    10 => array(
        '_wp_page_template' => 'page-about.php',
        'forgewp_route_id'  => 'about-page',
    ),
    11 => array(
        '_wp_page_template' => 'page-contact.php',
        'forgewp_route_id'  => 'contact-page',
    ),
);
$GLOBALS['__next_id'] = 100;

function get_option($key, $default = false) {
    return array_key_exists($key, $GLOBALS['__options']) ? $GLOBALS['__options'][$key] : $default;
}
function update_option($key, $val) { $GLOBALS['__options'][$key] = $val; }
function get_users($args = array()) { return array((object) array('ID' => 1)); }
function sanitize_text_field($s) { return trim((string) $s); }
function sanitize_title($s) { return strtolower(preg_replace('/[^a-zA-Z0-9_-]+/', '-', trim((string) $s))); }
function sanitize_key($s) { return strtolower(preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $s))); }
function wp_count_posts($type) {
    $count = 0;
    foreach ($GLOBALS['__posts'] as $p) {
        if ($p->post_type === $type && $p->post_status === 'publish') $count++;
    }
    return (object) array('publish' => $count);
}
function get_post($id) { return isset($GLOBALS['__posts'][$id]) ? $GLOBALS['__posts'][$id] : null; }
function get_page_by_path($slug, $output = OBJECT, $type = 'page') {
    foreach ($GLOBALS['__posts'] as $p) {
        if ($p->post_type === $type && $p->post_name === $slug) return $p;
    }
    return null;
}
function forgewp_resolve_route_page_id($route_id) {
    foreach ($GLOBALS['__meta'] as $pid => $meta) {
        if (isset($meta['forgewp_route_id']) && $meta['forgewp_route_id'] === $route_id) {
            return $pid;
        }
    }
    return 0;
}
function get_post_meta($id, $key, $single = false) {
    return isset($GLOBALS['__meta'][$id][$key]) ? $GLOBALS['__meta'][$id][$key] : '';
}
function update_post_meta($id, $key, $val) {
    if (!isset($GLOBALS['__meta'][$id])) $GLOBALS['__meta'][$id] = array();
    $GLOBALS['__meta'][$id][$key] = $val;
}
function is_wp_error($v) { return false; }
function wp_update_post($args, $wp_error = false) {
    $id = intval($args['ID']);
    $p = $GLOBALS['__posts'][$id];
    $p->post_title = $args['post_title'];
    $p->post_name = $args['post_name'];
    $p->post_content = $args['post_content'];
    // Simulate WordPress resetting _wp_page_template if page_template wasn't passed
    if (isset($args['page_template'])) {
        update_post_meta($id, '_wp_page_template', $args['page_template']);
    } else {
        update_post_meta($id, '_wp_page_template', 'default');
    }
    return $id;
}
function wp_insert_post($args, $wp_error = false) {
    $id = $GLOBALS['__next_id']++;
    $GLOBALS['__posts'][$id] = (object) array(
        'ID' => $id,
        'post_type' => $args['post_type'],
        'post_status' => $args['post_status'],
        'post_name' => $args['post_name'],
        'post_title' => $args['post_title'],
        'post_content' => $args['post_content'],
    );
    return $id;
}

${fnOnly}

forgewp_seed_mock_content();

echo json_encode(array(
    'postCount' => count($GLOBALS['__posts']),
    'posts' => $GLOBALS['__posts'],
    'meta' => $GLOBALS['__meta'],
));
`,
          'utf8',
        );

        const res = spawnSync('php', [scriptPath], { encoding: 'utf8' });
        expect(res.status, res.stderr).toBe(0);
        return JSON.parse(res.stdout);
      };

      // 'once' mode: seeds empty stub (ID 10), preserves template & route_id, skips user-edited (ID 11), no duplicates
      const onceOut = runSeederInPhp(oncePhp, 'once');
      expect(onceOut.postCount).toBe(2);
      expect(onceOut.posts['10'].post_title).toBe('About Our Studio');
      expect(onceOut.posts['10'].post_content).toBe('<p>Seeded studio story.</p>');
      expect(onceOut.posts['10'].post_name).toBe('about-us');
      expect(onceOut.meta['10']._wp_page_template).toBe('page-about.php');
      expect(onceOut.meta['10'].forgewp_route_id).toBe('about-page');
      expect(onceOut.meta['10'].subtitle).toBe('Crafted in Berlin');
      // User-edited page (ID 11) is untouched in 'once' mode
      expect(onceOut.posts['11'].post_content).toBe('<p>User edited content</p>');
      expect(onceOut.meta['11']._wp_page_template).toBe('page-contact.php');

      // 'upsert' mode: updates both ID 10 and ID 11 in place, preserves templates & route_ids, zero duplicates
      const upsertOut = runSeederInPhp(upsertPhp, 'upsert');
      expect(upsertOut.postCount).toBe(2);
      expect(upsertOut.posts['10'].post_title).toBe('About Our Studio');
      expect(upsertOut.posts['10'].post_name).toBe('about-us');
      expect(upsertOut.meta['10']._wp_page_template).toBe('page-about.php');
      expect(upsertOut.meta['10'].forgewp_route_id).toBe('about-page');
      expect(upsertOut.posts['11'].post_content).toBe('<p>Default contact copy.</p>');
      expect(upsertOut.meta['11']._wp_page_template).toBe('page-contact.php');
      expect(upsertOut.meta['11'].forgewp_route_id).toBe('contact-page');
    });
  });
});
