import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createWpServerClient,
  getWpEditable,
  toNextMetadata,
  WpJsonLd,
  createForgeWpRuntime,
  configureForgeWpRuntime,
  resetForgeWpRuntime,
  createNativeSource,
  ForgeWpRuntimeError,
  normalizeSeoResource,
  normalizeEditableImage,
  normalizeEditablesResource,
} from '../../../react/src/server.ts';
import {
  defineEditable,
  text,
  richText,
  boolean as boolField,
  number as numField,
  image as imageField,
  repeater,
  useWpMeta,
  useWpSeo,
  useWpEditables,
  WpRepeater,
} from '../../../react/src/index.ts';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_NATIVE_EXPORT = process.env.FORGEWP_NATIVE_EXPORT;

function makeJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('R4 (seo) & R5 (editables) contracts, runtime, and helpers (§13–§14)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.FORGEWP_NATIVE_EXPORT;
    resetForgeWpRuntime();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_NATIVE_EXPORT === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = ORIGINAL_NATIVE_EXPORT;
    resetForgeWpRuntime();
    vi.unstubAllGlobals();
  });

  it('R4: normalizeSeoResource, wpClient.getSeo(), toNextMetadata(), and <WpJsonLd> match §13', async () => {
    const rawSeo = {
      path: '/en/contact/',
      lang: 'en',
      provider: 'yoast',
      objectType: 'post',
      objectId: 17,
      title: 'Contact &amp; Press &#8212; Studio',
      description: 'Reach out&#8230;',
      canonical: 'https://example.com/en/contact/',
      robots: { index: true, follow: true, maxSnippet: -1, maxImagePreview: 'large' },
      openGraph: {
        title: 'Contact OG',
        description: 'OG desc',
        type: 'article',
        url: 'https://example.com/en/contact/',
        siteName: 'Studio',
        locale: 'en_US',
        images: [{ url: 'https://wp.example.com/wp-content/uploads/og.jpg', width: 1200, height: 630, alt: 'Contact' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Contact TW',
        description: 'TW desc',
        site: '@studio',
        creator: '@ada',
        images: ['https://wp.example.com/wp-content/uploads/og.jpg'],
      },
      alternates: {
        canonical: 'https://example.com/en/contact/',
        languages: {
          de: 'https://example.com/kontakt/',
          en: 'https://example.com/en/contact/',
          'x-default': 'https://example.com/kontakt/',
        },
      },
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Contact </script><script>alert(1)' },
      ],
    };

    const normalized = normalizeSeoResource(rawSeo);
    expect(normalized?.title).toBe('Contact & Press \u2014 Studio');
    expect(normalized?.alternates.languages['x-default']).toBe('https://example.com/kontakt/');

    const calls = [];
    const client = createWpServerClient({
      wpUrl: 'https://wp.example.com',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        const u = String(url);
        if (u.includes('path=%2Fmissing')) {
          return makeJsonResponse({ code: 'FORGEWP_SEO_NOT_FOUND', message: 'Not found' }, 404);
        }
        if (u.includes('lang=fr')) {
          return makeJsonResponse({ code: 'FORGEWP_LOCALE_NOT_FOUND', message: 'Unknown locale' }, 404);
        }
        return makeJsonResponse(rawSeo, 200);
      },
    });

    const seo = await client.getSeo('/en/contact/', { lang: 'en' });
    expect(seo?.provider).toBe('yoast');
    expect(calls[0].url).toBe('https://wp.example.com/wp-json/forgewp/v1/seo?path=%2Fen%2Fcontact%2F&lang=en');
    expect(calls[0].init.next.tags).toEqual(expect.arrayContaining(['seo', 'seo:path:/en/contact/']));

    expect(await client.getSeo('/missing')).toBeNull();
    await expect(client.getSeo('https://external.example.com/foo')).rejects.toThrowError(ForgeWpRuntimeError);
    await expect(client.getSeo('/en/contact/', { lang: 'fr' })).rejects.toThrowError(ForgeWpRuntimeError);

    const meta = toNextMetadata(seo, { title: 'Fallback' });
    expect(meta).toMatchObject({
      title: 'Contact & Press \u2014 Studio',
      description: 'Reach out\u2026',
      robots: { index: true, follow: true, googleBot: { 'max-image-preview': 'large' } },
      alternates: {
        canonical: 'https://example.com/en/contact/',
        languages: {
          de: 'https://example.com/kontakt/',
          en: 'https://example.com/en/contact/',
          'x-default': 'https://example.com/kontakt/',
        },
      },
    });

    const ldHtml = renderToStaticMarkup(React.createElement(WpJsonLd, { schemas: seo?.jsonLd }));
    expect(ldHtml).toContain('<script type="application/ld+json">');
    expect(ldHtml).not.toContain('</script><script>');
    expect(ldHtml).toContain('\\u003c/script>');
  });

  it('R5: normalizeEditablesResource, wpClient.getEditables(), getEditable(), and getWpEditable() resolve scalars, images, repeaters, and protected posts', async () => {
    const aboutSchema = defineEditable({
      hero_title: text({ default: 'Default Title' }),
      hero_intro: richText({ default: '<p>Default</p>' }),
      show_team: boolField({ default: false }),
      founded_year: numField({ default: 2020 }),
      hero_image: imageField({ default: '/fallback.jpg' }),
      team_members: repeater({
        default: [{ name: 'Default Member', avatar: { url: '/default-avatar.jpg', alt: '' } }],
        fields: {
          name: text(),
          avatar: imageField(),
        },
      }),
    });

    expect(normalizeEditableImage('https://wp.example.com/a.jpg')).toEqual({
      url: 'https://wp.example.com/a.jpg',
      alt: '',
    });

    const locked = normalizeEditablesResource({
      postId: 20,
      postType: 'page',
      path: '/secret/',
      protected: true,
      fields: { hero_title: 'Leaked!' },
    });
    expect(locked?.protected).toBe(true);
    expect(locked?.fields).toEqual({});

    const liveEditables = {
      postId: 15,
      postType: 'page',
      routeId: 'about',
      path: '/about/',
      lang: 'en',
      schema: 'about',
      protected: false,
      fields: {
        hero_title: 'About Our Studio',
        hero_intro: '<p>Built in 2021.</p>\n',
        show_team: '1',
        founded_year: '2021',
        hero_image: { id: 88, url: 'https://wp.example.com/studio.jpg', alt: 'Studio' },
        team_members: [
          { name: 'Ada Lovelace', avatar: 'https://wp.example.com/ada.jpg' },
        ],
      },
    };

    const calls = [];
    const client = createWpServerClient({
      wpUrl: 'https://wp.example.com',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        const u = String(url);
        if (u.includes('schema=missing')) {
          return makeJsonResponse({ code: 'FORGEWP_EDITABLE_SCHEMA_NOT_FOUND', message: 'No schema' }, 404);
        }
        return makeJsonResponse(liveEditables, 200);
      },
    });

    await expect(client.getEditables({})).rejects.toThrowError(ForgeWpRuntimeError);
    await expect(client.getEditables({ routeId: 'about', schema: 'missing' })).rejects.toThrowError(ForgeWpRuntimeError);

    const resolved = await client.getEditable(aboutSchema, { routeId: 'about', lang: 'en' });
    expect(calls[1].url).toBe('https://wp.example.com/wp-json/forgewp/v1/editables?routeId=about&lang=en');
    expect(calls[1].init.next.tags).toEqual(expect.arrayContaining(['editables', 'route:about']));
    expect(resolved).toEqual({
      hero_title: 'About Our Studio',
      hero_intro: '<p>Built in 2021.</p>\n',
      show_team: true,
      founded_year: 2021,
      hero_image: { id: 88, url: 'https://wp.example.com/studio.jpg', alt: 'Studio' },
      team_members: [
        { name: 'Ada Lovelace', avatar: { url: 'https://wp.example.com/ada.jpg', alt: '' } },
      ],
    });

    // Empty fields fall back to schema defaults
    const emptyResolved = getWpEditable(aboutSchema, {
      postId: 15,
      postType: 'page',
      path: '/about/',
      protected: false,
      fields: { hero_title: '', team_members: [] },
    });
    expect(emptyResolved.hero_title).toBe('Default Title');
    expect(emptyResolved.team_members).toEqual([
      { name: 'Default Member', avatar: { url: '/default-avatar.jpg', alt: '' } },
    ]);
  });

  it('R4 & R5 runtime + hooks + <WpRepeater> read native hydration and primed decoupled resources', async () => {
    vi.stubGlobal('window', {
      forgeWpHydration: {
        resources: {
          seo: {
            path: '/about/',
            provider: 'rankmath',
            objectType: 'post',
            objectId: 15,
            title: 'Native SEO Title',
            description: 'Native desc',
            canonical: 'https://example.com/about/',
            robots: { index: true, follow: true },
            openGraph: { title: 'Native SEO Title', description: 'Native desc', type: 'article', url: 'https://example.com/about/', siteName: 'Studio', locale: 'en_US', images: [] },
            twitter: { card: 'summary', title: 'Native SEO Title', description: 'Native desc', site: '', creator: '', images: [] },
            alternates: { canonical: 'https://example.com/about/', languages: {} },
            jsonLd: [],
          },
          editables: {
            postId: 15,
            postType: 'page',
            routeId: 'about',
            path: '/about/',
            protected: false,
            fields: {
              hero_title: 'Native Hero',
              team_members: [{ name: 'Native Ada' }],
            },
          },
        },
      },
    });

    const nativeSource = createNativeSource();
    expect(nativeSource.peek('seo')?.title).toBe('Native SEO Title');
    expect(nativeSource.peek('editables')?.fields?.hero_title).toBe('Native Hero');

    function Probe() {
      const { seo } = useWpSeo('/about/');
      const { fields } = useWpEditables({ path: '/about/' });
      const title = useWpMeta('hero_title', 'Fallback');
      return React.createElement(
        'div',
        null,
        `${seo?.title || ''}|${String(fields.hero_title || '')}|${title}`,
        React.createElement(
          WpRepeater,
          { name: 'team_members', defaultValue: [{ name: 'Default' }] },
          (row) => React.createElement('span', { key: row.name }, row.name),
        ),
      );
    }

    expect(renderToStaticMarkup(React.createElement(Probe))).toBe(
      '<div>Native SEO Title|Native Hero|Native Hero<span>Native Ada</span></div>',
    );

    // Primed decoupled runtime drives useWpSeo, useWpEditables, useWpMeta, and <WpRepeater>
    vi.stubGlobal('window', {});
    const runtime = configureForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.com',
    });
    runtime.prime(
      'seo',
      {
        path: '/about/',
        provider: 'yoast',
        objectType: 'post',
        objectId: 15,
        title: 'Decoupled SEO Title',
        description: '',
        canonical: 'https://example.com/about/',
        robots: { index: true, follow: true },
        openGraph: { title: 'Decoupled SEO Title', description: '', type: 'article', url: 'https://example.com/about/', siteName: 'Studio', locale: 'en_US', images: [] },
        twitter: { card: 'summary', title: 'Decoupled SEO Title', description: '', site: '', creator: '', images: [] },
        alternates: { canonical: 'https://example.com/about/', languages: {} },
        jsonLd: [],
      },
      { query: { path: '/about/' } },
    );
    runtime.prime('editables', {
      postId: 15,
      postType: 'page',
      path: '/about/',
      protected: false,
      fields: {
        hero_title: 'Decoupled Hero',
        team_members: [{ name: 'Decoupled Grace' }],
      },
    });

    expect(renderToStaticMarkup(React.createElement(Probe))).toBe(
      '<div>Decoupled SEO Title|Decoupled Hero|Decoupled Hero<span>Decoupled Grace</span></div>',
    );
  });
});
