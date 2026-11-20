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

export interface WpServerClientOptions {
  fixtures?: Record<string, Array<Record<string, any>>>;
  siteOptions?: Record<string, string>;
  meta?: Record<string, string>;
  wpUrl?: string;
  auth?: WpServerAuth;
  fetch?: typeof globalThis.fetch;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
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
  getOption(key: string, defaultValue?: string): string;
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
  const siteOptions = options.siteOptions || {};
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

    getOption(key, defaultValue = '') {
      const safeKey = sanitizeTokenKey(key);
      if (isNativeWordPressExport()) {
        return `__FORGEWP_OPTION_${safeKey}_DEFAULT_${encodeURIComponent(defaultValue)}__`;
      }
      return Object.prototype.hasOwnProperty.call(siteOptions, safeKey)
        ? siteOptions[safeKey]
        : defaultValue;
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
