import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { buildRoutingPhp } from '../../lib/functions/routing.js';
import { buildHydrationEnqueuerPhp } from '../../lib/functions/hydration-enqueuer.js';
import { buildThemeSetupPhp } from '../../lib/functions/theme-setup.js';
import { loadMenusData } from '../../lib/functions/load-menus.js';

describe('Mega Menus & Hierarchical Navigation Compiler Tests', () => {
  it('serializes nested mega menu items with children, badges, images, and classes to PHP', () => {
    const config = {
      textDomain: 'test_theme',
      themeVersion: '1.0.0',
      version: '1.0.0',
    };
    const menus = {
      primary: [
        {
          title: 'Furniture',
          url: '/category/furniture',
          badge: 'New Season',
          image: 'https://example.com/furniture.jpg',
          classes: ['mega-menu-col', 'featured'],
          children: [
            {
              title: 'Living Room',
              url: '/category/living',
              description: 'Sofas, tables, and lounge chairs',
              children: [
                { title: 'Sofas', url: '/category/sofas' },
                { title: 'Coffee Tables', url: '/category/coffee-tables' },
              ],
            },
            {
              title: 'Dining Room',
              url: '/category/dining',
            },
          ],
        },
        {
          title: 'About',
          url: '/about',
        },
      ],
    };

    const generatedPhp = buildFunctionsPhp(
      config,
      { cssFile: 'assets/main.css' }, // assets
      [], // blockSlugs
      '', // themeRoot
      [], // pagesToAutoCreate
      menus, // menus
      null, // hydrationData
      [], // i18nKeys
      {}, // schemas
      [], // queries
      [] // wpOptions
    );

    expect(generatedPhp).toContain("'title' => 'Furniture'");
    expect(generatedPhp).toContain("'badge' => 'New Season'");
    expect(generatedPhp).toContain("'image' => 'https://example.com/furniture.jpg'");
    expect(generatedPhp).toContain("'classes' => array('mega-menu-col', 'featured')");
    expect(generatedPhp).toContain("'title' => 'Living Room'");
    expect(generatedPhp).toContain("'description' => 'Sofas, tables, and lounge chairs'");
    expect(generatedPhp).toContain("'title' => 'Sofas'");
    expect(generatedPhp).toContain("'title' => 'Coffee Tables'");
    expect(generatedPhp).toContain('forgewp_seed_menu_items');
  });

  it('buildRoutingPhp includes recursive forgewp_seed_menu_items function', () => {
    const config = {
      textDomain: 'test_theme',
      themeVersion: '1.0.0',
    };
    const pagesPhpArray = `        array('title' => 'Shop', 'slug' => 'shop', 'template' => 'page-shop.php')`;
    const schemaDefaultsPhp = ``;
    const menuItemsPhpArray = `        'primary' => array(\n            array('title' => 'Shop', 'url' => '/shop')\n        )`;
    const socialSettingsPhp = ``;
    const postTypes = [];

    const routingPhp = buildRoutingPhp(
      config,
      pagesPhpArray,
      schemaDefaultsPhp,
      menuItemsPhpArray,
      socialSettingsPhp,
      postTypes
    );

    expect(routingPhp).toContain('function forgewp_seed_menu_items($menu_id, $items, $parent_id = 0)');
    expect(routingPhp).toContain("'menu-item-parent-id' => (int)$parent_id");
    expect(routingPhp).toContain("update_post_meta($item_id, '_forgewp_menu_badge'");
    expect(routingPhp).toContain("update_post_meta($item_id, '_forgewp_menu_image'");
    expect(routingPhp).toContain("forgewp_seed_menu_items($menu_id, $item['children'], $item_id)");
  });

  it('buildHydrationEnqueuerPhp includes forgewp_build_menu_tree function and attaches nested hierarchy', () => {
    const config = {
      textDomain: 'test_theme',
    };
    const assets = { cssFile: 'assets/main.css' };
    const enqueuerPhp = buildHydrationEnqueuerPhp(
      config,
      assets,
      'assets/main.js',
      new Set(), // uniqueMetaKeys
      [], // uniqueRichTextKeys
      '', // repeaterFieldsPhp
      '', // manifestPairs
      '', // optionsPairs
      '', // themeModsPairs
      '', // page_links_php
      '', // fontsEnqueue
      '', // i18nKeysPhp
      '', // headlessScript
      '', // currentUserHydrationField
      'usernameAndEmail', // defaultLoginField
      '' // providersPhp
    );

    expect(enqueuerPhp).toContain('function forgewp_build_menu_tree($menu_items, $parent_id = 0)');
    expect(enqueuerPhp).toContain("(int)$item->menu_item_parent === (int)$parent_id");
    expect(enqueuerPhp).toContain("forgewp_build_menu_tree($menu_items, $item->ID)");
    expect(enqueuerPhp).toContain("$node['children'] = $children;");
    expect(enqueuerPhp).toContain("$items_list = forgewp_build_menu_tree($menu_items, 0);");
  });
});

describe('loadMenusData dual-resolution', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-load-menus-'));
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads hierarchical menus from cms/menus.ts via defineWpMenus()', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'menus.ts'),
      `import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  primary: [
    {
      title: 'Furniture',
      url: '/category/furniture',
      badge: '2026 ARCHIVE',
      children: [
        { title: 'Lounge Chairs', url: '/category/furniture?sub=lounge-chairs' }
      ]
    }
  ],
  footer_col_1: [
    { title: 'About Us', url: '/about' }
  ]
});

export default menus;
`
    );

    const menus = loadMenusData(tmpDir);
    expect(Object.keys(menus)).toEqual(['primary', 'footer_col_1']);
    expect(menus.primary[0].title).toBe('Furniture');
    expect(menus.primary[0].badge).toBe('2026 ARCHIVE');
    expect(menus.primary[0].children[0].title).toBe('Lounge Chairs');
    expect(menus.footer_col_1[0].url).toBe('/about');
  });

  it('prefers cms/menus.ts over cms/menus.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'menus.ts'),
      `export const menus = { primary: [{ title: 'From TS', url: '/ts' }] };`
    );
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'menus.json'),
      JSON.stringify({ primary: [{ title: 'From JSON', url: '/json' }] })
    );

    const menus = loadMenusData(tmpDir);
    expect(menus.primary[0].title).toBe('From TS');
  });

  it('falls back to cms/menus.json when menus.ts is absent', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'menus.json'),
      JSON.stringify({
        primary: [{ title: 'Shop', url: '/shop' }],
        footer: [{ title: 'Privacy', url: '/privacy' }],
      })
    );

    const menus = loadMenusData(tmpDir);
    expect(menus.primary[0].title).toBe('Shop');
    expect(menus.footer[0].url).toBe('/privacy');
  });

  it('returns an empty object when neither menus file exists', () => {
    expect(loadMenusData(tmpDir)).toEqual({});
  });
});

describe('theme setup always enables Appearance → Menus', () => {
  function themeSetup(menus = {}) {
    return buildThemeSetupPhp(
      { version: '1.0.0', textDomain: 'test_theme' },
      {},
      [],
      [],
      new Set(),
      {},
      new Set(),
      [],
      '',
      '',
      '',
      '',
      'usernameAndEmail',
      '1',
      '1',
      '0',
      menus
    );
  }

  it('emits add_theme_support(menus) even with no menu locations', () => {
    const php = themeSetup({});
    expect(php).toContain("add_theme_support( 'menus' )");
    expect(php).not.toContain('register_nav_menus(array(');
  });

  it('registers locations loaded from cms/menus.ts', () => {
    const php = themeSetup({
      primary: [{ title: 'Home', url: '/' }],
      footer_col_1: [{ title: 'About', url: '/about' }],
    });
    expect(php).toContain("add_theme_support( 'menus' )");
    expect(php).toContain('register_nav_menus');
    expect(php).toContain("'primary'");
    expect(php).toContain("'footer_col_1'");
  });
});



