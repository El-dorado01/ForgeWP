import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createWpServerClient,
  createForgeWpRuntime,
  configureForgeWpRuntime,
  resetForgeWpRuntime,
  createNativeSource,
  ForgeWpRuntimeError,
  normalizeMenusCollection,
  normalizeRoutesResource,
  normalizeI18nResource,
} from '../../../react/src/server.ts';
import {
  useWpMenu,
  useWpPageLink,
  useWpI18n,
  useWpLanguage,
} from '../../../react/src/hooks.ts';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_NATIVE_EXPORT = process.env.FORGEWP_NATIVE_EXPORT;

function makeJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('Phase C: menus, routes, and i18n contracts (React runtime + server client + hooks)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.FORGEWP_NATIVE_EXPORT;
    resetForgeWpRuntime();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_NATIVE_EXPORT === undefined) {
      delete process.env.FORGEWP_NATIVE_EXPORT;
    } else {
      process.env.FORGEWP_NATIVE_EXPORT = ORIGINAL_NATIVE_EXPORT;
    }
    resetForgeWpRuntime();
    vi.unstubAllGlobals();
  });

  it('normalizes menus, routes, and i18n payloads to canonical Phase C shapes', () => {
    // Menus: single-location response + external flag
    const singleMenu = normalizeMenusCollection({
      location: 'primary',
      lang: 'de',
      items: [
        {
          id: 10,
          title: 'Über uns',
          url: 'https://wp.example.test/de/ueber-uns/',
          path: '/de/ueber-uns/',
          children: [],
        },
        {
          id: 11,
          title: 'Docs',
          url: 'https://docs.example.org/guide',
          path: 'https://docs.example.org/guide',
          target: '_blank',
          external: true,
          children: [],
        },
      ],
    });
    expect(singleMenu?.lang).toBe('de');
    expect(singleMenu?.menus.primary).toHaveLength(2);
    expect(singleMenu?.menus.primary[1].external).toBe(true);
    expect(singleMenu?.menus.primary[1].path).toBe('https://docs.example.org/guide');

    // Routes: derives pageLinks when omitted
    const routes = normalizeRoutesResource({
      homeUrl: 'https://wp.example.test/',
      basePath: '',
      lang: 'en',
      routes: [
        {
          routeId: 'about',
          id: 42,
          slug: 'about',
          title: 'About',
          path: '/about/',
          permalink: 'https://wp.example.test/about/',
        },
      ],
    });
    expect(routes?.pageLinks.about).toBe('/about/');
    expect(routes?.lang).toBe('en');

    // I18n: derives locales & defaultLocale cleanly
    const i18n = normalizeI18nResource({
      currentLanguage: 'fr',
      translations: { fr: { Home: 'Accueil' } },
      urls: { en: '/', fr: '/fr/' },
      homeUrls: { en: '/', fr: '/fr/' },
    });
    expect(i18n?.currentLanguage).toBe('fr');
    expect(i18n?.defaultLocale).toBe('fr');
    expect(i18n?.locales).toEqual(['en', 'fr']);
  });

  it('wpClient.getMenu() and getMenus() fetch canonical REST routes with cache tags, cache sharing, and 404 FORGEWP_LOCALE_NOT_FOUND errors', async () => {
    const calls = [];
    const mockFetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('lang=xx')) {
        return makeJsonResponse(
          { code: 'FORGEWP_LOCALE_NOT_FOUND', message: 'Unknown locale "xx".' },
          404,
        );
      }
      if (String(url).includes('/menus/primary')) {
        return makeJsonResponse({
          location: 'primary',
          lang: 'de',
          items: [
            {
              id: 1,
              title: 'Start',
              url: 'https://wp.example.test/de/',
              path: '/de/',
              children: [],
            },
            {
              id: 2,
              title: 'External',
              url: 'https://external.example.com',
              path: 'https://external.example.com',
              external: true,
              children: [],
            },
          ],
        });
      }
      if (String(url).includes('/menus')) {
        return makeJsonResponse({
          lang: 'en',
          menus: {
            primary: [
              { id: 1, title: 'Home', url: 'https://wp.example.test/', path: '/', children: [] },
            ],
            footer: [
              {
                id: 2,
                title: 'Privacy',
                url: 'https://wp.example.test/privacy/',
                path: '/privacy/',
                children: [],
              },
            ],
          },
        });
      }
      return makeJsonResponse({}, 404);
    };

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: mockFetch,
    });

    // Single menu with lang
    const dePrimary = await client.getMenu('primary', { lang: 'de' });
    expect(dePrimary).toHaveLength(2);
    expect(dePrimary[1].external).toBe(true);
    expect(calls[0].url).toBe('https://wp.example.test/wp-json/forgewp/v1/menus/primary?lang=de');
    expect(calls[0].init.next.tags).toEqual(expect.arrayContaining(['menus', 'menu:primary']));

    // Collection populates per-location cache
    const enAll = await client.getMenus({ lang: 'en' });
    expect(Object.keys(enAll.menus)).toEqual(['primary', 'footer']);
    expect(calls[1].url).toBe('https://wp.example.test/wp-json/forgewp/v1/menus?lang=en');
    expect(calls[1].init.next.tags).toEqual(expect.arrayContaining(['menus']));

    const countBeforeCachedRead = calls.length;
    const cachedFooter = await client.getMenu('footer', { lang: 'en' });
    expect(cachedFooter[0].title).toBe('Privacy');
    expect(calls.length).toBe(countBeforeCachedRead);

    // Unknown locale -> typed ForgeWpRuntimeError
    await expect(client.getMenu('primary', { lang: 'xx' })).rejects.toThrowError(
      ForgeWpRuntimeError,
    );
    await expect(client.getMenus({ lang: 'xx' })).rejects.toThrowError(ForgeWpRuntimeError);
  });

  it('wpClient.getRoutes() and getI18n() support lang/path params, cache tags, fixtures, and 404 FORGEWP_LOCALE_NOT_FOUND', async () => {
    const calls = [];
    const mockFetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('lang=xx')) {
        return makeJsonResponse(
          { code: 'FORGEWP_LOCALE_NOT_FOUND', message: 'Unknown locale "xx".' },
          404,
        );
      }
      if (String(url).includes('/routes')) {
        return makeJsonResponse({
          homeUrl: 'https://wp.example.test/',
          basePath: '',
          lang: 'de',
          routes: [
            {
              routeId: 'about',
              id: 5,
              slug: 'ueber-uns',
              title: 'Über uns',
              path: '/de/ueber-uns/',
              permalink: 'https://wp.example.test/de/ueber-uns/',
            },
          ],
          pageLinks: {
            about: '/de/ueber-uns/',
          },
        });
      }
      if (String(url).includes('/i18n')) {
        return makeJsonResponse({
          currentLanguage: 'de',
          defaultLocale: 'en',
          locales: ['en', 'de'],
          translations: { de: { 'Read more': 'Mehr lesen' } },
          urls: { en: '/about/', de: '/de/ueber-uns/' },
          homeUrls: { en: '/', de: '/de/' },
        });
      }
      return makeJsonResponse({}, 404);
    };

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: mockFetch,
    });

    const routes = await client.getRoutes({ lang: 'de' });
    expect(routes.pageLinks.about).toBe('/de/ueber-uns/');
    expect(calls[0].url).toBe('https://wp.example.test/wp-json/forgewp/v1/routes?lang=de');
    expect(calls[0].init.next.tags).toEqual(expect.arrayContaining(['routes']));

    const href = await client.getRouteHref('about', '/about', { lang: 'de' });
    expect(href).toBe('/de/ueber-uns/');

    const i18n = await client.getI18n({ lang: 'de', path: '/de/ueber-uns/' });
    expect(i18n.currentLanguage).toBe('de');
    expect(i18n.defaultLocale).toBe('en');
    expect(i18n.locales).toEqual(['en', 'de']);
    expect(i18n.translations.de['Read more']).toBe('Mehr lesen');
    expect(calls[1].url).toBe(
      'https://wp.example.test/wp-json/forgewp/v1/i18n?lang=de&path=%2Fde%2Fueber-uns%2F',
    );
    expect(calls[1].init.next.tags).toEqual(expect.arrayContaining(['i18n', 'i18n:de']));

    await expect(client.getRoutes({ lang: 'xx' })).rejects.toThrowError(ForgeWpRuntimeError);
    await expect(client.getI18n({ lang: 'xx' })).rejects.toThrowError(ForgeWpRuntimeError);

    // Fixture fallback when no wpUrl
    const fixtureClient = createWpServerClient({
      fixtures: {
        page: [{ id: 1, slug: 'contact', routeId: 'contact', title: 'Contact' }],
      },
      i18n: {
        currentLanguage: 'en',
        defaultLocale: 'en',
        locales: ['en', 'es'],
        translations: { en: { Hello: 'Hello' }, es: { Hello: 'Hola' } },
        urls: { en: '/', es: '/es/' },
        homeUrls: { en: '/', es: '/es/' },
      },
    });
    const fixtureRoutes = await fixtureClient.getRoutes();
    expect(fixtureRoutes.pageLinks.contact).toBe('/contact');
    const fixtureI18n = await fixtureClient.getI18n({ lang: 'es' });
    expect(fixtureI18n.currentLanguage).toBe('es');
    expect(fixtureI18n.locales).toEqual(['en', 'es']);
  });

  it('ForgeWpRuntime restSource and nativeSource resolve canonical Phase C resources with cache tags', async () => {
    const fetched = [];
    const runtime = createForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
      fetch: async (url, init) => {
        fetched.push({ url: String(url), init });
        if (String(url).includes('/menus/primary')) {
          return makeJsonResponse({
            location: 'primary',
            lang: 'de',
            items: [{ id: 1, title: 'Start', url: '/de/', path: '/de/', children: [] }],
          });
        }
        if (String(url).includes('/i18n')) {
          return makeJsonResponse({
            currentLanguage: 'de',
            defaultLocale: 'en',
            locales: ['en', 'de'],
            translations: { de: { Hi: 'Hallo' } },
            urls: { en: '/', de: '/de/' },
            homeUrls: { en: '/', de: '/de/' },
          });
        }
        return makeJsonResponse({}, 404);
      },
    });

    const menus = await runtime.get('menus', { slug: 'primary', query: { lang: 'de' } });
    expect(menus?.menus.primary[0].title).toBe('Start');
    expect(fetched[0].init.next.tags).toEqual(expect.arrayContaining(['menus', 'menu:primary']));
    // Merged into collection cache so peek('menus', { slug: 'primary' }) works
    expect(runtime.peek('menus', { slug: 'primary' })?.menus.primary[0].title).toBe('Start');

    const i18n = await runtime.get('i18n', { query: { lang: 'de' } });
    expect(i18n?.translations.de.Hi).toBe('Hallo');
    expect(fetched[1].init.next.tags).toEqual(expect.arrayContaining(['i18n', 'i18n:de']));

    // Canonical nativeSource reads window.forgeWpHydration.resources.{menus,routes,i18n}
    vi.stubGlobal('window', {
      forgeWpHydration: {
        resources: {
          menus: {
            lang: 'en',
            menus: {
              primary: [{ id: 9, title: 'Canonical Home', url: '/', path: '/', children: [] }],
            },
          },
          routes: {
            homeUrl: 'https://wp.example.test/',
            basePath: '',
            routes: [
              {
                routeId: 'pricing',
                id: 7,
                slug: 'pricing',
                title: 'Pricing',
                path: '/pricing/',
                permalink: 'https://wp.example.test/pricing/',
              },
            ],
            pageLinks: { pricing: '/pricing/' },
          },
          i18n: {
            currentLanguage: 'en',
            defaultLocale: 'en',
            locales: ['en', 'de'],
            translations: { en: { CTA: 'Get Started' } },
            urls: { en: '/pricing/', de: '/de/preise/' },
            homeUrls: { en: '/', de: '/de/' },
          },
        },
      },
    });

    const nativeSource = createNativeSource();
    expect(nativeSource.peek('menus')?.menus.primary[0].title).toBe('Canonical Home');
    expect(nativeSource.peek('routes')?.pageLinks.pricing).toBe('/pricing/');
    expect(nativeSource.peek('i18n')?.defaultLocale).toBe('en');
    expect(nativeSource.peek('i18n')?.locales).toEqual(['en', 'de']);
  });

  it('useWpMenu, useWpPageLink, useWpI18n, and useWpLanguage read canonical native hydration and primed decoupled runtime', () => {
    function PhaseCProbe() {
      const { items } = useWpMenu('primary');
      const aboutHref = useWpPageLink('about', '/fallback-about');
      const { __ } = useWpI18n();
      const { currentLanguage, defaultLocale, locales } = useWpLanguage();
      return React.createElement(
        'div',
        null,
        `${items.map((i) => i.title).join(',')}|${aboutHref}|${__('Welcome')}|${currentLanguage}/${defaultLocale}/${locales.join(',')}`,
      );
    }

    // 1. Canonical native hydration (`resources.*`)
    vi.stubGlobal('window', {
      forgeWpHydration: {
        resources: {
          menus: {
            menus: {
              primary: [{ id: 1, title: 'Docs', url: '/docs', path: '/docs', children: [] }],
            },
          },
          routes: {
            homeUrl: '/',
            basePath: '',
            routes: [],
            pageLinks: { about: '/about-us' },
          },
          i18n: {
            currentLanguage: 'de',
            defaultLocale: 'en',
            locales: ['en', 'de'],
            translations: { de: { Welcome: 'Willkommen' } },
            urls: { en: '/about', de: '/de/ueber-uns' },
            homeUrls: { en: '/', de: '/de/' },
          },
        },
      },
    });
    expect(renderToStaticMarkup(React.createElement(PhaseCProbe))).toBe(
      '<div>Docs|/about-us|Willkommen|de/en/en,de</div>',
    );

    // 2. Primed decoupled runtime (no native hydration on window)
    vi.stubGlobal('window', {});
    const runtime = configureForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
    });
    runtime.prime('menus', {
      menus: {
        primary: [{ id: 2, title: 'Blog', url: '/blog', path: '/blog', children: [] }],
      },
    });
    runtime.prime('routes', {
      homeUrl: 'https://wp.example.test/',
      basePath: '',
      routes: [],
      pageLinks: { about: '/company/about' },
    });
    runtime.prime('i18n', {
      currentLanguage: 'fr',
      defaultLocale: 'en',
      locales: ['en', 'fr'],
      translations: { fr: { Welcome: 'Bienvenue' } },
      urls: { en: '/', fr: '/fr/' },
      homeUrls: { en: '/', fr: '/fr/' },
    });

    expect(renderToStaticMarkup(React.createElement(PhaseCProbe))).toBe(
      '<div>Blog|/company/about|Bienvenue|fr/en/en,fr</div>',
    );
  });
});
