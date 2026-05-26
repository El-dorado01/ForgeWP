import { useContext, useCallback, ComponentType } from 'react';
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

import { useEffect, useState } from 'react';

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

export function useWpQuery(args: WpQueryArgs = {}): WpQueryResults {
  const {
    postType = 'post',
    postsPerPage = 10,
    paged = 1,
  } = args;

  const [posts, setPosts] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(paged);
  const [totalPosts, setTotalPosts] = useState(0);

  // Serialize args (excluding paged) to detect query-level param changes and reset
  const queryKey = JSON.stringify({
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

  const [prevQueryKey, setPrevQueryKey] = useState(queryKey);

  if (prevQueryKey !== queryKey) {
    setPrevQueryKey(queryKey);
    setCurrentPage(1);
    setPosts([]);
  }

  const hasMore = (currentPage * postsPerPage) < totalPosts;

  const executeMockQuery = useCallback(
    (page: number, accumulate: boolean) => {
      setLoading(true);

      // Micro-delay simulates async feel without blocking
      setTimeout(() => {
        try {
          const mockDb =
            typeof window !== 'undefined'
              ? (window as any)._forgeWpMockPosts?.[postType] || []
              : [];

          const { items, total } = executeInMemoryQuery(mockDb, args, page);

          setPosts((prev) => (accumulate ? [...prev, ...items] : items));
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
    executeMockQuery(currentPage, currentPage > 1);
  }, [executeMockQuery, currentPage]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setCurrentPage((p) => p + 1);
  }, [loading, hasMore]);

  const refetch = useCallback(async () => {
    setCurrentPage(1);
    executeMockQuery(1, false);
  }, [executeMockQuery]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
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


