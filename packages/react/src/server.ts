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
  isAuthMeAllowed,
  isProductionRuntime,
  normalizeAuthMeResource,
  normalizeCommentsListResource,
  normalizeEditableImage,
  normalizeEditablesResource,
  normalizeFormResource,
  normalizeFormsCollection,
  normalizeI18nResource,
  normalizeMenuItemsContract,
  normalizeMenusCollection,
  normalizePostResource,
  normalizePostsListResource,
  normalizeRoutesResource,
  normalizeSeoResource,
  normalizeSiteSettings,
  normalizeTermResource,
  normalizeTermsListResource,
  type AuthMeResource,
  type CommentResource,
  type CommentsListResource,
  type EditablesResource,
  type FormResource,
  type FormsCollectionResource,
  type I18nResource,
  type MenusCollectionResource,
  type PostResource,
  type PostsListResource,
  type PostTermRefContract,
  type RoutesResource,
  type SeoResource,
  type SiteSettingsResource,
  type TermResource,
  type TermsListResource,
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
  external?: boolean;
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

export interface WpServerAuthMeOptions {
  /** Incoming request headers (e.g. from Next.js `headers()`). */
  headers?: Headers | Record<string, string | null | undefined>;
  /** Explicit incoming `Cookie` header string. */
  cookie?: string | null;
  /** Explicit incoming `Authorization` header string. */
  authorization?: string | null;
  /** Override JWT HttpOnly cookie name (default: `'forgewp_auth_token'`). */
  authCookieName?: string;
  /** Request timeout in milliseconds before failing closed (default: `5000`). */
  timeoutMs?: number;
}

export interface WpServerPostsQueryOptions {
  type?: string;
  page?: number;
  perPage?: number;
  lang?: string;
  taxonomy?: string;
  term?: string;
  search?: string;
  orderby?: 'date' | 'title' | 'menu_order';
  order?: 'desc' | 'asc';
}

export interface WpServerTermsQueryOptions {
  lang?: string;
  hideEmpty?: boolean;
  parent?: number;
}

export interface WpServerCommentsQueryOptions {
  page?: number;
  perPage?: number;
}

export interface WpServerEditablesTarget {
  path?: string;
  routeId?: string;
  post?: number;
  lang?: string;
  schema?: string;
  keys?: string[];
}

export interface WpServerClientOptions {
  fixtures?: Record<string, Array<Record<string, any>>>;
  menus?: Record<string, Array<Record<string, any>>>;
  forms?: Record<string, any>;
  terms?: Record<string, Array<Record<string, any>>>;
  comments?: Record<number | string, Array<Record<string, any>>>;
  seo?: Record<string, SeoResource>;
  editables?: Record<string, EditablesResource>;
  i18n?: Partial<I18nResource>;
  /** Optional local dev fixture for `getAuthMe()` when no `wpUrl` is configured. */
  authMe?: AuthMeResource;
  /** Cookie name carrying a cross-origin JWT token (default: `'forgewp_auth_token'`). */
  authCookieName?: string;
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
  path?: string;
  featuredImage: string;
  terms?: Record<string, PostTermRefContract[]>;
  blocks: WpServerBlockNode[];
  protected?: boolean;
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
    options?: { basePath?: string; perPage?: number; page?: number; lang?: string; taxonomy?: string; term?: string; search?: string; orderby?: 'date' | 'title' | 'menu_order'; order?: 'desc' | 'asc' },
  ): Promise<WpServerPostRecord[]>;
  getPostsList(options?: WpServerPostsQueryOptions): Promise<PostsListResource>;
  getPost(
    type: string,
    slug: string,
    options?: { lang?: string },
  ): Promise<PostResource | null>;
  getLivePost(
    postType: string,
    slug: string,
    options?: { basePath?: string; lang?: string },
  ): Promise<WpServerPostRecord | null>;
  getTerms(
    taxonomy: string,
    options?: WpServerTermsQueryOptions,
  ): Promise<TermsListResource>;
  getTerm(
    taxonomy: string,
    slug: string,
    options?: { lang?: string },
  ): Promise<TermResource | null>;
  getComments(
    postId: number,
    options?: WpServerCommentsQueryOptions,
  ): Promise<CommentsListResource>;
  getStaticParams(
    postType?: string,
    paramName?: string,
  ): Promise<Array<Record<string, string>>>;
  getRoutes(options?: { lang?: string }): Promise<RoutesResource>;
  getRouteHref(
    routeSlug: string,
    fallbackPath?: string,
    options?: { query?: string; fragment?: string; lang?: string },
  ): Promise<string>;
  getMenu(
    location?: string,
    options?: { lang?: string },
  ): Promise<WpServerMenuItem[]>;
  getMenus(options?: { lang?: string }): Promise<MenusCollectionResource>;
  getI18n(options?: { lang?: string; path?: string }): Promise<I18nResource>;
  getAuthMe(options?: WpServerAuthMeOptions): Promise<AuthMeResource>;
  getSiteInfo(): Promise<WpServerSiteInfo>;
  getSiteSettings(): Promise<SiteSettingsResource>;
  getForm(name: string, options?: { lang?: string }): Promise<FormResource | null>;
  getForms(options?: { lang?: string }): Promise<FormsCollectionResource>;
  getSeo(path: string, options?: { lang?: string }): Promise<SeoResource | null>;
  getEditables(target: WpServerEditablesTarget): Promise<EditablesResource | null>;
  getEditable<T extends Record<string, any>>(
    schema: T,
    target: WpServerEditablesTarget,
  ): Promise<{ [K in keyof T]: any }>;
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

export const DEFAULT_AUTH_COOKIE_NAME = 'forgewp_auth_token';

/**
 * Thrown by server auth guards when redirecting an unauthenticated visitor
 * outside a Next.js App Router request context (where `next/navigation`
 * `redirect()` is unavailable).
 */
export class ForgeWpAuthRedirectError extends Error {
  readonly code = 'FORGEWP_AUTH_REDIRECT';
  readonly redirectTo: string;
  readonly status = 307;

  constructor(redirectTo: string) {
    super(`FORGEWP_AUTH_REDIRECT: Redirecting unauthenticated request to "${redirectTo}".`);
    this.name = 'ForgeWpAuthRedirectError';
    this.redirectTo = redirectTo;
  }
}

/**
 * Filters a raw HTTP `Cookie` header down to only WordPress session cookies
 * (`wordpress_logged_in_*` and `wordpress_sec_*`), per `docs/resource-contracts.md` §9.
 */
export function filterForwardedWordPressCookies(
  cookieHeader?: string | null,
): string {
  if (!cookieHeader || typeof cookieHeader !== 'string') return '';
  const kept: string[] = [];
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (
      name.startsWith('wordpress_logged_in_') ||
      name.startsWith('wordpress_sec_')
    ) {
      kept.push(trimmed);
    }
  }
  return kept.join('; ');
}

function extractNamedCookie(
  cookieHeader: string | null | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader || !cookieName) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (name === cookieName) {
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!val) return null;
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

function readHeaderValue(
  headers: Headers | Record<string, string | null | undefined> | null | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers as Record<string, string | null | undefined>)) {
    if (k.toLowerCase() === lower && typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return null;
}

async function readNextRequestHeaders(): Promise<Headers | null> {
  try {
    const spec = 'next/headers';
    const mod = await import(/* @vite-ignore */ spec);
    if (mod && typeof mod.headers === 'function') {
      const h = await mod.headers();
      if (h && typeof h.get === 'function') return h as Headers;
    }
  } catch {
    // Outside Next.js App Router request context
  }
  return null;
}

/**
 * Builds the exact outbound headers forwarded to `GET /wp-json/forgewp/v1/auth/me`:
 * - Only `wordpress_logged_in_*` and `wordpress_sec_*` cookies
 * - Incoming `Authorization` header, OR `Authorization: Bearer <token>` extracted
 *   from the configured JWT HttpOnly cookie (`forgewp_auth_token` by default).
 */
export function buildForwardedAuthHeaders(
  options: WpServerAuthMeOptions = {},
): Record<string, string> {
  const cookieHeader =
    options.cookie !== undefined
      ? options.cookie
      : readHeaderValue(options.headers, 'cookie');
  const authHeader =
    options.authorization !== undefined
      ? options.authorization
      : readHeaderValue(options.headers, 'authorization');
  const authCookieName =
    options.authCookieName ||
    readEnv('FORGEWP_AUTH_COOKIE') ||
    DEFAULT_AUTH_COOKIE_NAME;

  const out: Record<string, string> = {
    Accept: 'application/json',
  };

  const wpCookies = filterForwardedWordPressCookies(cookieHeader);
  if (wpCookies) {
    out.Cookie = wpCookies;
  }

  const trimmedAuth = typeof authHeader === 'string' ? authHeader.trim() : '';
  if (trimmedAuth) {
    out.Authorization = trimmedAuth;
  } else {
    const jwtCookie = extractNamedCookie(cookieHeader, authCookieName);
    if (jwtCookie) {
      out.Authorization = jwtCookie.toLowerCase().startsWith('bearer ')
        ? jwtCookie
        : `Bearer ${jwtCookie}`;
    }
  }

  return out;
}

async function performNextRedirect(target: string): Promise<never> {
  let redirectFn: ((url: string) => never) | null = null;
  try {
    const spec = 'next/navigation';
    const mod = await import(/* @vite-ignore */ spec);
    if (mod && typeof mod.redirect === 'function') {
      redirectFn = mod.redirect;
    }
  } catch {
    // Outside Next.js runtime
  }
  if (redirectFn) {
    // Call outside try/catch so Next.js's NEXT_REDIRECT control-flow error propagates
    return redirectFn(target);
  }
  throw new ForgeWpAuthRedirectError(target);
}

/**
 * Attempts to invoke Next.js's `forbidden()` for a real HTTP 403 status when
 * `experimental.authInterrupts` is enabled in `next.config.*`. If Next.js is
 * absent or `authInterrupts` is disabled, returns `false` so callers can fall
 * back to the built-in 403 UI (HTTP 200) without crashing.
 */
async function tryNextForbidden(): Promise<boolean> {
  let forbiddenFn: (() => never) | null = null;
  try {
    const spec = 'next/navigation';
    const mod = await import(/* @vite-ignore */ spec);
    if (mod && typeof mod.forbidden === 'function') {
      forbiddenFn = mod.forbidden;
    }
  } catch {
    return false;
  }
  if (!forbiddenFn) return false;
  try {
    forbiddenFn();
    return true;
  } catch (err: any) {
    const digest = typeof err?.digest === 'string' ? err.digest : '';
    if (digest.includes('403') || digest === 'NEXT_FORBIDDEN') {
      throw err;
    }
    // `forbidden()` threw because experimental.authInterrupts is not enabled
    return false;
  }
}

async function fetchDecoupledAuthMe(params: {
  wpUrl?: string;
  fetchImpl?: typeof globalThis.fetch;
  authCookieName?: string;
  requestOptions?: WpServerAuthMeOptions;
}): Promise<AuthMeResource> {
  const base = normalizeBaseUrl(
    params.wpUrl !== undefined ? params.wpUrl : readEnv('FORGEWP_WP_URL'),
  );
  if (!base) {
    // Fail closed when WordPress URL is unavailable
    return { authenticated: false, user: null };
  }

  const fetchImpl = params.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { authenticated: false, user: null };
  }

  const reqOpts: WpServerAuthMeOptions = { ...(params.requestOptions || {}) };
  if (
    reqOpts.headers === undefined &&
    reqOpts.cookie === undefined &&
    reqOpts.authorization === undefined
  ) {
    const nextHeaders = await readNextRequestHeaders();
    if (nextHeaders) {
      reqOpts.headers = nextHeaders;
    }
  }
  if (params.authCookieName && !reqOpts.authCookieName) {
    reqOpts.authCookieName = params.authCookieName;
  }

  const headers = buildForwardedAuthHeaders(reqOpts);
  const timeoutMs =
    typeof reqOpts.timeoutMs === 'number' && reqOpts.timeoutMs > 0
      ? reqOpts.timeoutMs
      : 5000;
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && typeof setTimeout === 'function'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetchImpl(`${base.baseUrl}/wp-json/forgewp/v1/auth/me`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) {
      return { authenticated: false, user: null };
    }
    const json = await response.json().catch(() => null);
    return normalizeAuthMeResource(json);
  } catch {
    // Fail closed on network failure or timeout
    return { authenticated: false, user: null };
  } finally {
    if (timer !== null && typeof clearTimeout === 'function') {
      clearTimeout(timer);
    }
  }
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
    content: rawContent,
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
  const fixtureI18n = options.i18n ? normalizeI18nResource(options.i18n) : null;
  let cachedSiteSettings: SiteSettingsResource | null = null;
  const cachedFormByKey = new Map<string, FormResource | null>();
  const cachedFormsByLang = new Map<string, FormsCollectionResource>();
  const cachedRoutesByLang = new Map<string, RoutesResource>();
  const cachedMenuByKey = new Map<string, WpServerMenuItem[]>();
  const cachedMenusByLang = new Map<string, MenusCollectionResource>();
  const cachedI18nByKey = new Map<string, I18nResource>();
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

  function buildTaggedInit(tags: string[], authenticated = false): Record<string, any> {
    const mergedTags = Array.from(new Set([...tags, ...(nextOptions?.tags || [])]));
    return {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(authenticated ? getAuthHeaders() : {}),
      },
      cache: cacheMode,
      next: {
        ...(nextOptions || {}),
        tags: mergedTags,
      },
    };
  }

  function throwIfLocaleNotFound(
    response: Response,
    json: any,
    resource: string,
  ): void {
    if (
      !response.ok &&
      json &&
      typeof json === 'object' &&
      json.code === 'FORGEWP_LOCALE_NOT_FOUND'
    ) {
      const msg =
        typeof json.message === 'string' && json.message
          ? json.message
          : `Unknown locale requested for resource "${resource}".`;
      throw new ForgeWpRuntimeError(
        'FORGEWP_RESOURCE_FETCH_FAILED',
        `[FORGEWP_LOCALE_NOT_FOUND] ${msg}`,
        { resource, status: response.status },
      );
    }
  }

  function isStrictDecoupledMode(
    wpBase: { baseUrl: string } | null | undefined,
  ): boolean {
    return (
      Boolean(wpBase) &&
      (readEnv('FORGEWP_DEPLOYMENT_MODE') === 'decoupled' || isProductionRuntime())
    );
  }

  function delayMs(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchJsonWithRetry(
    url: string,
    init: Record<string, any>,
    opts: {
      resource: string;
      strict: boolean;
      allow404?: boolean;
      retryDelayMs?: number;
      checkDomainErrors?: (response: Response, json: any) => void;
    },
  ): Promise<{ ok: boolean; status: number; json: any }> {
    const retryDelayMs = opts.retryDelayMs ?? 300;
    const maxAttempts = opts.strict ? 2 : 1;
    let lastStatus = 0;
    let lastDetail = 'Unknown fetch error';
    let lastCause: unknown = undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetchImpl(url, init);
        lastStatus = response.status;

        let json: any = null;
        let parseFailed = false;
        if (typeof (response as any).json === 'function') {
          try {
            json = await response.json();
          } catch (parseErr) {
            parseFailed = true;
            lastCause = parseErr;
          }
        }

        if (opts.checkDomainErrors) {
          opts.checkDomainErrors(response, json);
        } else {
          throwIfLocaleNotFound(response, json, opts.resource);
        }

        if (response.status === 404 && opts.allow404) {
          return { ok: false, status: 404, json };
        }

        if (response.ok && !parseFailed) {
          return { ok: true, status: response.status, json };
        }

        if (
          !response.ok &&
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 408 &&
          response.status !== 429 &&
          !opts.strict
        ) {
          return { ok: false, status: response.status, json };
        }

        const errCode = json && typeof json.code === 'string' ? `[${json.code}] ` : '';
        const errMsg =
          json && typeof json.message === 'string'
            ? json.message
            : parseFailed
              ? `Invalid JSON response (HTTP ${response.status})`
              : `HTTP ${response.status}`;
        lastDetail = `${errCode}${errMsg}`;
      } catch (err) {
        if (err instanceof ForgeWpRuntimeError) {
          throw err;
        }
        lastCause = err;
        lastDetail = err instanceof Error ? err.message : String(err);
      }

      if (attempt < maxAttempts) {
        await delayMs(retryDelayMs);
      }
    }

    if (opts.strict) {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RESOURCE_FETCH_FAILED',
        `Failed to fetch WordPress resource "${opts.resource}" (${url}): ${lastDetail}`,
        {
          resource: opts.resource,
          ...(lastStatus > 0 ? { status: lastStatus } : {}),
          ...(lastCause !== undefined ? { cause: lastCause } : {}),
        },
      );
    }

    return { ok: false, status: lastStatus, json: null };
  }

  async function wpFetchJson(
    base: { baseUrl: string },
    endpoint: string,
    authenticated = false,
    opts: { resource?: string; allow404?: boolean } = {},
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
    const res = await fetchJsonWithRetry(`${base.baseUrl}${endpoint}`, init, {
      resource: opts.resource || endpoint,
      strict: isStrictDecoupledMode(base),
      allow404: opts.allow404,
    });
    return res.ok ? res.json : null;
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
    const bySlug = await wpFetchJson(
      base,
      `/wp-json/wp/v2/pages?${params.toString()}`,
      preview,
      { resource: `page:${cleanSlug}`, allow404: true },
    );
    if (Array.isArray(bySlug) && bySlug.length > 0) {
      wpPage = bySlug[0];
    }

    if (!wpPage) {
      const routeData = await wpFetchJson(base, '/wp-json/forgewp/v1/routes', false, {
        resource: 'routes',
      });
      const match = Array.isArray(routeData?.routes)
        ? routeData.routes.find((r: any) => r.routeId === cleanSlug || r.slug === cleanSlug)
        : null;
      if (match?.id) {
        const byIdEndpoint = preview
          ? `/wp-json/wp/v2/pages/${match.id}?context=edit`
          : `/wp-json/wp/v2/pages/${match.id}`;
        wpPage = await wpFetchJson(base, byIdEndpoint, preview, {
          resource: `page:${match.id}`,
          allow404: true,
        });
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
      content: renderedHtml,
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
        if (isStrictDecoupledMode(base)) return null;
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
          if (isStrictDecoupledMode(base)) return null;
        }
      }
      return findFixturePage(slug);
    },

    async getRoutes(routeOptions = {}) {
      const lang =
        typeof routeOptions.lang === 'string' && routeOptions.lang.trim()
          ? routeOptions.lang.trim()
          : undefined;
      const cacheKey = lang || '';

      if (!isNativeWordPressExport() && cachedRoutesByLang.has(cacheKey)) {
        return cachedRoutesByLang.get(cacheKey)!;
      }

      const base = !isNativeWordPressExport() ? resolveWpBase() : null;
      if (base) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${base.baseUrl}/wp-json/forgewp/v1/routes${qs}`;
        const res = await fetchJsonWithRetry(url, buildTaggedInit(['routes']), {
          resource: 'routes',
          strict: isStrictDecoupledMode(base),
        });
        if (res.ok && res.json) {
          const json = res.json;
          const normalized = normalizeRoutesResource({
            ...json,
            homeUrl: json.homeUrl || `${base.baseUrl}/`,
            basePath: json.basePath ?? base.basePath,
            ...(lang && !json.lang ? { lang } : {}),
          });
          if (normalized) {
            cachedRoutesByLang.set(cacheKey, normalized);
            return normalized;
          }
          if (isStrictDecoupledMode(base)) {
            throw new ForgeWpRuntimeError(
              'FORGEWP_RESOURCE_FETCH_FAILED',
              'Failed to normalize routes resource from WordPress.',
              { resource: 'routes' },
            );
          }
        }
      }

      const pages = Array.isArray(fixtures.page) ? fixtures.page : [];
      const routes = pages.map((p, idx) => {
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
      });
      const pageLinks: Record<string, string> = {};
      for (const route of routes) {
        if (route.routeId) pageLinks[route.routeId] = route.path;
        if (route.slug && !pageLinks[route.slug]) pageLinks[route.slug] = route.path;
      }
      const fallbackRoutes: RoutesResource = {
        homeUrl: '/',
        basePath: '',
        ...(lang ? { lang } : {}),
        routes,
        pageLinks,
      };
      if (!base && !isNativeWordPressExport()) {
        cachedRoutesByLang.set(cacheKey, fallbackRoutes);
      }
      return fallbackRoutes;
    },

    async getRouteHref(routeSlug, fallbackPath = '/', opts = {}) {
      const clean = String(routeSlug || '').replace(/^\/+|\/+$/g, '');
      if (clean === '' || clean === '__home__') {
        return appendQueryAndFragment('/', opts);
      }
      const { routes, pageLinks } = await this.getRoutes(
        opts.lang ? { lang: opts.lang } : undefined,
      );
      if (pageLinks?.[clean]) {
        return appendQueryAndFragment(pageLinks[clean], opts);
      }
      const match = routes.find((r) => r.routeId === clean || r.slug === clean);
      return appendQueryAndFragment(match ? match.path : fallbackPath, opts);
    },

    async getPostsList(queryOptions = {}) {
      const cleanType = String(queryOptions.type || 'post').trim() || 'post';
      const page =
        typeof queryOptions.page === 'number' && queryOptions.page > 0
          ? Math.floor(queryOptions.page)
          : 1;
      const perPage =
        typeof queryOptions.perPage === 'number' && queryOptions.perPage > 0
          ? Math.min(Math.floor(queryOptions.perPage), 100)
          : 10;
      const lang =
        typeof queryOptions.lang === 'string' && queryOptions.lang.trim()
          ? queryOptions.lang.trim()
          : undefined;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const params = new URLSearchParams();
        params.set('type', cleanType);
        params.set('page', String(page));
        params.set('perPage', String(perPage));
        if (lang) params.set('lang', lang);
        if (queryOptions.taxonomy) params.set('taxonomy', queryOptions.taxonomy);
        if (queryOptions.term) params.set('term', queryOptions.term);
        if (queryOptions.search) params.set('search', queryOptions.search);
        if (queryOptions.orderby) params.set('orderby', queryOptions.orderby);
        if (queryOptions.order) params.set('order', queryOptions.order);

        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/posts?${params.toString()}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['posts', `type:${cleanType}`]),
          {
            resource: `posts:${cleanType}`,
            strict: isStrictDecoupledMode(wpBase),
            checkDomainErrors(response, json) {
              throwIfLocaleNotFound(response, json, `posts:${cleanType}`);
              if (
                !response.ok &&
                json &&
                typeof json === 'object' &&
                json.code === 'FORGEWP_POST_TYPE_NOT_PUBLIC'
              ) {
                throw new ForgeWpRuntimeError(
                  'FORGEWP_RESOURCE_FETCH_FAILED',
                  `[FORGEWP_POST_TYPE_NOT_PUBLIC] ${json.message || `Post type "${cleanType}" is not public.`}`,
                  { resource: `posts:${cleanType}`, status: response.status },
                );
              }
            },
          },
        );
        if (res.ok && res.json) {
          const normalized = normalizePostsListResource(res.json, cleanType);
          if (normalized) return normalized;
        }
      }

      const rawList = Array.isArray((fixtures as any)?.[cleanType])
        ? (fixtures as any)[cleanType]
        : [];
      const defaultBase = cleanType === 'post' ? '/blog' : `/${cleanType}s`;
      let filtered = rawList.map((item: any, idx: number) => {
        const slug = String(item.slug || `item-${idx + 1}`);
        return normalizePostResource(
          {
            ...item,
            id: item.id ?? idx + 1,
            type: cleanType,
            slug,
            path: item.path || `${defaultBase}/${slug}`,
            permalink: item.permalink || `${defaultBase}/${slug}`,
          },
          { isListItem: true, fallbackType: cleanType },
        );
      }).filter(Boolean) as PostResource[];

      if (queryOptions.search) {
        const q = queryOptions.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.excerpt.toLowerCase().includes(q),
        );
      }
      if (queryOptions.taxonomy && queryOptions.term) {
        const tax = queryOptions.taxonomy;
        const termSlug = queryOptions.term;
        filtered = filtered.filter((p) =>
          (p.terms?.[tax] || []).some((t) => t.slug === termSlug),
        );
      }

      const total = filtered.length;
      const totalPages = total > 0 ? Math.ceil(total / perPage) : 0;
      const start = (page - 1) * perPage;
      const items = filtered.slice(start, start + perPage);

      return {
        type: cleanType,
        ...(lang ? { lang } : {}),
        page,
        perPage,
        total,
        totalPages,
        items,
      };
    },

    async getPost(postType, slug, postOptions = {}) {
      const cleanType = String(postType || 'post').trim() || 'post';
      const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
      if (isNativeWordPressExport()) {
        return {
          id: '__FORGEWP_THE_ID__' as unknown as number,
          type: cleanType,
          slug: cleanSlug,
          title: '__FORGEWP_THE_TITLE__',
          excerpt: '__FORGEWP_THE_EXCERPT__',
          content: '__FORGEWP_THE_CONTENT__',
          date: '__FORGEWP_THE_DATE__',
          modified: '__FORGEWP_THE_MODIFIED_DATE__',
          permalink: '__FORGEWP_THE_PERMALINK__',
          path: '__FORGEWP_THE_PATH__',
          author: { id: 0, name: '__FORGEWP_THE_AUTHOR__' },
          featuredImage: { url: '__FORGEWP_THE_POST_THUMBNAIL_URL__', alt: '' },
          terms: {},
          fields: {},
          blocks: [],
          protected: false,
        };
      }
      if (!cleanSlug) return null;
      const lang =
        typeof postOptions.lang === 'string' && postOptions.lang.trim()
          ? postOptions.lang.trim()
          : undefined;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/posts/${encodeURIComponent(cleanType)}/${encodeURIComponent(cleanSlug)}${qs}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['posts', `type:${cleanType}`]),
          {
            resource: `post:${cleanType}:${cleanSlug}`,
            strict: isStrictDecoupledMode(wpBase),
            allow404: true,
            checkDomainErrors(response, json) {
              throwIfLocaleNotFound(response, json, `post:${cleanType}:${cleanSlug}`);
              if (
                !response.ok &&
                json &&
                typeof json === 'object' &&
                json.code === 'FORGEWP_POST_TYPE_NOT_PUBLIC'
              ) {
                throw new ForgeWpRuntimeError(
                  'FORGEWP_RESOURCE_FETCH_FAILED',
                  `[FORGEWP_POST_TYPE_NOT_PUBLIC] ${json.message || `Post type "${cleanType}" is not public.`}`,
                  { resource: `post:${cleanType}:${cleanSlug}`, status: response.status },
                );
              }
            },
          },
        );
        if (res.status === 404) {
          return null;
        }
        if (res.ok && res.json) {
          return normalizePostResource(res.json, { fallbackType: cleanType });
        }
      }

      const rawList = Array.isArray((fixtures as any)?.[cleanType])
        ? (fixtures as any)[cleanType]
        : [];
      const found = rawList.find(
        (item: any) => String(item?.slug || '').replace(/^\/+|\/+$/g, '') === cleanSlug,
      );
      if (!found) return null;
      const defaultBase = cleanType === 'post' ? '/blog' : `/${cleanType}s`;
      return normalizePostResource(
        {
          ...found,
          type: cleanType,
          slug: cleanSlug,
          path: found.path || `${defaultBase}/${cleanSlug}`,
          permalink: found.permalink || `${defaultBase}/${cleanSlug}`,
        },
        { fallbackType: cleanType },
      );
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
        const perPage = opts.perPage ?? 20;
        const page = opts.page ?? 1;
        const params = new URLSearchParams();
        params.set('type', cleanType);
        params.set('page', String(page));
        params.set('perPage', String(perPage));
        if (opts.lang) params.set('lang', opts.lang);
        if (opts.taxonomy) params.set('taxonomy', opts.taxonomy);
        if (opts.term) params.set('term', opts.term);
        if (opts.search) params.set('search', opts.search);
        if (opts.orderby) params.set('orderby', opts.orderby);
        if (opts.order) params.set('order', opts.order);

        const res = await fetchJsonWithRetry(
          `${wpBase.baseUrl}/wp-json/forgewp/v1/posts?${params.toString()}`,
          buildTaggedInit(['posts', `type:${cleanType}`]),
          {
            resource: `posts:${cleanType}`,
            strict: isStrictDecoupledMode(wpBase),
          },
        );
        if (res.ok && res.json) {
          const normalized = normalizePostsListResource(res.json, cleanType);
          if (normalized) {
            return normalized.items.map((item) => {
              const resolvedPath =
                opts.basePath !== undefined
                  ? `${defaultBase}/${item.slug}`
                  : item.path || `${defaultBase}/${item.slug}`;
              return {
                id: item.id,
                slug: item.slug,
                postType: item.type,
                title: item.title,
                excerpt: stripTags(item.excerpt),
                content: item.content ?? '',
                date: item.date,
                author: item.author?.name || '',
                permalink:
                  opts.basePath !== undefined
                    ? resolvedPath
                    : item.permalink || resolvedPath,
                path: resolvedPath,
                featuredImage: item.featuredImage?.url || '',
                terms: item.terms || {},
                blocks: Array.isArray(item.blocks) ? item.blocks : [],
                protected: item.protected === true,
                source: 'wordpress' as const,
              };
            });
          }
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
        const fallbackPath = `${defaultBase}/${slug}`;
        const normalized = normalizePostResource(
          {
            ...item,
            id: Number(item.id ?? idx + 1),
            type: cleanType,
            slug,
            path: item.path || fallbackPath,
            permalink: item.permalink || fallbackPath,
          },
          { isListItem: true, fallbackType: cleanType },
        );
        const isProtected = normalized?.protected === true;
        const resolvedPath =
          opts.basePath !== undefined
            ? fallbackPath
            : normalized?.path || fallbackPath;
        return {
          id: Number(item.id ?? idx + 1),
          slug,
          postType: cleanType,
          title: String(item.title || ''),
          excerpt: isProtected ? '' : String(item.excerpt || ''),
          content: isProtected ? '' : String(item.content || ''),
          date: String(item.date || ''),
          author: String(
            typeof item.author === 'object' && item.author !== null
              ? item.author.name || ''
              : item.author || '',
          ),
          permalink: fallbackPath,
          path: resolvedPath,
          featuredImage: String(img),
          terms: normalized?.terms || {},
          blocks: Array.isArray(item.blocks) ? item.blocks : [],
          protected: isProtected,
          source: 'fixture' as const,
        };
      });
    },

    async getLivePost(postType, slug, opts = {}) {
      const cleanType = String(postType || 'post').trim() || 'post';
      if (isNativeWordPressExport()) {
        return {
          id: '__FORGEWP_THE_ID__' as unknown as number,
          slug: String(slug || ''),
          postType: cleanType,
          title: '__FORGEWP_THE_TITLE__',
          excerpt: '__FORGEWP_THE_EXCERPT__',
          content: '__FORGEWP_THE_CONTENT__',
          date: '__FORGEWP_THE_DATE__',
          author: '__FORGEWP_THE_AUTHOR__',
          permalink: '__FORGEWP_THE_PERMALINK__',
          path: '__FORGEWP_THE_PATH__',
          featuredImage: '__FORGEWP_THE_POST_THUMBNAIL_URL__',
          terms: {},
          blocks: [],
          protected: false,
          source: 'native' as const,
        };
      }

      const defaultBase =
        opts.basePath !== undefined
          ? opts.basePath.replace(/\/+$/, '')
          : cleanType === 'post'
            ? '/blog'
            : `/${cleanType}s`;
      const wpBase = resolveWpBase();
      if (wpBase) {
        const single = await this.getPost(cleanType, slug, { lang: opts.lang });
        if (single) {
          const resolvedPath =
            opts.basePath !== undefined
              ? `${defaultBase}/${single.slug}`
              : single.path || `${defaultBase}/${single.slug}`;
          return {
            id: single.id,
            slug: single.slug,
            postType: single.type,
            title: single.title,
            excerpt: stripTags(single.excerpt),
            content: single.content ?? '',
            date: single.date,
            author: single.author?.name || '',
            permalink:
              opts.basePath !== undefined
                ? resolvedPath
                : single.permalink || resolvedPath,
            path: resolvedPath,
            featuredImage: single.featuredImage?.url || '',
            terms: single.terms || {},
            blocks: Array.isArray(single.blocks) ? single.blocks : [],
            protected: single.protected === true,
            source: 'wordpress' as const,
          };
        }
        return null;
      }

      const posts = await this.getPosts(cleanType, opts);
      const target = String(slug || '').replace(/^\/+|\/+$/g, '');
      return posts.find((p) => p.slug === target) ?? null;
    },

    async getTerms(taxonomy, termOptions = {}) {
      const cleanTax = String(taxonomy || 'category').trim() || 'category';
      const lang =
        typeof termOptions.lang === 'string' && termOptions.lang.trim()
          ? termOptions.lang.trim()
          : undefined;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const params = new URLSearchParams();
        if (lang) params.set('lang', lang);
        if (termOptions.hideEmpty !== undefined) {
          params.set('hideEmpty', termOptions.hideEmpty ? 'true' : 'false');
        }
        if (termOptions.parent !== undefined) {
          params.set('parent', String(termOptions.parent));
        }
        const qs = params.toString();
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/terms/${encodeURIComponent(cleanTax)}${qs ? `?${qs}` : ''}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['terms', `taxonomy:${cleanTax}`]),
          {
            resource: `terms:${cleanTax}`,
            strict: isStrictDecoupledMode(wpBase),
            checkDomainErrors(response, json) {
              throwIfLocaleNotFound(response, json, `terms:${cleanTax}`);
              if (
                !response.ok &&
                json &&
                typeof json === 'object' &&
                json.code === 'FORGEWP_TAXONOMY_NOT_PUBLIC'
              ) {
                throw new ForgeWpRuntimeError(
                  'FORGEWP_RESOURCE_FETCH_FAILED',
                  `[FORGEWP_TAXONOMY_NOT_PUBLIC] ${json.message || `Taxonomy "${cleanTax}" is not public.`}`,
                  { resource: `terms:${cleanTax}`, status: response.status },
                );
              }
            },
          },
        );
        if (res.ok && res.json) {
          const normalized = normalizeTermsListResource(res.json, cleanTax);
          if (normalized) return normalized;
        }
      }

      const rawTerms = Array.isArray(options.terms?.[cleanTax])
        ? options.terms[cleanTax]
        : [];
      return (
        normalizeTermsListResource(
          { taxonomy: cleanTax, ...(lang ? { lang } : {}), items: rawTerms },
          cleanTax,
        ) || { taxonomy: cleanTax, ...(lang ? { lang } : {}), items: [] }
      );
    },

    async getTerm(taxonomy, slug, termOptions = {}) {
      const cleanTax = String(taxonomy || 'category').trim() || 'category';
      const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
      if (!cleanSlug) return null;
      if (
        isNativeWordPressExport() &&
        /^[a-zA-Z0-9_-]+$/.test(cleanTax) &&
        /^[a-zA-Z0-9_-]+$/.test(cleanSlug)
      ) {
        return {
          id: `__FORGEWP_TERM_LOOKUP_ID__${cleanTax}__${cleanSlug}__` as unknown as number,
          slug: `__FORGEWP_TERM_LOOKUP_SLUG__${cleanTax}__${cleanSlug}__`,
          name: `__FORGEWP_TERM_LOOKUP_NAME__${cleanTax}__${cleanSlug}__`,
          description: `__FORGEWP_TERM_LOOKUP_DESCRIPTION__${cleanTax}__${cleanSlug}__`,
          count: `__FORGEWP_TERM_LOOKUP_COUNT__${cleanTax}__${cleanSlug}__` as unknown as number,
          parent: 0,
          path: `__FORGEWP_TERM_LOOKUP_PATH__${cleanTax}__${cleanSlug}__`,
          permalink: `__FORGEWP_TERM_LOOKUP_URL__${cleanTax}__${cleanSlug}__`,
        };
      }
      const lang =
        typeof termOptions.lang === 'string' && termOptions.lang.trim()
          ? termOptions.lang.trim()
          : undefined;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/terms/${encodeURIComponent(cleanTax)}/${encodeURIComponent(cleanSlug)}${qs}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['terms', `taxonomy:${cleanTax}`]),
          {
            resource: `term:${cleanTax}:${cleanSlug}`,
            strict: isStrictDecoupledMode(wpBase),
            allow404: true,
            checkDomainErrors(response, json) {
              throwIfLocaleNotFound(response, json, `term:${cleanTax}:${cleanSlug}`);
              if (
                !response.ok &&
                json &&
                typeof json === 'object' &&
                json.code === 'FORGEWP_TAXONOMY_NOT_PUBLIC'
              ) {
                throw new ForgeWpRuntimeError(
                  'FORGEWP_RESOURCE_FETCH_FAILED',
                  `[FORGEWP_TAXONOMY_NOT_PUBLIC] ${json.message || `Taxonomy "${cleanTax}" is not public.`}`,
                  { resource: `term:${cleanTax}:${cleanSlug}`, status: response.status },
                );
              }
            },
          },
        );
        if (res.status === 404) {
          return null;
        }
        if (res.ok && res.json) {
          return normalizeTermResource(res.json, cleanTax);
        }
      }

      const list = await this.getTerms(cleanTax, { lang });
      return list.items.find((t) => t.slug === cleanSlug) ?? null;
    },

    async getComments(postId, commentOptions = {}) {
      const cleanPostId = Number(postId || 0);
      const page =
        typeof commentOptions.page === 'number' && commentOptions.page > 0
          ? Math.floor(commentOptions.page)
          : 1;
      const perPage =
        typeof commentOptions.perPage === 'number' && commentOptions.perPage > 0
          ? Math.min(Math.floor(commentOptions.perPage), 100)
          : 50;

      if (isNativeWordPressExport()) {
        return {
          post: 0,
          open: true,
          page,
          perPage,
          total: '__FORGEWP_COMMENTS_COUNT__' as unknown as number,
          items: [],
        };
      }

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const params = new URLSearchParams({
          post: String(cleanPostId),
          page: String(page),
          perPage: String(perPage),
        });
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/comments?${params.toString()}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['comments', `comments:post:${cleanPostId}`]),
          {
            resource: `comments:${cleanPostId}`,
            strict: isStrictDecoupledMode(wpBase),
            checkDomainErrors(response, json) {
              if (
                !response.ok &&
                json &&
                typeof json === 'object' &&
                json.code === 'FORGEWP_POST_NOT_FOUND'
              ) {
                throw new ForgeWpRuntimeError(
                  'FORGEWP_RESOURCE_FETCH_FAILED',
                  `[FORGEWP_POST_NOT_FOUND] ${json.message || `Post ${cleanPostId} not found.`}`,
                  { resource: `comments:${cleanPostId}`, status: response.status },
                );
              }
            },
          },
        );
        if (res.ok && res.json) {
          const normalized = normalizeCommentsListResource(res.json, cleanPostId);
          if (normalized) return normalized;
        }
      }

      const rawComments =
        (options.comments &&
          (options.comments[cleanPostId] || options.comments[String(cleanPostId)])) ||
        [];
      return (
        normalizeCommentsListResource(
          {
            post: cleanPostId,
            open: true,
            page,
            perPage,
            total: Array.isArray(rawComments) ? rawComments.length : 0,
            items: Array.isArray(rawComments) ? rawComments : [],
          },
          cleanPostId,
        ) || {
          post: cleanPostId,
          open: true,
          page,
          perPage,
          total: 0,
          items: [],
        }
      );
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

    async getMenu(location = 'primary', menuOptions = {}) {
      const cleanLoc = String(location || 'primary').trim() || 'primary';
      const lang =
        typeof menuOptions.lang === 'string' && menuOptions.lang.trim()
          ? menuOptions.lang.trim()
          : undefined;
      const cacheKey = `${cleanLoc}::${lang || ''}`;

      const normalizeLocalItems = (raw: unknown): WpServerMenuItem[] => {
        const items = normalizeMenuItemsContract(raw, cleanLoc);
        const wpBase = resolveWpBase();
        if (!wpBase) return items;
        const fixBasePaths = (list: WpServerMenuItem[]): WpServerMenuItem[] =>
          list.map((item) => ({
            ...item,
            path:
              item.external || item.path.startsWith('http://') || item.path.startsWith('https://')
                ? item.path
                : item.path || stripBasePath(item.url, wpBase),
            children: fixBasePaths(item.children),
          }));
        return fixBasePaths(items);
      };

      const menusFixture = options.menus || {};
      const localItems = normalizeLocalItems(menusFixture[cleanLoc]);

      if (isNativeWordPressExport()) {
        return localItems;
      }

      if (cachedMenuByKey.has(cacheKey)) {
        return cachedMenuByKey.get(cacheKey)!;
      }

      const base = resolveWpBase();
      if (base) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${base.baseUrl}/wp-json/forgewp/v1/menus/${encodeURIComponent(cleanLoc)}${qs}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['menus', `menu:${cleanLoc}`]),
          {
            resource: `menus:${cleanLoc}`,
            strict: isStrictDecoupledMode(base),
          },
        );
        if (res.ok && res.json && Array.isArray(res.json.items)) {
          const normalized = normalizeLocalItems(res.json.items);
          cachedMenuByKey.set(cacheKey, normalized);
          return normalized;
        }
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            `Invalid menu payload for location "${cleanLoc}".`,
            { resource: `menus:${cleanLoc}`, status: res.status },
          );
        }
        return localItems;
      }

      cachedMenuByKey.set(cacheKey, localItems);
      return localItems;
    },

    async getMenus(menusOptions = {}) {
      const lang =
        typeof menusOptions.lang === 'string' && menusOptions.lang.trim()
          ? menusOptions.lang.trim()
          : undefined;
      const cacheKey = lang || '';

      const fallbackCollection: MenusCollectionResource =
        normalizeMenusCollection(options.menus || {}) || { menus: {} };
      const withLangFallback: MenusCollectionResource = {
        ...(lang ? { lang } : {}),
        menus: fallbackCollection.menus,
      };

      if (isNativeWordPressExport()) {
        return withLangFallback;
      }

      if (cachedMenusByLang.has(cacheKey)) {
        return cachedMenusByLang.get(cacheKey)!;
      }

      const base = resolveWpBase();
      if (base) {
        const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
        const url = `${base.baseUrl}/wp-json/forgewp/v1/menus${qs}`;
        const res = await fetchJsonWithRetry(url, buildTaggedInit(['menus']), {
          resource: 'menus',
          strict: isStrictDecoupledMode(base),
        });
        if (res.ok && res.json) {
          const normalized = normalizeMenusCollection(res.json) || {
            ...(lang ? { lang } : {}),
            menus: {},
          };
          const finalCollection: MenusCollectionResource = {
            ...(normalized.lang ? { lang: normalized.lang } : lang ? { lang } : {}),
            menus: normalized.menus,
          };
          cachedMenusByLang.set(cacheKey, finalCollection);
          for (const [loc, locItems] of Object.entries(finalCollection.menus)) {
            cachedMenuByKey.set(`${loc}::${lang || ''}`, locItems);
          }
          return finalCollection;
        }
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            'Invalid menus collection payload from WordPress.',
            { resource: 'menus', status: res.status },
          );
        }
        return withLangFallback;
      }

      cachedMenusByLang.set(cacheKey, withLangFallback);
      return withLangFallback;
    },

    async getI18n(i18nOptions = {}) {
      const lang =
        typeof i18nOptions.lang === 'string' && i18nOptions.lang.trim()
          ? i18nOptions.lang.trim()
          : undefined;
      const path =
        typeof i18nOptions.path === 'string' && i18nOptions.path.trim()
          ? i18nOptions.path.trim()
          : undefined;
      const cacheKey = `${lang || ''}::${path || ''}`;

      const buildFallbackI18n = (): I18nResource => {
        if (fixtureI18n) {
          return {
            ...fixtureI18n,
            ...(lang ? { currentLanguage: lang } : {}),
          };
        }
        const effectiveLang = lang || 'en';
        return {
          currentLanguage: effectiveLang,
          defaultLocale: effectiveLang,
          locales: [effectiveLang],
          translations: {},
          urls: { [effectiveLang]: '/' },
          homeUrls: { [effectiveLang]: '/' },
        };
      };

      if (isNativeWordPressExport()) {
        return buildFallbackI18n();
      }

      if (cachedI18nByKey.has(cacheKey)) {
        return cachedI18nByKey.get(cacheKey)!;
      }

      const base = resolveWpBase();
      if (base) {
        const params = new URLSearchParams();
        if (lang) params.set('lang', lang);
        if (path) params.set('path', path);
        const qs = params.toString();
        const url = `${base.baseUrl}/wp-json/forgewp/v1/i18n${qs ? `?${qs}` : ''}`;
        const tags = lang ? ['i18n', `i18n:${lang}`] : ['i18n'];
        const res = await fetchJsonWithRetry(url, buildTaggedInit(tags), {
          resource: 'i18n',
          strict: isStrictDecoupledMode(base),
        });
        if (res.ok && res.json) {
          const normalized = normalizeI18nResource(res.json);
          if (normalized) {
            cachedI18nByKey.set(cacheKey, normalized);
            return normalized;
          }
        }
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            'Invalid i18n payload from WordPress.',
            { resource: 'i18n', status: res.status },
          );
        }
        return buildFallbackI18n();
      }

      const fallback = buildFallbackI18n();
      cachedI18nByKey.set(cacheKey, fallback);
      return fallback;
    },

    async getAuthMe(authOptions = {}) {
      if (isNativeWordPressExport()) {
        return { authenticated: false, user: null };
      }

      const base = resolveWpBase();
      if (base) {
        return fetchDecoupledAuthMe({
          wpUrl: base.baseUrl,
          fetchImpl,
          authCookieName: authOptions.authCookieName || options.authCookieName,
          requestOptions: authOptions,
        });
      }

      if (isProductionRuntime()) {
        return { authenticated: false, user: null };
      }

      return normalizeAuthMeResource(options.authMe);
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
        const data = await wpFetchJson(base, '/wp-json/forgewp/v1/site-info', false, {
          resource: 'site-info',
        });
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
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            'Invalid site-info payload from WordPress.',
            { resource: 'site-info' },
          );
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
        const parseEnvMap = (envName: string): Record<string, unknown> => {
          const raw = readEnv(envName);
          if (!raw) return {};
          try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : {};
          } catch {
            return {};
          }
        };
        const mergedOptions = {
          ...parseEnvMap('FORGEWP_DECLARED_OPTIONS_JSON'),
          ...siteOptions,
        };
        const mergedMods = {
          ...parseEnvMap('FORGEWP_DECLARED_THEME_MODS_JSON'),
          ...themeMods,
        };
        const tokenOptions: Record<string, string> = {};
        for (const [k, v] of Object.entries(mergedOptions)) {
          const safeKey = sanitizeTokenKey(k);
          tokenOptions[safeKey] = `__FORGEWP_OPTION_${safeKey}_DEFAULT_${encodeURIComponent(String(v ?? ''))}__`;
        }
        const tokenMods: Record<string, string> = {};
        for (const [k, v] of Object.entries(mergedMods)) {
          const safeKey = sanitizeTokenKey(k);
          tokenMods[safeKey] = `__FORGEWP_THEME_MOD_${safeKey}_DEFAULT_${encodeURIComponent(String(v ?? ''))}__`;
        }
        const createTokenProxy = (
          base: Record<string, string>,
          tokenPrefix: '__FORGEWP_OPTION_' | '__FORGEWP_THEME_MOD_',
        ): Record<string, string> =>
          new Proxy(base, {
            get(target, prop, receiver) {
              if (typeof prop !== 'string') {
                return Reflect.get(target, prop, receiver);
              }
              if (Object.prototype.hasOwnProperty.call(target, prop)) {
                return target[prop];
              }
              if (
                prop === 'then' ||
                prop === 'toJSON' ||
                prop === 'valueOf' ||
                prop === 'toString' ||
                prop === 'constructor' ||
                prop === 'prototype' ||
                prop === 'hasOwnProperty' ||
                prop.startsWith('__')
              ) {
                return Reflect.get(target, prop, receiver);
              }
              if (/^[a-zA-Z0-9_-]+$/.test(prop)) {
                return `${tokenPrefix}${prop}_DEFAULT___`;
              }
              return undefined;
            },
          });
        const nativeSite = await this.getSiteInfo();
        const { mode: _mode, ...siteMeta } = nativeSite;
        return {
          options: createTokenProxy(tokenOptions, '__FORGEWP_OPTION_'),
          themeMods: createTokenProxy(tokenMods, '__FORGEWP_THEME_MOD_'),
          site: siteMeta,
        };
      }

      if (cachedSiteSettings) {
        return cachedSiteSettings;
      }

      const base = resolveWpBase();
      if (base) {
        const data = await wpFetchJson(base, '/wp-json/forgewp/v1/site-settings', false, {
          resource: 'site-settings',
        });
        const normalized = normalizeSiteSettings(data);
        if (normalized) {
          cachedSiteSettings = normalized;
          return normalized;
        }
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            'Invalid site-settings payload from WordPress.',
            { resource: 'site-settings' },
          );
        }
        const localSite = await this.getSiteInfo();
        const { mode: _mode, ...localSiteMeta } = localSite;
        return {
          options: { ...siteOptions },
          themeMods: { ...themeMods },
          site: localSiteMeta,
        };
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
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['forms', `form:${cleanName}`]),
          {
            resource: `forms:${cleanName}`,
            strict: isStrictDecoupledMode(base),
            allow404: true,
          },
        );
        if (res.status === 404) {
          cachedFormByKey.set(cacheKey, null);
          return null;
        }
        if (!res.ok) {
          const json = res.json;
          const code = json && typeof json.code === 'string' ? json.code : '';
          const msg =
            json && typeof json.message === 'string'
              ? json.message
              : `Failed to fetch form "${cleanName}" (HTTP ${res.status}).`;
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            code ? `[${code}] ${msg}` : msg,
            { resource: `forms:${cleanName}`, status: res.status },
          );
        }
        const normalized = normalizeFormResource(res.json, cleanName);
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
        const res = await fetchJsonWithRetry(url, buildTaggedInit(['forms']), {
          resource: 'forms',
          strict: isStrictDecoupledMode(base),
        });
        if (res.ok && res.json) {
          const normalized = normalizeFormsCollection(res.json) || {
            ...(lang ? { lang } : {}),
            forms: {},
          };
          cachedFormsByLang.set(cacheKey, normalized);
          for (const [fName, fRecord] of Object.entries(normalized.forms)) {
            cachedFormByKey.set(`${fName}::${lang || ''}`, fRecord);
          }
          return normalized;
        }
        if (isStrictDecoupledMode(base)) {
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            'Invalid forms collection payload from WordPress.',
            { resource: 'forms', status: res.status },
          );
        }
        return {
          ...(lang ? { lang } : {}),
          forms: { ...fixtureForms.forms },
        };
      }

      const fallbackCollection: FormsCollectionResource = {
        ...(lang ? { lang } : {}),
        forms: { ...fixtureForms.forms },
      };
      cachedFormsByLang.set(cacheKey, fallbackCollection);
      return fallbackCollection;
    },

    async getSeo(routePath, seoOptions = {}) {
      const rawPath = String(routePath || '').trim();
      if (!rawPath || /^https?:\/\//i.test(rawPath)) {
        throw new ForgeWpRuntimeError(
          'FORGEWP_RESOURCE_FETCH_FAILED',
          `[FORGEWP_INVALID_PATH] SEO path must be a non-empty site-relative path, received "${rawPath}".`,
          { resource: 'seo', status: 400 },
        );
      }
      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      const lang =
        typeof seoOptions.lang === 'string' && seoOptions.lang.trim()
          ? seoOptions.lang.trim()
          : undefined;

      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const params = new URLSearchParams({ path: normalizedPath });
        if (lang) params.set('lang', lang);
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/seo?${params.toString()}`;
        const res = await fetchJsonWithRetry(
          url,
          buildTaggedInit(['seo', `seo:path:${normalizedPath}`]),
          {
            resource: `seo:${normalizedPath}`,
            strict: isStrictDecoupledMode(wpBase),
            allow404: true,
            checkDomainErrors(response, json) {
              throwIfLocaleNotFound(response, json, 'seo');
            },
          },
        );
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          const json = res.json;
          const code = json && typeof json.code === 'string' ? json.code : '';
          const msg =
            json && typeof json.message === 'string'
              ? json.message
              : `Failed to fetch SEO metadata for "${normalizedPath}" (HTTP ${res.status}).`;
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            code ? `[${code}] ${msg}` : msg,
            { resource: `seo:${normalizedPath}`, status: res.status },
          );
        }
        return normalizeSeoResource(res.json);
      }

      const fixtureEntry =
        options.seo?.[normalizedPath] ||
        options.seo?.[normalizedPath.replace(/\/+$/, '') || '/'];
      return fixtureEntry ? normalizeSeoResource(fixtureEntry) : null;
    },

    async getEditables(target) {
      const hasSelector = Boolean(
        (target?.path && String(target.path).trim()) ||
          (target?.routeId && String(target.routeId).trim()) ||
          (typeof target?.post === 'number' && target.post > 0),
      );
      if (!hasSelector) {
        throw new ForgeWpRuntimeError(
          'FORGEWP_RESOURCE_FETCH_FAILED',
          '[FORGEWP_EDITABLES_TARGET_REQUIRED] Provide at least one of path, routeId, or post when calling getEditables().',
          { resource: 'editables', status: 400 },
        );
      }

      const lang =
        typeof target.lang === 'string' && target.lang.trim()
          ? target.lang.trim()
          : undefined;
      const wpBase = resolveWpBase();
      if (wpBase && !isNativeWordPressExport()) {
        const params = new URLSearchParams();
        if (target.path) params.set('path', target.path);
        if (target.routeId) params.set('routeId', target.routeId);
        if (typeof target.post === 'number' && target.post > 0) {
          params.set('post', String(target.post));
        }
        if (lang) params.set('lang', lang);
        if (target.schema) params.set('schema', target.schema);
        if (Array.isArray(target.keys) && target.keys.length > 0) {
          params.set('keys', target.keys.join(','));
        }
        const tags = ['editables'];
        if (target.post) tags.push(`post:${target.post}`);
        if (target.routeId) tags.push(`route:${target.routeId}`);
        const url = `${wpBase.baseUrl}/wp-json/forgewp/v1/editables?${params.toString()}`;
        const res = await fetchJsonWithRetry(url, buildTaggedInit(tags), {
          resource: 'editables',
          strict: isStrictDecoupledMode(wpBase),
          allow404: true,
          checkDomainErrors(response, json) {
            throwIfLocaleNotFound(response, json, 'editables');
            if (
              response.status === 404 &&
              json?.code === 'FORGEWP_EDITABLE_SCHEMA_NOT_FOUND'
            ) {
              throw new ForgeWpRuntimeError(
                'FORGEWP_RESOURCE_FETCH_FAILED',
                `[FORGEWP_EDITABLE_SCHEMA_NOT_FOUND] ${json.message || 'Editable schema not found.'}`,
                { resource: 'editables', status: 404 },
              );
            }
          },
        });
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          const json = res.json;
          const code = json && typeof json.code === 'string' ? json.code : '';
          const msg =
            json && typeof json.message === 'string'
              ? json.message
              : `Failed to fetch editables (HTTP ${res.status}).`;
          throw new ForgeWpRuntimeError(
            'FORGEWP_RESOURCE_FETCH_FAILED',
            code ? `[${code}] ${msg}` : msg,
            { resource: 'editables', status: res.status },
          );
        }
        return normalizeEditablesResource(res.json);
      }

      const fixtureMatch =
        (target.routeId && options.editables?.[target.routeId]) ||
        (target.path && options.editables?.[target.path]) ||
        (target.schema && options.editables?.[target.schema]) ||
        (target.post !== undefined ? options.editables?.[String(target.post)] : undefined);
      if (fixtureMatch) {
        return normalizeEditablesResource(fixtureMatch);
      }
      if (Object.keys(metaMap).length > 0) {
        return normalizeEditablesResource({
          postId: target.post || 0,
          postType: 'page',
          ...(target.routeId ? { routeId: target.routeId } : {}),
          path: target.path || '/',
          ...(lang ? { lang } : {}),
          ...(target.schema ? { schema: target.schema } : {}),
          protected: false,
          fields: metaMap,
        });
      }
      return null;
    },

    async getEditable(schema, target) {
      if (isNativeWordPressExport()) {
        return getWpEditable(schema, this);
      }
      const res = await this.getEditables(target);
      return getWpEditable(schema, res);
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
  id: '__FORGEWP_THE_ID__' as unknown as number,
  slug: '__forgewp-loop-item__',
  postType: 'post',
  title: '__FORGEWP_THE_TITLE__',
  excerpt: '__FORGEWP_THE_EXCERPT__',
  content: '__FORGEWP_THE_CONTENT__',
  date: '__FORGEWP_THE_DATE__',
  author: '__FORGEWP_THE_AUTHOR__',
  permalink: '__FORGEWP_THE_PERMALINK__',
  path: '__FORGEWP_THE_PATH__',
  featuredImage: '__FORGEWP_THE_POST_THUMBNAIL_URL__',
  terms: {},
  blocks: [],
  protected: false,
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
  /** Redirect path for unauthenticated visitors (default: `'/login'`). */
  redirect?: string;
  /** Optional redirect path when authenticated but `allowed` is not satisfied. */
  forbiddenRedirect?: string;
  /** Optional custom 403 UI rendered when authenticated but `allowed` is not satisfied. */
  forbiddenFallback?: React.ReactNode;
  /** Optional custom handler invoked when unauthenticated (overrides Next.js `redirect()`). */
  onUnauthenticated?: (redirectTo: string) => never | React.ReactElement;
  /** Optional custom handler invoked when authenticated but `allowed` is not met. */
  onForbidden?: (auth: AuthMeResource) => never | React.ReactElement;
  /** Optional pre-resolved `AuthMeResource` (skips fetching `/auth/me`). */
  auth?: AuthMeResource;
  /** Optional `WpServerClient` instance used to call `getAuthMe()`. */
  client?: WpServerClient;
  /** Optional explicit WordPress base URL override (defaults to `FORGEWP_WP_URL`). */
  wpUrl?: string;
  /** Optional JWT HttpOnly cookie name override (default: `'forgewp_auth_token'`). */
  authCookieName?: string;
  /** Optional incoming request headers (defaults to Next.js `headers()` when available). */
  headers?: Headers | Record<string, string | null | undefined>;
  /** Optional custom `fetch` implementation (useful in tests). */
  fetch?: typeof globalThis.fetch;
  children?: React.ReactNode;
}

function renderDefaultForbiddenElement(): React.ReactElement {
  return React.createElement(
    'section',
    {
      role: 'alert',
      'data-forgewp-auth-status': '403',
    },
    React.createElement('h1', null, '403 Forbidden'),
    React.createElement('p', null, 'You do not have permission to view this page.'),
  );
}

function evaluateRequireAuth(
  auth: AuthMeResource,
  opts: {
    allowed?: string | string[];
    redirect: string;
    forbiddenRedirect?: string;
    forbiddenFallback?: React.ReactNode;
    onUnauthenticated?: (redirectTo: string) => never | React.ReactElement;
    onForbidden?: (auth: AuthMeResource) => never | React.ReactElement;
    children?: React.ReactNode;
  },
): React.ReactElement | Promise<React.ReactElement> {
  if (!auth.authenticated || !auth.user) {
    if (opts.onUnauthenticated) {
      return opts.onUnauthenticated(opts.redirect);
    }
    return performNextRedirect(opts.redirect);
  }
  if (!isAuthMeAllowed(auth, opts.allowed)) {
    if (opts.onForbidden) {
      return opts.onForbidden(auth);
    }
    if (opts.forbiddenRedirect) {
      return performNextRedirect(opts.forbiddenRedirect);
    }
    if (opts.forbiddenFallback !== undefined) {
      return React.createElement(React.Fragment, null, opts.forbiddenFallback);
    }
    return tryNextForbidden().then(() => renderDefaultForbiddenElement());
  }
  return React.createElement(React.Fragment, null, opts.children ?? null);
}

/**
 * Pure-TypeScript, Server-Component-safe route protection boundary for Next.js App Router
 * (`docs/resource-contracts.md` §9).
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits `<forgewp-require-auth ... />`
 *   compiled to server-side PHP `is_user_logged_in()` / `current_user_can()` redirect guards.
 * - Decoupled / production mode: calls `GET /wp-json/forgewp/v1/auth/me` per request
 *   (`cache: 'no-store'`) forwarding only WordPress session cookies / Bearer JWT, failing
 *   closed on any error. Redirects unauthenticated visitors and blocks forbidden roles with 403.
 * - Plain local dev (no `FORGEWP_WP_URL` and `NODE_ENV !== 'production'`): renders children
 *   synchronously unless an explicit `auth` prop is supplied.
 */
export function WpServerRequireAuth({
  allowed,
  redirect = '/login',
  forbiddenRedirect,
  forbiddenFallback,
  onUnauthenticated,
  onForbidden,
  auth,
  client,
  wpUrl,
  authCookieName,
  headers,
  fetch: fetchImpl,
  children,
}: WpServerRequireAuthProps): React.ReactElement | Promise<React.ReactElement> {
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

  if (auth !== undefined) {
    return evaluateRequireAuth(normalizeAuthMeResource(auth), {
      allowed,
      redirect,
      forbiddenRedirect,
      forbiddenFallback,
      onUnauthenticated,
      onForbidden,
      children,
    });
  }

  const hasDecoupledBackend = Boolean(
    client || wpUrl || fetchImpl || readEnv('FORGEWP_WP_URL') || isProductionRuntime(),
  );
  if (!hasDecoupledBackend) {
    return React.createElement(React.Fragment, null, children ?? null);
  }

  return (async () => {
    const resolvedAuth = client
      ? await client.getAuthMe({ headers, authCookieName })
      : await fetchDecoupledAuthMe({
          wpUrl,
          fetchImpl,
          authCookieName,
          requestOptions: { headers, authCookieName },
        });
    return evaluateRequireAuth(resolvedAuth, {
      allowed,
      redirect,
      forbiddenRedirect,
      forbiddenFallback,
      onUnauthenticated,
      onForbidden,
      children,
    });
  })();
}

export interface WpServerAuthGateProps {
  /** Optional WordPress role or capability required. When omitted, requires any logged-in user. */
  allowed?: string | string[];
  /** Optional fallback content rendered for unauthorized visitors. */
  fallback?: React.ReactNode;
  /** Optional pre-resolved `AuthMeResource` (skips fetching `/auth/me`). */
  auth?: AuthMeResource;
  /** Optional `WpServerClient` instance used to call `getAuthMe()`. */
  client?: WpServerClient;
  /** Optional explicit WordPress base URL override (defaults to `FORGEWP_WP_URL`). */
  wpUrl?: string;
  /** Optional JWT HttpOnly cookie name override (default: `'forgewp_auth_token'`). */
  authCookieName?: string;
  /** Optional incoming request headers (defaults to Next.js `headers()` when available). */
  headers?: Headers | Record<string, string | null | undefined>;
  /** Optional custom `fetch` implementation (useful in tests). */
  fetch?: typeof globalThis.fetch;
  children?: React.ReactNode;
}

/**
 * Pure-TypeScript, Server-Component-safe inline authentication / capability gate for Next.js
 * (`docs/resource-contracts.md` §9).
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`): emits ForgeWP auth/capability gate
 *   markers compiled to server-side PHP `if ( is_user_logged_in() )` / `current_user_can()`.
 * - Decoupled / production mode: calls `GET /wp-json/forgewp/v1/auth/me` per request
 *   (`cache: 'no-store'`) and fails closed (renders `fallback` on unauthenticated or error).
 * - Plain local dev (no `FORGEWP_WP_URL` and `NODE_ENV !== 'production'`): renders children
 *   synchronously unless an explicit `auth` prop is supplied.
 */
export function WpServerAuthGate({
  allowed,
  fallback,
  auth,
  client,
  wpUrl,
  authCookieName,
  headers,
  fetch: fetchImpl,
  children,
}: WpServerAuthGateProps): React.ReactElement | Promise<React.ReactElement> {
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

  if (auth !== undefined) {
    const ok = isAuthMeAllowed(normalizeAuthMeResource(auth), allowed);
    return React.createElement(React.Fragment, null, ok ? (children ?? null) : (fallback ?? null));
  }

  const hasDecoupledBackend = Boolean(
    client || wpUrl || fetchImpl || readEnv('FORGEWP_WP_URL') || isProductionRuntime(),
  );
  if (!hasDecoupledBackend) {
    return React.createElement(React.Fragment, null, children ?? null);
  }

  return (async () => {
    const resolvedAuth = client
      ? await client.getAuthMe({ headers, authCookieName })
      : await fetchDecoupledAuthMe({
          wpUrl,
          fetchImpl,
          authCookieName,
          requestOptions: { headers, authCookieName },
        });
    const ok = isAuthMeAllowed(resolvedAuth, allowed);
    return React.createElement(React.Fragment, null, ok ? (children ?? null) : (fallback ?? null));
  })();
}

export interface ProtectedPageConfigLike {
  protected?: boolean | string | string[];
  allowed?: string | string[];
  loginRedirect?: string;
  redirect?: string;
  forbiddenRedirect?: string;
}

export interface GuardProtectedPageOptions extends WpServerAuthMeOptions {
  client?: WpServerClient;
  wpUrl?: string;
  fetch?: typeof globalThis.fetch;
  onUnauthenticated?: (redirectTo: string) => never | void;
  onForbidden?: (auth: AuthMeResource) => never | void;
}

export interface GuardProtectedPageResult {
  allowed: boolean;
  status: 200 | 403;
  auth: AuthMeResource | null;
}

/**
 * Enforces `pageConfig.protected` on Next.js App Router pages in decoupled mode
 * with the same fail-closed semantics as `WpRequireAuth` (`docs/resource-contracts.md` §9).
 */
export async function guardProtectedPage(
  pageConfig: ProtectedPageConfigLike | null | undefined,
  options: GuardProtectedPageOptions = {},
): Promise<GuardProtectedPageResult> {
  if (!pageConfig || !pageConfig.protected) {
    return { allowed: true, status: 200, auth: null };
  }
  if (isNativeWordPressExport()) {
    return { allowed: true, status: 200, auth: null };
  }

  const requiredAllowed =
    typeof pageConfig.protected === 'string' || Array.isArray(pageConfig.protected)
      ? pageConfig.protected
      : pageConfig.allowed;
  const redirectTo = pageConfig.loginRedirect || pageConfig.redirect || '/login';

  const hasDecoupledBackend = Boolean(
    options.client ||
      options.wpUrl ||
      options.fetch ||
      readEnv('FORGEWP_WP_URL') ||
      isProductionRuntime(),
  );
  if (!hasDecoupledBackend) {
    return { allowed: true, status: 200, auth: null };
  }

  const auth = options.client
    ? await options.client.getAuthMe(options)
    : await fetchDecoupledAuthMe({
        wpUrl: options.wpUrl,
        fetchImpl: options.fetch,
        authCookieName: options.authCookieName,
        requestOptions: options,
      });

  if (!auth.authenticated || !auth.user) {
    if (options.onUnauthenticated) {
      options.onUnauthenticated(redirectTo);
      return { allowed: false, status: 403, auth };
    }
    return performNextRedirect(redirectTo);
  }

  if (!isAuthMeAllowed(auth, requiredAllowed)) {
    if (options.onForbidden) {
      options.onForbidden(auth);
      return { allowed: false, status: 403, auth };
    }
    if (pageConfig.forbiddenRedirect) {
      return performNextRedirect(pageConfig.forbiddenRedirect);
    }
    return { allowed: false, status: 403, auth };
  }

  return { allowed: true, status: 200, auth };
}

function normalizeEditableFieldValue(field: any, rawValue: unknown, defaultVal: any): any {
  if (
    rawValue === null ||
    rawValue === undefined ||
    rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0)
  ) {
    if (field?.type === 'image') {
      return normalizeEditableImage(defaultVal) ?? defaultVal ?? null;
    }
    return defaultVal;
  }

  switch (field?.type) {
    case 'boolean':
      return rawValue === true || rawValue === 'true' || rawValue === '1' || rawValue === 1;
    case 'number': {
      const parsed = Number(rawValue);
      return Number.isNaN(parsed) ? defaultVal : parsed;
    }
    case 'image':
      return normalizeEditableImage(rawValue) ?? normalizeEditableImage(defaultVal) ?? null;
    case 'repeater': {
      if (!Array.isArray(rawValue)) return Array.isArray(defaultVal) ? defaultVal : [];
      const subFields = field.fields && typeof field.fields === 'object' ? field.fields : {};
      return rawValue.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const normalizedRow: Record<string, any> = { ...row };
        for (const [subKey, subField] of Object.entries(subFields)) {
          const subDefault = (subField as any)?.default ?? '';
          if (subKey in row) {
            normalizedRow[subKey] = normalizeEditableFieldValue(
              subField,
              (row as Record<string, unknown>)[subKey],
              subDefault,
            );
          }
        }
        return normalizedRow;
      });
    }
    default:
      return rawValue;
  }
}

/**
 * Pure-TypeScript, Server-Component-safe helper that resolves a `defineEditable()`
 * schema from either a `WpServerClient` (`wp.getField(...)`), an `EditablesResource`
 * (`docs/resource-contracts.md` §14), a plain meta/page object, or the schema's own defaults.
 *
 * - Native WordPress export (`FORGEWP_NATIVE_EXPORT=1`) with a `WpServerClient`:
 *   emits `__FORGEWP_META_<key>_DEFAULT_<default>__` compile tokens so each field
 *   compiles to live `get_post_meta()` in PHP.
 * - Local dev & decoupled mode: reads live/fixture meta values with typed defaults.
 */
export function getWpEditable<T extends Record<string, any>>(
  schema: T,
  source?: WpServerClient | EditablesResource | Record<string, any> | null,
): { [K in keyof T]: any } {
  const out: Record<string, any> = {};
  const isClient =
    source &&
    typeof source === 'object' &&
    typeof (source as WpServerClient).getField === 'function';
  const recordSource =
    !isClient && source && typeof source === 'object'
      ? ((source as Record<string, any>).fields ??
        (source as Record<string, any>).customFields ??
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
      out[key] = normalizeEditableFieldValue(field, recordSource[key], defaultVal);
    } else {
      out[key] = defaultVal;
    }
  }

  return out as { [K in keyof T]: any };
}

export interface NextMetadataLike {
  title?: string;
  description?: string;
  robots?: {
    index?: boolean;
    follow?: boolean;
    googleBot?: {
      index?: boolean;
      follow?: boolean;
      'max-snippet'?: number;
      'max-image-preview'?: string;
      'max-video-preview'?: number;
    };
  };
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    siteName?: string;
    locale?: string;
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    site?: string;
    creator?: string;
    images?: string[];
  };
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
  };
  [key: string]: unknown;
}

/**
 * Converts a canonical `SeoResource` (`docs/resource-contracts.md` §13) into a
 * Next.js App Router `Metadata` object for `generateMetadata()`.
 */
export function toNextMetadata(
  seo: SeoResource | null | undefined,
  fallback: NextMetadataLike = {},
): NextMetadataLike {
  if (!seo) return { ...fallback };
  const robots: NextMetadataLike['robots'] = {
    index: seo.robots.index,
    follow: seo.robots.follow,
    googleBot: {
      index: seo.robots.index,
      follow: seo.robots.follow,
      ...(seo.robots.maxSnippet !== undefined ? { 'max-snippet': seo.robots.maxSnippet } : {}),
      ...(seo.robots.maxImagePreview
        ? { 'max-image-preview': seo.robots.maxImagePreview }
        : {}),
      ...(seo.robots.maxVideoPreview !== undefined
        ? { 'max-video-preview': seo.robots.maxVideoPreview }
        : {}),
    },
  };

  return {
    ...fallback,
    title: seo.title || fallback.title,
    description: seo.description || fallback.description,
    robots,
    openGraph: {
      ...(fallback.openGraph || {}),
      title: seo.openGraph.title || seo.title || fallback.openGraph?.title,
      description:
        seo.openGraph.description || seo.description || fallback.openGraph?.description,
      type: seo.openGraph.type || fallback.openGraph?.type || 'website',
      ...(seo.openGraph.url || seo.canonical
        ? { url: seo.openGraph.url || seo.canonical }
        : {}),
      ...(seo.openGraph.siteName ? { siteName: seo.openGraph.siteName } : {}),
      ...(seo.openGraph.locale ? { locale: seo.openGraph.locale } : {}),
      ...(seo.openGraph.images.length > 0
        ? { images: seo.openGraph.images }
        : fallback.openGraph?.images
          ? { images: fallback.openGraph.images }
          : {}),
    },
    twitter: {
      ...(fallback.twitter || {}),
      card: seo.twitter.card || fallback.twitter?.card || 'summary_large_image',
      title: seo.twitter.title || seo.title || fallback.twitter?.title,
      description:
        seo.twitter.description || seo.description || fallback.twitter?.description,
      ...(seo.twitter.site ? { site: seo.twitter.site } : {}),
      ...(seo.twitter.creator ? { creator: seo.twitter.creator } : {}),
      ...(seo.twitter.images.length > 0
        ? { images: seo.twitter.images }
        : fallback.twitter?.images
          ? { images: fallback.twitter.images }
          : {}),
    },
    alternates: {
      ...(fallback.alternates || {}),
      ...(seo.alternates.canonical || seo.canonical
        ? { canonical: seo.alternates.canonical || seo.canonical }
        : {}),
      ...(Object.keys(seo.alternates.languages).length > 0
        ? { languages: seo.alternates.languages }
        : fallback.alternates?.languages
          ? { languages: fallback.alternates.languages }
          : {}),
    },
  };
}

export interface WpJsonLdProps {
  schemas?: Array<Record<string, unknown>> | null;
}

/**
 * Server-safe JSON-LD `<script type="application/ld+json">` emitter for `seo.jsonLd`.
 * Escapes `<` as `\u003c` so embedded schema strings cannot close the script tag.
 */
export function WpJsonLd({ schemas }: WpJsonLdProps): React.ReactElement | null {
  if (!Array.isArray(schemas) || schemas.length === 0) {
    return null;
  }
  const safeJson = (obj: unknown) =>
    JSON.stringify(obj).replace(/</g, '\\u003c');
  return React.createElement(
    React.Fragment,
    null,
    ...schemas.map((schema, idx) =>
      React.createElement('script', {
        key: idx,
        type: 'application/ld+json',
        dangerouslySetInnerHTML: { __html: safeJson(schema) },
      }),
    ),
  );
}

export interface WpServerPostTermsProps {
  /** Taxonomy slug (e.g. `'category'`, `'post_tag'`), or `'*'` for all public taxonomies. */
  taxonomy?: string;
  /** Terms array rendered in local dev & decoupled mode. */
  terms?: PostTermRefContract[];
  /** Optional separator rendered between adjacent terms (both decoupled and native PHP). */
  separator?: React.ReactNode;
  /** Optional fallback rendered when the post has no matching terms. */
  empty?: React.ReactNode;
  /** Render function for each term item. */
  renderItem?: (term: PostTermRefContract, index: number) => React.ReactNode;
  /** Optional function children (same signature as `renderItem`) or fallback. */
  children?:
    | React.ReactNode
    | ((term: PostTermRefContract, index: number) => React.ReactNode);
}

const NATIVE_POST_TERM_TOKEN: PostTermRefContract = {
  id: '__FORGEWP_TERM_ID__' as unknown as number,
  slug: '__FORGEWP_TERM_SLUG__',
  name: '__FORGEWP_TERM_NAME__',
  path: '__FORGEWP_TERM_PATH__',
};

function sanitizeTaxonomyAttr(taxonomy?: string): string {
  const clean = String(taxonomy || 'category').trim();
  if (clean === '*') return '*';
  return /^[a-zA-Z0-9_-]+$/.test(clean) ? clean : 'category';
}

/**
 * Pure-TypeScript, Server-Component-safe post taxonomy terms loop (R2).
 * Emits `<forgewp-terms-loop-start>` / `<forgewp-terms-loop-end>` markers during
 * `FORGEWP_NATIVE_EXPORT=1` so `markup-processor.js` compiles to live `get_the_terms()`.
 */
export function WpServerPostTerms({
  taxonomy = 'category',
  terms = [],
  separator,
  empty,
  renderItem,
  children,
}: WpServerPostTermsProps): React.ReactElement {
  const render =
    renderItem ??
    (typeof children === 'function'
      ? (children as (term: PostTermRefContract, index: number) => React.ReactNode)
      : () => children ?? null);

  if (isNativeWordPressExport()) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-terms-loop-start', {
        taxonomy: sanitizeTaxonomyAttr(taxonomy),
        ...(typeof separator === 'string' && separator.length > 0 ? { separator } : {}),
      }),
      render(NATIVE_POST_TERM_TOKEN, 0),
      empty !== undefined && empty !== null
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('forgewp-terms-loop-empty'),
            empty,
          )
        : null,
      React.createElement('forgewp-terms-loop-end'),
    );
  }

  const list = Array.isArray(terms) ? terms : [];
  if (list.length === 0) {
    return React.createElement(React.Fragment, null, empty ?? null);
  }
  const nodes: React.ReactNode[] = [];
  list.forEach((term, idx) => {
    if (idx > 0 && separator !== undefined && separator !== null && separator !== false) {
      nodes.push(React.createElement(React.Fragment, { key: `sep-${idx}` }, separator));
    }
    nodes.push(render(term, idx));
  });
  return React.createElement(React.Fragment, null, ...nodes);
}

export interface WpServerTermsLoopProps {
  /** Public taxonomy slug (default: `'category'`). */
  taxonomy?: string;
  /** Whether to hide empty terms in native WordPress `get_terms()` (default: `true`). */
  hideEmpty?: boolean;
  /** Terms array or `TermsListResource` rendered in local dev & decoupled mode. */
  terms?: TermResource[] | TermsListResource | null;
  /** Optional separator rendered between adjacent terms (both decoupled and native PHP). */
  separator?: React.ReactNode;
  /** Optional fallback rendered when no terms exist. */
  empty?: React.ReactNode;
  /** Render function for each term item. */
  renderItem?: (term: TermResource, index: number) => React.ReactNode;
  /** Optional function children (same signature as `renderItem`) or fallback. */
  children?:
    | React.ReactNode
    | ((term: TermResource, index: number) => React.ReactNode);
}

const NATIVE_TAXONOMY_TERM_TOKEN: TermResource = {
  id: '__FORGEWP_TERM_ID__' as unknown as number,
  slug: '__FORGEWP_TERM_SLUG__',
  name: '__FORGEWP_TERM_NAME__',
  description: '__FORGEWP_TERM_DESCRIPTION__',
  count: '__FORGEWP_TERM_COUNT__' as unknown as number,
  parent: 0,
  path: '__FORGEWP_TERM_PATH__',
  permalink: '__FORGEWP_TERM_URL__',
};

/**
 * Pure-TypeScript, Server-Component-safe taxonomy archive terms loop (R2 / C4).
 * Emits `<forgewp-terms-loop-start source="taxonomy" ...>` markers during
 * `FORGEWP_NATIVE_EXPORT=1` so `markup-processor.js` compiles to live `get_terms()`.
 */
export function WpServerTermsLoop({
  taxonomy = 'category',
  hideEmpty = true,
  terms = [],
  separator,
  empty,
  renderItem,
  children,
}: WpServerTermsLoopProps): React.ReactElement {
  const render =
    renderItem ??
    (typeof children === 'function'
      ? (children as (term: TermResource, index: number) => React.ReactNode)
      : () => children ?? null);

  if (isNativeWordPressExport()) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-terms-loop-start', {
        source: 'taxonomy',
        taxonomy: sanitizeTaxonomyAttr(taxonomy),
        hideempty: hideEmpty ? '1' : '0',
        ...(typeof separator === 'string' && separator.length > 0 ? { separator } : {}),
      }),
      render(NATIVE_TAXONOMY_TERM_TOKEN, 0),
      empty !== undefined && empty !== null
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('forgewp-terms-loop-empty'),
            empty,
          )
        : null,
      React.createElement('forgewp-terms-loop-end'),
    );
  }

  const list = Array.isArray(terms)
    ? terms
    : terms && Array.isArray(terms.items)
      ? terms.items
      : [];
  if (list.length === 0) {
    return React.createElement(React.Fragment, null, empty ?? null);
  }
  const nodes: React.ReactNode[] = [];
  list.forEach((term, idx) => {
    if (idx > 0 && separator !== undefined && separator !== null && separator !== false) {
      nodes.push(React.createElement(React.Fragment, { key: `sep-${idx}` }, separator));
    }
    nodes.push(render(term, idx));
  });
  return React.createElement(React.Fragment, null, ...nodes);
}

export interface WpCommentRenderHelpers {
  renderChildren: () => React.ReactNode;
  depth: number;
}

export interface WpServerCommentsProps {
  /** `CommentsListResource` from `wpClient.getComments()` or `CommentResource[]`. */
  comments?: CommentsListResource | CommentResource[] | null;
  /** Page number used in native export (default: `comments?.page ?? 1`). */
  page?: number;
  /** Per-page limit used in native export (default: `comments?.perPage ?? 50`). */
  perPage?: number;
  /** Optional fallback rendered when there are zero approved comments. */
  empty?: React.ReactNode;
  /** Optional UI rendered when comments are closed on the post. */
  closed?: React.ReactNode;
  /** Render function for each comment (and threaded replies via `helpers.renderChildren()`). */
  renderItem?: (
    comment: CommentResource,
    helpers: WpCommentRenderHelpers,
  ) => React.ReactNode;
  /** Optional function children (same signature as `renderItem`) or fallback. */
  children?:
    | React.ReactNode
    | ((comment: CommentResource, helpers: WpCommentRenderHelpers) => React.ReactNode);
}

const NATIVE_COMMENT_TOKEN: CommentResource = {
  id: '__FORGEWP_COMMENT_ID__' as unknown as number,
  parentId: '__FORGEWP_COMMENT_PARENT_ID__' as unknown as number,
  author: {
    name: '__FORGEWP_COMMENT_AUTHOR_NAME__',
    avatarUrl: '__FORGEWP_COMMENT_AUTHOR_AVATAR__',
    url: '__FORGEWP_COMMENT_AUTHOR_URL__',
  },
  date: '__FORGEWP_COMMENT_DATE__',
  content: '__FORGEWP_COMMENT_CONTENT__',
  children: [],
};

/**
 * Pure-TypeScript, Server-Component-safe WordPress comments list loop (R2).
 * Emits `<forgewp-comments-loop-start>` / `<forgewp-comment-children>` /
 * `<forgewp-comments-loop-end>` markers during `FORGEWP_NATIVE_EXPORT=1`.
 */
export function WpServerComments({
  comments,
  page,
  perPage,
  empty,
  closed,
  renderItem,
  children,
}: WpServerCommentsProps): React.ReactElement {
  const render =
    renderItem ??
    (typeof children === 'function'
      ? (children as (
          comment: CommentResource,
          helpers: WpCommentRenderHelpers,
        ) => React.ReactNode)
      : () => children ?? null);

  if (isNativeWordPressExport()) {
    const resolvedPage =
      typeof page === 'number' && page > 0
        ? Math.floor(page)
        : !Array.isArray(comments) && typeof comments?.page === 'number' && comments.page > 0
          ? Math.floor(comments.page)
          : 1;
    const resolvedPerPage =
      typeof perPage === 'number' && perPage > 0
        ? Math.min(Math.floor(perPage), 100)
        : !Array.isArray(comments) && typeof comments?.perPage === 'number' && comments.perPage > 0
          ? Math.min(Math.floor(comments.perPage), 100)
          : 50;

    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-comments-loop-start', {
        page: String(resolvedPage),
        perpage: String(resolvedPerPage),
      }),
      render(NATIVE_COMMENT_TOKEN, {
        renderChildren: () => React.createElement('forgewp-comment-children'),
        depth: 0,
      }),
      empty !== undefined && empty !== null
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('forgewp-comments-loop-empty'),
            empty,
          )
        : null,
      React.createElement('forgewp-comments-loop-end'),
      closed !== undefined && closed !== null
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('forgewp-comments-closed-start'),
            closed,
            React.createElement('forgewp-comments-closed-end'),
          )
        : null,
    );
  }

  const items = Array.isArray(comments)
    ? comments
    : comments && Array.isArray(comments.items)
      ? comments.items
      : [];
  const isOpen = Array.isArray(comments) ? true : comments?.open !== false;

  const renderList = (list: CommentResource[], depth: number): React.ReactNode[] =>
    list.map((comment) =>
      render(comment, {
        depth,
        renderChildren: () =>
          Array.isArray(comment.children) && comment.children.length > 0
            ? React.createElement(
                React.Fragment,
                null,
                ...renderList(comment.children, depth + 1),
              )
            : null,
      }),
    );

  return React.createElement(
    React.Fragment,
    null,
    items.length > 0
      ? React.createElement(React.Fragment, null, ...renderList(items, 0))
      : (empty ?? null),
    !isOpen ? (closed ?? null) : null,
  );
}

// Unified component aliases so Next.js Server Components can import the exact same
// component names from `@forgewp/react` (resolved via the `"react-server"` export condition)
// as Vite React apps. `WpServer*` names remain exported for backwards compatibility.
export const WpQueryLoop = WpServerLoop;
export const WpMenu = WpServerMenu;
export const WpPostTerms = WpServerPostTerms;
export const WpTermsLoop = WpServerTermsLoop;
export const WpComments = WpServerComments;
export const WpRequireAuth = WpServerRequireAuth;
export const WpAuthGate = WpServerAuthGate;

export type {
  WpServerLoopProps as WpQueryLoopProps,
  WpServerMenuProps as WpMenuProps,
  WpServerPostTermsProps as WpPostTermsProps,
  WpServerTermsLoopProps as WpTermsLoopProps,
  WpServerCommentsProps as WpCommentsProps,
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
  defineEditable,
  getEditableDefaults,
  buildPageEditable,
  pickEditable,
  mergeEditable,
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
} from './editable-schema.js';
export type {
  FieldBase,
  EditableField,
  EditableSchema,
  TextField,
  RichTextField,
  ImageField,
  BooleanField,
  RepeaterField,
  RepeaterMode,
  ImageFieldVal,
  ColorField,
  UrlField,
  SelectField,
  NumberField,
  IconField,
  InferAttributes,
  InferFieldType,
  PageEditableSectionSource,
} from './editable-schema.js';

export {
  ForgeWpRuntimeError,
  FORGEWP_RESOURCES,
  defineResource,
  getResourceDefinition,
  normalizeSiteSettings,
  normalizeFormResource,
  normalizeFormsCollection,
  normalizeMenuItemsContract,
  normalizeMenusCollection,
  normalizeRoutesResource,
  normalizeI18nResource,
  normalizeAuthMeResource,
  isAuthMeAllowed,
  normalizePostResource,
  normalizePostsListResource,
  normalizeTermResource,
  normalizeTermsListResource,
  normalizeCommentResource,
  normalizeCommentsListResource,
  normalizeSeoResource,
  normalizeEditableImage,
  normalizeEditablesResource,
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
  MenuItemContract,
  MenusCollectionResource,
  RouteRecordContract,
  RoutesResource,
  I18nResource,
  AuthMeUserContract,
  AuthMeResource,
  PostAuthorContract,
  PostImageContract,
  PostTermRefContract,
  PostBlockContract,
  PostResource,
  PostsListResource,
  TermResource,
  TermsListResource,
  CommentAuthorContract,
  CommentResource,
  CommentsListResource,
  SeoProvider,
  SeoObjectType,
  SeoRobotsContract,
  SeoImageContract,
  SeoOpenGraphContract,
  SeoTwitterContract,
  SeoAlternatesContract,
  SeoResource,
  EditableImageContract,
  EditablesResource,
  RestSourceOptions,
  PrimableForgeWpSource,
  FixtureSourceOptions,
} from './runtime/index.js';
