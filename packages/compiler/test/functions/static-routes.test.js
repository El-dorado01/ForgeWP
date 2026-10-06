import { describe, it, expect } from 'vitest';
import { collectFallbackPageRoutes } from '../../lib/collect-static-routes.js';
import { collectPageTemplateRoutes } from '../../lib/collect-page-template-routes.js';
import { buildThemeSetupPhp } from '../../lib/functions/theme-setup.js';
import { buildPlaceholderPagePhp } from '../../lib/php-builders.js';

describe('collectFallbackPageRoutes', () => {
  it('creates an About page from menus so /about is not guessed as about-a-chair', () => {
    const pages = collectFallbackPageRoutes({
      menus: {
        primary: [
          { title: 'Studio', url: '/about' },
          { title: 'Shop', url: '/shop' },
          {
            title: 'Furniture',
            url: '/category/furniture',
            children: [
              { title: 'About A Chair', url: '/product/about-a-chair-aa51' },
            ],
          },
        ],
        footer_col_1: [{ title: 'About Us', url: '/about' }],
      },
      existingSlugs: ['shop', 'studio'],
    });

    expect(pages.map((p) => p.slug)).toContain('about');
    expect(pages.find((p) => p.slug === 'about').template).toBe(
      'page-placeholder.php',
    );
    expect(pages.map((p) => p.slug)).not.toContain('shop');
    expect(pages.map((p) => p.slug)).not.toContain('category/furniture');
    expect(pages.map((p) => p.slug)).not.toContain(
      'product/about-a-chair-aa51',
    );
  });

  it('picks up static placeholder routes from routes.tsx', () => {
    const pages = collectFallbackPageRoutes({
      routesSource: `
        function Routes() {
          return <>
            <Route path="/about" />
            <Route path="/contact" />
            <Route path="/product/:slug" />
            <Route path="/category/:slug" />
            <Route path="/cart" />
          </>;
        }
      `,
      existingSlugs: [],
    });
    const slugs = pages.map((p) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(['about', 'contact']));
    expect(slugs).not.toContain('product/:slug');
    expect(slugs).not.toContain('cart');
  });

  it('ignores JSX route examples in comments and strings', () => {
    const pages = collectFallbackPageRoutes({
      routesSource: `
        // Example: <Route path="/about" />
        const example = '<Route path="/fake" />';
        export function Routes() {
          return <Route path="/contact" />;
        }
      `,
    });

    expect(pages.map((page) => page.slug)).toEqual(['contact']);
  });

  it('does not create a WordPress route from a fragment-only link', () => {
    const pages = collectFallbackPageRoutes({
      menus: {
        primary: [{ title: 'About', url: '/#about' }],
      },
    });

    expect(pages).toEqual([]);
  });

  it('extracts custom title and description from routes.tsx and overrides menu labels', () => {
    const pages = collectFallbackPageRoutes({
      menus: {
        primary: [{ title: 'Studio', url: '/about' }],
      },
      routesSource: `
        <Route path="/about">
          {() =>
            withLayout(PlaceholderPage)({
              title: 'About',
              description: 'Editorial brand story page (Demo 34 energy) — next phase.',
            })
          }
        </Route>
      `,
      existingSlugs: [],
    });

    const aboutPage = pages.find((p) => p.slug === 'about');
    expect(aboutPage).toBeDefined();
    expect(aboutPage.title).toBe('About');
    expect(aboutPage.description).toBe(
      'Editorial brand story page (Demo 34 energy) — next phase.',
    );
  });
});

describe('collectPageTemplateRoutes', () => {
  it('maps nested menu templates and prefers the named page template once', () => {
    const routes = collectPageTemplateRoutes(
      [
        'teamlizenz-page',
        'lizenz-team',
        'unternehmenslizenz-page',
        'lizenz-unternehmen',
        'einzellizenz-page',
        'checkout-single-license',
      ],
      {
        primary: [
          {
            title: 'Lizenzen',
            url: '/lizenzen',
            children: [
              { title: 'Einzellizenz', url: '/checkout/single-license' },
              { title: 'Teamlizenz', url: '/lizenz/team' },
              { title: 'Unternehmenslizenz', url: '/lizenz/unternehmen' },
            ],
          },
        ],
      },
    );

    expect(routes).toEqual(
      expect.arrayContaining([
        {
          title: 'Teamlizenz',
          slug: 'lizenz/team',
          template: 'page-teamlizenz-page.php',
        },
        {
          title: 'Unternehmenslizenz',
          slug: 'lizenz/unternehmen',
          template: 'page-unternehmenslizenz-page.php',
        },
        {
          title: 'Einzellizenz',
          slug: 'checkout/single-license',
          template: 'page-einzellizenz-page.php',
        },
      ]),
    );
    expect(routes).toHaveLength(3);
  });
});

describe('404 permalink guessing', () => {
  it('disables WordPress fuzzy 404 redirects in theme setup', () => {
    const php = buildThemeSetupPhp(
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
      {},
    );
    expect(php).toContain(
      "add_filter('do_redirect_guess_404_permalink', '__return_false')",
    );
  });

  it('emits a Coming Next page template with dynamic description support', () => {
    const php = buildPlaceholderPagePhp();
    expect(php).toContain('Template Name: Coming Next');
    expect(php).toContain('Coming next');
    expect(php).toContain('get_the_title()');
    expect(php).toContain('$forgewp_page_desc');
  });
});
