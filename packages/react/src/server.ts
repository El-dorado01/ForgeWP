/**
 * @forgewp/react/server
 *
 * Server-safe WordPress content client for Next.js App Router Server Components
 * and other Node/SSR runtimes. Zero React client hooks, zero DOM assumptions.
 *
 * Operates across all three ForgeWP contexts without changing app source:
 * - Local development (no FORGEWP_WP_URL): reads local typed `cms/mock-data.ts` fixtures.
 * - Decoupled WordPress (FORGEWP_WP_URL set): reads live WordPress REST API + ForgeWP REST bridge.
 * - Native WordPress export (FORGEWP_NATIVE_EXPORT=1): emits ForgeWP compile tokens for explicit
 *   live bindings (`getLivePage`, `getOption`, `getField`), compiling to native PHP calls.
 */

import React from 'react';
import {
  ForgeWpRuntimeError,
  normalizeFormResource,
  normalizeFormsCollection,
  normalizeSiteSettings,
  type FormResource,
  type FormsCollectionResource,
  type SiteSettingsResource,
} from './runtime/index.js';

export interface WpServerBlockNode {
  blockName: string | null;
  attrs?: Record<string, unknown>;
  innerHTML?: string;
  innerBlocks?: WpServerBlockNode[];
}

export interface WpServerPageRecord {
  id: number;
  slug: string;
  routeId: string;
  title: string;
  content: string;
  contentHtml: string;
  excerpt: string;
  permalink: string;
  path: string;
  status: string;
  blocks: WpServerBlockNode[];
  mode: 'fixture' | 'decoupled' | 'native';
}

export interface WpServerRouteRecord {
  routeId: string;
  id: number;
  slug: string;
  title: string;
  path: string;
  permalink: string;
}

export type WpServerAuth =
  | { username: string; applicationPassword: string }
  | { bearerToken: string };

export interface WpServerMenuItem {
  id: number | string;
  title: string;
  url: string;
  path: string;
  target?: string;
  classes?: string[];
  children: WpServerMenuItem[];
}

export interface WpServerSiteInfo {
  name: string;
  description: string;
  url: string;
  homeUrl: string;
  language: string;
  logoUrl?: string;
  mode: 'fixture' | 'decoupled' | 'native';
}

export interface WpServerClientOptions {
  fixtures?: Record<string, Array<Record<string, any>>>;
  menus?: Record<string, Array<Record<string, any>>>;
  forms?: Record<string, any>;
  siteInfo?: Partial<Omit<WpServerSiteInfo, 'mode'>>;
  siteOptions?: Record<string, any>;
  themeMods?: Record<string, any>;
  meta?: Record<string, string>;
  wpUrl?: string;
  auth?: WpServerAuth;
  fetch?: typeof globalThis.fetch;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

export interface WpServerPostRecord {
  id: number;
  slug: string;
  postType: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  permalink: string;
  featuredImage: string;
  blocks: WpServerBlockNode[];
  source: 'fixture' | 'wordpress' | 'native';
}

export interface WpServerClient {
  getMode(): 'fixture' | 'decoupled' | 'native';
  getPage(
    slug: string,
    options?: { live?: boolean; preview?: boolean },
  ): Promise<WpServerPageRecord | null>;
  getLivePage(
    slug: string,
    options?: { preview?: boolean },
  ): Promise<WpServerPageRecord | null>;
  getPosts(
    postType?: string,
    options?: { basePath?: string; perPage?: number },
  ): Promise<WpServerPostRecord[]>;
  getLivePost(
    postType: string,
    slug: string,
    options?: { basePath?: string },
  ): Promise<WpServerPostRecord | null>;
  getStaticParams(
    postType?: string,
    paramName?: string,
  ): Promise<Array<Record<string, string>>>;
  getRoutes(): Promise<{
    homeUrl: string;
    basePath: string;
    routes: WpServerRouteRecord[];
  }>;
  getRouteHref(
    routeSlug: string,
    fallbackPath?: string,
    options?: { query?: string; fragment?: string },
  ): Promise<string>;
  getMenu(location?: string): Promise<WpServerMenuItem[]>;
  getSiteInfo(): Promise<WpServerSiteInfo>;
  getSiteSettings(): Promise<SiteSettingsResource>;
  getForm(name: string, options?: { lang?: string }): Promise<FormResource | null>;
  getForms(options?: { lang?: string }): Promise<FormsCollectionResource>;
  getOption(key: string, defaultValue?: string): string;
  getThemeMod(key: string, defaultValue?: string): string;
  getLiveOption(key: string, defaultValue?: string): Promise<string>;
  getLiveThemeMod(key: string, defaultValue?: string): Promise<string>;
  getField(key: string, defaultValue?: string): string;
}

function readEnv(name: string): string | undefined {
  const proc = (globalThis as any).process;
  return proc?.env?.[name];
}

/**
 * True when running inside a native WordPress static/SSR compilation pass.
 */
export function isNativeWordPressExport(): boolean {
  return (
    Boolean((globalThis as any)._forgeWpCompileTime) ||
    readEnv('FORGEWP_NATIVE_EXPORT') === '1'
  );
}

function stripTags(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .trim();
}

function encodeBase64(input: string): string {
  const buf = (globalThis as any).Buffer;
  if (buf && typeof buf.from === 'function') {
    return buf.from(input, 'utf8').toString('base64');
  }
  if (typeof btoa === 'function') {
    return btoa(input);
  }
  throw new Error('FORGEWP_AUTH_ENCODE_UNAVAILABLE: Base64 encoder unavailable in this runtime.');
}

function normalizeBaseUrl(rawUrl?: string): { origin: string; basePath: string; baseUrl: string } | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`FORGEWP_INVALID_WP_URL: Expected http(s) URL, received "${trimmed}".`);
  }
  const basePath = parsed.pathname.replace(/\/+$/, '');
  return {
    origin: parsed.origin,
    basePath,
    baseUrl: `${parsed.origin}${basePath}`,
  };
}

function stripBasePath(permalink: string, base: { origin: string; basePath: string }): string {
  if (!permalink) return '/';
  try {
    const parsed = new URL(permalink, `${base.origin}/`);
    let relPath = parsed.pathname || '/';
    if (
      base.basePath &&
      (relPath === base.basePath || relPath.startsWith(`${base.basePath}/`))
    ) {
      relPath = relPath.slice(base.basePath.length) || '/';
    }
    return relPath.startsWith('/') ? relPath : `/${relPath}`;
  } catch {
    return '/';
  }
}

function appendQueryAndFragment(
  basePath: string,
  { query = '', fragment = '' }: { query?: string; fragment?: string } = {},
): string {
  let out = basePath;
  const cleanQuery = String(query || '').replace(/^[?&]+/, '');
  if (cleanQuery) {
    out += (out.includes('?') ? '&' : '?') + cleanQuery;
  }
  const cleanFragment = String(fragment || '').replace(/^#+/, '');
  if (cleanFragment) {
    out += `#${cleanFragment}`;
  }
  return out;
}

function sanitizeTokenKey(key: string): string {
  const clean = String(key || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    throw new Error(
      `FORGEWP_INVALID_TOKEN_KEY: Key "${key}" must match /^[a-zA-Z0-9_-]+$/.`,
    );
  }
  return clean;
}

function fromFixture(entry: Record<string, any>, slug: string): WpServerPageRecord {
  const cleanSlug = String(entry.slug || slug).replace(/^\/+|\/+$/g, '');
  const relPath = cleanSlug === '' || cleanSlug === 'home' ? '/' : `/${cleanSlug}`;
  const rawContent = String(entry.content || '');
  return {
    id: typeof entry.id === 'number' ? entry.id : 0,
    slug: cleanSlug,
    routeId: String(entry.routeId || cleanSlug),
    title: String(entry.title || ''),
    content: stripTags(rawContent),
    contentHtml: rawContent,
    excerpt: String(entry.excerpt || ''),
    permalink: relPath,
    path: relPath,
    status: String(entry.status || 'publish'),
    blocks: [],
    mode: 'fixture',
  };
}

/**
 * Create a unified server-side WordPress content client for Next.js App Router
 * Server Components (local fixtures -> decoupled REST -> native PHP tokens).
 */
export function createWpServerClient(options: WpServerClientOptions = {}): WpServerClient {
  const fixtures = options.fixtures || {};
  const normalizedFixtureSettings = normalizeSiteSettings({
    options: options.siteOptions || {},
    themeMods: options.themeMods || {},
    ...(options.siteInfo ? { site: options.siteInfo } : {}),
  }) || { options: {}, themeMods: {} };
  const siteOptions = normalizedFixtureSettings.options;
  const themeMods = normalizedFixtureSettings.themeMods;
  const fixtureForms = normalizeFormsCollection(options.forms || {}) || { forms: {} };
  let cachedSiteSettings: SiteSettingsResource | null = null;
  const cachedFormByKey = new Map<string, FormResource | null>();
  const cachedFormsByLang = new Map<string, FormsCollectionResource>();
  const metaMap = options.meta || {};
  const fetchImpl = options.fetch || globalThis.fetch;
  const cacheMode = options.cache ?? 'no-store';
  const nextOptions = options.next;

  if (options.auth && typeof window !== 'undefined') {
    throw new Error(
      'FORGEWP_CLIENT_BUNDLE_CREDENTIAL_GUARD: WordPress server credentials must never be passed in a browser runtime.',
    );
  }

  function resolveWpBase() {
    const rawUrl = options.wpUrl !== undefined ? options.wpUrl : readEnv('FORGEWP_WP_URL');
    return normalizeBaseUrl(rawUrl);
  }

  function getAuthHeaders(): Record<string, string> {
    if (!options.auth) return {};
    if ('bearerToken' in options.auth) {
      return { Authorization: `Bearer ${options.auth.bearerToken}` };
    }
    return {
      Authorization: `Basic ${encodeBase64(`${options.auth.username}:${options.auth.applicationPassword}`)}`,
    };
  }

  async function wpFetchJson(
    base: { baseUrl: string },
    endpoint: string,
    authenticated = false,
  ) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(authenticated ? getAuthHeaders() : {}),
    };
    const init: Record<string, any> = {
      method: 'GET',
      headers,
      cache: cacheMode,
      ...(nextOptions ? { next: nextOptions } : {}),
    };
    const response = await fetchImpl(`${base.baseUrl}${endpoint}`, init);
    if (!response.ok) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function fetchDecoupledPage(
    base: { origin: string; basePath: string; baseUrl: string },
    slug: string,
    preview: boolean,
  ): Promise<WpServerPageRecord | null> {
    if (preview && !options.auth) {
      throw new Error(
        'FORGEWP_PREVIEW_AUTH_REQUIRED: Draft/preview reads require server-side auth credentials.',
      );
    }

    const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
    const params = new URLSearchParams({ slug: cleanSlug });
    if (preview) {
      params.set('status', 'any');
      params.set('context', 'edit');
    }

    let wpPage: any = null;
    const bySlug = await wpFetchJson(base, `/wp-json/wp/v2/pages?${params.toString()}`, preview);
    if (Array.isArray(bySlug) && bySlug.length > 0) {
      wpPage = bySlug[0];
    }

    if (!wpPage) {
      const routeData = await wpFetchJson(base, '/wp-json/forgewp/v1/routes', false);
      const match = Array.isArray(routeData?.routes)
        ? routeData.routes.find((r: any) => r.routeId === cleanSlug || r.slug === cleanSlug)
        : null;
      if (match?.id) {
        const byIdEndpoint = preview
          ? `/wp-json/wp/v2/pages/${match.id}?context=edit`
          : `/wp-json/wp/v2/pages/${match.id}`;
        wpPage = await wpFetchJson(base, byIdEndpoint, preview);
      }
    }

    if (!wpPage) return null;

    const renderedHtml = String(wpPage.content?.rendered ?? '');
    const permalink = String(wpPage.link || '');
    return {
      id: typeof wpPage.id === 'number' ? wpPage.id : 0,
      slug: String(wpPage.slug || cleanSlug),
      routeId:
        typeof wpPage.forgewp_route_id === 'string' && wpPage.forgewp_route_id
          ? wpPage.forgewp_route_id
          : String(wpPage.slug || cleanSlug),
      title: stripTags(wpPage.title?.rendered ?? wpPage.title?.raw ?? ''),
      content: stripTags(renderedHtml),
      contentHtml: renderedHtml,
      excerpt: stripTags(wpPage.excerpt?.rendered ?? ''),
      permalink,
      path: stripBasePath(permalink, base),
      status: String(wpPage.status || 'publish'),
      blocks: Array.isArray(wpPage.forgewp_blocks) ? wpPage.forgewp_blocks : [],
      mode: 'decoupled',
    };
  }

  function findFixturePage(slug: string): WpServerPageRecord | null {
    const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
    const pages = Array.isArray(fixtures.page) ? fixtures.page : [];
    const found = pages.find(
      (p) =>
        String(p.slug || '').replace(/^\/+|\/+$/g, '') === cleanSlug ||
        String(p.routeId || '') === cleanSlug,
    );
    return found ? fromFixture(found, cleanSlug) : null;
  }

  return {
    getMode() {
      if (isNativeWordPressExport()) return 'native';
      return resolveWpBase() ? 'decoupled' : 'fixture';
    },

    async getLivePage(slug, { preview = false } = {}) {
      const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
      if (isNativeWordPressExport()) {
        const relPath = cleanSlug === '' || cleanSlug === 'home' ? '/' : `/${cleanSlug}`;
        return {
          id: 0,
          slug: cleanSlug,
          routeId: cleanSlug || 'home',
          title: '__FORGEWP_THE_TITLE__',
          content: '__FORGEWP_THE_CONTENT__',
          contentHtml: '__FORGEWP_THE_CONTENT__',
          excerpt: '__FORGEWP_THE_EXCERPT__',
          permalink: '__FORGEWP_THE_PERMALINK__',
          path: relPath,
          status: 'publish',
          blocks: [],
          mode: 'native',
        };
      }

      const base = resolveWpBase();
      if (base) {
        const live = await fetchDecoupledPage(base, cleanSlug, preview);
        if (live) return live;
      }

      return findFixturePage(cleanSlug);
    },

    async getPage(slug, { live = false, preview = false } = {}) {
      if (live) {
        return this.getLivePage(slug, { preview });
      }
      if (!isNativeWordPressExport()) {
        const base = resolveWpBase();
        if (base) {
          const remote = await fetchDecoupledPage(base, slug, preview);
          if (remote) return remote;
        }
      }
      return findFixturePage(slug);
    },

    async getRoutes() {
      const base = !isNativeWordPressExport() ? resolveWpBase() : null;
      if (base) {
        const bridge = await wpFetchJson(base, '/wp-json/forgewp/v1/routes', false);
        if (bridge && Array.isArray(bridge.routes)) {
          return {
            homeUrl: bridge.homeUrl || `${base.baseUrl}/`,
            basePath: bridge.basePath ?? base.basePath,
            routes: bridge.routes,
          };
        }
      }

      const pages = Array.isArray(fixtures.page) ? fixtures.page : [];
      return {
        homeUrl: '/',
        basePath: '',
        routes: pages.map((p, idx) => {
          const slug = String(p.slug || '').replace(/^\/+|\/+$/g, '');
          const relPath = slug === '' || slug === 'home' ? '/' : `/${slug}`;
          return {
            routeId: String(p.routeId || slug || '__home__'),
            id: typeof p.id === 'number' ? p.id : idx + 1,
            slug,
            title: String(p.title || ''),
            path: relPath,
            permalink: relPath,
          };
        }),
      };
    },

    async getRouteHref(routeSlug, fallbackPath = '/', opts = {}) {
      const clean = String(routeSlug || '').replace(/^\/+|\/+$/g, '');
      if (clean === '' || clean === '__home__') {
        return appendQueryAndFragment('/', opts);
      }
      const { routes } = await this.getRoutes();
      const match = routes.find((r) => r.routeId === clean || r.slug === clean);
      return appendQueryAndFragment(match ? match.path : fallbackPath, opts);
    },

    async getPosts(postType = 'post', opts = {}) {
      const cleanType = String(postType || 'post').trim() || 'post';
      const defaultBase =
        opts.basePath !== undefined
          ? opts.basePath.replace(/\/+$/, '')
          : cleanType === 'post'
            ? '/blog'
            : `/${cleanType}s`;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const restBase =
          cleanType === 'post' ? 'posts' : cleanType === 'page' ? 'pages' : cleanType;
        const perPage = opts.perPage ?? 20;
        try {
          const raw = await wpFetchJson(
            wpBase,
            `/wp-json/wp/v2/${encodeURIComponent(restBase)}?per_page=${perPage}&_embed=1`,
          );
          if (Array.isArray(raw)) {
            return raw.map((item: any) => {
              const slug = String(item.slug || item.id || '');
              const renderedTitle =
                typeof item.title === 'object' ? item.title?.rendered : item.title;
              const renderedContent =
                typeof item.content === 'object' ? item.content?.rendered : item.content;
              const renderedExcerpt =
                typeof item.excerpt === 'object' ? item.excerpt?.rendered : item.excerpt;
              const mediaUrl =
                item._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
              const authorName = item._embedded?.author?.[0]?.name || '';
              return {
                id: Number(item.id || 0),
                slug,
                postType: cleanType,
                title: stripTags(String(renderedTitle || '')),
                excerpt: stripTags(String(renderedExcerpt || '')),
                content: String(renderedContent || ''),
                date: String(item.date || ''),
                author: String(authorName || ''),
                permalink: `${defaultBase}/${slug}`,
                featuredImage: String(mediaUrl || ''),
                blocks: Array.isArray(item.forgewp_blocks) ? item.forgewp_blocks : [],
                source: 'wordpress' as const,
              };
            });
          }
        } catch {
          // Fall back to local fixtures if REST endpoint is unavailable
        }
      }

      const list = Array.isArray((fixtures as any)?.[cleanType])
        ? (fixtures as any)[cleanType]
        : [];
      return list.map((item: any, idx: number) => {
        const slug = String(item.slug || `item-${idx + 1}`);
        const img =
          typeof item.featuredImage === 'string'
            ? item.featuredImage
            : item.featuredImage?.url || '';
        return {
          id: Number(item.id ?? idx + 1),
          slug,
          postType: cleanType,
          title: String(item.title || ''),
          excerpt: String(item.excerpt || ''),
          content: String(item.content || ''),
          date: String(item.date || ''),
          author: String(item.author || ''),
          permalink: `${defaultBase}/${slug}`,
          featuredImage: String(img),
          blocks: Array.isArray(item.blocks) ? item.blocks : [],
          source: 'fixture' as const,
        };
      });
    },

    async getLivePost(postType, slug, opts = {}) {
      const cleanType = String(postType || 'post').trim() || 'post';
      if (isNativeWordPressExport()) {
        return {
          id: 0,
          slug: String(slug || ''),
          postType: cleanType,
          title: '__FORGEWP_THE_TITLE__',
          excerpt: '__FORGEWP_THE_EXCERPT__',
          content: '__FORGEWP_THE_CONTENT__',
          date: '__FORGEWP_THE_DATE__',
          author: '__FORGEWP_THE_AUTHOR__',
          permalink: '__FORGEWP_THE_PERMALINK__',
          featuredImage: '__FORGEWP_THE_POST_THUMBNAIL_URL__',
          blocks: [],
          source: 'native' as const,
        };
      }
      const posts = await this.getPosts(cleanType, opts);
      const target = String(slug || '').replace(/^\/+|\/+$/g, '');
      return posts.find((p) => p.slug === target) ?? null;
    },

    async getStaticParams(postType = 'post', paramName = 'slug') {
      const cleanType = String(postType || 'post').trim() || 'post';
      const posts = await this.getPosts(cleanType);
      if (isNativeWordPressExport()) {
        const sampleSlug = posts[0]?.slug || 'sample-post';
        return [{ [paramName]: sampleSlug }];
      }
      if (posts.length === 0) {
        return [{ [paramName]: 'sample-post' }];
      }
      return posts.map((p) => ({ [paramName]: p.slug }));
    },

    async getMenu(location = 'primary') {
      const cleanLoc = String(location || 'primary').trim() || 'primary';
      const normalizeMenuItems = (raw: any, prefix = cleanLoc): WpServerMenuItem[] => {
        if (!Array.isArray(raw)) return [];
        return raw.map((item, idx) => {
          const rawUrl = String(item?.url || item?.path || '/');
          const relPath =
            typeof item?.path === 'string' && item.path
              ? item.path
              : rawUrl.startsWith('/')
                ? rawUrl
                : stripBasePath(
                    rawUrl,
                    resolveWpBase() || { origin: 'http://localhost', basePath: '' },
                  );
          const classes = Array.isArray(item?.classes)
            ? item.classes.map(String).filter(Boolean)
            : typeof item?.classes === 'string' && item.classes.trim()
              ? item.classes.trim().split(/\s+/)
              : [];
          return {
            id: item?.id ?? `${prefix}-${idx + 1}`,
            title: String(item?.title || ''),
            url: rawUrl,
            path: relPath || '/',
            ...(item?.target ? { target: String(item.target) } : {}),
            ...(classes.length > 0 ? { classes } : {}),
            children: normalizeMenuItems(item?.children, `${prefix}-${idx + 1}`),
          };
        });
      };

      const menusFixture = options.menus || {};
      const localItems = normalizeMenuItems(menusFixture[cleanLoc]);

      if (isNativeWordPressExport()) {
        return localItems;
      }

      const base = resolveWpBase();
      if (base) {
        try {
          const data = await wpFetchJson(
            base,
            `/wp-json/forgewp/v1/menus/${encodeURIComponent(cleanLoc)}`,
            false,
          );
          if (data && Array.isArray(data.items)) {
            return normalizeMenuItems(data.items);
          }
        } catch {
          // Fall back to local menus fixture if endpoint is unavailable
        }
      }

      return localItems;
    },

    async getSiteInfo() {
      const localInfo = options.siteInfo || {};
      const fallbackName = String(
        localInfo.name || siteOptions.blogname || 'ForgeWP Site',
      );
      const fallbackDesc = String(
        localInfo.description || siteOptions.blogdescription || '',
      );
      const fallbackUrl = localInfo.homeUrl || localInfo.url || '/';
      const fallbackLang = localInfo.language || 'en-US';

      if (isNativeWordPressExport()) {
        return {
          name: '__FORGEWP_OPTION_blogname__',
          description: '__FORGEWP_OPTION_blogdescription__',
          url: '__FORGEWP_HOME_URL__',
          homeUrl: '__FORGEWP_HOME_URL__',
          language: fallbackLang,
          ...(localInfo.logoUrl ? { logoUrl: localInfo.logoUrl } : {}),
          mode: 'native',
        };
      }

      const base = resolveWpBase();
      if (base) {
        try {
          const data = await wpFetchJson(base, '/wp-json/forgewp/v1/site-info', false);
          if (data && typeof data === 'object') {
            return {
              name: String(data.name || fallbackName),
              description: String(data.description ?? fallbackDesc),
              url: String(data.url || data.homeUrl || base.baseUrl),
              homeUrl: String(data.homeUrl || data.url || base.baseUrl),
              language: String(data.language || fallbackLang),
              ...(data.logoUrl ? { logoUrl: String(data.logoUrl) } : {}),
              mode: 'decoupled',
            };
          }
        } catch {
          // Fall back to local siteInfo fixture if endpoint is unavailable
        }
      }

      return {
        name: fallbackName,
        description: fallbackDesc,
        url: fallbackUrl,
        homeUrl: fallbackUrl,
        language: fallbackLang,
        ...(localInfo.logoUrl ? { logoUrl: localInfo.logoUrl } : {}),
        mode: 'fixture',
      };
    },

    async getSiteSettings() {
      if (isNativeWordPressExport()) {
        const tokenOptions: Record<string, string> = {};
        for (const [k, v] of Object.entries(siteOptions)) {
          const safeKey = sanitizeTokenKey(k);
          tokenOptions[safeKey] = `__FORGEWP_OPTION_${safeKey}_DEFAULT_${encodeURIComponent(String(v ?? ''))}__`;
        }
        const tokenMods: Record<string, string> = {};
        for (const [k, v] of Object.entries(themeMods)) {
          const safeKey = sanitizeTokenKey(k);
          tokenMods[safeKey] = `__FORGEWP_THEME_MOD_${safeKey}_DEFAULT_${encodeURIComponent(String(v ?? ''))}__`;
        }
        const nativeSite = await this.getSiteInfo();
        const { mode: _mode, ...siteMeta } = nativeSite;
        return {
          options: tokenOptions,
          themeMods: tokenMods,
          site: siteMeta,
        };
      }

      if (cachedSiteSettings) {
        return cachedSiteSettings;
      }

      const base = resolveWpBase();
      if (base) {
        try {
          const data = await wpFetchJson(base, '/wp-json/forgewp/v1/site-settings', false);
          const normalized = normalizeSiteSettings(data);
          if (normalized) {
            cachedSiteSettings = normalized;
            return normalized;
          }
        } catch {
          // Fall back to fixture settings when endpoint is unavailable
        }
      }

      const fixtureSite = await this.getSiteInfo();
      const { mode: _mode, ...siteMeta } = fixtureSite;
      const fallbackSettings: SiteSettingsResource = {
        options: { ...siteOptions },
        themeMods: { ...themeMods },
        site: siteMeta,
      };
      cachedSiteSettings = fallbackSettings;
      return fallbackSettings;
    },

    async getForm(name, formOptions = {}) {
      const cleanName = sanitizeTokenKey(name);
      const lang =
        typeof formOptions.lang === 'string' && formOptions.lang.trim()
          ? formOptions.lang.trim()
          : undefined;
      const cacheKey = `${cleanName}::${lang || ''}`;

      if (isNativeWordPressExport()) {
        const fixture = fixtureForms.forms[cleanName];
        if (fixture) {
          return { ...fixture, ...(lang ? { lang } : {}) };
        }
        return {
          name: cleanName,
          mode: 'native',
          ...(lang ? { lang } : {}),
          fieldLabels: {},
          fields: [],
        };
      }

      if (cachedFormByKey.has(cacheKey)) {
        return cachedFormByKey.get(cacheKey) ?? null;
      }

      const base = resolveWpBase();
      if (base) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${base.baseUrl}/wp-json/forgewp/v1/forms/${encodeURIComponent(cleanName)}${qs}`;
        const mergedTags = Array.from(
          new Set(['forms', `form:${cleanName}`, ...(nextOptions?.tags || [])]),
        );
        const init: Record<string, any> = {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: cacheMode,
          next: {
            ...(nextOptions || {}),
            tags: mergedTags,
          },
        };
        const response = await fetchImpl(url, init);
        if (response.status === 404) {
          cachedFormByKey.set(cacheKey, null);
          return null;
        }
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          const code = json && typeof json.code === 'string' ? json.code : '';
          const msg =
            json && typeof json.message === 'string'
              ? json.message
              : `Failed to fetch form "${cleanName}" (HTTP ${response.status}).`;
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            code ? `[${code}] ${msg}` : msg,
            { resource: `forms:${cleanName}`, status: response.status },
          );
        }
        const normalized = normalizeFormResource(json, cleanName);
        cachedFormByKey.set(cacheKey, normalized);
        return normalized;
      }

      const fixture = fixtureForms.forms[cleanName] ?? null;
      const resolved = fixture ? { ...fixture, ...(lang ? { lang } : {}) } : null;
      cachedFormByKey.set(cacheKey, resolved);
      return resolved;
    },

    async getForms(formsOptions = {}) {
      const lang =
        typeof formsOptions.lang === 'string' && formsOptions.lang.trim()
          ? formsOptions.lang.trim()
          : undefined;
      const cacheKey = lang || '';

      if (isNativeWordPressExport()) {
        return {
          ...(lang ? { lang } : {}),
          forms: { ...fixtureForms.forms },
        };
      }

      if (cachedFormsByLang.has(cacheKey)) {
        return cachedFormsByLang.get(cacheKey)!;
      }

      const base = resolveWpBase();
      if (base) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${base.baseUrl}/wp-json/forgewp/v1/forms${qs}`;
        const mergedTags = Array.from(
          new Set(['forms', ...(nextOptions?.tags || [])]),
        );
        const init: Record<string, any> = {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: cacheMode,
          next: {
            ...(nextOptions || {}),
            tags: mergedTags,
          },
        };
        const response = await fetchImpl(url, init);
        if (response.ok) {
          const json = await response.json().catch(() => null);
          const normalized = normalizeFormsCollection(json) || {
            ...(lang ? { lang } : {}),
            forms: {},
          };
          cachedFormsByLang.set(cacheKey, normalized);
          for (const [fName, fRecord] of Object.entries(normalized.forms)) {
            cachedFormByKey.set(`${fName}::${lang || ''}`, fRecord);
          }
          return normalized;
        }
      }

      const fallbackCollection: FormsCollectionResource = {
        ...(lang ? { lang } : {}),
        forms: { ...fixtureForms.forms },
      };
      cachedFormsByLang.set(cacheKey, fallbackCollection);
      return fallbackCollection;
    },

    getOption(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_OPTION_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      if (
        cachedSiteSettings &&
        Object.prototype.hasOwnProperty.call(cachedSiteSettings.options, safeKey) &&
        cachedSiteSettings.options[safeKey] !== null &&
        cachedSiteSettings.options[safeKey] !== undefined
      ) {
        return String(cachedSiteSettings.options[safeKey]);
      }
      return Object.prototype.hasOwnProperty.call(siteOptions, safeKey) &&
        siteOptions[safeKey] !== null &&
        siteOptions[safeKey] !== undefined
        ? String(siteOptions[safeKey])
        : defaultValue;
    },

    getThemeMod(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_THEME_MOD_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      if (
        cachedSiteSettings &&
        Object.prototype.hasOwnProperty.call(cachedSiteSettings.themeMods, safeKey) &&
        cachedSiteSettings.themeMods[safeKey] !== null &&
        cachedSiteSettings.themeMods[safeKey] !== undefined
      ) {
        return String(cachedSiteSettings.themeMods[safeKey]);
      }
      return Object.prototype.hasOwnProperty.call(themeMods, safeKey) &&
        themeMods[safeKey] !== null &&
        themeMods[safeKey] !== undefined
        ? String(themeMods[safeKey])
        : defaultValue;
    },

    async getLiveOption(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_OPTION_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      const settings = await this.getSiteSettings();
      const value = settings.options[safeKey];
      return value !== undefined && value !== null ? String(value) : defaultValue;
    },

    async getLiveThemeMod(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_THEME_MOD_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      const settings = await this.getSiteSettings();
      const value = settings.themeMods[safeKey];
      return value !== undefined && value !== null ? String(value) : defaultValue;
    },

    getField(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_META_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      return Object.prototype.hasOwnProperty.call(metaMap, safeKey)
        ? metaMap[safeKey]
        : defaultValue;
    },
  };
}

export interface WpServerMenuProps {
  /** WordPress registered menu location slug (default: `'primary'`). */
  location?: string;
  /** Menu items rendered in local dev & decoupled mode (from `wpClient.getMenu()`). */
  items?: WpServerMenuItem[];
  /** CSS class applied to the `<nav>` wrapper. */
  className?: string;
  /** CSS class applied to each `<a>` link. */
  linkClassName?: string;
  /** Optional `aria-label` for the `<nav>` landmark. */
  ariaLabel?: string;
}

/**
 * Pure-TypeScript, Server-Component-safe WordPress navigation menu for Next.js App Router.
 *
 * - Local dev & decoupled mode: renders `<nav>` + `<a>` links from `items`.
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits `<forgewp-menu ... />`
 *   which `markup-processor.js` compiles to live `wp_get_nav_menu_items()` (with Polylang
 *   language support).
 */
export function WpServerMenu({
  location = 'primary',
  items = [],
  className = '',
  linkClassName = '',
  ariaLabel,
}: WpServerMenuProps): React.ReactElement {
  if (isNativeWordPressExport()) {
    return React.createElement('forgewp-menu', {
      location,
      ...(className ? { class: className } : {}),
      ...(linkClassName ? { linkClassName } : {}),
    });
  }

  return React.createElement(
    'nav',
    {
      ...(className ? { className } : {}),
      ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
    },
    items.map((item, idx) =>
      React.createElement(
        'a',
        {
          key: String(item.id ?? idx),
          href: item.url || item.path || '/',
          ...(linkClassName ? { className: linkClassName } : {}),
          ...(item.target ? { target: item.target } : {}),
        },
        item.title,
      ),
    ),
  );
}

export interface WpServerLoopProps {
  /** WordPress post type slug (default: 'post'). */
  postType?: string;
  /** Posts array rendered in local dev / decoupled mode. */
  posts?: WpServerPostRecord[];
  /**
   * When true (default), compiles to the main WordPress archive loop (`have_posts()`).
   * Set to false when embedding a custom `WP_Query` feed inside a static page.
   */
  useMainQuery?: boolean;
  /** Optional `posts_per_page` when `useMainQuery` is false. */
  postsPerPage?: number;
  /** Render function for each post item. */
  renderItem?: (post: WpServerPostRecord, index: number) => React.ReactNode;
  /** Optional children render function (same signature as `renderItem`) or static fallback. */
  children?:
    | React.ReactNode
    | ((post: WpServerPostRecord, index: number) => React.ReactNode);
}

const NATIVE_LOOP_TOKEN_POST: WpServerPostRecord = {
  id: 0,
  slug: '__forgewp-loop-item__',
  postType: 'post',
  title: '__FORGEWP_THE_TITLE__',
  excerpt: '__FORGEWP_THE_EXCERPT__',
  content: '__FORGEWP_THE_CONTENT__',
  date: '__FORGEWP_THE_DATE__',
  author: '__FORGEWP_THE_AUTHOR__',
  permalink: '__FORGEWP_THE_PERMALINK__',
  featuredImage: '__FORGEWP_THE_POST_THUMBNAIL_URL__',
  blocks: [],
  source: 'native',
};

/**
 * Pure-TypeScript, Server-Component-safe WordPress post loop for Next.js App Router.
 *
 * - Local dev & decoupled mode: renders `posts.map(renderItem)` (or function `children`).
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits ForgeWP loop markers
 *   around a single token-populated item so `markup-processor.js` compiles it to
 *   a native WordPress `have_posts()` or `WP_Query` PHP loop.
 */
export function WpServerLoop({
  postType = 'post',
  posts = [],
  useMainQuery = true,
  postsPerPage = 10,
  renderItem,
  children,
}: WpServerLoopProps): React.ReactElement {
  const render =
    renderItem ??
    (typeof children === 'function'
      ? (children as (post: WpServerPostRecord, index: number) => React.ReactNode)
      : () => children ?? null);

  if (isNativeWordPressExport()) {
    const tokenItem: WpServerPostRecord = {
      ...NATIVE_LOOP_TOKEN_POST,
      postType,
    };
    if (useMainQuery) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('forgewp-loop-start'),
        render(tokenItem, 0),
        React.createElement('forgewp-loop-end'),
      );
    }
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-query-loop-start', {
        posttype: postType,
        postsperpage: String(postsPerPage),
      }),
      render(tokenItem, 0),
      React.createElement('forgewp-query-loop-end'),
    );
  }

  return React.createElement(
    React.Fragment,
    null,
    ...(Array.isArray(posts) ? posts.map((post, i) => render(post, i)) : []),
  );
}

export interface ServerBlockAreaProps {
  name: string;
  /** Optional HTML content to render in local dev or decoupled mode. */
  content?: string;
  /** Optional custom fallback/children for local dev or decoupled mode. */
  children?: React.ReactNode;
}

/**
 * Server-Component-safe Gutenberg BlockArea for Next.js App Router pages.
 *
 * - During native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits
 *   `<forgewp-block-area data-name="..." />`, which compiles to `<?php the_content(); ?>`.
 * - During local development or decoupled Next.js mode: renders `children` if provided,
 *   or `content` HTML if provided, or a clean Gutenberg slot placeholder.
 */
export function BlockArea({
  name,
  content,
  children,
}: ServerBlockAreaProps): React.ReactElement {
  if (isNativeWordPressExport()) {
    return React.createElement('forgewp-block-area', { 'data-name': name });
  }

  if (children !== undefined && children !== null) {
    return React.createElement('div', { 'data-forgewp-block-area': name }, children);
  }

  if (typeof content === 'string' && content.trim().length > 0) {
    return React.createElement('div', {
      'data-forgewp-block-area': name,
      dangerouslySetInnerHTML: { __html: content },
    });
  }

  return React.createElement(
    'div',
    {
      'data-forgewp-block-area': name,
      style: {
        border: '1px dashed currentColor',
        borderRadius: '0.5rem',
        padding: '1.25rem',
        margin: '1.25rem 0',
        opacity: 0.8,
      },
    },
    React.createElement('strong', null, `Gutenberg Block Area — ${name}`),
  );
}

export interface ServerHydrateProps {
  trigger?: 'load' | 'visible' | 'interaction' | 'idle' | 'click' | 'hover';
  id?: string;
  clientOnly?: boolean;
  preload?: 'near-visible' | 'none';
  media?: string;
  connection?: 'fast' | 'any';
  className?: string;
  style?: React.CSSProperties;
  slotChildren?: boolean;
  needsProviders?: boolean;
  children: React.ReactElement;
}

/**
 * Pure-TypeScript, Server-Component-safe `<Hydrate>` boundary for Next.js App Router.
 * Emits the exact `data-forgewp-hydrate` marker attributes consumed by `next-islands.js`
 * and `assets/forgewp-hydrator.js` without requiring JSX compilation or client hooks.
 */
export function Hydrate({
  trigger = 'visible',
  id,
  clientOnly = false,
  preload = 'none',
  media,
  connection = 'any',
  className,
  style,
  slotChildren = false,
  needsProviders = false,
  children,
}: ServerHydrateProps): React.ReactElement | null {
  if (!children || typeof children !== 'object') {
    return null;
  }

  const type = children.type as any;
  const inferredName = type?.displayName || type?.name;
  const resolvedName = id || inferredName || 'dynamic-island';
  const kebabName = resolvedName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  let propsData = '{}';
  if (children.props) {
    try {
      const { children: _ignoredChildren, ...serializableProps } =
        (children.props as any) || {};
      const seen = new WeakSet();
      propsData =
        JSON.stringify(serializableProps, (key, value) => {
          if (
            key === 'children' ||
            typeof value === 'function' ||
            typeof value === 'symbol'
          ) {
            return undefined;
          }
          if (typeof value === 'object' && value !== null) {
            if ((value as any).$$typeof || seen.has(value)) {
              return undefined;
            }
            seen.add(value);
          }
          return value;
        }) || '{}';
    } catch {
      propsData = '{}';
    }
  }

  const isSSR =
    typeof window === 'undefined' ||
    Boolean((window as any)._forgeWpCompileTime) ||
    isNativeWordPressExport();
  const shouldRender = !clientOnly || !isSSR;

  const childProps = (children as any)?.props || {};
  const childStyle = childProps.style;
  const mergedStyle: React.CSSProperties = {
    display: (style && style.display) || 'contents',
    ...(typeof childStyle === 'object' && childStyle !== null ? childStyle : {}),
    ...style,
  };

  return React.createElement(
    'div',
    {
      'data-forgewp-hydrate': kebabName,
      'data-forgewp-trigger': trigger,
      'data-forgewp-props': propsData,
      'data-forgewp-client-only': clientOnly ? 'true' : undefined,
      'data-forgewp-preload': preload !== 'none' ? preload : undefined,
      'data-forgewp-media': media || undefined,
      'data-forgewp-connection': connection !== 'any' ? connection : undefined,
      'data-forgewp-slot-children': slotChildren ? 'true' : undefined,
      'data-forgewp-needs-providers': needsProviders ? 'true' : undefined,
      className,
      style: mergedStyle,
    },
    shouldRender ? children : null,
  );
}

export interface WpServerRequireAuthProps {
  /** Optional WordPress role or capability required (e.g. `'manage_options'` or `'editor'`). */
  allowed?: string | string[];
  /** Redirect path for unauthorized visitors (default: `'/login'`). */
  redirect?: string;
  children?: React.ReactNode;
}

/**
 * Pure-TypeScript, Server-Component-safe route protection boundary for Next.js App Router.
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits `<forgewp-require-auth ... />`
 *   which `generate-theme.js` compiles to server-side PHP `is_user_logged_in()` /
 *   `current_user_can()` redirect guards and records in `auth-manifest.json`.
 * - Local dev & decoupled mode: renders `children` directly (pair with Next.js middleware
 *   or session checks in decoupled mode).
 */
export function WpServerRequireAuth({
  allowed,
  redirect = '/login',
  children,
}: WpServerRequireAuthProps): React.ReactElement {
  if (isNativeWordPressExport()) {
    const allowedAttr = Array.isArray(allowed)
      ? allowed.join(',')
      : allowed || undefined;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-require-auth', {
        ...(allowedAttr ? { allowed: allowedAttr } : {}),
        redirect,
      }),
      children ?? null,
    );
  }
  return React.createElement(React.Fragment, null, children ?? null);
}

export interface WpServerAuthGateProps {
  /** Optional WordPress role or capability required. When omitted, requires any logged-in user. */
  allowed?: string | string[];
  /** Optional fallback content rendered for unauthorized visitors. */
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Pure-TypeScript, Server-Component-safe inline authentication / capability gate for Next.js.
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits ForgeWP auth/capability gate
 *   markers compiled to server-side PHP `if ( is_user_logged_in() )` / `current_user_can()`.
 * - Local dev & decoupled mode: renders `children` directly.
 */
export function WpServerAuthGate({
  allowed,
  fallback,
  children,
}: WpServerAuthGateProps): React.ReactElement {
  if (isNativeWordPressExport()) {
    const allowedAttr = Array.isArray(allowed)
      ? allowed.join(',')
      : allowed || '';
    if (allowedAttr) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('forgewp-capability-gate-start', {
          allowed: allowedAttr,
        }),
        children ?? null,
        fallback
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement('forgewp-capability-gate-fallback'),
              fallback,
            )
          : null,
        React.createElement('forgewp-capability-gate-end'),
      );
    }
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-auth-gate-start'),
      children ?? null,
      fallback
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('forgewp-auth-gate-fallback'),
            fallback,
          )
        : null,
      React.createElement('forgewp-auth-gate-end'),
    );
  }
  return React.createElement(React.Fragment, null, children ?? null);
}

/**
 * Pure-TypeScript, Server-Component-safe helper that resolves a `defineEditable()`
 * schema from either a `WpServerClient` (`wp.getField(...)`), a plain meta/page
 * object, or the schema's own defaults.
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`) with a `WpServerClient`:
 *   emits `__FORGEWP_META_<key>_DEFAULT_<default>__` compile tokens so each field
 *   compiles to live `get_post_meta()` in PHP.
 * - Local dev & decoupled mode: reads live/fixture meta values with typed defaults.
 */
export function getWpEditable<T extends Record<string, any>>(
  schema: T,
  source?: WpServerClient | Record<string, any> | null,
): { [K in keyof T]: any } {
  const out: Record<string, any> = {};
  const isClient =
    source &&
    typeof source === 'object' &&
    typeof (source as WpServerClient).getField === 'function';
  const recordSource =
    !isClient && source && typeof source === 'object'
      ? ((source as Record<string, any>).customFields ??
        (source as Record<string, any>).meta ??
        (source as Record<string, any>))
      : null;

  for (const [key, field] of Object.entries(schema || {})) {
    let defaultVal: any;
    if (
      field &&
      typeof field === 'object' &&
      'default' in field &&
      field.default !== undefined
    ) {
      defaultVal = field.default;
    } else {
      switch (field?.type) {
        case 'boolean':
          defaultVal = false;
          break;
        case 'number':
          defaultVal = 0;
          break;
        case 'repeater':
          defaultVal = [];
          break;
        default:
          defaultVal = '';
      }
    }

    if (isClient) {
      if (field?.type === 'repeater') {
        out[key] = defaultVal;
        continue;
      }
      const raw = (source as WpServerClient).getField(
        key,
        typeof defaultVal === 'string' ? defaultVal : String(defaultVal ?? ''),
      );
      if (typeof raw === 'string' && raw.startsWith('__FORGEWP_META_')) {
        out[key] = raw;
      } else if (field?.type === 'boolean') {
        out[key] = raw === 'true' || raw === '1';
      } else if (field?.type === 'number') {
        const parsed = Number(raw);
        out[key] = Number.isNaN(parsed) ? defaultVal : parsed;
      } else {
        out[key] = raw;
      }
    } else if (
      recordSource &&
      Object.prototype.hasOwnProperty.call(recordSource, key) &&
      recordSource[key] !== undefined
    ) {
      out[key] = recordSource[key];
    } else {
      out[key] = defaultVal;
    }
  }

  return out as { [K in keyof T]: any };
}

// Unified component aliases so Next.js Server Components can import the exact same
// component names from `@forgewp/react` (resolved via the `"react-server"` export condition)
// as Vite React apps. `WpServer*` names remain exported for backwards compatibility.
export const WpQueryLoop = WpServerLoop;
export const WpMenu = WpServerMenu;
export const WpRequireAuth = WpServerRequireAuth;
export const WpAuthGate = WpServerAuthGate;

export type {
  WpServerLoopProps as WpQueryLoopProps,
  WpServerMenuProps as WpMenuProps,
  WpServerRequireAuthProps as WpRequireAuthProps,
  WpServerAuthGateProps as WpAuthGateProps,
};

// Re-export pure-TypeScript config helpers so they are also available from `@forgewp/react`
// inside Next.js Server Components without pulling in client hooks.
export {
  defineWpForm,
  definePageConfig,
  defineWpPosts,
  defineWpMenus,
  defineWpUsers,
  defineWpRoles,
  defineTranslations,
  defineWpThemeMods,
  defineWpOptions,
  optionText,
  optionUrl,
  optionEmail,
  optionTextarea,
  optionToggle,
  optionNumber,
  optionPostPicker,
} from './config.js';

export {
  ForgeWpRuntimeError,
  FORGEWP_RESOURCES,
  defineResource,
  getResourceDefinition,
  normalizeSiteSettings,
  normalizeFormResource,
  normalizeFormsCollection,
  createForgeWpRuntime,
  configureForgeWpRuntime,
  getForgeWpRuntime,
  resetForgeWpRuntime,
  createNativeSource,
  createRestSource,
  createFixtureSource,
  isProductionRuntime,
} from './runtime/index.js';
export type {
  ForgeWpRuntime,
  ForgeWpRuntimeMode,
  ForgeWpRuntimeOptions,
  ForgeWpRuntimeErrorCode,
  ForgeWpRuntimeErrorOptions,
  ForgeWpResourceAuth,
  ForgeWpResourceDefinition,
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
  ForgeWpSource,
  SiteSettingsResource,
  SiteSettingsSiteMeta,
  FormFieldContract,
  FormResource,
  FormsCollectionResource,
  I18nResource,
  RestSourceOptions,
  PrimableForgeWpSource,
  FixtureSourceOptions,
} from './runtime/index.js';
