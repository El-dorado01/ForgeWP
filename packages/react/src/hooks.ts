import { useContext, useCallback, useMemo, ComponentType, useState, useRef, useEffect, createContext } from 'react';
import { WpPostContext } from './context';
import type { WpPost, WpQueryArgs, WpQueryResults, WpMenuItem } from './types';

/**
 * @forgewp/react — WordPress Data Hooks
 *
 * These hooks read from WpPostContext, which is provided by WpQueryLoop.
 *
 * In local dev: returns mock data from the context.
 * In WordPress production: the ForgeWP compiler replaces each hook call
 * with the equivalent PHP function (e.g. useWpTitle() → get_the_title()).
 *
 * Rules:
 * - Always call these inside a WpQueryLoop or WpLoop block.
 * - Never call these at the top level of your app (no WpPostContext = empty strings).
 * - Do not wrap in conditionals — standard React rules of hooks apply.
 */

// ── Content ───────────────────────────────────────────────────────────────────

export function useWpTitle(): string {
  const post = useContext(WpPostContext);
  return post?.title ?? 'Sample WordPress Post Title';
}

export function useWpContent(): string {
  const post = useContext(WpPostContext);
  return (
    post?.content ??
    '<p>This is sample post content rendered locally so you can design your theme.</p>'
  );
}

export function useWpExcerpt(): string {
  const post = useContext(WpPostContext);
  return (
    post?.excerpt ??
    'A short excerpt that gives readers a quick preview of what to expect in the full post.'
  );
}

export function useWpPermalink(): string {
  const post = useContext(WpPostContext);
  if (!post) return '/post';
  if (post.permalink) return post.permalink;
  const type =
    post.__postType && post.__postType !== 'post' ? post.__postType : 'post';
  return `/${type}/${post.id}`;
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export function useWpDate(): string {
  const post = useContext(WpPostContext);
  return (
    post?.date ??
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );
}

export function useWpModifiedDate(): string {
  const post = useContext(WpPostContext);
  return (
    post?.modified ??
    post?.date ??
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );
}

export function useWpAuthor(): string {
  const post = useContext(WpPostContext);
  return post?.author ?? 'Jane Doe';
}

export function useWpFeaturedImage(): string {
  const post = useContext(WpPostContext);
  const featured = post?.featuredImage;
  if (!featured) return 'https://picsum.photos/seed/forgewp/1200/630';
  if (typeof featured === 'string') return featured;
  return featured.url;
}

// ── Custom Fields (ACF / Meta) ────────────────────────────────────────────────

export function useWpCustomField(fieldName: string, defaultValue = ''): string {
  const post = useContext(WpPostContext);

  if (
    post?.customFields &&
    typeof post.customFields[fieldName] !== 'undefined'
  ) {
    return String(post.customFields[fieldName]);
  }
  return defaultValue || `[custom field: ${fieldName}]`;
}

export function useWpField(fieldName: string, defaultValue = ''): string {
  const post = useContext(WpPostContext);
  if (
    post?.customFields &&
    typeof post.customFields[fieldName] !== 'undefined'
  ) {
    return String(post.customFields[fieldName]);
  }
  return defaultValue || `[field: ${fieldName}]`;
}

/**
 * Hook to dynamically detect and adapt to prefers-reduced-motion preferences.
 * Satisfies modern global accessibility standards.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return reduced;
}

/**
 * Statically extracts and formats motion/animation initial states into safe React styles.
 * Guarantees zero cumulative layout shift (CLS) and zero Flash of Unstyled Content (FOUC)
 * by applying initial styles during server-side pre-rendering (SSR).
 *
 * @example
 * const initial = { opacity: 0, y: 50 };
 * <motion.div initial={initial} animate={{ opacity: 1, y: 0 }} style={getStaticMotionStyle(initial)}>
 */
export function getStaticMotionStyle(
  initial: Record<string, any>,
): React.CSSProperties {
  if (!initial || typeof initial !== 'object') return {};

  const style: React.CSSProperties = {};

  if (initial.opacity !== undefined) {
    style.opacity = initial.opacity;
  }

  let transform = '';
  if (initial.y !== undefined) {
    transform += ` translateY(${typeof initial.y === 'number' ? initial.y + 'px' : initial.y})`;
  }
  if (initial.x !== undefined) {
    transform += ` translateX(${typeof initial.x === 'number' ? initial.x + 'px' : initial.x})`;
  }
  if (initial.scale !== undefined) {
    transform += ` scale(${initial.scale})`;
  }
  if (initial.rotate !== undefined) {
    transform += ` rotate(${initial.rotate}deg)`;
  }

  if (transform) {
    style.transform = transform.trim();
  }

  return style;
}

// ── State & Option Hooks ──────────────────────────────────────────────────────

function getForgeWpSiteSettings() {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  return (
    win._forgeWpMockSiteSettings || win.forgeWpHydration?.siteSettings || null
  );
}

/** Optional compiler hints for useWpOption — ignored at runtime, used by the ForgeWP compiler to generate richer admin UI. */
export interface WpOptionMeta {
  /** When set, the Theme Options admin page renders a searchable post picker instead of a text input. */
  postType?: string;
}

export function useWpOption(optionName: string, defaultValue = ''): string {
  const siteSettings = getForgeWpSiteSettings();
  if (siteSettings?.options) {
    return siteSettings.options[optionName] ?? defaultValue;
  }
  return defaultValue || `[option: ${optionName}]`;
}

// ── Native Forms ──────────────────────────────────────────────────────────────
// submitWpForm + WpFormFields (components/WpFormFields.tsx) are the ONLY
// runtime additions for forms — see architectural-principles.md Principle 11.
// Forms are otherwise plain React; the compiler generates the REST backend
// from the `forms` key in wp.config.ts. See forgewp_forms_spec.md.

export interface WpFormResult {
  ok: boolean;
  /** Human-readable server message (already translated server-side). */
  message?: string;
  /** Per-field validation errors keyed by field name. */
  errors?: Record<string, string>;
}

// Module-load timestamp, used as the server-side time-trap's baseline —
// a genuine human takes more than a few seconds between page load and
// submit; a bot firing the request immediately does not.
const forgeWpFormsLoadedAt = typeof window !== 'undefined' ? Date.now() : 0;

function isProductionForms(): boolean {
  return typeof window !== 'undefined' && !!(window as any).forgeWpHydration?.restUrl;
}

/**
 * Submits a form declared in wp.config.ts's `forms` key. Deliberately a
 * plain function (not a hook) so it composes with any form library —
 * react-hook-form's handleSubmit, a plain onSubmit, anything.
 *
 * Never throws: network failures resolve to { ok: false, message }, so
 * callers never need try/catch around this call.
 */
export async function submitWpForm(
  name: string,
  data: FormData | Record<string, unknown>,
): Promise<WpFormResult> {
  if (!isProductionForms()) {
    let plain: Record<string, unknown>;
    if (data instanceof FormData) {
      plain = {};
      data.forEach((value, key) => {
        plain[key] = value;
      });
    } else {
      plain = data;
    }
    // eslint-disable-next-line no-console
    console.log(`[forgewp:forms] submit "${name}"`, plain);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(plain)) {
      if (value === '__fail__') {
        errors[key] = 'Simulated error (dev)';
      }
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors, message: 'Simulated error (dev)' };
    }
    return { ok: true, message: 'Simulated (dev)' };
  }

  try {
    const win = window as any;
    const restUrl = win.forgeWpHydration.restUrl;
    const elapsed = String(Date.now() - forgeWpFormsLoadedAt);

    // The visitor's page language (Polylang/WPML), not the browser's own
    // locale — needed server-side so the submission validates against and
    // stores under the same language's client-owned field set the visitor
    // actually saw, not always the site default.
    const lang = win.forgeWpTranslations?.currentLanguage;

    let response: Response;
    if (data instanceof FormData) {
      data.set('_forgewp_elapsed', elapsed);
      if (lang) data.set('lang', lang);
      const headers: Record<string, string> = {};
      if (win.forgeWpHydration.restNonce) {
        headers['X-WP-Nonce'] = win.forgeWpHydration.restNonce;
      }
      response = await fetch(`${restUrl}/forms/${name}/submit`, {
        method: 'POST',
        body: data,
        headers,
      });
    } else {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (win.forgeWpHydration.restNonce) {
        headers['X-WP-Nonce'] = win.forgeWpHydration.restNonce;
      }
      response = await fetch(`${restUrl}/forms/${name}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, _forgewp_elapsed: elapsed, ...(lang ? { lang } : {}) }),
      });
    }

    const json = await response.json().catch(() => ({}) as any);
    if (!response.ok) {
      return { ok: false, message: json.message, errors: json.errors };
    }
    return { ok: true, message: json.message };
  } catch {
    return { ok: false, message: 'network' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// defineWpOptions — compiler-only site option schema declaration
// Declare site-wide option metadata centrally in src/cms/site-options.ts.
// The compiler reads this to generate the Appearance → Theme Options admin UI.
// At runtime these are all no-ops; useWpOption() is the actual data accessor.
// ─────────────────────────────────────────────────────────────────────────────

export interface WpOptionField {
  /** The internal field type used by the compiler to render the correct admin UI widget. */
  _type: 'text' | 'url' | 'email' | 'textarea' | 'toggle' | 'number' | 'postPicker';
  /** Human-readable label shown in the Theme Options admin page. */
  label?: string;
  /** Default value used when the option has not been set. */
  default?: string;
  /** For postPicker fields: the WordPress post type to search (e.g. 'hotel', 'post'). */
  postType?: string;
}

export type WpOptionsSchema = Record<string, WpOptionField>;

/** Plain text input field. */
export function optionText(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'text' };
}

/** URL input field (sanitized with esc_url_raw server-side). */
export function optionUrl(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'url' };
}

/** Email input field. */
export function optionEmail(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'email' };
}

/** Multi-line textarea field. */
export function optionTextarea(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'textarea' };
}

/** Checkbox / boolean toggle field. */
export function optionToggle(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'toggle' };
}

/** Numeric input field. */
export function optionNumber(config: Omit<WpOptionField, '_type'> & { min?: number; max?: number; step?: number } = {}): WpOptionField {
  return { ...config, _type: 'number' };
}

/**
 * Searchable post picker field — renders a Select2 AJAX-powered dropdown
 * in the Theme Options admin page that searches posts of the given post type.
 */
export function optionPostPicker(config: Omit<WpOptionField, '_type'> & { postType: string }): WpOptionField {
  return { ...config, _type: 'postPicker' };
}

/**
 * Declare site-wide WordPress option metadata for the auto-generated
 * Appearance → Theme Options admin page.
 *
 * Place this in `src/cms/site-options.ts` (one file, one call per project).
 * The compiler reads this at build time — it has zero effect at runtime.
 *
 * @example
 * ```ts
 * import { defineWpOptions, optionPostPicker, optionText, optionUrl } from '../.forgewp/wordpress';
 *
 * export const siteOptions = defineWpOptions({
 *   hotel_of_the_month: optionPostPicker({ postType: 'hotel', label: 'Hotel of the Month', default: '6' }),
 *   contact_phone:      optionText({ label: 'Contact Phone' }),
 *   social_facebook:    optionUrl({ label: 'Facebook URL' }),
 * });
 * ```
 */
export function defineWpOptions(schema: WpOptionsSchema): WpOptionsSchema {
  // Runtime no-op — compiler reads source files statically.
  return schema;
}

export function useWpThemeMod(modName: string, defaultValue = ''): string {
  const siteSettings = getForgeWpSiteSettings();
  if (siteSettings?.theme_mods) {
    return siteSettings.theme_mods[modName] ?? defaultValue;
  }
  return defaultValue || `[theme_mod: ${modName}]`;
}

export function useWpThemeUri(): string {
  if (typeof window !== 'undefined') {
    return (window as any).forgeWpHydration?.themeUri || '';
  }
  return '';
}

export function resolveWpAsset(path: string): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  if (typeof window !== 'undefined') {
    const themeUri =
      (window as any).forgeWpHydration?.themeUri ||
      (window as any).forgeWpThemeUri ||
      (window as any).forgewpData?.themeUri;
    if (themeUri) {
      return themeUri.replace(/\/+$/, '') + '/' + path.replace(/^(\/|\.\/)+/, '');
    }
  }
  return path;
}

export function useWpPageLink(name: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.forgeWpHydration?.pageLinks?.[name]) {
      return win.forgeWpHydration.pageLinks[name];
    }
  }
  return fallback;
}

function normalizeMenuUrl(url: string): string {
  if (!url) return '';
  if (typeof window !== 'undefined' && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const parsed = new URL(url);
      if (parsed.origin === window.location.origin) {
        const cleanPath = (parsed.pathname || '/').replace(/\/+$/, '') || '/';
        return cleanPath + parsed.search + parsed.hash;
      }
    } catch {}
  }
  if (url.startsWith('/') && url.length > 1) {
    return url.replace(/\/+$/, '');
  }
  return url;
}

function normalizeMenuItems(items: WpMenuItem[]): WpMenuItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    url: normalizeMenuUrl(item.url),
    children: item.children ? normalizeMenuItems(item.children) : undefined,
  }));
}

export function useWpMenu(location: string = 'primary'): { items: WpMenuItem[]; loading: boolean } {
  if (typeof window === 'undefined') {
    return { items: [], loading: true };
  }

  const win = window as any;
  const rawItems = win.forgeWpHydration?.menus?.[location] ||
    win._forgeWpMockMenus?.[location] || [];
  const items = useMemo(() => normalizeMenuItems(rawItems), [rawItems]);

  return { items, loading: false };
}

// ── Isomorphic Query Hook ─────────────────────────────────────────────────────

/**
 * Resolves a single meta-query condition against a post's customFields.
 * Returns true if the condition passes.
 */
function matchMetaCondition(
  customFields: Record<string, any> = {},
  condition: import('./types').WpMetaQuery,
): boolean {
  const { key, value, compare = '=' } = condition;

  if (compare === 'EXISTS') return key in customFields;
  if (compare === 'NOT EXISTS') return !(key in customFields);

  if (!(key in customFields)) return false;

  const fieldVal = customFields[key];

  if (compare === 'LIKE') {
    return String(fieldVal).toLowerCase().includes(String(value ?? '').toLowerCase());
  }

  const a = isNaN(Number(fieldVal)) ? String(fieldVal) : Number(fieldVal);
  const b = isNaN(Number(value)) ? String(value ?? '') : Number(value ?? 0);

  if (compare === '=') return a == b;  // loose equality to cover "45000" == 45000
  if (compare === '!=') return a != b;
  if (compare === '>') return a > b;
  if (compare === '>=') return a >= b;
  if (compare === '<') return a < b;
  if (compare === '<=') return a <= b;

  return false;
}

/**
 * Applies the full relational filter pipeline against a flat mock post array.
 * Supports: full-text search, category name, taxQuery (terms), metaQuery (meta fields),
 * ordering by any field or ISO date, and standard page-slice pagination.
 */
function executeInMemoryQuery(
  mockDb: any[],
  args: import('./types').WpQueryArgs,
  page: number,
): { items: any[]; total: number } {
  const {
    postsPerPage = 10,
    categoryName = '',
    s = '',
    orderby = 'date',
    order = 'DESC',
    taxQuery = [],
    metaQuery = [],
    metaRelation = 'AND',
    p,
  } = args;

  // Single-post lookup by ID (mirrors WP_Query's `p` argument) — bypasses every
  // other filter/sort/pagination option, matching WP_Query's own precedence.
  if (p !== undefined && p !== null && p !== '') {
    const match = mockDb.find((post) => String(post.id) === String(p));
    return match ? { items: [match], total: 1 } : { items: [], total: 0 };
  }

  let filtered = [...mockDb];

  // ── 1. Full-text search (title + content + excerpt) ──────────────────────
  if (s) {
    const q = s.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q)) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q)),
    );
  }

  // ── 2. Legacy categoryName filter (simple slug match) ────────────────────
  if (categoryName) {
    const catSlug = categoryName.toLowerCase();
    filtered = filtered.filter((p) => {
      // Check _terms.category array first (enriched mock data)
      if (p._terms?.category) {
        const cats: any[] = p._terms.category;
        return cats.some(
          (c) =>
            (typeof c === 'string' && c.toLowerCase() === catSlug) ||
            (typeof c === 'object' && c.slug?.toLowerCase() === catSlug),
        );
      }
      // Fallback: scan customFields for any value matching the slug
      return JSON.stringify(p.customFields || {}).toLowerCase().includes(catSlug);
    });
  }

  // ── 3. Relational taxQuery joins ─────────────────────────────────────────
  // Mock posts must have _terms: { [taxonomy]: [{ slug, id, name }] }
  for (const tq of taxQuery) {
    const { taxonomy, field = 'slug', terms } = tq;
    const termList = Array.isArray(terms) ? terms : [terms];

    filtered = filtered.filter((p) => {
      const postTerms: any[] = p._terms?.[taxonomy] || [];
      return termList.some((t) =>
        postTerms.some((pt) => {
          if (typeof pt === 'string') return pt === String(t);
          const val = String(pt[field] ?? pt.slug ?? pt);
          return val === String(t);
        }),
      );
    });
  }

  // ── 4. Meta queries (custom field relational filters) ────────────────────
  if (metaQuery.length > 0) {
    filtered = filtered.filter((p) => {
      const cf = p.customFields || {};
      if (metaRelation === 'OR') {
        return metaQuery.some((cond) => matchMetaCondition(cf, cond));
      }
      // Default: AND
      return metaQuery.every((cond) => matchMetaCondition(cf, cond));
    });
  }

  // ── 5. Sorting ───────────────────────────────────────────────────────────
  filtered.sort((a, b) => {
    let valA: any = (a as any)[orderby] ?? '';
    let valB: any = (b as any)[orderby] ?? '';

    // Cast date strings to timestamps for reliable numeric comparison
    if (orderby === 'date' || orderby === 'modified') {
      valA = new Date(a.date || a.modified || 0).getTime();
      valB = new Date(b.date || b.modified || 0).getTime();
    } else if (typeof valA === 'string' && typeof valB === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (order === 'DESC') return valA < valB ? 1 : valA > valB ? -1 : 0;
    return valA > valB ? 1 : valA < valB ? -1 : 0;
  });

  // ── 6. Pagination (page-slice: returns only page N, not cumulative) ───────
  const total = filtered.length;
  const start = (page - 1) * postsPerPage;
  const end = start + postsPerPage;
  const items = filtered.slice(start, end);

  return { items, total };
}

const queryCache = new Map<string, { posts: any[]; total: number; hasMore: boolean }>();

const activeQueries = new Set<{
  args: WpQueryArgs;
  querySelector: (params: URLSearchParams) => WpQueryArgs;
  execute: (targetArgs: WpQueryArgs) => Promise<void>;
}>();

export function useWpQuery(args: WpQueryArgs = {}): WpQueryResults {
  const {
    postType = 'post',
    postsPerPage = 10,
    paged = 1,
  } = args;

  // Serialize args to detect query-level param changes and reset
  const queryKey = JSON.stringify({
    queryId: args.queryId,
    postType,
    postsPerPage,
    s: args.s,
    categoryName: args.categoryName,
    orderby: args.orderby,
    order: args.order,
    taxQuery: args.taxQuery,
    metaQuery: args.metaQuery,
    metaRelation: args.metaRelation,
    p: args.p,
  });

  let initialState = null;
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    const stateEl = document.getElementById('forgewp-initial-state');
    if (stateEl) {
      try {
        const parsed = JSON.parse(stateEl.textContent || '{}');
        if (parsed.queries && parsed.queries[queryKey]) {
          initialState = parsed.queries[queryKey];
          // Pre-populate queryCache for page 1
          const cacheKey = JSON.stringify({ ...args, paged: paged });
          if (!queryCache.has(cacheKey)) {
            queryCache.set(cacheKey, {
              posts: initialState.posts,
              hasMore: initialState.hasMore,
              total: initialState.total || initialState.posts.length
            });
          }
        }
      } catch (e) {
        console.warn('Failed to parse forgewp-initial-state:', e);
      }
    }
  }

  const [posts, setPosts] = useState<WpPost[]>(initialState ? initialState.posts : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(paged);
  const [totalPosts, setTotalPosts] = useState(initialState ? initialState.total : 0);
  const hydratedFromSsrRef = useRef(initialState ? true : false);
  // 'append' = loadMore behaviour; 'replace' = goToPage behaviour
  const pageModeRef = useRef<'append' | 'replace'>('replace');

  const [prevQueryKey, setPrevQueryKey] = useState(queryKey);

  if (prevQueryKey !== queryKey) {
    setPrevQueryKey(queryKey);
    setCurrentPage(1);
    setPosts([]);
    setTotalPosts(0);
    pageModeRef.current = 'replace';
    hydratedFromSsrRef.current = false;
  }

  const totalPages = Math.max(1, Math.ceil(totalPosts / postsPerPage));
  const hasMore = (currentPage * postsPerPage) < totalPosts;

  const executeMockQuery = useCallback(
    (page: number) => {
      const mode = pageModeRef.current;
      // After consuming the mode, reset to 'append' for subsequent loadMore calls
      pageModeRef.current = 'append';
      const cacheKey = JSON.stringify({ ...args, paged: page });
      if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey)!;
        setPosts((prev) => {
          if (mode === 'append') {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = cached.posts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          }
          return cached.posts;
        });
        setTotalPosts(cached.total);
        setError(null);
        return;
      }

      setLoading(true);

      // Micro-delay simulates async feel without blocking
      setTimeout(() => {
        try {
          const mockDb =
            typeof window !== 'undefined'
              ? (window as any)._forgeWpMockPosts?.[postType] || []
              : [];

          const { items, total } = executeInMemoryQuery(mockDb, args, page);
          queryCache.set(cacheKey, {
            posts: items,
            total,
            hasMore: (page * postsPerPage) < total,
          });

          setPosts((prev) => {
            if (mode === 'append') {
              const existingIds = new Set(prev.map((p) => p.id));
              const newPosts = items.filter((p) => !existingIds.has(p.id));
              return [...prev, ...newPosts];
            }
            return items;
          });
          setTotalPosts(total);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Query execution failed');
        } finally {
          setLoading(false);
        }
      }, 60);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, postType],
  );

  useEffect(() => {
    if (hydratedFromSsrRef.current) {
      hydratedFromSsrRef.current = false;
      return;
    }
    executeMockQuery(currentPage);
  }, [executeMockQuery, currentPage]);

  const querySelector = useCallback((params: URLSearchParams) => {
    const target = { ...args };
    if (params.has('q') || params.has('s')) {
      target.s = params.get('q') || params.get('s') || '';
    }
    if (params.has('category')) {
      target.categoryName = params.get('category') || '';
    }
    return target;
  }, [args]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const item = {
      args,
      querySelector,
      execute: async (targetArgs: any) => {
        const cacheKey = JSON.stringify({ ...targetArgs, paged: 1 });
        if (queryCache.has(cacheKey)) return;
        try {
          const mockDb =
            typeof window !== 'undefined'
              ? (window as any)._forgeWpMockPosts?.[targetArgs.postType || 'post'] || []
              : [];
          const { items, total } = executeInMemoryQuery(mockDb, targetArgs, 1);
          queryCache.set(cacheKey, {
            posts: items,
            total,
            hasMore: (1 * (targetArgs.postsPerPage || 10)) < total,
          });
        } catch (e) {}
      }
    };
    activeQueries.add(item);
    return () => {
      activeQueries.delete(item);
    };
  }, [args, querySelector]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    pageModeRef.current = 'append';
    setCurrentPage((p) => p + 1);
  }, [loading, hasMore]);

  const goToPage = useCallback((targetPage: number) => {
    if (loading) return;
    if (targetPage < 1 || targetPage > totalPages) return;
    pageModeRef.current = 'replace';
    setPosts([]);
    setCurrentPage(targetPage);
  }, [loading, totalPages]);

  const refetch = useCallback(async () => {
    pageModeRef.current = 'replace';
    setCurrentPage(1);
    executeMockQuery(1);
  }, [executeMockQuery]);

  return {
    posts,
    loading,
    error,
    hasMore,
    totalPages,
    currentPage,
    loadMore,
    goToPage,
    refetch,
  };
}

let prefetchTimeout: any = null;

export function useWpPrefetch() {
  const prefetch = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    if (prefetchTimeout) {
      clearTimeout(prefetchTimeout);
    }
    prefetchTimeout = setTimeout(() => {
      try {
        const url = new URL(to, window.location.href);
        const params = url.searchParams;
        activeQueries.forEach((item) => {
          const targetArgs = item.querySelector(params);
          item.execute(targetArgs);
        });
      } catch (e) {
        console.warn('[prefetch] Failed to parse target URL:', to, e);
      }
    }, 80);
  }, []);
  return prefetch;
}

// ── Gutenberg Block Compiler Authoring ───────────────────────────────────────────



export interface BlockAttributeDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default?: any;
}

/**
 * Parent shell configuration — layout only; children fill via Gutenberg InnerBlocks.
 * Children stay standalone unless a child sets its own `parent` restriction (WP native).
 */
export interface BlockInnerBlocksConfig {
  /** Allowed child block names (with or without `forgewp/` prefix). */
  allowedBlocks?: string[];
  /** Default inserted children: [blockName, attributes?][] */
  template?: Array<[string, Record<string, any>?]>;
  /** `false` | `true` | `'all'` | `'insert'` — WP templateLock */
  templateLock?: boolean | 'all' | 'insert';
  /** Editor orientation hint for the inner blocks appender */
  orientation?: 'horizontal' | 'vertical';
}

/** Outer / grid classNames for parent shell render + editor chrome */
export interface BlockShellConfig {
  /** Classes on the outer section wrapper (max-width, padding, …) */
  className?: string;
  /** Classes on the grid that wraps InnerBlocks */
  gridClassName?: string;
}

export interface BlockDefinition<TAttrs = Record<string, any>> {
  name: string;      // e.g. "info-box" (namespace is auto-prefixed: "forgewp/info-box")
  title: string;     // e.g. "ForgeWP Info Box"
  category?: string; // e.g. "common", "formatting", "layout", "design", "widgets"
  icon?: string;     // Dashicon slug (e.g. "info", "admin-generic") or inline SVG
  description?: string;
  keywords?: string[];
  attributes?: Record<string, BlockAttributeDefinition>;
  /**
   * When set, this block is a **parent shell**: layout wrapper + InnerBlocks.
   * `edit` may be a no-op (`() => null`); the compiler generates the editor UI.
   */
  innerBlocks?: BlockInnerBlocksConfig;
  /** Layout classes for parent shells (ignored for leaf content blocks). */
  shell?: BlockShellConfig;
  edit: ComponentType<{
    attributes: TAttrs;
    setAttributes: (attrs: Partial<TAttrs>) => void;
  }>;
  save?: ComponentType<{
    attributes: TAttrs;
  }>;
}

/**
 * Declares a Gutenberg block in ForgeWP.
 * Enforces type safety and acts as a compiler hook.
 */
export function defineBlock<
  TAttrs = Record<string, any>,
  TDef extends BlockDefinition<TAttrs> = BlockDefinition<TAttrs>
>(def: TDef): TDef {
  return def;
}

// ── Theme Compilation Authoring ──────────────────────────────────────────────────

export interface ColorPreset {
  name: string;
  slug: string;
  color: string;
}

export interface FontSizePreset {
  name: string;
  slug: string;
  size: string;
}

export interface FontFamilyPreset {
  name: string;
  slug: string;
  fontFamily: string;
}

export interface ThemeSettings {
  name: string;
  slug: string;
  version?: string;
  description?: string;
  textDomain?: string;
  style?: 'forgewp' | 'shadcn';
  screenshot?: string;
  features?: Record<string, boolean>;
  menus?: Record<string, string>;
  presets?: {
    wordpressCoreStyles?: boolean; // Set to false to fully cut off standard pre-packaged legacy styles
  };
  settings?: {
    layout?: {
      contentSize?: string;
      wideSize?: string;
    };
    color?: {
      palette?: ColorPreset[];
      custom?: boolean;
    };
    typography?: {
      fontSizes?: FontSizePreset[];
      fontFamilies?: FontFamilyPreset[];
      googleFonts?: string[];
    };
  };
}

/**
 * Declares a WordPress theme configuration in ForgeWP.
 * Statically parsed by the compiler to output theme.json and functions.php registers.
 */
export function defineTheme(config: ThemeSettings): ThemeSettings {
  return config;
}

// ── Structured Editable Content Architecture (Phase 1) ──────────────────────

export interface FieldBase<T> {
  type: 'text' | 'richText' | 'image' | 'repeater' | 'boolean' | 'color' | 'url' | 'select' | 'number' | 'icon';
  label?: string;
  default?: T;
  description?: string;
  required?: boolean;
  customType?: string;
  skipRegisterMeta?: boolean;
  postTypes?: string[];
}

export interface TextField extends FieldBase<string> {
  type: 'text';
}

export interface RichTextField extends FieldBase<string> {
  type: 'richText';
}

export interface ImageFieldVal {
  id?: number;
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface ImageField extends FieldBase<ImageFieldVal | string> {
  type: 'image';
}

export interface BooleanField extends FieldBase<boolean> {
  type: 'boolean';
}

export interface ColorField extends FieldBase<string> {
  type: 'color';
}

export interface UrlField extends FieldBase<string> {
  type: 'url';
}

export interface SelectField extends FieldBase<string> {
  type: 'select';
  options: (string | { label: string; value: string })[];
}

export interface NumberField extends FieldBase<number> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Icon slug stored as a string (e.g. "award", "map-pin").
 * Optional `options` allowlist limits the block-editor picker.
 *
 * `provider` (default `lucide`):
 * - `lucide` / `lucide-react` — Lucide
 * - `dashicons` — WordPress Dashicons
 * - `custom` — theme custom SVG map (`forgewp_custom_icons`)
 * - any installed package id (e.g. `@heroicons/react/24/outline`) — resolved when present;
 *   missing packages never crash; PHP/editor fall back to curated SVG or dashicons
 */
export interface IconField extends FieldBase<string> {
  type: 'icon';
  /** Allowlist of icon slugs for the picker. Omit for the curated ForgeWP default set. */
  options?: string[];
  /** Icon library / package. Defaults to `lucide`. */
  provider?: string;
}

/** Fixed = locked row count (usually default.length). Dynamic = editors may add/remove/reorder within min/max. */
export type RepeaterMode = 'fixed' | 'dynamic';

export interface RepeaterField<T extends Record<string, any> = Record<string, any>> extends FieldBase<T[]> {
  type: 'repeater';
  fields: Record<keyof T, EditableField>;
  /**
   * `fixed` — row count locked (no add/remove/reorder that changes cardinality).
   * `dynamic` — editors may add/remove/reorder rows in the block sidebar.
   * @default 'dynamic'
   */
  mode?: RepeaterMode;
  /** Minimum rows when mode is `dynamic`. Ignored for fixed (uses default length). */
  min?: number;
  /** Maximum rows when mode is `dynamic`. Omit for unlimited. */
  max?: number;
}

export type EditableField = 
  | TextField 
  | RichTextField 
  | ImageField 
  | BooleanField 
  | RepeaterField 
  | ColorField 
  | UrlField 
  | SelectField 
  | NumberField
  | IconField;

export type EditableSchema = Record<string, EditableField>;

export type InferFieldType<F> = 
  F extends TextField ? string :
  F extends RichTextField ? string :
  F extends ColorField ? string :
  F extends UrlField ? string :
  F extends SelectField ? string :
  F extends IconField ? string :
  F extends NumberField ? number :
  F extends BooleanField ? boolean :
  F extends ImageField ? ImageFieldVal :
  F extends RepeaterField<infer U> ? U[] :
  any;

export type InferAttributes<T extends EditableSchema> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

/**
 * Declares a structured editable content schema in ForgeWP.
 * Enforces type safety and acts as a compiler hook.
 *
 * This is the **single source of field defaults**. Prefer
 * {@link getEditableDefaults} (or a colocated `defaults` export) for
 * `useWpMeta(key, defaults.key)` and component props — do not re-type
 * the same strings in three places.
 */
export function defineEditable<T extends EditableSchema>(schema: T): T {
  return schema;
}

/**
 * Extract default values from a `defineEditable` schema.
 * One schema → one defaults object for ACF/page meta, SSR, and props.
 */
export function getEditableDefaults<T extends EditableSchema>(
  schema: T,
): InferAttributes<T> {
  const out = {} as Record<string, unknown>;
  for (const [key, field] of Object.entries(schema) as [string, EditableField][]) {
    if (field && typeof field === 'object' && 'default' in field && field.default !== undefined) {
      out[key] = field.default;
      continue;
    }
    switch (field?.type) {
      case 'boolean':
        out[key] = false;
        break;
      case 'number':
        out[key] = 0;
        break;
      case 'repeater':
        out[key] = [];
        break;
      case 'image':
        out[key] = '';
        break;
      default:
        out[key] = '';
    }
  }
  return out as InferAttributes<T>;
}

/**
 * One section contribution when composing a baked page schema from shared
 * block/section editables (see `cms/editables/`).
 *
 * - `prefix` is prepended to each field key (`hero_` + `title` → `hero_title`)
 * - `rename` maps section field key → suffix after prefix
 *   e.g. `{ team: 'members' }` + prefix `team_` → `team_members`
 */
export interface PageEditableSectionSource {
  /** Section schema from `defineEditable` (block-native keys) */
  schema: EditableSchema;
  /** Meta key prefix for ACF uniqueness on one page */
  prefix?: string;
  /** Optional renames: sectionKey → page suffix (after prefix) */
  rename?: Record<string, string>;
}

/**
 * Flatten section schemas into one page-level `defineEditable` schema.
 * Section files stay the single source of field types/defaults; the page
 * only chooses prefixes / renames for ACF.
 */
export function buildPageEditable(
  sections: PageEditableSectionSource[],
): EditableSchema {
  const out: EditableSchema = {};
  for (const { schema, prefix = '', rename = {} } of sections) {
    for (const [key, field] of Object.entries(schema)) {
      const suffix = rename[key] ?? key;
      const pageKey = `${prefix}${suffix}`;
      out[pageKey] = field;
    }
  }
  return out;
}

/**
 * Pick / rename fields from a page (or other) schema for a block attribute bag.
 *
 * @example Map page meta keys → block attribute names
 * ```ts
 * export const editable = pickEditable(berUnsEditable, {
 *   badge: 'hero_badge',
 *   title: 'hero_title',
 * });
 * ```
 *
 * @example Keep the same keys
 * ```ts
 * export const editable = pickEditable(schema, ['title', 'subtitle']);
 * ```
 *
 * Prefer this (or JSDoc `from` + `pick` on `@forgewp-block`) over re-declaring
 * field types/defaults. The page schema remains the single source of truth.
 */
export function pickEditable<T extends EditableSchema>(
  schema: T,
  map: Partial<Record<string, keyof T & string>> | readonly (keyof T & string)[],
): EditableSchema {
  const out: EditableSchema = {};
  if (Array.isArray(map)) {
    for (const key of map) {
      const field = schema[key as string];
      if (field) out[key as string] = field;
    }
    return out;
  }
  for (const [attrKey, schemaKey] of Object.entries(map)) {
    if (!schemaKey) continue;
    const field = schema[schemaKey as string];
    if (field) out[attrKey] = field;
  }
  return out;
}

/**
 * Merge multiple editable schemas into one block attribute bag.
 *
 * **Page ACF vs block-only fields**
 * - Put content in `cms/editables/<page>.ts` and borrow with {@link pickEditable}
 *   or JSDoc `from`/`pick`.
 * - Put layout chrome that only makes sense on Gutenberg blocks (vertical
 *   padding via `select`/`number`, background via `color`/`image`, toggles, …)
 *   in a second schema and merge it here.
 * - Never register those block-only keys on the page ACF schema — baked
 *   templates ship fixed defaults in React; blocks expose controls to editors.
 *
 * @example
 * ```ts
 * export const editable = mergeEditable(
 *   pickEditable(frontPageEditable, { heading: 'featured_heading' }),
 *   {
 *     paddingY: select({
 *       label: 'Vertical padding',
 *       default: 'md',
 *       options: [
 *         { label: 'Small', value: 'sm' },
 *         { label: 'Medium', value: 'md' },
 *         { label: 'Large', value: 'lg' },
 *       ],
 *     }),
 *   },
 * );
 * ```
 */
export function mergeEditable(...parts: EditableSchema[]): EditableSchema {
  const out: EditableSchema = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    Object.assign(out, part);
  }
  return out;
}

export function text(options: Omit<TextField, 'type'> = {}): TextField {
  return { type: 'text', ...options };
}

export function richText(options: Omit<RichTextField, 'type'> = {}): RichTextField {
  return { type: 'richText', ...options };
}

export function image(options: Omit<ImageField, 'type'> = {}): ImageField {
  return { type: 'image', ...options };
}

export function boolean(options: Omit<BooleanField, 'type'> = {}): BooleanField {
  return { type: 'boolean', ...options };
}

export function color(options: Omit<ColorField, 'type'> = {}): ColorField {
  return { type: 'color', ...options };
}

export function url(options: Omit<UrlField, 'type'> = {}): UrlField {
  return { type: 'url', ...options };
}

export function select(options: Omit<SelectField, 'type'>): SelectField {
  return { type: 'select', ...options };
}

export function number(options: Omit<NumberField, 'type'> = {}): NumberField {
  return { type: 'number', ...options };
}

export function icon(options: Omit<IconField, 'type'> = {}): IconField {
  return { type: 'icon', provider: 'lucide', ...options };
}

export function repeater<T extends Record<string, any>>(options: Omit<RepeaterField<T>, 'type'>): RepeaterField<T> {
  const mode = options.mode ?? 'dynamic';
  return { type: 'repeater', ...options, mode };
}

/**
 * True when running inside the ForgeWP Gutenberg block editor preview
 * (`forgewp-editor.js` sets `window.forgeWpIsEditorPreview`).
 * Prefer this over reading the window flag directly.
 */
export function isEditorPreview(): boolean {
  return typeof window !== 'undefined' && !!(window as any).forgeWpIsEditorPreview;
}

/**
 * React hook wrapper for {@link isEditorPreview}.
 * Use for optional editor-only canvas chrome. Structure controls (add/remove/reorder)
 * for dynamic repeaters belong in the block sidebar, driven by `repeater({ mode })`.
 */
export function useIsEditorPreview(): boolean {
  return isEditorPreview();
}

/**
 * True when running in decoupled local React SPA dev mode (Vite dev server)
 * where the storefront is decoupled from a live WordPress PHP backend.
 */
export function isDecoupled(): boolean {
  if (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime) {
    return false;
  }
  const isDev =
    typeof import.meta !== 'undefined' &&
    // @ts-ignore
    import.meta.env?.DEV === true;

  return isDev || (typeof window !== 'undefined' && !(window as any).forgeWpHydration);
}

/**
 * React hook wrapper for {@link isDecoupled}.
 */
export function useIsDecoupled(): boolean {
  return isDecoupled();
}

/**
 * True when running in a live WordPress site (hydrating inside an exported WordPress theme).
 */
export function isWordPress(): boolean {
  return typeof window !== 'undefined' && !!(window as any).forgeWpHydration;
}

/**
 * React hook wrapper for {@link isWordPress}.
 */
export function useIsWordPress(): boolean {
  return isWordPress();
}

export const WpBlockContext = typeof window !== 'undefined'
  ? ((window as any)._forgeWpBlockContext || ((window as any)._forgeWpBlockContext = createContext<any>(null)))
  : createContext<any>(null);

/**
 * True when ACF/meta should fall through to schema defaults.
 * Matches PHP `forgewp_get_meta_value` empty handling (+ empty repeaters).
 */
function isEmptyMetaValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * Dual-host field resolve: block attribute prop vs page ACF/meta.
 *
 * Prefer the prop whenever it is provided (editor attributes OR visitor
 * island `data-forgewp-props`). Only fall back to meta when the prop is
 * nullish. Do **not** gate on `setAttributes` — that made visitor-side
 * block hydrates ignore attributes and only read page meta.
 *
 *   const title = resolveDualHost(titleProp, titleMeta);
 */
export function resolveDualHost<T>(prop: T | undefined | null, meta: T): T {
  if (prop !== undefined && prop !== null) {
    return prop as T;
  }
  return meta;
}

/**
 * Isomorphic hook to read a dynamic structured editable field value.
 * In local dev (Vite): resolves the value from WpPostContext / cms/mock-data.json.
 * In production: the compiler replaces this with direct WordPress/ACF metadata calls.
 *
 * Empty strings / empty arrays from hydration do not override `defaultValue`
 * (otherwise island remounts blank out SSR defaults when ACF is unset).
 *
 * When an island is hydrated with block attributes (WpBlockContext), those
 * keys are attribute names (e.g. `stat1Value`). Meta keys (e.g.
 * `trust_stat1_value`) are still read from post customFields for page host.
 */
export function useWpMeta<T>(key: string, defaultValue: T): T {
  const blockAttrs = useContext(WpBlockContext) as any;
  if (blockAttrs && typeof blockAttrs[key] !== 'undefined' && !isEmptyMetaValue(blockAttrs[key])) {
    return blockAttrs[key] as T;
  }
  const post = useContext(WpPostContext);
  if (post?.customFields && typeof post.customFields[key] !== 'undefined') {
    const val = post.customFields[key];
    if (!isEmptyMetaValue(val)) {
      return val as T;
    }
  }
  return defaultValue;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  if (typeof window === 'undefined') {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

export function useWpPagePath(name: string, fallback: string): string {
  const href = useWpPageLink(name, fallback);
  return useMemo(() => {
    try {
      return new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    } catch (e) {
      return href;
    }
  }, [href]);
}

export function useWpSearchParams(): URLSearchParams {
  const [search, setSearch] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search || '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setSearch(window.location.search || '');
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useWpLocation(): [string, (to: string, options?: { replace?: boolean }) => void] {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    setPathname(window.location.pathname || '/');
  }, []);

  return [pathname, navigate];
}

export function useWpSearch(): string {
  const [search, setSearch] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search || '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setSearch(window.location.search || '');
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  return search;
}

export interface WpTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  meta: Record<string, any>;
}

export function useWpTaxonomyList(taxonomy: string, defaultValue = ''): string {
  const post = useContext(WpPostContext);
  const terms = (post as any)?._terms?.[taxonomy];
  if (Array.isArray(terms) && terms.length > 0) {
    return terms.map((t: any) => t.name).join(', ');
  }
  return defaultValue || `[taxonomy: ${taxonomy}]`;
}

export function useWpTerms(taxonomy: string): { terms: WpTerm[]; loading: boolean; error: string | null } {
  const terms = useMemo<WpTerm[]>(() => {
    if (typeof window !== 'undefined' && (window as any)._forgeWpMockPosts) {
      const raw = (window as any)._forgeWpMockPosts[`_taxonomy_${taxonomy}`] || [];
      return raw.map((t: any) => ({
        id: t.id ?? 0,
        name: t.name ?? '',
        slug: t.slug ?? '',
        description: t.description ?? '',
        count: t.count ?? 0,
        meta: t.meta ?? {},
      }));
    }
    return [];
  }, [taxonomy]);

  return { terms, loading: false, error: null };
}

export function useWpI18n() {
  const getTranslatedText = useCallback((text: string) => {
    if (typeof window === 'undefined') return text;
    const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage || 'de';
    const dict = (window as any).forgeWpTranslations?.translations || (window as any)._forgeWpMockTranslations;

    if (dict) {
      if (dict[currentLang] && typeof dict[currentLang][text] !== 'undefined') {
        return dict[currentLang][text];
      }
      if (typeof dict[text] !== 'undefined') {
        return dict[text];
      }
    }
    return text;
  }, []);

  return {
    __: getTranslatedText,
  };
}

export function useWpLanguage() {
  const currentLanguage = typeof window !== 'undefined'
    ? ((window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage || 'de')
    : 'de';

  const urls: Record<string, string> = typeof window !== 'undefined' && (window as any).forgeWpTranslations?.urls
    ? (window as any).forgeWpTranslations.urls
    : { de: '/', en: '/en/' };

  const homeUrls: Record<string, string> = typeof window !== 'undefined' && (window as any).forgeWpTranslations?.homeUrls
    ? (window as any).forgeWpTranslations.homeUrls
    : { de: '/', en: '/en/' };

  const homeUrl = homeUrls[currentLanguage] || '/';
  const languages = useMemo(() => Object.keys(urls), [urls]);

  const switchLanguage = useCallback((lang: string) => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const base = urls[lang] || (lang === 'de' ? '/' : `/${lang}/`);
      const separator = base.includes('?') ? '&' : '?';
      window.location.href = search ? (base + separator + search.substring(1)) : base;
    }
  }, [urls]);

  return {
    currentLanguage,
    languages,
    urls,
    homeUrls,
    homeUrl,
    switchLanguage,
  };
}



