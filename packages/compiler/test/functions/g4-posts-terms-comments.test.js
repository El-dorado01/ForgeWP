import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { diagnoseNextNativeCompatibility } from '../../lib/next-adapter.js';
import {
  createWpServerClient,
  WpPostTerms,
  WpTermsLoop,
  WpComments,
  createForgeWpRuntime,
  configureForgeWpRuntime,
  resetForgeWpRuntime,
  createNativeSource,
  ForgeWpRuntimeError,
  normalizePostResource,
  normalizePostsListResource,
  normalizeTermResource,
  normalizeTermsListResource,
  normalizeCommentResource,
  normalizeCommentsListResource,
} from '../../../react/src/server.ts';
import {
  useWpPost,
  useWpPosts,
  useWpTerms,
  useWpComments,
  submitWpComment,
  getForgeWpAntiSpamFields,
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

describe('G4: posts, terms, and comments contracts (§10–§12, §12a)', () => {
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

  it('normalizes posts (plain-text title, blocks on single, protected stripping), terms, and threaded comments', () => {
    // Single post: entity-decoded plain-text title + blocks + fields
    const single = normalizePostResource({
      id: 42,
      type: 'post',
      slug: 'first-post',
      lang: 'en',
      title: 'Ada&#8217;s &amp; Grace&rsquo;s <em>Post</em>',
      excerpt: '<p>Short summary</p>',
      content: '<p>Full HTML body</p>',
      date: '2026-11-01T09:00:00+00:00',
      modified: '2026-11-02T10:00:00+00:00',
      permalink: 'https://example.com/blog/first-post/',
      path: '/blog/first-post/',
      author: { id: 1, name: 'Ada' },
      featuredImage: { url: 'https://example.com/a.jpg', alt: 'Hero', width: 1200, height: 630 },
      terms: { category: [{ id: 3, slug: 'news', name: 'News &amp; Updates', path: '/category/news/' }] },
      fields: { read_time: '5' },
      blocks: [{ blockName: 'core/paragraph', innerHTML: '<p>Hi</p>' }],
      protected: false,
    });
    expect(single?.title).toBe('Ada\u2019s & Grace\u2019s Post');
    expect(single?.blocks).toHaveLength(1);
    expect(single?.fields?.read_time).toBe('5');
    expect(single?.terms.category[0].name).toBe('News & Updates');

    // Password-protected post strips content & excerpt
    const locked = normalizePostResource({
      id: 43,
      type: 'post',
      slug: 'secret',
      title: 'Secret',
      excerpt: '<p>Leaked?</p>',
      content: '<p>Leaked body</p>',
      protected: true,
    });
    expect(locked?.protected).toBe(true);
    expect(locked?.content).toBe('');
    expect(locked?.excerpt).toBe('');

    // List omits content & fields
    const list = normalizePostsListResource({
      type: 'post',
      page: 1,
      perPage: 10,
      total: 1,
      totalPages: 1,
      items: [{ id: 42, slug: 'first-post', title: 'First', excerpt: '<p>E</p>', content: '<p>X</p>' }],
    });
    expect(list?.items[0].content).toBeUndefined();
    expect(list?.items[0].fields).toBeUndefined();

    // Terms & threaded comments
    const term = normalizeTermResource({ id: 3, slug: 'news', name: 'News &amp; Press', count: 12 }, 'category');
    expect(term?.name).toBe('News & Press');
    expect(term?.path).toBe('/category/news/');

    const termsList = normalizeTermsListResource({ taxonomy: 'category', items: [term] });
    expect(termsList?.items).toHaveLength(1);

    const comments = normalizeCommentsListResource({
      post: 42,
      open: true,
      page: 1,
      perPage: 50,
      total: 2,
      items: [
        {
          id: 9,
          parentId: 0,
          author: { name: 'Grace', avatarUrl: 'https://example.com/g.png', url: '' },
          date: '2026-11-03T08:00:00+00:00',
          content: '<p>Great post</p>',
          children: [
            {
              id: 10,
              parentId: 9,
              author: { name: 'Ada' },
              date: '2026-11-03T09:00:00+00:00',
              content: '<p>Thanks!</p>',
              children: [],
            },
          ],
        },
      ],
    });
    expect(comments?.items[0].children[0].author.name).toBe('Ada');
    expect(normalizeCommentResource(comments?.items[0])?.id).toBe(9);
  });

  it('wpClient.getPostsList(), getPost(), getLivePost(), getTerms(), getTerm(), and getComments() use canonical §10–§12 endpoints and cache tags', async () => {
    const calls = [];
    const mockFetch = async (url, init) => {
      calls.push({ url: String(url), init });
      const u = String(url);
      if (u.includes('type=private_cpt')) {
        return makeJsonResponse({ code: 'FORGEWP_POST_TYPE_NOT_PUBLIC', message: 'Not public' }, 400);
      }
      if (u.includes('/posts/post/missing')) {
        return makeJsonResponse({ code: 'FORGEWP_POST_NOT_FOUND', message: 'Not found' }, 404);
      }
      if (u.includes('/posts/post/first-post')) {
        return makeJsonResponse({
          id: 42,
          type: 'post',
          slug: 'first-post',
          lang: 'en',
          title: 'First Post',
          excerpt: '<p>Summary</p>',
          content: '<p>Body</p>',
          date: '2026-11-01T09:00:00+00:00',
          modified: '2026-11-02T10:00:00+00:00',
          permalink: 'https://wp.example.test/blog/first-post/',
          path: '/blog/first-post/',
          author: { id: 1, name: 'Ada' },
          featuredImage: null,
          terms: {},
          fields: { read_time: '4' },
          blocks: [{ blockName: 'core/heading', innerHTML: '<h2>Intro</h2>' }],
          protected: false,
        });
      }
      if (u.includes('/posts?')) {
        return makeJsonResponse({
          type: 'post',
          lang: 'en',
          page: 1,
          perPage: 10,
          total: 1,
          totalPages: 1,
          items: [
            {
              id: 42,
              type: 'post',
              slug: 'first-post',
              title: 'First Post',
              excerpt: '<p>Summary</p>',
              date: '2026-11-01T09:00:00+00:00',
              modified: '2026-11-02T10:00:00+00:00',
              permalink: 'https://wp.example.test/blog/first-post/',
              path: '/blog/first-post/',
              author: { id: 1, name: 'Ada' },
              featuredImage: null,
              terms: {},
              protected: false,
            },
          ],
        });
      }
      if (u.includes('/terms/private_tax')) {
        return makeJsonResponse({ code: 'FORGEWP_TAXONOMY_NOT_PUBLIC', message: 'Not public' }, 400);
      }
      if (u.includes('/terms/category/news')) {
        return makeJsonResponse({
          id: 3,
          taxonomy: 'category',
          lang: 'en',
          slug: 'news',
          name: 'News',
          description: '',
          count: 12,
          parent: 0,
          path: '/category/news/',
          permalink: 'https://wp.example.test/category/news/',
        });
      }
      if (u.includes('/terms/category')) {
        return makeJsonResponse({
          taxonomy: 'category',
          lang: 'en',
          items: [
            {
              id: 3,
              slug: 'news',
              name: 'News',
              description: '',
              count: 12,
              parent: 0,
              path: '/category/news/',
              permalink: 'https://wp.example.test/category/news/',
            },
          ],
        });
      }
      if (u.includes('/comments?')) {
        return makeJsonResponse({
          post: 42,
          open: true,
          page: 1,
          perPage: 50,
          total: 1,
          items: [
            {
              id: 9,
              parentId: 0,
              author: { name: 'Grace', avatarUrl: 'https://wp.example.test/g.png', url: '' },
              date: '2026-11-03T08:00:00+00:00',
              content: '<p>Great post</p>',
              children: [],
            },
          ],
        });
      }
      return makeJsonResponse({}, 404);
    };

    const client = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: mockFetch,
    });

    const list = await client.getPostsList({ type: 'post', taxonomy: 'category', term: 'news', lang: 'en' });
    expect(list.items).toHaveLength(1);
    expect(calls[0].url).toContain('/wp-json/forgewp/v1/posts?type=post&page=1&perPage=10&lang=en&taxonomy=category&term=news');
    expect(calls[0].init.next.tags).toEqual(expect.arrayContaining(['posts', 'type:post']));

    const single = await client.getPost('post', 'first-post', { lang: 'en' });
    expect(single?.blocks).toHaveLength(1);
    expect(single?.content).toBe('<p>Body</p>');
    expect(calls[1].url).toBe('https://wp.example.test/wp-json/forgewp/v1/posts/post/first-post?lang=en');

    const livePost = await client.getLivePost('post', 'first-post');
    expect(livePost?.blocks).toHaveLength(1);
    expect(livePost?.source).toBe('wordpress');

    expect(await client.getPost('post', 'missing')).toBeNull();
    await expect(client.getPostsList({ type: 'private_cpt' })).rejects.toThrowError(ForgeWpRuntimeError);

    const terms = await client.getTerms('category', { hideEmpty: true, lang: 'en' });
    expect(terms.items[0].slug).toBe('news');
    expect(calls.find((c) => c.url.includes('/terms/category?'))?.init.next.tags).toEqual(
      expect.arrayContaining(['terms', 'taxonomy:category']),
    );
    const singleTerm = await client.getTerm('category', 'news');
    expect(singleTerm?.name).toBe('News');
    await expect(client.getTerms('private_tax')).rejects.toThrowError(ForgeWpRuntimeError);

    const comments = await client.getComments(42);
    expect(comments.open).toBe(true);
    expect(comments.items[0].author.name).toBe('Grace');
    expect(calls.find((c) => c.url.includes('/comments?'))?.init.next.tags).toEqual(
      expect.arrayContaining(['comments', 'comments:post:42']),
    );
  });

  it('submitWpComment() shares anti-spam fields (_forgewp_elapsed, _forgewp_interacted, _forgewp_hp) with submitWpForm() and handles moderation/errors', async () => {
    const antiSpam = getForgeWpAntiSpamFields();
    expect(typeof antiSpam._forgewp_elapsed).toBe('string');
    expect(typeof antiSpam._forgewp_interacted).toBe('boolean');
    expect(antiSpam._forgewp_hp).toBe('');

    const sentBodies = [];
    const resultHold = await submitWpComment(
      {
        post: 42,
        content: 'Helpful article!',
        authorName: 'Grace',
        authorEmail: 'grace@example.com',
      },
      {
        submitUrl: 'https://wp.example.test/wp-json/forgewp/v1/comments',
        fetch: async (_url, init) => {
          sentBodies.push(JSON.parse(String(init.body)));
          return makeJsonResponse({ ok: true, status: 'hold', comment: null }, 201);
        },
      },
    );
    expect(resultHold).toEqual({
      ok: true,
      status: 'hold',
      comment: null,
      message: 'Your comment is awaiting moderation.',
    });
    expect(sentBodies[0]).toMatchObject({
      post: 42,
      parent: 0,
      content: 'Helpful article!',
      authorName: 'Grace',
      authorEmail: 'grace@example.com',
      _forgewp_hp: '',
    });
    expect(typeof sentBodies[0]._forgewp_elapsed).toBe('string');
    expect(typeof sentBodies[0]._forgewp_interacted).toBe('boolean');

    // Validation error
    const resultErr = await submitWpComment(
      { post: 42, content: '' },
      {
        submitUrl: 'https://wp.example.test/wp-json/forgewp/v1/comments',
        fetch: async () =>
          makeJsonResponse(
            {
              code: 'FORGEWP_VALIDATION_FAILED',
              message: 'Content is required.',
              errors: { content: 'Required' },
            },
            400,
          ),
      },
    );
    expect(resultErr.ok).toBe(false);
    expect(resultErr.code).toBe('FORGEWP_VALIDATION_FAILED');
    expect(resultErr.errors?.content).toBe('Required');
  });

  it('ForgeWpRuntime nativeSource, restSource, and G4 hooks (useWpPost, useWpPosts, useWpTerms, useWpComments) read canonical resources', async () => {
    // 1. Canonical native hydration (`resources.post`, `resources.posts`, `resources.term`)
    vi.stubGlobal('window', {
      forgeWpHydration: {
        resources: {
          post: {
            id: 42,
            type: 'post',
            slug: 'hello',
            title: 'Hello Native',
            excerpt: '<p>E</p>',
            content: '<p>Body</p>',
            blocks: [{ blockName: 'core/paragraph', innerHTML: '<p>Body</p>' }],
            protected: false,
          },
          posts: {
            type: 'post',
            page: 1,
            perPage: 10,
            total: 1,
            totalPages: 1,
            items: [{ id: 42, type: 'post', slug: 'hello', title: 'Hello Native', excerpt: '<p>E</p>' }],
          },
          term: {
            id: 3,
            taxonomy: 'category',
            slug: 'news',
            name: 'Native News',
            count: 5,
            parent: 0,
            path: '/blog/category/news/',
            permalink: 'https://example.com/blog/category/news/',
          },
        },
      },
    });

    const nativeSource = createNativeSource();
    expect(nativeSource.peek('post')?.title).toBe('Hello Native');
    expect(nativeSource.peek('posts')?.items).toHaveLength(1);
    expect(nativeSource.peek('term')?.name).toBe('Native News');
    expect(nativeSource.peek('term')?.path).toBe('/blog/category/news/');

    function G4Probe() {
      const { post } = useWpPost('post', 'hello');
      const { items: posts } = useWpPosts({ type: 'post' });
      const { terms } = useWpTerms('category');
      const { items: comments } = useWpComments(42);
      return React.createElement(
        'div',
        null,
        `${post?.title || ''}|${posts.length}|${terms.map((t) => `${t.name}@${t.path || ''}`).join(',')}|${comments.length}`,
      );
    }

    expect(renderToStaticMarkup(React.createElement(G4Probe))).toBe(
      '<div>Hello Native|1|Native News@/blog/category/news/|0</div>',
    );

    // 2. Primed decoupled runtime
    vi.stubGlobal('window', {});
    const runtime = configureForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
    });
    runtime.prime(
      'post',
      {
        id: 42,
        type: 'post',
        slug: 'hello',
        title: 'Hello Decoupled',
        excerpt: '<p>E</p>',
        content: '<p>C</p>',
        date: '',
        modified: '',
        permalink: '/blog/hello/',
        path: '/blog/hello/',
        author: null,
        featuredImage: null,
        terms: {},
        fields: {},
        blocks: [],
        protected: false,
      },
      { slug: 'post/hello' },
    );
    runtime.prime(
      'posts',
      {
        type: 'post',
        page: 1,
        perPage: 10,
        total: 1,
        totalPages: 1,
        items: [
          {
            id: 42,
            type: 'post',
            slug: 'hello',
            title: 'Hello Decoupled',
            excerpt: '<p>E</p>',
            date: '',
            modified: '',
            permalink: '/blog/hello/',
            path: '/blog/hello/',
            author: null,
            featuredImage: null,
            terms: {},
            protected: false,
          },
        ],
      },
      { query: { type: 'post', page: 1, perPage: 10 } },
    );
    runtime.prime(
      'terms',
      {
        taxonomy: 'category',
        items: [
          {
            id: 3,
            slug: 'news',
            name: 'Decoupled News',
            description: '',
            count: 2,
            parent: 0,
            path: '/category/news/',
            permalink: '/category/news/',
          },
        ],
      },
      { slug: 'category' },
    );
    runtime.prime(
      'comments',
      {
        post: 42,
        open: true,
        page: 1,
        perPage: 50,
        total: 1,
        items: [
          {
            id: 9,
            parentId: 0,
            author: { name: 'Grace' },
            date: '',
            content: '<p>Hi</p>',
            children: [],
          },
        ],
      },
      { query: { post: 42, page: 1, perPage: 50 } },
    );

    expect(renderToStaticMarkup(React.createElement(G4Probe))).toBe(
      '<div>Hello Decoupled|1|Decoupled News@/category/news/|1</div>',
    );

    // 3. restSource encodes multi-segment slugs (/posts/post/hello, /terms/category/news) properly
    const urls = [];
    const restRuntime = createForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.example.test',
      fetch: async (url) => {
        urls.push(String(url));
        if (String(url).includes('/posts/post/hello')) {
          return makeJsonResponse({ id: 42, type: 'post', slug: 'hello', title: 'Hi', excerpt: '' });
        }
        return makeJsonResponse({ id: 3, slug: 'news', name: 'News' });
      },
    });
    await restRuntime.get('post', { slug: 'post/hello' });
    await restRuntime.get('term', { slug: 'category/news' });
    expect(urls[0]).toBe('https://wp.example.test/wp-json/forgewp/v1/posts/post/hello');
    expect(urls[1]).toBe('https://wp.example.test/wp-json/forgewp/v1/terms/category/news');
  });

  it('R3: getPosts() and getLivePost() expose additive path, terms, and protected fields across decoupled and fixture modes', async () => {
    const decoupledClient = createWpServerClient({
      wpUrl: 'https://wp.example.test',
      fetch: async (url) => {
        const u = String(url);
        if (u.includes('/posts/post/first-post')) {
          return makeJsonResponse({
            id: 42,
            type: 'post',
            slug: 'first-post',
            title: 'First Post',
            excerpt: '<p>Summary</p>',
            content: '<p>Body</p>',
            date: '2026-11-01T09:00:00+00:00',
            modified: '2026-11-02T10:00:00+00:00',
            permalink: 'https://wp.example.test/blog/first-post/',
            path: '/blog/first-post/',
            author: { id: 1, name: 'Ada' },
            featuredImage: null,
            terms: {
              category: [{ id: 3, slug: 'news', name: 'News &amp; Press', path: '/category/news/' }],
            },
            blocks: [],
            protected: false,
          });
        }
        return makeJsonResponse({
          type: 'post',
          page: 1,
          perPage: 20,
          total: 2,
          totalPages: 1,
          items: [
            {
              id: 42,
              type: 'post',
              slug: 'first-post',
              title: 'First Post',
              excerpt: '<p>Summary</p>',
              date: '2026-11-01T09:00:00+00:00',
              modified: '2026-11-02T10:00:00+00:00',
              permalink: 'https://wp.example.test/blog/first-post/',
              path: '/blog/first-post/',
              author: { id: 1, name: 'Ada' },
              featuredImage: null,
              terms: {
                category: [{ id: 3, slug: 'news', name: 'News &amp; Press', path: '/category/news/' }],
              },
              protected: false,
            },
            {
              id: 43,
              type: 'post',
              slug: 'locked-post',
              title: 'Locked Post',
              excerpt: '<p>Hidden</p>',
              date: '2026-11-02T09:00:00+00:00',
              modified: '2026-11-02T09:00:00+00:00',
              permalink: 'https://wp.example.test/blog/locked-post/',
              path: '/blog/locked-post/',
              author: { id: 1, name: 'Ada' },
              featuredImage: null,
              terms: {},
              protected: true,
            },
          ],
        });
      },
    });

    const decoupledList = await decoupledClient.getPosts('post');
    expect(decoupledList).toHaveLength(2);
    expect(decoupledList[0]).toMatchObject({
      id: 42,
      slug: 'first-post',
      postType: 'post',
      author: 'Ada',
      permalink: 'https://wp.example.test/blog/first-post/',
      path: '/blog/first-post/',
      protected: false,
      source: 'wordpress',
      terms: {
        category: [{ id: 3, slug: 'news', name: 'News & Press', path: '/category/news/' }],
      },
    });
    expect(decoupledList[1].protected).toBe(true);
    expect(decoupledList[1].excerpt).toBe('');

    const customBaseList = await decoupledClient.getPosts('post', { basePath: '/journal' });
    expect(customBaseList[0].permalink).toBe('/journal/first-post');
    expect(customBaseList[0].path).toBe('/journal/first-post');

    const liveSingle = await decoupledClient.getLivePost('post', 'first-post');
    expect(liveSingle).toMatchObject({
      path: '/blog/first-post/',
      protected: false,
      terms: {
        category: [{ id: 3, slug: 'news', name: 'News & Press', path: '/category/news/' }],
      },
    });

    const fixtureClient = createWpServerClient({
      fixtures: {
        post: [
          {
            id: 7,
            slug: 'fixture-open',
            title: 'Fixture Open',
            excerpt: 'Hello world',
            content: '<p>Body</p>',
            path: '/articles/fixture-open/',
            terms: {
              category: [{ id: 2, slug: 'guides', name: 'Guides', path: '/category/guides/' }],
            },
            protected: false,
          },
          {
            id: 8,
            slug: 'fixture-secret',
            title: 'Fixture Secret',
            excerpt: 'Should be stripped',
            content: '<p>Secret body</p>',
            protected: true,
          },
        ],
      },
    });

    const fixtureList = await fixtureClient.getPosts('post');
    expect(fixtureList[0]).toMatchObject({
      permalink: '/blog/fixture-open',
      path: '/articles/fixture-open/',
      protected: false,
      source: 'fixture',
      terms: {
        category: [{ id: 2, slug: 'guides', name: 'Guides', path: '/category/guides/' }],
      },
    });
    expect(fixtureList[1]).toMatchObject({
      permalink: '/blog/fixture-secret',
      path: '/blog/fixture-secret',
      protected: true,
      excerpt: '',
      content: '',
      terms: {},
    });
  });

  it('R2 + P2 + C4: emits native tokens/loops for getPost, getComments, WpPostTerms, WpTermsLoop, WpComments, getSiteSettings, and doctor warnings', async () => {
    process.env.FORGEWP_NATIVE_EXPORT = '1';
    process.env.FORGEWP_DECLARED_OPTIONS_JSON = JSON.stringify({ contact_phone: '+49 30 1234' });
    process.env.FORGEWP_DECLARED_THEME_MODS_JSON = JSON.stringify({ footer_text: 'Copyright' });
    try {
      const nativeClient = createWpServerClient({ fixtures: { post: [] } });

      const nativePost = await nativeClient.getPost('post', 'any-slug');
      expect(nativePost).toMatchObject({
        id: '__FORGEWP_THE_ID__',
        title: '__FORGEWP_THE_TITLE__',
        content: '__FORGEWP_THE_CONTENT__',
        permalink: '__FORGEWP_THE_PERMALINK__',
        path: '__FORGEWP_THE_PATH__',
      });

      const nativeLive = await nativeClient.getLivePost('post', 'any-slug');
      expect(nativeLive?.id).toBe('__FORGEWP_THE_ID__');
      expect(nativeLive?.path).toBe('__FORGEWP_THE_PATH__');

      const nativeComments = await nativeClient.getComments(99, { page: 2, perPage: 25 });
      expect(nativeComments).toEqual({
        post: 0,
        open: true,
        page: 2,
        perPage: 25,
        total: '__FORGEWP_COMMENTS_COUNT__',
        items: [],
      });

      // P2: declared env defaults + Proxy fallback for arbitrary accessed option/themeMod keys
      const nativeSettings = await nativeClient.getSiteSettings();
      expect(nativeSettings.options.contact_phone).toBe('__FORGEWP_OPTION_contact_phone_DEFAULT_%2B49%2030%201234__');
      expect(nativeSettings.options.unpassed_key).toBe('__FORGEWP_OPTION_unpassed_key_DEFAULT___');
      expect(nativeSettings.themeMods.footer_text).toBe('__FORGEWP_THEME_MOD_footer_text_DEFAULT_Copyright__');
      expect(nativeSettings.themeMods.accent_color).toBe('__FORGEWP_THEME_MOD_accent_color_DEFAULT___');

      // Native loop components emit sibling markers
      const termsHtml = renderToStaticMarkup(
        React.createElement(WpPostTerms, {
          taxonomy: '*',
          empty: React.createElement('span', null, 'None'),
          renderItem: (t) => React.createElement('a', { href: t.path }, t.name),
        }),
      );
      expect(termsHtml).toContain('<forgewp-terms-loop-start taxonomy="*"></forgewp-terms-loop-start>');
      expect(termsHtml).toContain('<a href="__FORGEWP_TERM_PATH__">__FORGEWP_TERM_NAME__</a>');
      expect(termsHtml).toContain('<forgewp-terms-loop-empty></forgewp-terms-loop-empty><span>None</span>');
      expect(termsHtml).toContain('<forgewp-terms-loop-end></forgewp-terms-loop-end>');

      const taxLoopHtml = renderToStaticMarkup(
        React.createElement(WpTermsLoop, {
          taxonomy: 'category',
          hideEmpty: false,
          renderItem: (t) => React.createElement('span', null, `${t.name}(${t.count})@${t.path}`),
        }),
      );
      expect(taxLoopHtml).toContain('source="taxonomy"');
      expect(taxLoopHtml).toContain('taxonomy="category"');
      expect(taxLoopHtml).toContain('hideempty="0"');
      expect(taxLoopHtml).toContain('__FORGEWP_TERM_NAME__(__FORGEWP_TERM_COUNT__)@__FORGEWP_TERM_PATH__');

      const commentsHtml = renderToStaticMarkup(
        React.createElement(WpComments, {
          comments: nativeComments,
          empty: React.createElement('p', null, 'No comments'),
          closed: React.createElement('p', null, 'Closed'),
          renderItem: (c, { renderChildren }) =>
            React.createElement(
              'article',
              null,
              React.createElement('b', null, c.author.name),
              React.createElement('div', { className: 'replies' }, renderChildren()),
            ),
        }),
      );
      expect(commentsHtml).toContain('<forgewp-comments-loop-start page="2" perpage="25"></forgewp-comments-loop-start>');
      expect(commentsHtml).toContain('<b>__FORGEWP_COMMENT_AUTHOR_NAME__</b>');
      expect(commentsHtml).toContain('<div class="replies"><forgewp-comment-children></forgewp-comment-children></div>');
      expect(commentsHtml).toContain('<forgewp-comments-loop-empty></forgewp-comments-loop-empty><p>No comments</p>');
      expect(commentsHtml).toContain('<forgewp-comments-closed-start></forgewp-comments-closed-start><p>Closed</p>');
    } finally {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      delete process.env.FORGEWP_DECLARED_OPTIONS_JSON;
      delete process.env.FORGEWP_DECLARED_THEME_MODS_JSON;
    }

    // Decoupled mode rendering for WpPostTerms, WpTermsLoop, WpComments (threaded + empty + closed)
    const decoupledCommentsHtml = renderToStaticMarkup(
      React.createElement(WpComments, {
        comments: {
          post: 1,
          open: false,
          page: 1,
          perPage: 50,
          total: 2,
          items: [
            {
              id: 10,
              parentId: 0,
              author: { name: 'Ada' },
              date: '2026-11-23',
              content: '<p>Top</p>',
              children: [
                {
                  id: 11,
                  parentId: 10,
                  author: { name: 'Grace' },
                  date: '2026-11-23',
                  content: '<p>Reply</p>',
                  children: [],
                },
              ],
            },
          ],
        },
        closed: React.createElement('p', null, 'Closed'),
        renderItem: (c, { renderChildren, depth }) =>
          React.createElement(
            'div',
            { key: c.id, 'data-depth': depth },
            c.author.name,
            renderChildren(),
          ),
      }),
    );
    expect(decoupledCommentsHtml).toContain('<div data-depth="0">Ada<div data-depth="1">Grace</div></div><p>Closed</p>');

    // C4: diagnoseNextNativeCompatibility warns when list calls are outside loop components
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-c4-doctor-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'frozen'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'looped'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'frozen', 'page.tsx'),
        `export default async function Page() { const posts = await wpClient.getPosts('post'); return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>; }`,
        'utf8',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'looped', 'page.tsx'),
        `import { WpQueryLoop } from '@forgewp/react';\nexport default async function Page() { const posts = await wpClient.getPosts('post'); return <WpQueryLoop posts={posts} renderItem={(p) => <li key={p.id}>{p.title}</li>} />; }`,
        'utf8',
      );
      const report = diagnoseNextNativeCompatibility(tmp);
      const c4Warnings = report.warnings.filter((d) => d.code === 'NEXT_NATIVE_FROZEN_LIST');
      expect(c4Warnings).toHaveLength(1);
      expect(c4Warnings[0].file.replace(/\\/g, '/')).toContain('frozen/page.tsx');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
