import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processMarkup } from '../../lib/markup-processor.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import {
  WpServerMenu,
  createWpServerClient,
} from '../../../react/src/server.ts';

describe('Next.js @forgewp/react/server: wpClient.getMenu(), wpClient.getSiteInfo(), WpServerMenu, and decoupled REST bridge', () => {
  it('resolves getMenu() and getSiteInfo() across fixture, decoupled REST, and native export modes', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const prevWpUrl = process.env.FORGEWP_WP_URL;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_WP_URL;

      // 1. Fixture mode (local dev)
      const fixtureClient = createWpServerClient({
        menus: {
          primary: [
            { title: 'Home', url: '/' },
            {
              title: 'Company',
              url: '/company',
              children: [{ title: 'About', url: '/about' }],
            },
          ],
        },
        siteInfo: {
          name: 'ForgeWP Studio',
          description: 'Modern WordPress themes',
          homeUrl: 'http://localhost:3000/',
          language: 'en-US',
        },
      });

      const localMenu = await fixtureClient.getMenu('primary');
      expect(localMenu).toHaveLength(2);
      expect(localMenu[1].children).toHaveLength(1);
      expect(localMenu[1].children[0]).toMatchObject({
        title: 'About',
        url: '/about',
        path: '/about',
      });

      const localSite = await fixtureClient.getSiteInfo();
      expect(localSite).toMatchObject({
        name: 'ForgeWP Studio',
        description: 'Modern WordPress themes',
        homeUrl: 'http://localhost:3000/',
        mode: 'fixture',
      });

      const localMenuHtml = renderToStaticMarkup(
        React.createElement(WpServerMenu, {
          location: 'primary',
          items: localMenu,
          className: 'main-nav',
          linkClassName: 'nav-link',
        }),
      );
      expect(localMenuHtml).toContain('<nav class="main-nav">');
      expect(localMenuHtml).toContain('<a href="/company" class="nav-link">Company</a>');

      // 2. Decoupled mode (live WordPress REST bridge)
      const calls = [];
      const mockFetch = async (url) => {
        calls.push(String(url));
        if (String(url).includes('/wp-json/forgewp/v1/menus/primary')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              location: 'primary',
              items: [
                {
                  id: 101,
                  title: 'Live Blog',
                  url: 'https://cms.example.com/blog/',
                  path: '/blog/',
                  children: [],
                },
              ],
            }),
          };
        }
        if (String(url).includes('/wp-json/forgewp/v1/site-info')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              name: 'Live WP Brand',
              description: 'Edited in wp-admin',
              url: 'https://cms.example.com/',
              homeUrl: 'https://cms.example.com/',
              language: 'en-US',
              logoUrl: 'https://cms.example.com/wp-content/uploads/logo.png',
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const decoupledClient = createWpServerClient({
        wpUrl: 'https://cms.example.com',
        fetch: mockFetch,
      });

      const liveMenu = await decoupledClient.getMenu('primary');
      expect(liveMenu).toEqual([
        {
          id: 101,
          title: 'Live Blog',
          url: 'https://cms.example.com/blog/',
          path: '/blog/',
          children: [],
        },
      ]);

      const liveSite = await decoupledClient.getSiteInfo();
      expect(liveSite).toMatchObject({
        name: 'Live WP Brand',
        description: 'Edited in wp-admin',
        logoUrl: 'https://cms.example.com/wp-content/uploads/logo.png',
        mode: 'decoupled',
      });
      expect(calls).toContain('https://cms.example.com/wp-json/forgewp/v1/menus/primary');
      expect(calls).toContain('https://cms.example.com/wp-json/forgewp/v1/site-info');

      // 3. Native export mode -> emits ForgeWP PHP compile tokens
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const nativeSite = await fixtureClient.getSiteInfo();
      expect(nativeSite.mode).toBe('native');
      expect(nativeSite.name).toBe('__FORGEWP_OPTION_blogname__');
      expect(nativeSite.description).toBe('__FORGEWP_OPTION_blogdescription__');
      expect(nativeSite.homeUrl).toBe('__FORGEWP_HOME_URL__');

      const nativeHtml = renderToStaticMarkup(
        React.createElement(
          'header',
          null,
          React.createElement('a', { href: nativeSite.homeUrl }, nativeSite.name),
          React.createElement('p', null, nativeSite.description),
          React.createElement(WpServerMenu, {
            location: 'primary',
            items: localMenu,
            className: 'main-nav',
            linkClassName: 'nav-link',
          }),
        ),
      );

      const compiledPhp = processMarkup(nativeHtml, 'demo-theme');
      expect(compiledPhp).toContain("get_bloginfo( 'name' )");
      expect(compiledPhp).toContain("get_bloginfo( 'description' )");
      expect(compiledPhp).toContain("home_url( '/' )");
      expect(compiledPhp).toContain('wp_get_nav_menu_items(');

      // Verify compiled PHP executes cleanly in PHP 8
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-menu-site-php-'));
      try {
        const tplPath = path.join(tmp, 'header.php');
        writeFileSync(tplPath, compiledPhp, 'utf8');
        const lint = spawnSync('php', ['-l', tplPath], { encoding: 'utf8' });
        expect(lint.status, lint.stderr).toBe(0);

        const runner = path.join(tmp, 'run.php');
        writeFileSync(
          runner,
          `<?php
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_url($s) { return (string)$s; }
function home_url($p = '') { return 'https://wp.example.com' . $p; }
function get_bloginfo($k) { return $k === 'name' ? 'Live Site Name' : 'Live Tagline'; }
function forgewp_get_menu_id_for_lang($loc, $lang) { return $loc === 'primary' ? 42 : null; }
function wp_get_nav_menu_items($id) {
  return array(
    (object) array('title' => 'Docs', 'url' => 'https://wp.example.com/docs/'),
    (object) array('title' => 'Contact', 'url' => 'https://wp.example.com/contact/'),
  );
}
include ${JSON.stringify(tplPath)};
`,
        );
        const exec = spawnSync('php', [runner], { encoding: 'utf8' });
        expect(exec.status, exec.stderr).toBe(0);
        expect(exec.stdout).toContain('<a href="https://wp.example.com/">Live Site Name</a>');
        expect(exec.stdout).toContain('<p>Live Tagline</p>');
        expect(exec.stdout).toContain('<nav class="main-nav">');
        expect(exec.stdout).toContain('<a href="https://wp.example.com/docs/" class="nav-link">Docs</a>');
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      if (prevWpUrl === undefined) delete process.env.FORGEWP_WP_URL;
      else process.env.FORGEWP_WP_URL = prevWpUrl;
    }
  });

  it('generates valid PHP for /wp-json/forgewp/v1/menus/<location> and /wp-json/forgewp/v1/site-info REST endpoints and executes them in PHP 8', () => {
    const php = buildFunctionsPhp(
      {
        name: 'Menu REST Test',
        slug: 'menu-rest-test',
        version: '1.0.0',
        description: 'Test theme',
        textDomain: 'menu-rest-test',
        menus: { primary: 'Primary Menu' },
      },
      { cssFile: 'assets/index.css' },
    );

    expect(php).toContain("register_rest_route('forgewp/v1', '/menus/(?P<location>[a-zA-Z0-9_-]+)'");
    expect(php).toContain("register_rest_route('forgewp/v1', '/site-info'");

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-rest-bridge-php-'));
    try {
      const fnPath = path.join(tmp, 'functions.php');
      writeFileSync(fnPath, php, 'utf8');
      const lint = spawnSync('php', ['-l', fnPath], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);

      // Extract forgewp_register_decoupled_rest_bridge and execute both new REST callbacks in PHP 8
      const start = php.indexOf('function forgewp_register_decoupled_rest_bridge()');
      expect(start).toBeGreaterThan(-1);
      const end = php.indexOf("add_action('rest_api_init', 'forgewp_register_decoupled_rest_bridge');");
      const bridgeBody = php.slice(start, end);

      const runner = path.join(tmp, 'test-rest.php');
      writeFileSync(
        runner,
        `<?php
$registered_routes = array();
function get_post_types($args, $out) { return array(); }
function register_rest_field($pt, $field, $args) {}
function register_rest_route($ns, $route, $args) {
  global $registered_routes;
  $registered_routes[$ns . $route] = $args;
}
function sanitize_key($k) { return preg_replace('/[^a-z0-9_-]/', '', strtolower($k)); }
function get_nav_menu_locations() { return array('primary' => 7); }
function wp_get_nav_menu_items($id) {
  if ($id !== 7) return array();
  return array(
    (object) array('ID' => 10, 'menu_item_parent' => 0, 'title' => 'Services', 'url' => 'https://example.com/wp/services/', 'target' => '', 'classes' => array('nav-top')),
    (object) array('ID' => 11, 'menu_item_parent' => 10, 'title' => 'Consulting', 'url' => 'https://example.com/wp/services/consulting/', 'target' => '_blank', 'classes' => array()),
  );
}
function home_url($p = '/') { return 'https://example.com/wp' . $p; }
function wp_parse_url($u) { return parse_url($u); }
function wp_strip_all_tags($s) { return strip_tags($s); }
function get_theme_mod($k) { return $k === 'custom_logo' ? 99 : ''; }
function wp_get_attachment_image_url($id, $size) { return $id === 99 ? 'https://example.com/wp/uploads/logo.svg' : ''; }
function get_bloginfo($k) {
  if ($k === 'name') return 'Acme & Co';
  if ($k === 'description') return 'Building themes';
  if ($k === 'language') return 'en-US';
  return '';
}
function rest_ensure_response($data) { return $data; }

${bridgeBody}

forgewp_register_decoupled_rest_bridge();
$menu_res = $registered_routes['forgewp/v1/menus/(?P<location>[a-zA-Z0-9_-]+)']['callback'](array('location' => 'primary'));
$site_res = $registered_routes['forgewp/v1/site-info']['callback']();
echo json_encode(array('menu' => $menu_res, 'site' => $site_res));
`,
      );

      const exec = spawnSync('php', [runner], { encoding: 'utf8' });
      expect(exec.status, exec.stderr).toBe(0);
      const parsed = JSON.parse(exec.stdout);

      expect(parsed.menu.location).toBe('primary');
      expect(parsed.menu.items).toHaveLength(1);
      expect(parsed.menu.items[0].title).toBe('Services');
      expect(parsed.menu.items[0].path).toBe('/services/');
      expect(parsed.menu.items[0].children).toHaveLength(1);
      expect(parsed.menu.items[0].children[0]).toMatchObject({
        id: 11,
        title: 'Consulting',
        path: '/services/consulting/',
        target: '_blank',
      });

      expect(parsed.site).toEqual({
        name: 'Acme & Co',
        description: 'Building themes',
        url: 'https://example.com/wp/',
        homeUrl: 'https://example.com/wp/',
        language: 'en-US',
        logoUrl: 'https://example.com/wp/uploads/logo.svg',
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
