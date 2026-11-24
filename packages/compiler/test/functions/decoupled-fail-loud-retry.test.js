import { describe, expect, it, afterEach } from 'vitest';
import {
  createWpServerClient,
  ForgeWpRuntimeError,
  defineEditable,
  text,
  richText,
  image,
  boolean,
  repeater,
  color,
  url,
  select,
  number,
  icon,
  WpPostTerms,
  WpTermsLoop,
} from '../../../react/src/server.ts';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { processMarkup } from '../../lib/markup-processor.js';
import { buildContentResourcesPhp } from '../../lib/functions/content-resources.js';

describe('Task 1 & Task 3: decoupled fail-loud retry, schema exports, separator prop, live getTerm', () => {
  const prevMode = process.env.FORGEWP_DEPLOYMENT_MODE;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevExport = process.env.FORGEWP_NATIVE_EXPORT;

  afterEach(() => {
    if (prevMode === undefined) delete process.env.FORGEWP_DEPLOYMENT_MODE;
    else process.env.FORGEWP_DEPLOYMENT_MODE = prevMode;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
  });

  it('retries once (~300ms) and succeeds in decoupled mode when first WordPress response fails', async () => {
    process.env.FORGEWP_DEPLOYMENT_MODE = 'decoupled';
    let menuAttempts = 0;
    let settingsAttempts = 0;

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      menus: {
        primary: [{ id: 99, title: 'Fixture Fallback', url: '/fixture', path: '/fixture', children: [] }],
      },
      siteOptions: { contact_phone: 'fixture-phone' },
      fetch: async (rawUrl) => {
        const u = String(rawUrl);
        if (u.includes('/forgewp/v1/menus/primary')) {
          menuAttempts++;
          if (menuAttempts === 1) {
            return new Response('Service Unavailable', { status: 503 });
          }
          return new Response(
            JSON.stringify({
              location: 'primary',
              items: [{ id: 1, title: 'Live Contact', url: 'https://wp.example.test/contact/', path: '/contact/', children: [] }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (u.includes('/forgewp/v1/site-settings')) {
          settingsAttempts++;
          if (settingsAttempts === 1) {
            return new Response('not-json{{{', { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(
            JSON.stringify({
              options: { contact_phone: '+1 (555) 010-2000' },
              themeMods: {},
              site: { name: 'Live', description: '', url: 'https://wp.example.test', homeUrl: 'https://wp.example.test', language: 'en' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      },
    });

    const menu = await client.getMenu('primary');
    expect(menuAttempts).toBe(2);
    expect(menu).toHaveLength(1);
    expect(menu[0].title).toBe('Live Contact');

    const settings = await client.getSiteSettings();
    expect(settingsAttempts).toBe(2);
    expect(settings.options.contact_phone).toBe('+1 (555) 010-2000');
  });

  it('throws ForgeWpRuntimeError and NEVER caches fixture fallback when decoupled fetch fails twice', async () => {
    process.env.FORGEWP_DEPLOYMENT_MODE = 'decoupled';
    let failAll = true;
    let calls = 0;

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      menus: {
        primary: [{ id: 99, title: 'Fixture Fallback', url: '/fixture', path: '/fixture', children: [] }],
      },
      siteOptions: { contact_phone: 'fixture-phone' },
      fetch: async (rawUrl) => {
        calls++;
        if (failAll) {
          return new Response(JSON.stringify({ message: 'Backend down' }), { status: 503 });
        }
        const u = String(rawUrl);
        if (u.includes('/menus/primary')) {
          return new Response(
            JSON.stringify({
              location: 'primary',
              items: [{ id: 5, title: 'Recovered Item', url: '/recovered', path: '/recovered', children: [] }],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            options: { contact_phone: 'recovered-phone' },
            themeMods: {},
            site: { name: 'Recovered', description: '', url: 'https://wp.example.test', homeUrl: 'https://wp.example.test', language: 'en' },
          }),
          { status: 200 },
        );
      },
    });

    await expect(client.getMenu('primary')).rejects.toThrowError(ForgeWpRuntimeError);
    expect(calls).toBe(2);

    await expect(client.getSiteSettings()).rejects.toThrowError(ForgeWpRuntimeError);
    expect(calls).toBe(4);

    // Must not have poisoned cache with fixture fallbacks: subsequent healthy call returns live data.
    failAll = false;
    const recoveredMenu = await client.getMenu('primary');
    expect(recoveredMenu[0].title).toBe('Recovered Item');
    const recoveredSettings = await client.getSiteSettings();
    expect(recoveredSettings.options.contact_phone).toBe('recovered-phone');
  });

  it('retries and throws in NODE_ENV=production when wpUrl fails twice, while plain local dev returns fixtures', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FORGEWP_DEPLOYMENT_MODE;

    const prodClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      menus: { primary: [{ id: 1, title: 'Fixture', url: '/f', path: '/f', children: [] }] },
      fetch: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    await expect(prodClient.getMenus()).rejects.toThrowError(ForgeWpRuntimeError);

    delete process.env.NODE_ENV;
    const localDevClient = createWpServerClient({
      menus: { primary: [{ id: 1, title: 'Local Dev Fixture', url: '/f', path: '/f', children: [] }] },
      siteOptions: { contact_phone: 'local-dev-phone' },
    });
    const devMenu = await localDevClient.getMenu('primary');
    expect(devMenu[0].title).toBe('Local Dev Fixture');
    const devSettings = await localDevClient.getSiteSettings();
    expect(devSettings.options.contact_phone).toBe('local-dev-phone');
  });

  it('rethrows Next.js control-flow errors unchanged without retrying or wrapping in ForgeWpRuntimeError', async () => {
    process.env.FORGEWP_DEPLOYMENT_MODE = 'decoupled';

    const dynamicErr = Object.assign(
      new Error("Dynamic server usage: Route /_not-found couldn't be rendered statically because it used no-store fetch."),
      { digest: 'DYNAMIC_SERVER_USAGE' },
    );
    let calls = 0;

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async () => {
        calls++;
        throw dynamicErr;
      },
    });

    await expect(client.getMenu('primary')).rejects.toBe(dynamicErr);
    expect(calls).toBe(1);

    const redirectErr = { digest: 'NEXT_REDIRECT;replace;/login;307;' };
    let redirectCalls = 0;
    const redirectClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async () => {
        redirectCalls++;
        throw redirectErr;
      },
    });
    await expect(redirectClient.getSiteSettings()).rejects.toBe(redirectErr);
    expect(redirectCalls).toBe(1);

    const notFoundErr = { digest: 'NEXT_NOT_FOUND' };
    let notFoundCalls = 0;
    const notFoundClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async () => {
        notFoundCalls++;
        throw notFoundErr;
      },
    });
    await expect(notFoundClient.getMenu('primary')).rejects.toBe(notFoundErr);
    expect(notFoundCalls).toBe(1);

    const httpFallbackErr = { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' };
    let httpFallbackCalls = 0;
    const httpFallbackClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async () => {
        httpFallbackCalls++;
        throw httpFallbackErr;
      },
    });
    await expect(httpFallbackClient.getMenu('primary')).rejects.toBe(httpFallbackErr);
    expect(httpFallbackCalls).toBe(1);

    const postponeErr = { $$typeof: Symbol.for('react.postpone'), message: 'Prerender postponed' };
    let postponeCalls = 0;
    const postponeClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async () => {
        postponeCalls++;
        throw postponeErr;
      },
    });
    await expect(postponeClient.getMenu('primary')).rejects.toBe(postponeErr);
    expect(postponeCalls).toBe(1);
  });

  it('Task 3a: exports defineEditable and field builders from @forgewp/react/server', () => {
    const schema = defineEditable({
      heading: text({ default: 'Hi' }),
      body: richText({ default: '<p>Body</p>' }),
      hero: image({ default: '/hero.jpg' }),
      show: boolean({ default: true }),
      accent: color({ default: '#000' }),
      href: url({ default: 'https://example.test' }),
      variant: select({ default: 'a', options: ['a', 'b'] }),
      count: number({ default: 3 }),
      glyph: icon({ default: 'star' }),
      cards: repeater({ fields: { title: text({ default: 'One' }) }, default: [] }),
    });
    expect(schema.heading.type).toBe('text');
    expect(schema.cards.type).toBe('repeater');
    expect(schema.glyph.provider).toBe('lucide');
  });

  it('Task 3b & 3c: renders separator in WpTermsLoop/WpPostTerms and live getTerm() PHP tokens', async () => {
    const decoupledHtml = renderToStaticMarkup(
      React.createElement(WpTermsLoop, {
        taxonomy: 'category',
        separator: ', ',
        terms: [
          { id: 1, slug: 'a', name: 'Alpha', description: '', count: 1, parent: 0, path: '/a', permalink: '/a' },
          { id: 2, slug: 'b', name: 'Beta', description: '', count: 2, parent: 0, path: '/b', permalink: '/b' },
        ],
        renderItem: (t) => React.createElement('span', { key: t.id }, t.name),
      }),
    );
    expect(decoupledHtml).toBe('<span>Alpha</span>, <span>Beta</span>');

    const postTermsDecoupled = renderToStaticMarkup(
      React.createElement(WpPostTerms, {
        taxonomy: 'category',
        separator: ' / ',
        terms: [
          { id: 1, slug: 'x', name: 'X', path: '/x' },
          { id: 2, slug: 'y', name: 'Y', path: '/y' },
        ],
        renderItem: (t) => React.createElement('a', { key: t.id, href: t.path }, t.name),
      }),
    );
    expect(postTermsDecoupled).toBe('<a href="/x">X</a> / <a href="/y">Y</a>');

    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const nativeClient = createWpServerClient({});
    const liveTerm = await nativeClient.getTerm('category', 'uncategorized');
    expect(liveTerm?.name).toBe('__FORGEWP_TERM_LOOKUP_NAME__category__uncategorized__');

    const nativeHtml = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(WpTermsLoop, {
          taxonomy: 'category',
          separator: ', ',
          renderItem: (t) => React.createElement('span', { key: t.id }, t.name),
        }),
        React.createElement('p', null, `${liveTerm?.name} ${liveTerm?.path}`),
      ),
    );
    const phpOut = processMarkup(nativeHtml);
    expect(phpOut).toContain("echo esc_html( ', ' );");
    expect(phpOut).toContain("forgewp_native_term('category', 'uncategorized')");
    expect(phpOut).not.toContain('__FORGEWP_TERM_');

    const phpBackend = buildContentResourcesPhp('forgewp');
    expect(phpBackend).toContain('function forgewp_native_term($taxonomy, $slug)');
  });

  it('mirrors queried editables into peek("editables") for <WpRepeater> and useWpMeta() in decoupled mode', async () => {
    const restSourceMod = await import(
      new URL('../../../react/src/runtime/rest-source.ts', import.meta.url).href
    );
    const runtimeMod = await import(
      new URL('../../../react/src/runtime/index.ts', import.meta.url).href
    );

    const payload = {
      objectType: 'post',
      objectId: 42,
      path: '/about/',
      routeId: 'about',
      lang: 'en',
      fields: {
        hero_title: 'About Studio',
        team_members: [{ name: 'Ada', role: 'Lead' }],
      },
      protected: false,
    };

    const source = restSourceMod.createRestSource({
      baseUrl: 'https://wp.example.test/wp-json/forgewp/v1',
      fetch: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    await source.get('editables', { query: { path: '/about/' } });
    const exact = source.peek('editables', { query: { path: '/about/' } });
    expect(exact).toMatchObject({ fields: payload.fields });
    expect(source.peek('editables')).toEqual(exact);

    const runtime = runtimeMod.createForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
      fetch: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    await runtime.get('editables', { query: { path: '/about/' } });
    expect(runtime.peek('editables')?.fields?.hero_title).toBe('About Studio');
    expect(runtime.peek('editables')?.fields?.team_members).toEqual([
      { name: 'Ada', role: 'Lead' },
    ]);
  });
});
