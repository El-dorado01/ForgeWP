/**
 * System File Blueprints — ForgeWP Compiler
 *
 * These are fallback templates used by the compiler's self-healing preflight check.
 * If a developer accidentally deletes a system-critical library file,
 * the compiler will automatically recreate it to prevent compilation and runtime errors.
 */

export const SYSTEM_BLUEPRINTS = {
  'cms/menus.json': `{
  "_comment": "⚡ ForgeWP Navigation Menus — Edit this file to add/remove links in local dev. Run 'pnpm forgewp sync:routes' to auto-scaffold corresponding React pages!",
  "primary": [
    { "title": "Home", "url": "/" },
    { "title": "New", "url": "/new" },
    { "title": "Men", "url": "/men" },
    { "title": "Women", "url": "/women" }
  ],
  "utility": [
    { "title": "Help", "url": "/help" },
    { "title": "Sign In", "url": "/login" }
  ]
}`,

  'cms/mock-data.json': `{
  "post": [
    {
      "id": 1,
      "title": "Welcome to ForgeWP: The Headless Revolution",
      "excerpt": "Discover how ForgeWP bridges standard WordPress themes with blistering fast React architectures.",
      "content": "<p>This is the first mock post. In local dev, you can modify <code>cms/mock-data.json</code> to test layout content changes.</p>",
      "date": "2026-05-10T09:00:00Z",
      "author": "Antigravity",
      "featuredImage": {
        "id": 101,
        "url": "https://picsum.photos/seed/forgewp/1200/630",
        "alt": "ForgeWP Logo and Brand Artwork",
        "title": "ForgeWP Logo",
        "caption": "A high-fidelity minimalist logo graphic.",
        "width": 1200,
        "height": 630,
        "sizes": {
          "thumbnail": { "url": "https://picsum.photos/seed/forgewp/150/150", "width": 150, "height": 150 },
          "medium":    { "url": "https://picsum.photos/seed/forgewp/300/300", "width": 300, "height": 300 },
          "large":     { "url": "https://picsum.photos/seed/forgewp/1024/768", "width": 1024, "height": 768 }
        }
      },
      "customFields": { "read_time": "5" },
      "_terms": {
        "category": [
          { "id": 1, "slug": "tutorials", "name": "Tutorials" },
          { "id": 2, "slug": "framework",  "name": "Framework" }
        ],
        "post_tag": [
          { "id": 10, "slug": "react",     "name": "React" },
          { "id": 11, "slug": "wordpress", "name": "WordPress" }
        ]
      }
    },
    {
      "id": 2,
      "title": "Unlocking Brutalist Web Design Aesthetics",
      "excerpt": "A deep dive into high-contrast grids, sharp corners, and premium flat shadows in modern interfaces.",
      "content": "<p>This is the second mock post. Style these grids using beautiful Tailwind utilities.</p>",
      "date": "2026-05-12T14:30:00Z",
      "author": "DeepMind Partner",
      "featuredImage": "https://picsum.photos/seed/brutalist/1200/630",
      "customFields": { "read_time": "8" },
      "_terms": {
        "category": [
          { "id": 3, "slug": "design", "name": "Design" },
          { "id": 4, "slug": "css",    "name": "CSS" }
        ],
        "post_tag": [
          { "id": 12, "slug": "brutalism", "name": "Brutalism" },
          { "id": 13, "slug": "tailwind",  "name": "Tailwind" }
        ]
      }
    }
  ],
  "project": [
    {
      "id": 1,
      "title": "ForgeWP Scaffolding Platform",
      "excerpt": "Building a custom compiler framework to transpile React elements into standard PHP themes.",
      "content": "<p>Detailed description of the ForgeWP compiler pipeline project.</p>",
      "date": "2026-05-15T12:00:00Z",
      "author": "Lead Architect",
      "featuredImage": "https://picsum.photos/seed/platform/1200/630",
      "customFields": {
        "client_name": "El Dorado",
        "project_budget": "45000",
        "status": "active"
      },
      "_terms": {
        "project_type": [{ "id": 20, "slug": "open-source", "name": "Open Source" }],
        "technology":   [{ "id": 30, "slug": "react", "name": "React" }]
      }
    },
    {
      "id": 2,
      "title": "Brutalist Starter Theme",
      "excerpt": "A clean, responsive, and robust high-contrast interface leveraging Tailwind CSS v4.",
      "content": "<p>A brutalist theme showcasing raw black borders and vivid accent colors.</p>",
      "date": "2026-05-16T16:00:00Z",
      "author": "Theme Engineer",
      "featuredImage": "https://picsum.photos/seed/starter/1200/630",
      "customFields": {
        "client_name": "ForgeWP Community",
        "project_budget": "0",
        "status": "completed"
      },
      "_terms": {
        "project_type": [{ "id": 20, "slug": "open-source", "name": "Open Source" }],
        "technology":   [{ "id": 32, "slug": "tailwind", "name": "Tailwind CSS" }]
      }
    }
  ],
  "attachment": [
    {
      "id": 101,
      "url": "https://picsum.photos/seed/forgewp/1200/630",
      "alt": "ForgeWP Logo and Brand Artwork",
      "title": "ForgeWP Logo",
      "caption": "A high-fidelity minimalist logo graphic.",
      "width": 1200,
      "height": 630,
      "sizes": {
        "thumbnail": { "url": "https://picsum.photos/seed/forgewp/150/150", "width": 150, "height": 150 },
        "medium":    { "url": "https://picsum.photos/seed/forgewp/300/300", "width": 300, "height": 300 },
        "large":     { "url": "https://picsum.photos/seed/forgewp/1024/768", "width": 1024, "height": 768 }
      }
    },
    {
      "id": 102,
      "url": "https://picsum.photos/seed/layout/1200/800",
      "alt": "Brutalist Layout Preview",
      "title": "Layout Preview",
      "width": 1200,
      "height": 800,
      "sizes": {
        "thumbnail": { "url": "https://picsum.photos/seed/layout/150/150", "width": 150, "height": 150 },
        "medium":    { "url": "https://picsum.photos/seed/layout/300/300", "width": 300, "height": 300 }
      }
    }
  ]
}`,

  'src/.forgewp/forgewp-config.ts': `export interface ColorPreset {
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

export interface ForgeWPThemeConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  textDomain: string;
  /** Design aesthetic style — "forgewp" (sharp edges, high-contrast) or "shadcn" (smooth rounded modern) */
  style?: "forgewp" | "shadcn";
  // Design Tokens (Phase 5)
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
`,

  'src/.forgewp/wordpress.tsx': `/**
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
  useWpAuthor as _useWpAuthor,
  useWpFeaturedImage as _useWpFeaturedImage,
  useWpCustomField as _useWpCustomField,
  useWpOption as _useWpOption,
  useWpThemeMod as _useWpThemeMod,
  useWpThemeUri as _useWpThemeUri,
  useWpQuery as _useWpQuery,
  WpHead as _WpHead,
  WpImage as _WpImage,
  WpPostContext,
} from '@forgewp/react';

export { WpPostContext };

import type {
  WpQueryLoopProps,
  WpMenuProps,
  WpHeadProps,
  WpImageProps,
  WpAttachment,
  WpQueryArgs,
  WpQueryResults,
  WpPost,
  WpShortcodeProps,
} from '@forgewp/react';

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  // @ts-ignore
  import.meta.env?.DEV === true;

if (IS_DEV) {
  if (typeof window !== 'undefined') {
    (window as any)._forgeWpMockSiteSettings = siteSettings;
    (window as any)._forgeWpMockPosts = mockData;
  }
}

// ── Re-export pure hooks with compiler token fallbacks ────────────────────────
// In dev: @forgewp/react hook returns the mock value from WpPostContext.
// In prod: compiler replaces the call with the PHP equivalent below.

export function useWpTitle(): string {
  if (IS_DEV) return _useWpTitle();
  return '__FORGEWP_THE_TITLE__';
}
export function useWpContent(): string {
  if (IS_DEV) return _useWpContent();
  return '__FORGEWP_THE_CONTENT__';
}
export function useWpExcerpt(): string {
  if (IS_DEV) return _useWpExcerpt();
  return '__FORGEWP_THE_EXCERPT__';
}
export function useWpPermalink(): string {
  if (IS_DEV) return _useWpPermalink();
  return '__FORGEWP_THE_PERMALINK__';
}
export function useWpDate(): string {
  if (IS_DEV) return _useWpDate();
  return '__FORGEWP_THE_DATE__';
}
export function useWpAuthor(): string {
  if (IS_DEV) return _useWpAuthor();
  return '__FORGEWP_THE_AUTHOR__';
}
export function useWpFeaturedImage(): string {
  if (IS_DEV) return _useWpFeaturedImage();
  return '__FORGEWP_THE_POST_THUMBNAIL_URL__';
}
export function useWpCustomField(fieldName: string, defaultValue = ''): string {
  if (IS_DEV) return _useWpCustomField(fieldName, defaultValue);
  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';
}

export function useWpOption(optionName: string, defaultValue = ''): string {
  if (IS_DEV) return _useWpOption(optionName, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    const siteSettings =
      win._forgeWpMockSiteSettings || win.forgeWpHydration?.siteSettings;
    if (siteSettings?.options?.[optionName] !== undefined) {
      const value = siteSettings.options[optionName];
      // Handle false/null values from WordPress
      if (value === false || value === null) {
        return defaultValue || \`[option: \${optionName}]\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \`__FORGEWP_OPTION_\${optionName}_DEFAULT_\${encodeURIComponent(defaultValue)}__\`
    : \`__FORGEWP_OPTION_\${optionName}__\`;
}

export function useWpThemeMod(modName: string, defaultValue = ''): string {
  if (IS_DEV) return _useWpThemeMod(modName, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    const siteSettings =
      win._forgeWpMockSiteSettings || win.forgeWpHydration?.siteSettings;
    if (siteSettings?.theme_mods?.[modName] !== undefined) {
      const value = siteSettings.theme_mods[modName];
      // Handle false/null values from WordPress
      if (value === false || value === null) {
        return defaultValue || \`[theme_mod: \${modName}]\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \`__FORGEWP_THEME_MOD_\${modName}_DEFAULT_\${encodeURIComponent(defaultValue)}__\`
    : \`__FORGEWP_THEME_MOD_\${modName}__\`;
}

export function useWpThemeUri(): string {
  if (IS_DEV) return _useWpThemeUri();
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    return (window as any).forgeWpHydration?.themeUri || '';
  }
  return '__FORGEWP_THEME_URI__';
}

export function useWpQuery(args: WpQueryArgs = {}): WpQueryResults {
  if (IS_DEV) {
    return _useWpQuery(args);
  }

  // Node SSR (Compile-time)
  if (typeof window === 'undefined') {
    const {
      postType = 'post',
      postsPerPage = 10,
      categoryName = '',
      s = '',
      paged = 1,
      orderby = 'date',
      order = 'DESC',
    } = args;

    const mockDb = (mockData as any)?.[postType] || [];
    let filtered = [...mockDb];

    if (s) {
      const query = s.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(query)) ||
          (p.content && p.content.toLowerCase().includes(query)) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(query)),
      );
    }

    if (categoryName) {
      const catLower = categoryName.toLowerCase();
      filtered = filtered.filter((p) => {
        const fields = JSON.stringify(p.customFields || {}).toLowerCase();
        return (
          fields.includes(catLower) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(catLower))
        );
      });
    }

    filtered.sort((a, b) => {
      let valA = (a as any)[orderby] || '';
      let valB = (b as any)[orderby] || '';

      if (orderby === 'date') {
        valA = new Date(a.date || 0).getTime();
        valB = new Date(b.date || 0).getTime();
      }

      if (order === 'DESC') {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      } else {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      }
    });

    const start = 0;
    const end = paged * postsPerPage;
    const pageItems = filtered.slice(start, end);

    return {
      posts: pageItems,
      loading: false,
      error: null,
      hasMore: end < filtered.length,
      loadMore: async () => {},
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

  const [posts, setPosts] = React.useState<WpPost[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(paged);
  const [hasMore, setHasMore] = React.useState(true);

  const executeProdQuery = React.useCallback(
    async (page: number) => {
      setLoading(true);
      try {
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
        const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home || '';
        let apiBase = '';
        if (homeUrl) {
          try {
            apiBase = new URL(homeUrl).pathname.replace(/\\/$/, '');
          } catch (e) {}
        }
        const response = await fetch(
          \`\${apiBase}/wp-json/wp/v2/\${endpoint}?\${params.toString()}\`,
        );
        if (!response.ok) {
          throw new Error(
            \`WordPress API returned \${response.status}: \${response.statusText}\`,
          );
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from WordPress API');
        }

        const cleanHtml = (html: string) => {
          if (!html) return '';
          return html
            .replace(/<\\/?[^>]+(>|$)/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&#8211;/g, '–')
            .replace(/&#8212;/g, '—')
            .replace(/&#8230;/g, '…')
            .trim();
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

          // Build _terms from embedded wp:term taxonomy groups
          const _terms: Record<string, any[]> = {};
          if (wp._embedded && wp._embedded['wp:term']) {
            for (const termGroup of wp._embedded['wp:term']) {
              if (Array.isArray(termGroup) && termGroup.length > 0) {
                const taxonomy = termGroup[0].taxonomy;
                if (taxonomy) {
                  _terms[taxonomy] = termGroup.map((t: any) => ({
                    id: t.id,
                    slug: t.slug,
                    name: t.name,
                  }));
                }
              }
            }
          }

          return {
            id: wp.id,
            title:
              typeof wp.title === 'object' ? wp.title.rendered : wp.title || '',
            excerpt:
              typeof wp.excerpt === 'object'
                ? cleanHtml(wp.excerpt.rendered)
                : cleanHtml(wp.excerpt || ''),
            content:
              typeof wp.content === 'object'
                ? wp.content.rendered
                : wp.content || '',
            date: wp.date
              ? new Date(wp.date).toLocaleDateString('en-US', {
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
            customFields: wp.acf || wp.meta || {},
            _terms,
            __postType: wp.type || postType,
          };
        });

        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        const totalPages = totalPagesHeader
          ? parseInt(totalPagesHeader, 10)
          : 1;

        if (page === 1) {
          setPosts(mappedPosts);
        } else {
          setPosts((prev) => [...prev, ...mappedPosts]);
        }
        setHasMore(page < totalPages && mappedPosts.length > 0);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch from WordPress API');
      } finally {
        setLoading(false);
      }
    },
    [postType, postsPerPage, categoryName, s, orderby, order],
  );

  React.useEffect(() => {
    executeProdQuery(currentPage);
  }, [executeProdQuery, currentPage]);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
  }, [currentPage, loading, hasMore]);

  const refetch = React.useCallback(async () => {
    setCurrentPage(1);
    executeProdQuery(1);
  }, [executeProdQuery]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
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
    return defaultValue || \`[taxonomy: \${taxonomy}]\`;
  }
  return \`__FORGEWP_TAXONOMY_LIST_\${taxonomy}__\`;
}

// ── useWpTerms — fetch all terms for a given taxonomy ─────────────────────────
// Dev:  reads \`_taxonomy_<name>\` key from mock-data.json
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
    const raw: any[] = (mockData as any)?.[\`_taxonomy_\${taxonomy}\`] || [];
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
    return { terms: [], loading: false, error: null };
  }

  // Browser production — live WP REST API fetch
  const [terms, setTerms] = React.useState<WpTerm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const endpoint = taxonomy === 'category' ? 'categories' : taxonomy === 'post_tag' ? 'tags' : taxonomy;
    const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home || '';
    let apiBase = '';
    if (homeUrl) {
      try {
        apiBase = new URL(homeUrl).pathname.replace(/\\/$/, '');
      } catch (e) {}
    }
    fetch(\`\${apiBase}/wp-json/wp/v2/\${endpoint}?per_page=100&_fields=id,name,slug,description,count,meta\`)
      .then((res) => {
        if (!res.ok) throw new Error(\`WP Terms API \${taxonomy}: \${res.status}\`);
        return res.json();
      })
      .then((data: any[]) => {
        if (cancelled) return;
        setTerms(
          data.map((t) => ({
            id: t.id,
            name: t.name || '',
            slug: t.slug || '',
            description: t.description || '',
            count: t.count || 0,
            meta: t.meta || {},
          }))
        );
        setError(null);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || \`Failed to load \${taxonomy} terms\`);
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
  children,
}: WpQueryLoopProps) {
  if (IS_DEV) {
    const posts = (mockData as any)?.[postType] || [];
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
    const posts = (mockData as any)?.post || [];
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

// ── WpMenu — data bridge wraps @forgewp/react with menus.json ────────────────

export function WpMenu({
  location = 'primary',
  className = '',
  linkClassName = '',
}: WpMenuProps) {
  if (IS_DEV) {
    const items = (menusData as any)?.[location] ||
      (mockData as any).menu?.[location] || [
        { title: 'Home', url: '/' },
        { title: 'Blog', url: '/post' },
      ];
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
    const items = (window as any).forgeWpHydration?.menus?.[location] || [];
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

// ── WpShortcode ──────────────────────────────────────────────────────────────
export function WpShortcode({ code }: WpShortcodeProps) {
  if (IS_DEV) {
    return <_WpShortcode code={code} />;
  }
  return (
    // @ts-ignore
    <forgewp-shortcode code={code} />
  );
}

export function WpHead(props: WpHeadProps) {
  if (IS_DEV) {
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
export type { WpHeadProps, WpImageProps, WpAttachment };

export function WpImage(props: WpImageProps) {
  if (IS_DEV) {
    const attachments = (mockData as any)?.attachment || [];
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
  if (IS_DEV) {
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

  if (IS_DEV) {
    return {
      __: (text: string) => {
        if (typeof window === "undefined") {
          return text;
        }
        const pathname = window.location.pathname;
        const isEn = pathname.startsWith('/en');
        const currentLang = isEn ? 'en' : 'de';
        
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
      __: (text: string) => \`__FORGEWP_I18N_\${text}__\`,
    };
  }
  // Production Browser (Hydration & Client-side rendering):
  return {
    __: getTranslatedText,
  };
}

export function useWpLocation() {
  if (IS_DEV) {
    return useWouterLocation();
  }
  const [loc] = React.useState(typeof window !== "undefined" ? window.location.pathname : "/");
  const navigate = React.useCallback((to: string) => {
    if (typeof window !== "undefined") {
      window.location.href = to;
    }
  }, []);
  return [loc, navigate] as const;
}
export { useWpLocation as useLocation };

export function useWpSearch() {
  if (IS_DEV) {
    return useWouterSearch();
  }
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.search;
}
export { useWpSearch as useSearch };

export function useWpLanguage() {
  if (IS_DEV) {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isEn = pathname.startsWith('/en');
    const currentLanguage = isEn ? 'en' : 'de';
    const urls: Record<string, string> = { de: '/', en: '/en/' };
    const languages = ['de', 'en'];
    const switchLanguage = React.useCallback((lang: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = urls[lang] || (lang === 'de' ? '/' : \`/\${lang}/\`);
      }
    }, [urls]);
    return {
      currentLanguage,
      languages,
      urls,
      switchLanguage,
    };
  }

  const translations = typeof window !== 'undefined' ? (window as any).forgeWpTranslations : null;
  
  // Dynamic current language slug enqueued by WordPress
  const currentLanguage = translations?.currentLanguage || 'de';

  // Dynamic dictionary mapping active language slugs to translation URLs
  const urls: Record<string, string> = translations?.urls || { de: '/' };

  // Dynamic list of active language slugs enqueued on the site
  const languages = React.useMemo(() => Object.keys(urls), [urls]);

  // Redirection helper to switch safely between languages
  const switchLanguage = React.useCallback((lang: string) => {
    if (typeof window !== 'undefined') {
      if (urls && urls[lang]) {
        window.location.href = urls[lang];
      } else {
        window.location.href = lang === 'de' ? '/' : \`/\${lang}/\`;
      }
    }
  }, [urls]);

  return {
    currentLanguage,
    languages,
    urls,
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
      }
    }
  }
}
`,

  'src/.forgewp/SEO.tsx': `import * as React from "react";
import * as ReactHelmetAsync from "react-helmet-async";
import { useWpTitle } from "./wordpress";

const defaultKey = "default";
const ReactHelmetLib = (ReactHelmetAsync as any).Helmet
  ? ReactHelmetAsync
  : (ReactHelmetAsync as any)[defaultKey] ?? ReactHelmetAsync;
const Helmet = (ReactHelmetLib as any).Helmet || React.Fragment;

/**
 * ForgeWP SEO — Internal system file. Do not delete.
 *
 * Use this component in \`src/app/layout.tsx\` to set global SEO defaults,
 * and in individual page files to override them per-page.
 *
 * The ForgeWP compiler reads the props you pass here and injects them
 * directly into the WordPress theme's <head> as native meta tags.
 *
 * @see https://forgewp.dev/docs/seo
 */

export interface SEOProps {
  /** Page title — defaults to the WordPress post title via useWpTitle() */
  title?: string;
  /** Meta description for search engines and social cards */
  description?: string;
  /** Comma-separated keywords */
  keywords?: string;
  /** Open Graph title (falls back to title if omitted) */
  ogTitle?: string;
  /** Open Graph description (falls back to description if omitted) */
  ogDescription?: string;
  /** Absolute URL to the Open Graph image */
  ogImage?: string;
  /** Open Graph type — "website" for homepages, "article" for posts */
  ogType?: string;
  /** Twitter card type */
  twitterCard?: string;
  /** Twitter creator handle, e.g. "@username" */
  twitterCreator?: string;
  /** Canonical URL — tells search engines the preferred version of this page */
  canonical?: string;
  /** Set to true to prevent this page from being indexed by search engines */
  noIndex?: boolean;
}

/**
 * \`<SEO>\` — ForgeWP SEO manager.
 *
 * Drop this into your **layout.tsx** to set site-wide defaults.
 * Then drop it into any **page file** to override for that specific template.
 *
 * @example
 * // layout.tsx — global defaults (the compiler reads these for all pages)
 * <SEO
 *   description="Your site tagline or description."
 *   keywords="WordPress, React, Tailwind"
 *   ogImage="https://yoursite.com/og-default.png"
 * />
 *
 * @example
 * // single.tsx — per-page override (article-specific metadata)
 * <SEO
 *   ogType="article"
 *   ogImage="https://yoursite.com/og-post.png"
 *   twitterCreator="@yourhandle"
 * />
 */
export function SEO({
  title,
  description = "A WordPress theme built with ForgeWP — React & Tailwind CSS.",
  keywords = "WordPress, React, Tailwind CSS, ForgeWP",
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterCreator,
  canonical,
  noIndex = false,
}: SEOProps) {
  const wpTitle = useWpTitle();
  const resolvedTitle = title ?? wpTitle;

  return (
    <Helmet>
      {/* ── Primary ── */}
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* ── Open Graph ── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle ?? resolvedTitle} />
      <meta property="og:description" content={ogDescription ?? description} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* ── Twitter ── */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle ?? resolvedTitle} />
      <meta name="twitter:description" content={ogDescription ?? description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
    </Helmet>
  );
}
`,

  'src/.forgewp/PresetsStyle.tsx': `import wpConfig from "../../wp.config";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

/**
 * PresetsStyle component — Internal system component.
 *
 * Dynamically injects WordPress-preset CSS Custom Properties and enqueues Google Fonts
 * during local Vite development, keeping your styles perfectly in sync with WordPress.
 * In production builds, this returns only the registry-aesthetic design tokens (like --radius)
 * to keep shadcn components and theme variables responsive to your config.
 */
export function PresetsStyle() {
  const themeStyle = wpConfig.style || "forgewp";

  // Production build: only inject custom registry-aesthetic design properties
  if (!IS_DEV) {
    const prodCss = \`
:root {
  --radius: \${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: \${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: \${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: \${themeStyle === "forgewp" ? "4px" : "0px"};
}
    \`;
    return <style dangerouslySetInnerHTML={{ __html: prodCss }} />;
  }

  // Local development fallbacks for WordPress CSS presets
  const colors = wpConfig.settings?.color?.palette || [];
  const fontSizes = wpConfig.settings?.typography?.fontSizes || [];
  const fontFamilies = wpConfig.settings?.typography?.fontFamilies || [];
  const layout = wpConfig.settings?.layout || {};
  const googleFonts = wpConfig.settings?.typography?.googleFonts || [];

  // Parse and build Google Fonts href for dev injection
  const fontsHtml = googleFonts.length > 0
    ? \`<link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=\&{googleFonts.map(f => encodeURIComponent(f)).join("&family=")}&display=swap" rel="stylesheet">\`
    : "";

  const devCss = \`
:root {
  \${colors.map((c) => "--wp--preset--color--" + c.slug + ": " + c.color + ";").join("\\n  ")}
  \${fontSizes.map((f) => "--wp--preset--font-size--" + f.slug + ": " + f.size + ";").join("\\n  ")}
  \${fontFamilies.map((f) => "--wp--preset--font-family--" + f.slug + ": " + f.fontFamily + ";").join("\\n  ")}
  \${layout.contentSize ? "--wp--style--global--content-size: " + layout.contentSize + ";" : ""}
  \${layout.wideSize ? "--wp--style--global--wide-size: " + layout.wideSize + ";" : ""}

  /* Registry Aesthetic Mode Custom Properties */
  --radius: \${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: \${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: \${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: \${themeStyle === "forgewp" ? "4px" : "0px"};
}
  \`;

  return (
    <>
      {fontsHtml && <span dangerouslySetInnerHTML={{ __html: fontsHtml }} />}
      <style dangerouslySetInnerHTML={{ __html: devCss }} />
    </>
  );
}
`,
};
