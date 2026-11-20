import { describe, expect, it, vi } from 'vitest';

const { loadFrameworkAdapter } = vi.hoisted(() => ({
  loadFrameworkAdapter: vi.fn(),
}));
vi.mock('../../lib/framework-adapter.js', () => ({ loadFrameworkAdapter }));

import {
  normalizeStaticRoutePath,
  renderStaticMarkup,
  resolveStaticPageRoute,
  validateStaticMarkup,
} from '../../lib/render-static.js';

describe('renderStaticMarkup and static route contract', () => {
  it('accepts legacy React/HTML markup objects with no routes field', async () => {
    const legacy = {
      appHtml: '<main>Hello</main>',
      headerHtml: '<header>Nav</header>',
      footerHtml: '<footer>Foot</footer>',
      headHtml: '<title>Legacy</title>',
      singleHtml: '',
      singleHeadHtml: '',
      notFoundHtml: '',
      archiveHtml: '',
    };
    loadFrameworkAdapter.mockResolvedValue({
      renderStaticMarkup: vi.fn().mockResolvedValue(legacy),
    });

    const result = await renderStaticMarkup('/theme', 'react');
    expect(result).toBe(legacy);
    expect(loadFrameworkAdapter).toHaveBeenLastCalledWith('react');
  });

  it('accepts additive route-backed markup records', async () => {
    const markup = {
      appHtml: '<main>Home</main>',
      headerHtml: '<header>Shared</header>',
      footerHtml: '<footer>Shared</footer>',
      headHtml: '<title>Home</title>',
      layout: { lang: 'en', sharedHeaderDetected: true, sharedFooterDetected: true },
      routes: [
        {
          path: '/',
          kind: 'home',
          title: 'Home',
          html: '<main>Home</main>',
          headHtml: '<title>Home</title>',
          layoutExtracted: true,
          assets: {
            stylesheets: ['_next/static/css/app.css'],
            clientScripts: ['_next/static/chunks/main.js'],
            strippedRuntime: { rscPayloadCount: 2, scriptCount: 1, preloadCount: 1 },
          },
        },
        {
          path: '/docs/getting-started/',
          kind: 'page',
          title: 'Getting Started',
          html: '<main>Docs</main>',
          headHtml: '<title>Getting Started</title>',
          layoutExtracted: true,
        },
        {
          path: '/404',
          kind: 'not-found',
          html: '<main>Not found</main>',
        },
      ],
    };
    loadFrameworkAdapter.mockResolvedValue({
      renderStaticMarkup: vi.fn().mockResolvedValue(markup),
    });

    expect(await renderStaticMarkup('/theme', 'custom')).toBe(markup);
    expect(resolveStaticPageRoute(markup.routes[1])).toMatchObject({
      path: '/docs/getting-started',
      slug: 'docs/getting-started',
      templateSlug: 'docs-getting-started',
      title: 'Getting Started',
    });
  });

  it('rejects adapters missing renderStaticMarkup()', async () => {
    loadFrameworkAdapter.mockResolvedValue({});
    await expect(renderStaticMarkup('/theme', 'stub')).rejects.toThrow(
      'Framework adapter must expose renderStaticMarkup() - adapter=stub',
    );
  });

  it.each([undefined, null, {}, { appHtml: 42 }, { appHtml: '<p>ok</p>', headerHtml: 123 }])(
    'rejects malformed static markup %j',
    (bad) => {
      expect(() => validateStaticMarkup(bad, 'custom')).toThrow('invalid static markup');
    },
  );

  it('rejects duplicate normalized route paths and colliding page templateSlugs', () => {
    expect(() =>
      validateStaticMarkup(
        {
          appHtml: '<main>Home</main>',
          routes: [
            { path: '/about', kind: 'page', html: '<p>1</p>' },
            { path: '/about/', kind: 'page', html: '<p>2</p>' },
          ],
        },
        'custom',
      ),
    ).toThrow('duplicate route path "/about"');

    expect(() =>
      validateStaticMarkup(
        {
          appHtml: '<main>Home</main>',
          routes: [
            { path: '/docs/intro', kind: 'page', html: '<p>1</p>' },
            { path: '/docs-intro', kind: 'page', html: '<p>2</p>' },
          ],
        },
        'custom',
      ),
    ).toThrow('colliding templateSlug "docs-intro"');
  });

  it('rejects dynamic bracket segments and malformed route assets', () => {
    expect(() =>
      validateStaticMarkup(
        {
          appHtml: '<main>Home</main>',
          routes: [{ path: '/blog/[slug]', kind: 'page', html: '<p>dyn</p>' }],
        },
        'custom',
      ),
    ).toThrow('not supported');

    expect(() =>
      validateStaticMarkup(
        {
          appHtml: '<main>Home</main>',
          routes: [
            {
              path: '/',
              kind: 'home',
              html: '<main />',
              assets: { stylesheets: ['ok.css'], clientScripts: [123] },
            },
          ],
        },
        'custom',
      ),
    ).toThrow('invalid assets');
  });

  it('normalizes route paths consistently', () => {
    expect(normalizeStaticRoutePath('/')).toBe('/');
    expect(normalizeStaticRoutePath('/about/')).toBe('/about');
    expect(normalizeStaticRoutePath('/about/?from=home#details')).toBe('/about');
    expect(normalizeStaticRoutePath('about')).toBe('');
  });
});
