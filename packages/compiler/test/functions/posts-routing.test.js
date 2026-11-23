/**
 * /blog Option 1 (docs/phase-status-and-blog-urls.md §4): WordPress posts
 * URLs follow the Next.js app routes. Verified live: fresh site gets
 * /blog/ as Posts page and /blog/%postname%/; an existing site keeps its
 * permalinks and sees a notice; CPT and taxonomy URLs are not prefixed.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPostsRoutingPhp } from '../../lib/functions/posts-routing.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

function activate(options, posts = []) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-posts-routing-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
const OBJECT = 'OBJECT';
class WP_Rewrite { function set_permalink_structure($s) { update_option('permalink_structure', $s); } }
$wp_rewrite = new WP_Rewrite();
$options = json_decode(${JSON.stringify(JSON.stringify(options))}, true);
$posts = json_decode(${JSON.stringify(JSON.stringify(posts))}, true);
$meta = array(); $actions = array();
function get_option($k, $d = false) { global $options; return array_key_exists($k, $options) ? $options[$k] : $d; }
function update_option($k, $v, $a = null) { global $options; $options[$k] = $v; }
function add_action($h, $cb, $p = 10) { global $actions; $actions[$h][$p][] = $cb; }
function do_action($h) { global $actions; $byP = $actions[$h] ?? array(); ksort($byP); foreach ($byP as $cbs) foreach ($cbs as $cb) $cb(); }
function wp_count_posts($t) { global $posts; return (object) array('publish' => count(array_filter($posts, fn($p) => $p['type'] === $t))); }
function get_page_by_path($slug, $o, $type) { global $posts; foreach ($posts as $id => $p) if ($p['slug'] === $slug && $p['type'] === $type) return (object) array('ID' => $id, 'post_status' => 'publish'); return null; }
function wp_insert_post($a, $e = false) { global $posts; $id = 100 + count($posts); $posts[$id] = array('slug' => $a['post_name'], 'type' => $a['post_type']); return $id; }
function is_wp_error($v) { return false; }
function update_post_meta($id, $k, $v) { global $meta; $meta[$id][$k] = $v; }
function delete_post_meta($id, $k) { global $meta; unset($meta[$id][$k]); }
function flush_rewrite_rules($h = true) {}
function __($s) { return $s; }
${buildPostsRoutingPhp({ archivePath: '/blog', singleBase: '/blog' }, 'demo')}
do_action('after_switch_theme');
echo json_encode(array('options' => $options, 'meta' => $meta));
`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('posts routing provisioning', () => {
  it('fresh site: makes /blog the Posts page and sets /blog/%postname%/', () => {
    const out = activate(
      { permalink_structure: '/%postname%/', show_on_front: 'page', page_on_front: 4 },
      { 1: { slug: 'hello-world', type: 'post' } },
    );
    expect(out.options.permalink_structure).toBe('/blog/%postname%/');
    const pageId = out.options.page_for_posts;
    expect(pageId).toBeGreaterThan(0);
    expect(out.meta[pageId].forgewp_route_id).toBe('posts-archive');
    expect(out.options.forgewp_posts_routing_done).toBe('yes');
  });

  it('existing site with real posts: keeps permalinks, still sets the Posts page', () => {
    const out = activate(
      { permalink_structure: '/%postname%/', show_on_front: 'page', page_on_front: 4 },
      { 1: { slug: 'hello-world', type: 'post' }, 2: { slug: 'my-news', type: 'post' }, 3: { slug: 'blog', type: 'page' } },
    );
    expect(out.options.permalink_structure).toBe('/%postname%/');
    expect(out.options.page_for_posts).toBe(3);
  });

  it('never touches a custom permalink structure or an existing Posts page', () => {
    const out = activate({ permalink_structure: '/%year%/%postname%/', show_on_front: 'page', page_for_posts: 9 });
    expect(out.options.permalink_structure).toBe('/%year%/%postname%/');
    expect(out.options.page_for_posts).toBe(9);
  });

  it('emits nothing for projects without blog routes', () => {
    expect(buildPostsRoutingPhp(null)).toBe('');
    expect(buildPostsRoutingPhp({ archivePath: null, singleBase: null })).toBe('');
  });
});

describe('content type URLs never inherit the posts permalink front', () => {
  it('registers custom post types and taxonomies with with_front => false', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'forgewp-with-front-'));
    mkdirSync(path.join(root, 'cms'));
    writeFileSync(path.join(root, 'cms', 'mock-data.json'), JSON.stringify({
      project: [{ title: 'P', slug: 'p', _terms: { skill: [{ slug: 'php', name: 'PHP' }] } }],
      listicle: [{ title: 'L', slug: 'l' }],
    }));
    let php;
    try {
      php = buildFunctionsPhp(
        { textDomain: 't', version: '1.0.0', postTypes: { listicle: { rewrite: { slug: 'lists' } } } },
        { cssFile: 'a.css' }, [], root, [], {}, null, [], {}, [], [],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    expect(php).toMatch(/register_post_type\('project'[\s\S]*?'rewrite'\s*=> array\('with_front' => false\)/);
    expect(php).toContain("array('slug' => 'lists', 'with_front' => false)");
    expect(php).toMatch(/register_taxonomy\('skill'[\s\S]*?'rewrite'\s*=> array\('with_front' => false\)/);
  });
});
