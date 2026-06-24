/**
 * ForgeWP WordPress Data Hooks
 *
 * These hooks provide mock data during local development (Vite dev server).
 * When the theme is exported, the ForgeWP compiler replaces every token
 * with the equivalent WordPress PHP function call.
 */
import React from 'react';
import { Link as WouterLink, useLocation as useWouterLocation, useSearch as useWouterSearch } from 'wouter';

// @ts-ignore
import mockData from '../../cms/mock-data.json';
// @ts-ignore
import menusData from '../../cms/menus.json';
// @ts-ignore
import siteSettings from '../../cms/site-settings.json';
// @ts-ignore
import translationsData from '../../cms/translations.json';

import {
  WpQueryLoop as _WpQueryLoop,
  WpMenu as _WpMenu,
  WpShortcode as _WpShortcode,
  useWpTitle as _useWpTitle,
  useWpContent as _useWpContent,
  useWpExcerpt as _useWpExcerpt,
  useWpPermalink as _useWpPermalink,
  useWpDate as _useWpDate,
  useWpModifiedDate as _useWpModifiedDate,
  useWpAuthor as _useWpAuthor,
  useWpFeaturedImage as _useWpFeaturedImage,
  useWpCustomField as _useWpCustomField,
  useWpField as _useWpField,
  useWpOption as _useWpOption,
  useWpThemeMod as _useWpThemeMod,
  useWpThemeUri as _useWpThemeUri,
  useWpQuery as _useWpQuery,
  useWpPrefetch as _useWpPrefetch,
  WpHead as _WpHead,
  WpImage as _WpImage,
  WpPostContext,
  useWpMeta as _useWpMeta,
  useWpPageLink as _useWpPageLink,
  useWpMenu as _useWpMenu,
  BlockArea as _BlockArea,
  defineEditable,
  text,
  richText,
  image,
  boolean,
  repeater,
  WpRepeater,
  WpIcon,
} from '@forgewp/react';

export { WpPostContext, defineEditable, text, richText, image, boolean, repeater, WpRepeater, WpIcon };

import type {
  WpQueryLoopProps,
  WpMenuProps,
  WpMenuItem,
  WpHeadProps,
  WpImageProps,
  WpAttachment,
  WpQueryArgs,
  WpQueryResults,
  WpPost,
  WpShortcodeProps,
  BlockAreaProps,
  WpRepeaterProps,
  WpIconProps,
} from '@forgewp/react';

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  // @ts-ignore
  import.meta.env?.DEV === true;

const IS_DECOUPLED =
  IS_DEV ||
  (typeof window !== 'undefined' && !(window as any).forgeWpHydration);

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

function getDevMockPosts(): any {
  if (typeof window !== 'undefined' && (window as any)._forgeWpMockPosts) {
    return (window as any)._forgeWpMockPosts;
  }
  return mockData;
}

if (IS_DEV) {
  if (typeof window !== 'undefined') {
    (window as any)._forgeWpMockSiteSettings = siteSettings;
    (window as any)._forgeWpMockPosts = mockData;
    (window as any)._forgeWpMockMenus = menusData;
  }
}

// ── Re-export pure hooks with compiler token fallbacks ────────────────────────
// In dev: @forgewp/react hook returns the mock value from WpPostContext.
// In prod: compiler replaces the call with the PHP equivalent below.

export function useWpTitle(): string {
  if (IS_DECOUPLED) return _useWpTitle();
  return '__FORGEWP_THE_TITLE__';
}
export function useWpContent(): string {
  if (IS_DECOUPLED) return _useWpContent();
  return '__FORGEWP_THE_CONTENT__';
}
export function useWpExcerpt(): string {
  if (IS_DECOUPLED) return _useWpExcerpt();
  return '__FORGEWP_THE_EXCERPT__';
}
export function useWpPermalink(): string {
  if (IS_DECOUPLED) return _useWpPermalink();
  return '__FORGEWP_THE_PERMALINK__';
}
export function useWpDate(): string {
  if (IS_DECOUPLED) return _useWpDate();
  return '__FORGEWP_THE_DATE__';
}
export function useWpModifiedDate(): string {
  if (IS_DECOUPLED) return _useWpModifiedDate();
  return '__FORGEWP_THE_MODIFIED_DATE__';
}
export function useWpAuthor(): string {
  if (IS_DECOUPLED) return _useWpAuthor();
  return '__FORGEWP_THE_AUTHOR__';
}
export function useWpFeaturedImage(): string {
  if (IS_DECOUPLED) return _useWpFeaturedImage();
  return '__FORGEWP_THE_POST_THUMBNAIL_URL__';
}
export function useWpCustomField(fieldName: string, defaultValue = ''): any {
  if (IS_DECOUPLED) return _useWpCustomField(fieldName, defaultValue);

  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win._forgeWpCompileTime) {
      const post = React.useContext(WpPostContext);
      const currentPost = post || win.forgeWpHydration?.post;
      if (currentPost?.customFields && typeof currentPost.customFields[fieldName] !== 'undefined') {
        return currentPost.customFields[fieldName];
      }
    }
  }

  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';
}

export function useWpField(fieldName: string, defaultValue = ''): any {
  if (IS_DECOUPLED) return _useWpField(fieldName, defaultValue);

  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win._forgeWpCompileTime) {
      const post = React.useContext(WpPostContext);
      const currentPost = post || win.forgeWpHydration?.post;
      if (currentPost?.customFields && typeof currentPost.customFields[fieldName] !== 'undefined') {
        return currentPost.customFields[fieldName];
      }
    }
  }

  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';
}

export function useWpMeta<T>(key: string, defaultValue: T): T {
  if (IS_DECOUPLED) return _useWpMeta(key, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win._forgeWpCompileTime) {
      if (typeof defaultValue === 'string') {
        return `__FORGEWP_META_${key}_DEFAULT_${encodeURIComponent(defaultValue).replace(/_/g, '%5F')}__` as any as T;
      }
      return defaultValue;
    }
    const post = React.useContext(WpPostContext);
    const currentPost = post || win.forgeWpHydration?.post;
    if (currentPost?.customFields && typeof currentPost.customFields[key] !== 'undefined') {
      return currentPost.customFields[key] as T;
    }
  }

  // Fallback to token for compiler replacement
  const defaultStr = typeof defaultValue === 'string' ? defaultValue : JSON.stringify(defaultValue);
  return `__FORGEWP_META_${key}_DEFAULT_${encodeURIComponent(defaultStr).replace(/_/g, '%5F')}__` as any as T;
}

export function useWpOption(optionName: string, defaultValue = ''): string {
  if (IS_DECOUPLED) return _useWpOption(optionName, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    const siteSettings =
      win._forgeWpMockSiteSettings || win.forgeWpHydration?.siteSettings;
    if (siteSettings?.options?.[optionName] !== undefined) {
      const value = siteSettings.options[optionName];
      // Handle false/null values from WordPress
      if (value === false || value === null) {
        return defaultValue || `[option: ${optionName}]`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? `__FORGEWP_OPTION_${optionName}_DEFAULT_${encodeURIComponent(defaultValue)}__`
    : `__FORGEWP_OPTION_${optionName}__`;
}

export function useWpThemeMod(modName: string, defaultValue = ''): string {
  if (IS_DECOUPLED) return _useWpThemeMod(modName, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    const siteSettings =
      win._forgeWpMockSiteSettings || win.forgeWpHydration?.siteSettings;
    if (siteSettings?.theme_mods?.[modName] !== undefined) {
      const value = siteSettings.theme_mods[modName];
      // Handle false/null values from WordPress
      if (value === false || value === null) {
        return defaultValue || `[theme_mod: ${modName}]`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? `__FORGEWP_THEME_MOD_${modName}_DEFAULT_${encodeURIComponent(defaultValue)}__`
    : `__FORGEWP_THEME_MOD_${modName}__`;
}

export function useWpThemeUri(): string {
  if (IS_DECOUPLED) return _useWpThemeUri();
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    return (window as any).forgeWpHydration?.themeUri || '';
  }
  return '__FORGEWP_THEME_URI__';
}

export function useWpPageLink(name: string, fallback: string): string {
  if (IS_DECOUPLED) return _useWpPageLink(name, fallback);
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    const win = window as any;
    if (win.forgeWpHydration?.pageLinks?.[name]) {
      return win.forgeWpHydration.pageLinks[name];
    }
  }
  return fallback
    ? `__FORGEWP_PAGELINK_${name}_DEFAULT_${encodeURIComponent(fallback)}__`
    : `__FORGEWP_PAGELINK_${name}__`;
}

export function useWpPagePath(name: string, fallback: string): string {
  const href = useWpPageLink(name, fallback);
  return React.useMemo(() => {
    try {
      return new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    } catch (e) {
      return href;
    }
  }, [href]);
}
const queryCache = new Map<string, { posts: any[]; total: number; hasMore: boolean; totalPages?: number }>();

const activeQueries = new Set<{
  args: any;
  querySelector: (params: URLSearchParams) => any;
  execute: (targetArgs: any) => Promise<any>;
}>();

let prefetchTimeout: any = null;

async function fetchWpApi(args: any, page: number) {
  const {
    postType = 'post',
    postsPerPage = 10,
    categoryName = '',
    s = '',
    orderby = 'date',
    order = 'DESC',
  } = args;

  const endpoint =
    postType === 'post'
      ? 'posts'
      : postType === 'page'
        ? 'pages'
        : postType;
  const params = new URLSearchParams();
  params.append('per_page', String(postsPerPage));
  params.append('page', String(page));
  params.append('_embed', '1');
  if (s) {
    params.append('search', s);
  }
  if (orderby) {
    params.append('orderby', orderby === 'date' ? 'date' : orderby);
  }
  if (order) {
    params.append('order', order.toLowerCase());
  }
  if (categoryName) {
    params.append('category_name', categoryName);
  }

  // Polylang multi-language query support
  const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage;
  if (currentLang) {
    params.append('lang', currentLang);
  }

  const apiBase = (typeof window !== 'undefined' && (window as any).FORGEWP_API_URL) ||
    (import.meta as any).env?.VITE_WP_API_URL ||
    (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env && ((globalThis as any).process.env.NEXT_PUBLIC_WP_API_URL || (globalThis as any).process.env.WP_API_URL)) ||
    (() => {
      const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home || '';
      if (homeUrl) {
        try {
          return new URL(homeUrl).pathname.replace(/\/$/, '');
        } catch (e) {}
      }
      return '';
    })();
  const fetchUrl = `${apiBase}/wp-json/wp/v2/${endpoint}?${params.toString()}`;
  console.log(`[useWpQuery] Fetching CPT "${postType}" from URL:`, fetchUrl);

  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('forgewp_jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(fetchUrl, { headers });
  if (!response.ok) {
    throw new Error(
      `WordPress API returned ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid response format from WordPress API');
  }
  console.log(`[useWpQuery] Successfully loaded ${data.length} items for CPT "${postType}"`);

  const cleanHtml = (html: string) => {
    if (!html) return '';
    return decodeHtmlEntities(html.replace(/<\/?[^>]+(>|$)/g, '')).trim();
  };

  const mappedPosts: WpPost[] = data.map((wp: any) => {
    let featuredImage = 'https://picsum.photos/seed/forgewp/1200/630';
    if (
      wp._embedded &&
      wp._embedded['wp:featuredmedia'] &&
      wp._embedded['wp:featuredmedia'][0]
    ) {
      const media = wp._embedded['wp:featuredmedia'][0];
      featuredImage = media.source_url || featuredImage;
    } else if (wp.featured_media_src_url) {
      featuredImage = wp.featured_media_src_url;
    }

    const _terms: Record<string, any[]> = {};
    if (wp._embedded && wp._embedded['wp:term']) {
      for (const termGroup of wp._embedded['wp:term']) {
        if (Array.isArray(termGroup) && termGroup.length > 0) {
          const taxonomy = termGroup[0].taxonomy;
          if (taxonomy) {
            _terms[taxonomy] = termGroup.map((t: any) => ({
              id: t.id,
              slug: t.slug,
              name: typeof t.name === 'string' ? decodeHtmlEntities(t.name) : '',
            }));
          }
        }
      }
    }

    return {
      id: wp.id,
      title:
        typeof wp.title === 'object' ? decodeHtmlEntities(wp.title.rendered) : decodeHtmlEntities(wp.title || ''),
      excerpt:
        typeof wp.excerpt === 'object'
          ? cleanHtml(wp.excerpt.rendered)
          : cleanHtml(wp.excerpt || ''),
      content:
        typeof wp.content === 'object'
          ? wp.content.rendered
          : wp.content || '',
      date: wp.date
        ? new Date(wp.date).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '',
      modified: wp.modified
        ? new Date(wp.modified).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '',
      author:
        wp._embedded &&
        wp._embedded['author'] &&
        wp._embedded['author'][0]
          ? wp._embedded['author'][0].name
          : 'Admin',
      featuredImage,
      permalink: wp.link,
      customFields: { ...(wp.acf || {}), ...(wp.meta || {}) },
      _terms,
      __postType: wp.type || postType,
    };
  });

  const totalPagesHeader = response.headers.get('X-WP-TotalPages');
  const totalPages = totalPagesHeader
    ? parseInt(totalPagesHeader, 10)
    : 1;

  const totalHeader = response.headers.get('X-WP-Total');
  const total = totalHeader
    ? parseInt(totalHeader, 10)
    : mappedPosts.length;

  return {
    posts: mappedPosts,
    hasMore: page < totalPages && mappedPosts.length > 0,
    total,
    totalPages,
  };
}

export function useWpQuery(args: WpQueryArgs = {}): WpQueryResults {
  if (IS_DEV) {
    return _useWpQuery(args);
  }

  // Node SSR (Compile-time)
  if (typeof window === 'undefined' || (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime)) {
    // In production WordPress themes, dynamic hydration islands should SSR in a loading state
    // so that the initial page layout contains loading skeletons instead of developer's compile-time mock data.
    return {
      posts: [],
      loading: true,
      error: null,
      hasMore: true,
      totalPages: 1,
      currentPage: 1,
      loadMore: async () => {},
      goToPage: (_n: number) => {},
      refetch: async () => {},
    };
  }

  // Browser (Hydration/Production Client)
  const {
    postType = 'post',
    postsPerPage = 10,
    categoryName = '',
    s = '',
    paged = 1,
    orderby = 'date',
    order = 'DESC',
  } = args;

  const queryKey = JSON.stringify({
    postType,
    postsPerPage,
    categoryName,
    s,
    paged,
    orderby,
    order,
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

  const [posts, setPosts] = React.useState<WpPost[]>(initialState ? initialState.posts : []);
  const [loading, setLoading] = React.useState(initialState ? false : true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(paged);
  const [hasMore, setHasMore] = React.useState(initialState ? initialState.hasMore : true);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const hydratedFromSsrRef = React.useRef(initialState ? true : false);
  // 'append' = loadMore behaviour; 'replace' = goToPage behaviour
  const pageModeRef = React.useRef<'append' | 'replace'>('replace');

  const [prevQueryKey, setPrevQueryKey] = React.useState(queryKey);
  if (prevQueryKey !== queryKey) {
    setPrevQueryKey(queryKey);
    setCurrentPage(1);
    setPosts([]);
    setHasMore(true);
    pageModeRef.current = 'replace';
    hydratedFromSsrRef.current = false;
  }

  const executeProdQuery = React.useCallback(
    async (page: number) => {
      const mode = pageModeRef.current;
      // Consume the mode; subsequent calls revert to append (for loadMore)
      pageModeRef.current = 'append';

      const cacheKey = JSON.stringify({ ...args, paged: page });
      if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey)!;
        setPosts((prev: WpPost[]) => {
          if (mode === 'append') {
            const existingIds = new Set(prev.map((p: WpPost) => p.id));
            const newPosts = cached.posts.filter((p: WpPost) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          }
          return cached.posts;
        });
        setHasMore(cached.hasMore);
        if ((cached as any).totalPages) setTotalPages((cached as any).totalPages);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const { posts: fetchedPosts, hasMore: nextPageHasMore, total: totalCount, totalPages: tp } = await fetchWpApi(args, page);
        queryCache.set(cacheKey, { posts: fetchedPosts, hasMore: nextPageHasMore, total: totalCount, totalPages: tp });

        setPosts((prev: WpPost[]) => {
          if (mode === 'append') {
            const existingIds = new Set(prev.map((p: WpPost) => p.id));
            const newPosts = fetchedPosts.filter((p: WpPost) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          }
          return fetchedPosts;
        });
        setHasMore(nextPageHasMore);
        setTotalPages(tp);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch from WordPress API');
      } finally {
        setLoading(false);
      }
    },
    [queryKey, args],
  );

  React.useEffect(() => {
    if (hydratedFromSsrRef.current) {
      hydratedFromSsrRef.current = false;
      return;
    }
    executeProdQuery(currentPage);
  }, [executeProdQuery, currentPage]);

  const querySelector = React.useCallback((params: URLSearchParams) => {
    const target = { ...args };
    if (params.has('q') || params.has('s')) {
      target.s = params.get('q') || params.get('s') || '';
    }
    if (params.has('category')) {
      target.categoryName = params.get('category') || '';
    }
    return target;
  }, [args]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const item = {
      args,
      querySelector,
      execute: async (targetArgs: any) => {
        const cacheKey = JSON.stringify({ ...targetArgs, paged: 1 });
        if (queryCache.has(cacheKey)) return;
        try {
          const res = await fetchWpApi(targetArgs, 1);
          queryCache.set(cacheKey, res);
        } catch (e) {}
      }
    };
    activeQueries.add(item);
    return () => {
      activeQueries.delete(item);
    };
  }, [args, querySelector]);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    pageModeRef.current = 'append';
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
  }, [currentPage, loading, hasMore]);

  const goToPage = React.useCallback((targetPage: number) => {
    if (loading) return;
    if (targetPage < 1 || targetPage > totalPages) return;
    pageModeRef.current = 'replace';
    setPosts([]);
    setCurrentPage(targetPage);
  }, [loading, totalPages]);

  const refetch = React.useCallback(async () => {
    pageModeRef.current = 'replace';
    setCurrentPage(1);
    executeProdQuery(1);
  }, [executeProdQuery]);

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

export function useWpCategories(): string {
  if (IS_DEV) return '<a href="#">Technology</a>, <a href="#">Design</a>';
  return '__FORGEWP_THE_CATEGORY_LIST__';
}
export function useWpArchiveTitle(): string {
  if (IS_DEV) return 'Category: Technology';
  return '__FORGEWP_THE_ARCHIVE_TITLE__';
}

export function useWpTaxonomyList(taxonomy: string, defaultValue = ''): string {
  if (IS_DEV) {
    const post = React.useContext(WpPostContext);
    const terms = (post as any)?._terms?.[taxonomy];
    if (Array.isArray(terms) && terms.length > 0) {
      return terms.map((t: any) => t.name).join(', ');
    }
    return defaultValue || `[taxonomy: ${taxonomy}]`;
  }
  return `__FORGEWP_TAXONOMY_LIST_${taxonomy}__`;
}

// ── useWpTerms — fetch all terms for a given taxonomy ─────────────────────────
// Dev:  reads `_taxonomy_<name>` key from mock-data.json
// SSR:  returns [] synchronously (Hydrate island loads in browser)
// Prod: fetches /wp-json/wp/v2/<taxonomy>?per_page=100

export interface WpTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  meta: Record<string, any>;
}

export function useWpTerms(taxonomy: string): { terms: WpTerm[]; loading: boolean; error: string | null } {
  if (IS_DEV) {
    const raw: any[] = (getDevMockPosts() as any)?.[`_taxonomy_${taxonomy}`] || [];
    const terms: WpTerm[] = raw.map((t: any) => ({
      id: t.id ?? 0,
      name: t.name ?? '',
      slug: t.slug ?? '',
      description: t.description ?? '',
      count: t.count ?? 0,
      meta: t.meta ?? {},
    }));
    return { terms, loading: false, error: null };
  }

  // Node SSR — return empty; Hydrate wrapper will load in browser
  if (typeof window === 'undefined') {
    return { terms: [], loading: true, error: null };
  }

  // Browser production — live WP REST API fetch
  const [terms, setTerms] = React.useState<WpTerm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const endpoint = taxonomy === 'category' ? 'categories' : taxonomy === 'post_tag' ? 'tags' : taxonomy;
    const apiBase = (typeof window !== 'undefined' && (window as any).FORGEWP_API_URL) ||
      (import.meta as any).env?.VITE_WP_API_URL ||
      (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env && ((globalThis as any).process.env.NEXT_PUBLIC_WP_API_URL || (globalThis as any).process.env.WP_API_URL)) ||
      (() => {
        const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home || '';
        if (homeUrl) {
          try {
            return new URL(homeUrl).pathname.replace(/\/$/, '');
          } catch (e) {}
        }
        return '';
      })();
    const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage;
    const langParam = currentLang ? `&lang=${currentLang}` : '';
    const fetchUrl = `${apiBase}/wp-json/wp/v2/${endpoint}?per_page=100&_fields=id,name,slug,description,count,acf,meta${langParam}`;
    console.log(`[useWpTerms] Fetching taxonomy "${taxonomy}" from URL:`, fetchUrl);

    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('forgewp_jwt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    fetch(fetchUrl, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`WP Terms API ${taxonomy}: ${res.status}`);
        return res.json();
      })
      .then((data: any[]) => {
        if (cancelled) return;
        console.log(`[useWpTerms] Successfully loaded ${data.length} terms for taxonomy "${taxonomy}"`);
        setTerms(
          data.map((t) => ({
            id: t.id,
            name: typeof t.name === 'string' ? decodeHtmlEntities(t.name) : '',
            slug: t.slug || '',
            description: t.description || '',
            count: t.count || 0,
            meta: { ...(t.acf || {}), ...(t.meta || {}) },
          }))
        );
        setError(null);
      })
      .catch((err: any) => {
        if (!cancelled) {
          console.error(`[useWpTerms] Error loading taxonomy "${taxonomy}":`, err);
          setError(err.message || `Failed to load ${taxonomy} terms`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taxonomy]);

  return { terms, loading, error };
}



// ── WpQueryLoop — data bridge wraps @forgewp/react with mock data ─────────────

export function WpQueryLoop({
  postType = 'post',
  postsPerPage = 3,
  categoryName = '',
  orderby = '',
  order = '',
  children,
}: WpQueryLoopProps & { orderby?: string; order?: string }) {
  if (IS_DEV) {
    let posts = (getDevMockPosts() as any)?.[postType] || [];
    if (orderby === 'rand') {
      posts = [...posts].sort(() => Math.random() - 0.5);
    } else if (orderby === 'title') {
      posts = [...posts].sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return order === 'ASC' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      });
    } else if (orderby === 'date') {
      posts = [...posts].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return order === 'ASC' ? dateA - dateB : dateB - dateA;
      });
    }
    return (
      <_WpQueryLoop
        posts={posts}
        postType={postType}
        postsPerPage={postsPerPage}
        categoryName={categoryName}
      >
        {children}
      </_WpQueryLoop>
    );
  }

  // Production: compiler transforms these custom elements into WordPress loop PHP
  return (
    <>
      {/* @ts-ignore */}
      <forgewp-query-loop-start
        postType={postType}
        postsPerPage={postsPerPage}
        categoryName={categoryName}
        orderby={orderby}
        order={order}
      />
      {children}
      {/* @ts-ignore */}
      <forgewp-query-loop-end />
    </>
  );
}

// ── WpLoop — simple all-posts loop (no postType arg) ─────────────────────────

export function WpLoop({ children }: { children: React.ReactNode }) {
  if (IS_DEV) {
    const posts = (getDevMockPosts() as any)?.post || [];
    return <_WpQueryLoop posts={posts}>{children}</_WpQueryLoop>;
  }
  return (
    <>
      {/* @ts-ignore */}
      <forgewp-loop-start />
      {children}
      {/* @ts-ignore */}
      <forgewp-loop-end />
    </>
  );
}

// ── useWpMenu ────────────────────────────────────────────────────────────────

export function useWpMenu(location: string = 'primary'): { items: WpMenuItem[]; loading: boolean } {
  if (IS_DEV) {
    return _useWpMenu(location);
  }

  // Node SSR (Compile-time)
  if (typeof window === "undefined" || (window as any)._forgeWpCompileTime) {
    return { items: [], loading: true };
  }

  // Browser production hydration client
  const items = (window as any).forgeWpHydration?.menus?.[location] || [];
  return { items, loading: false };
}

// ── WpMenu — data bridge wraps @forgewp/react with menus.json ────────────────

export function WpMenu({
  location = 'primary',
  className = '',
  linkClassName = '',
}: WpMenuProps) {
  const { items } = useWpMenu(location);

  if (IS_DEV) {
    return (
      <_WpMenu
        items={items}
        location={location}
        className={className}
        linkClassName={linkClassName}
      />
    );
  }

  // Production browser hydration client: render menu items from localized PHP data
  if (typeof window !== "undefined" && !(window as any)._forgeWpCompileTime) {
    if (items.length > 0) {
      return (
        <nav className={className}>
          {items.map((item: any, idx: number) => (
            <a key={idx} href={item.url} className={linkClassName}>
              {item.title}
            </a>
          ))}
        </nav>
      );
    }
    
    // Server-matching fallback nav to guarantee zero hydration mismatch
    return (
      <nav className={className}>
        <a href="/" className={linkClassName}>
          Home
        </a>
      </nav>
    );
  }

  // Production: compiler transforms this into wp_nav_menu()
  return (
    // @ts-ignore
    <forgewp-menu
      location={location}
      className={className}
      linkClassName={linkClassName}
    />
  );
}

// ── BlockArea ────────────────────────────────────────────────────────────────
export function BlockArea(props: BlockAreaProps) {
  if (IS_DECOUPLED) {
    return <_BlockArea {...props} />;
  }
  return (
    // @ts-ignore
    <forgewp-block-area name={props.name} />
  );
}

// ── WpShortcode ──────────────────────────────────────────────────────────────
export function WpShortcode({ code }: WpShortcodeProps) {
  if (IS_DECOUPLED) {
    return <_WpShortcode code={code} />;
  }
  return (
    // @ts-ignore
    <forgewp-shortcode code={code} />
  );
}

export function WpHead(props: WpHeadProps) {
  if (IS_DECOUPLED) {
    return <_WpHead {...props} />;
  }
  return (
    // @ts-ignore
    <forgewp-head
      data-title={props.title}
      data-description={props.description}
      data-keywords={props.keywords}
      data-og-title={props.ogTitle}
      data-og-description={props.ogDescription}
      data-og-image={props.ogImage}
      data-og-type={props.ogType}
      data-twitter-card={props.twitterCard}
      data-twitter-creator={props.twitterCreator}
      data-canonical={props.canonical}
    />
  );
}
export type { WpHeadProps, WpImageProps, WpAttachment, WpRepeaterProps, WpIconProps };

export function WpImage(props: WpImageProps) {
  if (IS_DECOUPLED) {
    const attachments = (getDevMockPosts() as any)?.attachment || [];
    return (
      <_WpImage
        {...props}
        attachments={attachments}
      />
    );
  }
  return <_WpImage {...props} />;
}

// ── Routing Wrappers for Dev SPA vs Production Multi-Page WordPress ───────────

export function WpLink({ href, className, children, ...props }: any) {
  if (IS_DECOUPLED) {
    return (
      <WouterLink href={href} className={className} {...props}>
        {children}
      </WouterLink>
    );
  }
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
}
export { WpLink as Link };

export function useWpI18n() {
  const getTranslatedText = (text: string) => {
    if (typeof window === "undefined") {
      return text;
    }
    const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage || 'de';
    const dict = (window as any).forgeWpTranslations?.translations;
    
    if (dict) {
      // 1. Nested dictionary format: { de: { ... }, en: { ... } }
      if (dict[currentLang] && typeof dict[currentLang][text] !== "undefined") {
        return dict[currentLang][text];
      }
      // 2. Flat enqueued active locale format: { 'Kontakt': 'Kontakt' }
      if (typeof dict[text] !== "undefined") {
        return dict[text];
      }
    }
    return text;
  };

  if (IS_DECOUPLED) {
    return {
      __: (text: string) => {
        if (typeof window === "undefined") {
          return text;
        }
        const pathname = window.location.pathname;
        const translations = translationsData || {};
        const languages = Object.keys(translations).length > 0 ? Object.keys(translations) : ['de', 'en'];
        const defaultLanguage = languages[0] || 'de';

        const matchedLang = languages.find(lang => {
          if (lang === defaultLanguage) return false;
          return pathname.startsWith(`/${lang}/`) || pathname === `/${lang}`;
        });
        const currentLang = matchedLang || defaultLanguage;

        const dict = (translationsData as any)?.[currentLang];
        if (dict && typeof dict[text] !== "undefined") {
          return dict[text];
        }
        return text;
      }
    };
  }
  // Node SSR (Compile-time): return the token so the compiler can perform string replacement
  if (typeof window === "undefined" || (window as any)._forgeWpCompileTime) {
    return {
      __: (text: string) => `__FORGEWP_I18N_${text}__`,
    };
  }
  // Production Browser (Hydration & Client-side rendering):
  return {
    __: getTranslatedText,
  };
}
const locationListeners = new Set<(payload: { pathname: string; search: string }) => void>();
let popstateBound = false;

function handleLocationUpdate() {
  const payload = {
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    search: typeof window !== 'undefined' ? window.location.search : '',
  };
  locationListeners.forEach((listener) => listener(payload));
}

function subscribeToLocation(listener: (payload: { pathname: string; search: string }) => void) {
  locationListeners.add(listener);
  if (typeof window !== 'undefined' && !popstateBound) {
    window.addEventListener('popstate', handleLocationUpdate);
    popstateBound = true;
  }
  return () => {
    locationListeners.delete(listener);
    if (locationListeners.size === 0 && typeof window !== 'undefined' && popstateBound) {
      window.removeEventListener('popstate', handleLocationUpdate);
      popstateBound = false;
    }
  };
}

function navigateTo(to: string) {
  if (typeof window === 'undefined') return;
  try {
    const targetUrl = new URL(to, window.location.href);
    if (targetUrl.pathname === window.location.pathname) {
      window.history.pushState(null, '', to);
      handleLocationUpdate();
    } else {
      window.location.href = to;
    }
  } catch (e) {
    window.location.href = to;
  }
}

export function useWpPrefetch() {
  if (IS_DECOUPLED) {
    return _useWpPrefetch();
  }
  const prefetch = React.useCallback((to: string) => {
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

export function useWpLocation() {
  const prefetch = useWpPrefetch();
  if (IS_DECOUPLED) {
    const [wLoc, wNavigate] = useWouterLocation();
    return [wLoc, wNavigate, prefetch] as const;
  }
  const [loc, setLoc] = React.useState(typeof window !== "undefined" ? window.location.pathname : "/");

  React.useEffect(() => {
    return subscribeToLocation((payload) => {
      setLoc(payload.pathname);
    });
  }, []);

  const navigate = React.useCallback((to: string) => {
    navigateTo(to);
  }, []);

  return [loc, navigate, prefetch] as const;
}
export { useWpLocation as useLocation };

export function useWpSearch() {
  if (IS_DECOUPLED) {
    return useWouterSearch();
  }
  const [search, setSearch] = React.useState(typeof window !== "undefined" ? window.location.search : "");

  React.useEffect(() => {
    return subscribeToLocation((payload) => {
      setSearch(payload.search);
    });
  }, []);

  return search;
}
export { useWpSearch as useSearch };

export function useWpSearchParams(): URLSearchParams {
  const search = useWpSearch();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}


export function useWpLanguage() {
  if (IS_DECOUPLED) {
    const translations = translationsData || {};
    const languages = Object.keys(translations).length > 0 ? Object.keys(translations) : ['de', 'en'];
    const defaultLanguage = languages[0] || 'de';

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    // Find if the path starts with one of the non-default languages, e.g. "/en" or "/en/"
    const matchedLang = languages.find(lang => {
      if (lang === defaultLanguage) return false;
      return pathname.startsWith(`/${lang}/`) || pathname === `/${lang}`;
    });
    const currentLanguage = matchedLang || defaultLanguage;

    // Generate URLs dynamically
    const urls: Record<string, string> = {};
    const homeUrls: Record<string, string> = {};
    languages.forEach(lang => {
      const url = lang === defaultLanguage ? '/' : `/${lang}/`;
      urls[lang] = url;
      homeUrls[lang] = url;
    });

    const homeUrl = homeUrls[currentLanguage] || '/';

    const switchLanguage = React.useCallback((lang: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = urls[lang] || (lang === defaultLanguage ? '/' : `/${lang}/`);
      }
    }, [urls, defaultLanguage]);

    return {
      currentLanguage,
      languages,
      urls,
      homeUrls,
      homeUrl,
      switchLanguage,
    };
  }

  const translations = typeof window !== 'undefined' ? (window as any).forgeWpTranslations : null;
  
  // Dynamic current language slug enqueued by WordPress
  const currentLanguage = translations?.currentLanguage || 'de';

  // Dynamic dictionary mapping active language slugs to translation counterpart URLs
  const urls: Record<string, string> = translations?.urls || { de: '/' };

  // Dynamic dictionary mapping active language slugs to home page URLs
  const homeUrls: Record<string, string> = translations?.homeUrls || { de: '/' };
  const homeUrl = homeUrls[currentLanguage] || '/';

  // Dynamic list of active language slugs enqueued on the site
  const languages = React.useMemo(() => Object.keys(urls), [urls]);

  // Redirection helper to switch safely between languages
  const switchLanguage = React.useCallback((lang: string) => {
    if (typeof window !== 'undefined') {
      if (urls && urls[lang]) {
        window.location.href = urls[lang];
      } else {
        window.location.href = lang === 'de' ? '/' : `/${lang}/`;
      }
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


// ── Compiler custom element JSX declarations ──────────────────────────────────

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'forgewp-menu': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            location?: 'primary' | 'footer' | 'sidebar' | string;
            linkClassName?: string;
          },
          HTMLElement
        >;
        'forgewp-query-loop-start': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            postType?: string;
            postsPerPage?: number;
            categoryName?: string;
            orderby?: string;
            order?: string;
          },
          HTMLElement
        >;
        'forgewp-query-loop-end': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-loop-start': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-loop-end': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-shortcode': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            code?: string;
          },
          HTMLElement
        >;
        'forgewp-head': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            'data-title'?: string;
            'data-description'?: string;
            'data-keywords'?: string;
            'data-og-title'?: string;
            'data-og-description'?: string;
            'data-og-image'?: string;
            'data-og-type'?: string;
            'data-twitter-card'?: string;
            'data-twitter-creator'?: string;
            'data-canonical'?: string;
          },
          HTMLElement
        >;
        'forgewp-image': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            'data-id'?: string;
            'data-field'?: string;
            'data-size'?: string;
            'data-class-name'?: string;
            'data-alt'?: string;
          },
          HTMLElement
        >;
        'forgewp-block-area': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            name?: string;
          },
          HTMLElement
        >;
        'forgewp-repeater-start': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            name?: string;
            subfields?: string;
          },
          HTMLElement
        >;
        'forgewp-repeater-end': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-icon-placeholder': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            name?: string;
            provider?: string;
            class?: string;
          },
          HTMLElement
        >;
        'forgewp-auth-gate-start': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-auth-gate-fallback': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-auth-gate-end': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-capability-gate-start': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            allowed?: string;
          },
          HTMLElement
        >;
        'forgewp-capability-gate-fallback': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-capability-gate-end': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        'forgewp-require-auth': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            allowed?: string;
            redirect?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}
