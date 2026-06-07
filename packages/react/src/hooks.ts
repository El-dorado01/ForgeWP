import { useContext, useCallback, ComponentType, useState, useRef, useEffect } from 'react';
import { WpPostContext } from './context';
import type { WpPost, WpQueryArgs, WpQueryResults } from './types';

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
  console.log(`[ForgeWP Debug] useWpCustomField requested: ${fieldName}`);
  console.log(`[ForgeWP Debug] Context post:`, post);

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

export function useWpOption(optionName: string, defaultValue = ''): string {
  const siteSettings = getForgeWpSiteSettings();
  if (siteSettings?.options) {
    return siteSettings.options[optionName] ?? defaultValue;
  }
  return defaultValue || `[option: ${optionName}]`;
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

export function useWpPageLink(name: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.forgeWpHydration?.pageLinks?.[name]) {
      return win.forgeWpHydration.pageLinks[name];
    }
  }
  return fallback;
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
  } = args;

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
        setPosts((prev) => (mode === 'append' ? [...prev, ...cached.posts] : cached.posts));
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

          setPosts((prev) => (mode === 'append' ? [...prev, ...items] : items));
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

export interface BlockDefinition<TAttrs = Record<string, any>> {
  name: string;      // e.g. "info-box" (namespace is auto-prefixed: "forgewp/info-box")
  title: string;     // e.g. "ForgeWP Info Box"
  category?: string; // e.g. "common", "formatting", "layout", "design", "widgets"
  icon?: string;     // Dashicon slug (e.g. "info", "admin-generic") or inline SVG
  attributes?: Record<string, BlockAttributeDefinition>;
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
  type: 'text' | 'richText' | 'image' | 'repeater' | 'boolean';
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

export interface RepeaterField<T extends Record<string, any> = Record<string, any>> extends FieldBase<T[]> {
  type: 'repeater';
  fields: Record<keyof T, EditableField>;
}

export type EditableField = TextField | RichTextField | ImageField | BooleanField | RepeaterField;

export type EditableSchema = Record<string, EditableField>;

/**
 * Declares a structured editable content schema in ForgeWP.
 * Enforces type safety and acts as a compiler hook.
 */
export function defineEditable<T extends EditableSchema>(schema: T): T {
  return schema;
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

export function repeater<T extends Record<string, any>>(options: Omit<RepeaterField<T>, 'type'>): RepeaterField<T> {
  return { type: 'repeater', ...options };
}

/**
 * Isomorphic hook to read a dynamic structured editable field value.
 * In local dev (Vite): resolves the value from WpPostContext / cms/mock-data.json.
 * In production: the compiler replaces this with direct WordPress/ACF metadata calls.
 */
export function useWpMeta<T>(key: string, defaultValue: T): T {
  const post = useContext(WpPostContext);
  if (post?.customFields && typeof post.customFields[key] !== 'undefined') {
    return post.customFields[key] as T;
  }
  return defaultValue;
}


