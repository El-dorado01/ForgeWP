import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createWordPressContentClient,
  normalizeWpBaseUrl,
  parseSerializedBlocks,
  resolveBlockRenderNodes,
  stripWpBasePath,
  verifyDeploymentSwitch,
} from '../../lib/next-decoupled-transport.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import introBlock from '../../../../projects/nextjs-adapter-fixture/src/blocks/IntroBlock.tsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const fixtureMockPath = path.join(
  repoRoot,
  'projects',
  'nextjs-adapter-fixture',
  'cms',
  'mock-data.json',
);

function extractPhpFunction(phpSource, functionName) {
  const start = phpSource.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`Function ${functionName} not found`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < phpSource.length; i++) {
    if (phpSource[i] === '{') {
      depth++;
      seenBrace = true;
    } else if (phpSource[i] === '}') {
      depth--;
      if (seenBrace && depth === 0) return phpSource.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${functionName}`);
}

describe('Next.js decoupled WordPress server-side transport', () => {
  it('reads local fixture data with zero WordPress database when wpUrl is omitted', async () => {
    const fixtures = JSON.parse(readFileSync(fixtureMockPath, 'utf8'));
    const client = createWordPressContentClient({ fixtures });

    expect(client.getMode()).toBe('fixture');
    const home = await client.getPageBySlug('home');
    expect(home).toMatchObject({
      slug: 'home',
      title: 'A standard Next.js app',
      source: 'fixture',
      path: '/',
    });

    const about = await client.getPageBySlug('about');
    expect(about).toMatchObject({
      slug: 'about',
      title: 'About the adapter fixture',
      source: 'fixture',
      path: '/about/',
    });

    const href = await client.resolveRouteHref('about', '/about/', {
      query: 'from=home',
      fragment: 'details',
    });
    expect(href).toBe('/about/?from=home#details');
    expect(await client.getPageBySlug('missing')).toBeNull();
  });

  it('enforces server-only credential and preview authorization boundaries', async () => {
    const prevWindow = globalThis.window;
    try {
      globalThis.window = {};
      expect(() =>
        createWordPressContentClient({
          wpUrl: 'https://example.com',
          auth: { username: 'admin', applicationPassword: 'secret' },
        }),
      ).toThrow(/FORGEWP_CLIENT_BUNDLE_CREDENTIAL_GUARD/);
    } finally {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
    }

    const publicClient = createWordPressContentClient({
      wpUrl: 'https://example.com',
      fetch: async () => new Response('[]', { status: 200 }),
    });
    await expect(publicClient.getPageBySlug('draft-page', { preview: true })).rejects.toThrow(
      /FORGEWP_PREVIEW_AUTH_REQUIRED/,
    );
    await expect(publicClient.getRegisteredBlocks('forgewp')).rejects.toThrow(
      /FORGEWP_AUTH_REQUIRED/,
    );
  });

  it('normalizes subdirectory WordPress base paths and resolves renamed slugs via forgewp_route_id', async () => {
    const base = normalizeWpBaseUrl('https://example.com/blog/');
    expect(base).toEqual({
      origin: 'https://example.com',
      basePath: '/blog',
      baseUrl: 'https://example.com/blog',
    });
    expect(stripWpBasePath('https://example.com/blog/our-story/', base)).toBe('/our-story/');
    expect(stripWpBasePath('https://example.com/blog/', base)).toBe('/');
    expect(stripWpBasePath('https://example.com/blog-other/page/', base)).toBe('/blog-other/page/');

    const calls = [];
    const mockFetch = async (url) => {
      calls.push(url);
      if (url.endsWith('/wp-json/wp/v2/pages?slug=about')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.endsWith('/wp-json/forgewp/v1/routes')) {
        return new Response(
          JSON.stringify({
            homeUrl: 'https://example.com/blog/',
            basePath: '/blog',
            routes: [
              {
                routeId: 'about',
                id: 42,
                slug: 'our-story',
                title: 'Our Story',
                path: '/our-story/',
                permalink: 'https://example.com/blog/our-story/',
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/wp-json/wp/v2/pages/42')) {
        return new Response(
          JSON.stringify({
            id: 42,
            slug: 'our-story',
            forgewp_route_id: 'about',
            status: 'publish',
            link: 'https://example.com/blog/our-story/',
            title: { rendered: 'Our Story &amp; Mission' },
            content: { rendered: '<section class="intro"><h2>Live edit</h2></section>' },
            forgewp_blocks: [
              {
                blockName: 'forgewp/next-intro',
                attrs: { heading: 'Live edit' },
                innerHTML: '',
                innerBlocks: [],
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const client = createWordPressContentClient({
      wpUrl: 'https://example.com/blog',
      fetch: mockFetch,
    });

    const page = await client.getPageBySlug('about');
    expect(page).toMatchObject({
      id: 42,
      slug: 'our-story',
      routeId: 'about',
      title: 'Our Story & Mission',
      path: '/our-story/',
      source: 'wordpress',
    });
    expect(page.blocks).toEqual([
      {
        blockName: 'forgewp/next-intro',
        attrs: { heading: 'Live edit' },
        innerHTML: '',
        innerBlocks: [],
      },
    ]);

    const href = await client.resolveRouteHref('about', '/about/', {
      query: 'from=home',
      fragment: 'details',
    });
    expect(href).toBe('/our-story/?from=home#details');

    // Render structured block through the real shared IntroBlock.tsx definition.
    const nodes = resolveBlockRenderNodes(page.blocks, {
      'forgewp/next-intro': introBlock,
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].kind).toBe('registered');
    const Save = nodes[0].definition.save;
    const html = renderToStaticMarkup(
      React.createElement(Save, { attributes: nodes[0].attributes }),
    );
    expect(html).toBe('<section class="intro"><h2>Live edit</h2></section>');
  });

  it('parses serialized self-closing, nested, and core Gutenberg blocks', () => {
    const raw = `
<!-- wp:forgewp/next-intro {"heading":"Saved in WP"} /-->
<!-- wp:paragraph --><p>Body copy</p><!-- /wp:paragraph -->
<!-- wp:group {"layout":{"type":"constrained"}} -->
<!-- wp:forgewp/next-intro /-->
<!-- /wp:group -->
`;
    const parsed = parseSerializedBlocks(raw);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      blockName: 'forgewp/next-intro',
      attrs: { heading: 'Saved in WP' },
    });
    expect(parsed[1]).toMatchObject({
      blockName: 'core/paragraph',
      innerHTML: '<p>Body copy</p>',
    });
    expect(parsed[2].blockName).toBe('core/group');
    expect(parsed[2].innerBlocks[0]).toMatchObject({
      blockName: 'forgewp/next-intro',
      attrs: {},
    });

    // Missing attributes fall back to declared block defaults.
    const nodes = resolveBlockRenderNodes(parsed[2].innerBlocks, {
      'forgewp/next-intro': introBlock,
    });
    expect(nodes[0].attributes).toEqual({ heading: 'An editable introduction' });
  });

  it('validates deployment-switch preconditions and reports rollback guidance on failure', async () => {
    const okFetch = async (url) => {
      if (url.endsWith('/wp-json/')) {
        return new Response(JSON.stringify({ namespaces: ['wp/v2', 'forgewp/v1'] }), {
          status: 200,
        });
      }
      if (url.endsWith('/wp-json/forgewp/v1/routes')) {
        return new Response(
          JSON.stringify({
            homeUrl: 'https://site.test/',
            basePath: '',
            routes: [{ routeId: 'about', id: 4, slug: 'about', path: '/about/' }],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/wp-json/wp/v2/block-types')) {
        return new Response(
          JSON.stringify([
            {
              name: 'forgewp/next-intro',
              attributes: { heading: { type: 'string', default: 'An editable introduction' } },
            },
          ]),
          { status: 200 },
        );
      }
      if (url.includes('/wp-json/wp/v2/pages?slug=intro-live')) {
        return new Response(
          JSON.stringify([
            {
              id: 5,
              slug: 'intro-live',
              status: 'publish',
              link: 'https://site.test/intro-live/',
              title: { rendered: 'Intro' },
              content: { rendered: '<section><h2>Hi</h2></section>' },
              forgewp_blocks: [{ blockName: 'forgewp/next-intro', attrs: { heading: 'Hi' } }],
            },
          ]),
          { status: 200 },
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const passRes = await verifyDeploymentSwitch({
      wpUrl: 'https://site.test',
      auth: { username: 'admin', applicationPassword: 'pw' },
      expectedBlocks: [
        { name: 'forgewp/next-intro', attributes: { heading: { type: 'string' } } },
      ],
      expectedRoutes: ['about'],
      probePageSlug: 'intro-live',
      fetch: okFetch,
    });
    expect(passRes.ok).toBe(true);
    expect(passRes.errors).toEqual([]);
    expect(passRes.rollback.required).toBe(false);

    // Mismatched block registry fails cleanly with rollback guidance.
    const mismatchRes = await verifyDeploymentSwitch({
      wpUrl: 'https://site.test',
      auth: { username: 'admin', applicationPassword: 'pw' },
      expectedBlocks: [
        { name: 'forgewp/next-intro', attributes: { heading: { type: 'number' } } },
        { name: 'forgewp/missing-block', attributes: {} },
      ],
      expectedRoutes: ['about', 'missing-route'],
      fetch: okFetch,
    });
    expect(mismatchRes.ok).toBe(false);
    expect(mismatchRes.rollback.required).toBe(true);
    expect(mismatchRes.errors.some((e) => e.includes('missing-route'))).toBe(true);
    expect(mismatchRes.errors.some((e) => e.includes('type mismatch'))).toBe(true);
    expect(mismatchRes.errors.some((e) => e.includes('forgewp/missing-block'))).toBe(true);

    // Unreachable WordPress fails immediately with rollback guidance.
    const downRes = await verifyDeploymentSwitch({
      wpUrl: 'https://down.test',
      fetch: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    expect(downRes.ok).toBe(false);
    expect(downRes.rollback.required).toBe(true);
    expect(downRes.errors[0]).toContain('ECONNREFUSED');
  });

  it('generates valid PHP REST bridge helpers that enforce publish/password privacy and strip subdirectory basePath', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-rest-bridge-php-'));
    try {
      const phpSource = buildFunctionsPhp(
        {
          name: 'Decoupled Bridge Test',
          slug: 'decoupled-bridge-test',
          textDomain: 'decoupled-bridge-test',
          version: '1.0.0',
          description: 'Test',
        },
        { cssFile: 'assets/app.css' },
        [],
        tmp,
      );

      const fullPhpPath = path.join(tmp, 'functions.php');
      writeFileSync(fullPhpPath, phpSource, 'utf8');
      const lint = spawnSync('php', ['-l', fullPhpPath], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);

      const serializeFn = extractPhpFunction(phpSource, 'forgewp_serialize_rest_blocks');
      const registerFn = extractPhpFunction(phpSource, 'forgewp_register_decoupled_rest_bridge');

      const driverPath = path.join(tmp, 'driver.php');
      writeFileSync(
        driverPath,
        `<?php
$fields = array();
$routes = array();
$can_read = false;
$posts = array(
  1 => (object) array('ID' => 1, 'post_status' => 'publish', 'post_password' => '', 'post_name' => 'our-story', 'post_content' => '<!-- wp:forgewp/next-intro {"heading":"Public"} /-->'),
  2 => (object) array('ID' => 2, 'post_status' => 'draft', 'post_password' => '', 'post_name' => 'secret-draft', 'post_content' => '<!-- wp:forgewp/next-intro {"heading":"Secret"} /-->'),
  3 => (object) array('ID' => 3, 'post_status' => 'publish', 'post_password' => 'pw123', 'post_name' => 'locked', 'post_content' => '<!-- wp:forgewp/next-intro {"heading":"Locked"} /-->'),
);
$meta = array(1 => 'about', 2 => 'secret', 3 => 'locked');
function register_rest_field($type, $name, $args) { global $fields; $fields["$type:$name"] = $args; }
function register_rest_route($ns, $route, $args) { global $routes; $routes["$ns$route"] = $args; }
function get_post_types($args = array(), $output = 'names') { return array('page', 'post'); }
function get_post($id) { global $posts; return isset($posts[$id]) ? $posts[$id] : null; }
function get_post_meta($id, $key, $single = false) { global $meta; return isset($meta[$id]) ? $meta[$id] : ''; }
function current_user_can($cap, $id = 0) { global $can_read; return $can_read; }
function home_url($p = '/') { return 'https://example.com/blog' . $p; }
function wp_parse_url($u) { return parse_url($u); }
function get_posts($args = array()) { global $posts; return array($posts[1], $posts[3]); }
function get_permalink($id) { return $id === 1 ? 'https://example.com/blog/our-story/' : 'https://example.com/blog/locked/'; }
function get_the_title($id) { return $id === 1 ? 'Our Story' : 'Locked'; }
function wp_strip_all_tags($s) { return strip_tags($s); }
function rest_ensure_response($data) { return $data; }
function parse_blocks($content) {
  if (strpos($content, 'Public') !== false) return array(
    array('blockName' => null, 'attrs' => array(), 'innerHTML' => "   \\n ", 'innerBlocks' => array()),
    array('blockName' => 'forgewp/next-intro', 'attrs' => array('heading' => 'Public'), 'innerHTML' => '', 'innerBlocks' => array()),
  );
  return array(array('blockName' => 'forgewp/next-intro', 'attrs' => array('heading' => 'Private'), 'innerHTML' => '', 'innerBlocks' => array()));
}

${serializeFn}
${registerFn}
forgewp_register_decoupled_rest_bridge();

$blocks_cb = $fields['page:forgewp_blocks']['get_callback'];
$route_id_cb = $fields['page:forgewp_route_id']['get_callback'];
$routes_cb = $routes['forgewp/v1/routes']['callback'];

$out = array(
  'routeId' => $route_id_cb(array('id' => 1)),
  'publicBlocks' => $blocks_cb(array('id' => 1)),
  'draftAnon' => $blocks_cb(array('id' => 2)),
  'passwordAnon' => $blocks_cb(array('id' => 3)),
  'routes' => $routes_cb(),
);
$can_read = true;
$out['draftAuth'] = $blocks_cb(array('id' => 2));
echo json_encode($out);
`,
        'utf8',
      );
      const run = spawnSync('php', [driverPath], { encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      const result = JSON.parse(run.stdout);
      expect(result.routeId).toBe('about');
      expect(result.publicBlocks).toEqual([
        {
          blockName: 'forgewp/next-intro',
          attrs: { heading: 'Public' },
          innerHTML: '',
          innerBlocks: [],
        },
      ]);
      expect(result.draftAnon).toEqual([]);
      expect(result.passwordAnon).toEqual([]);
      expect(result.draftAuth).toHaveLength(1);
      expect(result.routes).toEqual({
        homeUrl: 'https://example.com/blog/',
        basePath: '/blog',
        routes: [
          {
            routeId: 'about',
            id: 1,
            slug: 'our-story',
            title: 'Our Story',
            path: '/our-story/',
            permalink: 'https://example.com/blog/our-story/',
          },
        ],
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('does not recreate a duplicate page when a provisioned route page slug is renamed in wp-admin', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-routing-rename-php-'));
    try {
      const phpSource = buildFunctionsPhp(
        {
          name: 'Routing Rename Test',
          slug: 'routing-rename-test',
          textDomain: 'routing-rename-test',
          version: '1.0.0',
          description: 'Test',
        },
        { cssFile: 'assets/app.css' },
        [],
        tmp,
        [{ title: 'About', slug: 'about', template: 'page-about.php' }],
      );
      const fnStart = phpSource.indexOf('function forgewp_auto_create_pages_and_menus(');
      const fnEnd = phpSource.indexOf("add_action('after_switch_theme'", fnStart);
      expect(fnStart).toBeGreaterThan(-1);
      expect(fnEnd).toBeGreaterThan(fnStart);
      const routingFn = phpSource.slice(fnStart, fnEnd);
      const driverPath = path.join(tmp, 'rename-driver.php');
      writeFileSync(
        driverPath,
        `<?php
define('FORGEWP_THEME_VERSION', '1.0.0');
$inserted = 0;
$renamed_page = (object) array('ID' => 4, 'post_name' => 'our-story', 'post_title' => 'Our Story');
function get_option($k, $d = false) { return 'yes'; }
function update_option($k, $v) {}
function get_posts($args = array()) {
  global $renamed_page;
  if (isset($args['meta_key']) && $args['meta_key'] === 'forgewp_route_id' && $args['meta_value'] === 'about') {
    return array($renamed_page);
  }
  return array();
}
function get_page_by_path($path, $output = 'OBJECT', $post_type = 'page') { return null; }
function wp_insert_post($args) { global $inserted; $inserted++; return 99; }
function wp_update_post($args) { return $args['ID']; }
function is_wp_error($v) { return false; }
function get_post_meta($id, $key, $single = false) {
  if ($key === '_wp_page_template') return 'page-about.php';
  if ($key === 'forgewp_route_id') return 'about';
  return '';
}
function update_post_meta($id, $key, $val) {}
function wp_get_nav_menus() { return array(); }
function get_nav_menu_locations() { return array(); }
function get_theme_mod($k, $d = '') { return $d; }
function set_theme_mod($k, $v) {}
function flush_rewrite_rules($hard = true) {}

${routingFn}
forgewp_auto_create_pages_and_menus();
echo json_encode(array('inserted' => $inserted));
`,
        'utf8',
      );
      const run = spawnSync('php', [driverPath], { encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      expect(JSON.parse(run.stdout)).toEqual({ inserted: 0 });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
