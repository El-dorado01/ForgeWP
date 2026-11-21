import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createWpServerClient,
  getWpEditable,
  WpQueryLoop,
  WpServerLoop,
  WpMenu,
  WpServerMenu,
  WpRequireAuth,
  WpServerRequireAuth,
  WpAuthGate,
  WpServerAuthGate,
  BlockArea,
  Hydrate,
  defineWpPosts,
  defineWpMenus,
  defineWpForm,
  defineWpOptions,
} from '../../../react/src/server.ts';

const REACT_PKG_JSON = path.resolve(
  import.meta.dirname,
  '../../../react/package.json',
);

describe('Unified @forgewp/react API & react-server conditional export', () => {
  afterEach(() => {
    delete process.env.FORGEWP_NATIVE_EXPORT;
    delete globalThis._forgeWpCompileTime;
  });

  it('declares types first and react-server -> ./src/server.ts on the root export', () => {
    const pkg = JSON.parse(readFileSync(REACT_PKG_JSON, 'utf8'));
    const rootExport = pkg.exports['.'];
    const keys = Object.keys(rootExport);
    expect(keys[0]).toBe('types');
    expect(rootExport['react-server']).toBe('./src/server.ts');
    expect(rootExport.import).toBe('./src/index.ts');
    expect(pkg.exports['./server']).toBeDefined();
    expect(pkg.exports['./config']).toBeDefined();
  });

  it('exposes unified component aliases and pure config helpers from the server entrypoint', () => {
    expect(WpQueryLoop).toBe(WpServerLoop);
    expect(WpMenu).toBe(WpServerMenu);
    expect(WpRequireAuth).toBe(WpServerRequireAuth);
    expect(WpAuthGate).toBe(WpServerAuthGate);
    expect(typeof BlockArea).toBe('function');
    expect(typeof Hydrate).toBe('function');
    expect(typeof defineWpPosts).toBe('function');
    expect(typeof defineWpMenus).toBe('function');
    expect(typeof defineWpForm).toBe('function');
    expect(typeof defineWpOptions).toBe('function');
  });

  it('supports function children on unified WpQueryLoop in both fixture and native export modes', () => {
    const samplePosts = [
      {
        id: 1,
        slug: 'hello-world',
        postType: 'post',
        title: 'Hello World',
        excerpt: 'First post',
        content: '<p>Hi</p>',
        date: '2026-01-01',
        author: 'Admin',
        permalink: '/posts/hello-world',
        featuredImage: '',
        blocks: [],
        source: 'fixture',
      },
    ];

    const devHtml = renderToStaticMarkup(
      React.createElement(
        WpQueryLoop,
        { postType: 'post', posts: samplePosts, useMainQuery: false, postsPerPage: 3 },
        (post) => React.createElement('article', { key: post.id }, post.title),
      ),
    );
    expect(devHtml).toContain('<article>Hello World</article>');

    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const nativeHtml = renderToStaticMarkup(
      React.createElement(
        WpQueryLoop,
        { postType: 'post', posts: samplePosts, useMainQuery: false, postsPerPage: 3 },
        (post) => React.createElement('article', { key: post.id }, post.title),
      ),
    );
    expect(nativeHtml).toContain('<forgewp-query-loop-start');
    expect(nativeHtml).toContain('__FORGEWP_THE_TITLE__');
    expect(nativeHtml).toContain('</forgewp-query-loop-end>');
  });

  it('resolves defineEditable schemas via getWpEditable() across defaults, plain meta, fixtures, and native export', () => {
    const heroSchema = {
      headline: { type: 'text', default: 'Welcome Home' },
      ctaCount: { type: 'number', default: 2 },
      showBadge: { type: 'boolean', default: true },
      items: { type: 'repeater', default: [{ label: 'One' }] },
    };

    // 1. Defaults when no source provided
    expect(getWpEditable(heroSchema)).toEqual({
      headline: 'Welcome Home',
      ctaCount: 2,
      showBadge: true,
      items: [{ label: 'One' }],
    });

    // 2. Plain meta / customFields object
    expect(
      getWpEditable(heroSchema, {
        customFields: { headline: 'Custom Title', ctaCount: 5, showBadge: false },
      }),
    ).toEqual({
      headline: 'Custom Title',
      ctaCount: 5,
      showBadge: false,
      items: [{ label: 'One' }],
    });

    // 3. WpServerClient in fixture mode
    const client = createWpServerClient({
      meta: { headline: 'Fixture Title', ctaCount: '9', showBadge: 'false' },
    });
    expect(getWpEditable(heroSchema, client)).toEqual({
      headline: 'Fixture Title',
      ctaCount: 9,
      showBadge: false,
      items: [{ label: 'One' }],
    });

    // 4. WpServerClient in native WordPress export mode -> emits PHP meta tokens
    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const nativeValues = getWpEditable(heroSchema, client);
    expect(nativeValues.headline).toBe('__FORGEWP_META_headline_DEFAULT_Welcome%20Home__');
    expect(nativeValues.ctaCount).toBe('__FORGEWP_META_ctaCount_DEFAULT_2__');
    expect(nativeValues.showBadge).toBe('__FORGEWP_META_showBadge_DEFAULT_true__');
  });
});
