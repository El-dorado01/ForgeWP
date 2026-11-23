/**
 * R2 native export (status §9 + §9a): marker/token output from <WpPostTerms>,
 * <WpTermsLoop>, <WpComments> and getPost()/getComments() becomes PHP that
 * reads live data. Executes the generated PHP with stand-ins.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { processR2NativeMarkers } from '../../lib/r2-native-markers.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;

const STUBS = `<?php
function esc_html($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_attr($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_url($s) { return (string) $s; }
function wp_kses_post($s) { return preg_replace('#<script.*?</script>#s', '', (string) $s); }
function home_url($p = '/') { return 'https://site.test' . $p; }
function get_the_ID() { return 27; }
function comments_open() { return $GLOBALS['open']; }
function forgewp_native_the_path() { return '/blog/first/'; }
function forgewp_native_comments_total() { return count($GLOBALS['comments']); }
function forgewp_native_comment_max_depth() { return 3; }
function forgewp_native_comments($page, $per) { return array('open' => $GLOBALS['open'], 'items' => $GLOBALS['comments']); }
function forgewp_native_post_terms($tax) { return $GLOBALS['terms'][$tax] ?? array(); }
function forgewp_native_taxonomy_terms($tax, $hide) { return $GLOBALS['terms'][$tax . ($hide ? ':hide' : ':all')] ?? array(); }
`;

function render(html, globals) {
  const php = processR2NativeMarkers(html);
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-r2-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `${STUBS}foreach (json_decode(${JSON.stringify(JSON.stringify(globals))}, true) as $k => $v) { $GLOBALS[$k] = $v; } ?>${php}`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return { out: out.stdout, php };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const comment = (id, name, content, children = []) => ({ id, parentId: 0, author: { name, avatarUrl: `https://a.test/${id}`, url: '' }, date: '2026-11-23', content, children });

describe('R2 native markers', () => {
  it.skipIf(!hasPhp)('renders a threaded comments loop with escaping, depth guard and count', () => {
    const html =
      '<h2>Comments (<!-- -->__FORGEWP_COMMENTS_COUNT__<!-- -->)</h2>' +
      '<forgewp-comments-loop-start page="1" perpage="50"></forgewp-comments-loop-start>' +
      '<article id="c-__FORGEWP_COMMENT_ID__"><b>__FORGEWP_COMMENT_AUTHOR_NAME__</b><div>__FORGEWP_COMMENT_CONTENT__</div><div class="r"><forgewp-comment-children></forgewp-comment-children></div></article>' +
      '<forgewp-comments-loop-empty></forgewp-comments-loop-empty><p>None yet</p>' +
      '<forgewp-comments-loop-end></forgewp-comments-loop-end>' +
      '<forgewp-comments-closed-start></forgewp-comments-closed-start><p>Closed</p><forgewp-comments-closed-end></forgewp-comments-closed-end>';
    const deep = comment(4, 'D', 'd', [comment(5, 'E', 'too deep')]);
    const { out } = render(html, {
      open: true,
      comments: [comment(1, 'Ada <x>', '<p>Hi</p><script>bad()</script>', [comment(2, 'Bob', 'reply', [deep])]), comment(3, 'Cy', 'second')],
    });
    expect(out).toContain('Comments (<!-- -->2<!-- -->)');
    expect(out).toContain('<b>Ada &lt;x&gt;</b><div><p>Hi</p></div>');
    expect(out).toContain('id="c-2"');
    expect(out).toContain('id="c-4"');
    expect(out).not.toContain('id="c-5"'); // depth guard (max depth 3)
    expect(out).not.toContain('None yet');
    expect(out).not.toContain('Closed');
    expect(out).not.toMatch(/__FORGEWP_|<forgewp-/);
    const empty = render(html, { open: false, comments: [] }).out;
    expect(empty).toContain('None yet');
    expect(empty).toContain('Closed');
  });

  it.skipIf(!hasPhp)('renders post terms (all taxonomies) and taxonomy term loops with empty fallback', () => {
    const html =
      '<p><forgewp-terms-loop-start taxonomy="*"></forgewp-terms-loop-start><a href="__FORGEWP_TERM_PATH__">__FORGEWP_TERM_NAME__</a><forgewp-terms-loop-end></forgewp-terms-loop-end></p>' +
      '<p><forgewp-terms-loop-start source="taxonomy" taxonomy="category" hideempty="1"></forgewp-terms-loop-start><span>__FORGEWP_TERM_NAME__(__FORGEWP_TERM_COUNT__)</span><forgewp-terms-loop-empty></forgewp-terms-loop-empty><i>no terms</i><forgewp-terms-loop-end></forgewp-terms-loop-end></p>' +
      '<p><forgewp-terms-loop-start taxonomy="x\'); evil();//"></forgewp-terms-loop-start>__FORGEWP_TERM_NAME__<forgewp-terms-loop-end></forgewp-terms-loop-end></p>';
    const { out, php } = render(html, {
      terms: { '*': [{ id: 1, slug: 'news', name: 'News & Notes', path: '/blog/category/news/' }], 'category:hide': [] },
    });
    expect(out).toContain('<a href="/blog/category/news/">News &amp; Notes</a>');
    expect(out).toContain('<i>no terms</i>');
    expect(php).not.toContain('evil');
  });

  it.skipIf(!hasPhp)('keeps numeric tokens numeric inside island props, and resolves the post path', () => {
    const html = '<div data-forgewp-props="{&quot;postId&quot;:&quot;__FORGEWP_THE_ID__&quot;}"></div><li>__FORGEWP_THE_PATH__ #__FORGEWP_THE_ID__</li>';
    const { out } = render(html, {});
    expect(out).toContain('data-forgewp-props="{&quot;postId&quot;:27}"');
    expect(out).toContain('<li>/blog/first/ #27</li>');
  });

  it('leaves markup without R2 markers untouched', () => {
    const html = '<p>__FORGEWP_THE_TITLE__</p>';
    expect(processR2NativeMarkers(html)).toBe(html);
  });
});
