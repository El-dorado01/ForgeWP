import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('packages/compiler/lib/blueprints.js');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Target block for the hooks
const targetHooksBlock = `export function useWpCustomField(fieldName: string, defaultValue = ''): string {
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
        return defaultValue || \\\`[option: \\\${optionName}]\\\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \\\`__FORGEWP_OPTION_\\\${optionName}_DEFAULT_\\\${encodeURIComponent(defaultValue)}__\\\`
    : \\\`__FORGEWP_OPTION_\\\${optionName}__\\\`;
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
        return defaultValue || \\\`[theme_mod: \\\${modName}]\\\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \\\`__FORGEWP_THEME_MOD_\\\${modName}_DEFAULT_\\\${encodeURIComponent(defaultValue)}__\\\`
    : \\\`__FORGEWP_THEME_MOD_\\\${modName}__\\\`;
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
            apiBase = new URL(homeUrl).pathname.replace(/\\\\/$/, '');
          } catch (e) {}
        }
        const response = await fetch(
          \\\`\\\${apiBase}/wp-json/wp/v2/\\\${endpoint}?\\\${params.toString()}\\\`,
        );
        if (!response.ok) {
          throw new Error(
            \\\`WordPress API returned \\\${response.status}: \\\${response.statusText}\\\`,
          );
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from WordPress API');
        }

        const cleanHtml = (html: string) => {
          if (!html) return '';
          return html
            .replace(/<\\\\/?[^>]+(>|$)/g, '')
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
    return defaultValue || \\\`[taxonomy: \\\${taxonomy}]\\\`;
  }
  return \\\`__FORGEWP_TAXONOMY_LIST_\\\${taxonomy}__\\\`;
}

// ── useWpTerms — fetch all terms for a given taxonomy ─────────────────────────
// Dev:  reads \\\`_taxonomy_<name>\\\` key from mock-data.json
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
    const raw: any[] = (mockData as any)?.[\\\`_taxonomy_\\\${taxonomy}\\\`] || [];
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
        apiBase = new URL(homeUrl).pathname.replace(/\\\\/$/, '');
      } catch (e) {}
    }
    fetch(\\\`\\\${apiBase}/wp-json/wp/v2/\\\${endpoint}?per_page=100&_fields=id,name,slug,description,count,meta\\\`)
      .then((res) => {
        if (!res.ok) throw new Error(\\\`WP Terms API \\\${taxonomy}: \\\${res.status}\\\`);
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
        if (!cancelled) setError(err.message || \\\`Failed to load \\\${taxonomy} terms\\\`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taxonomy]);

  return { terms, loading, error };
}`;

// 2. Replacement block with Polylang, ACF meta merge, decodeHtmlEntities, useWpPageLink, and useWpMeta
const replacementHooksBlock = `export function useWpCustomField(fieldName: string, defaultValue = ''): any {
  if (IS_DEV) return _useWpCustomField(fieldName, defaultValue);

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
  if (IS_DEV) return _useWpMeta(key, defaultValue);

  // Browser-side hydration: check for forgeWpHydration data first
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win._forgeWpCompileTime) {
      if (typeof defaultValue === 'string') {
        return \\\`__FORGEWP_META_\\\${key}_DEFAULT_\\\${encodeURIComponent(defaultValue).replace(/_/g, '%5F')}__\\\` as any as T;
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
  return \\\`__FORGEWP_META_\\\${key}_DEFAULT_\\\${encodeURIComponent(defaultStr).replace(/_/g, '%5F')}__\\\` as any as T;
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
        return defaultValue || \\\`[option: \\\${optionName}]\\\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \\\`__FORGEWP_OPTION_\\\${optionName}_DEFAULT_\\\${encodeURIComponent(defaultValue)}__\\\`
    : \\\`__FORGEWP_OPTION_\\\${optionName}__\\\`;
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
        return defaultValue || \\\`[theme_mod: \\\${modName}]\\\`;
      }
      return String(value);
    }
  }

  // Fallback to token for compiler replacement
  return defaultValue
    ? \\\`__FORGEWP_THEME_MOD_\\\${modName}_DEFAULT_\\\${encodeURIComponent(defaultValue)}__\\\`
    : \\\`__FORGEWP_THEME_MOD_\\\${modName}__\\\`;
}

export function useWpThemeUri(): string {
  if (IS_DEV) return _useWpThemeUri();
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    return (window as any).forgeWpHydration?.themeUri || '';
  }
  return '__FORGEWP_THEME_URI__';
}

export function useWpPageLink(name: string, fallback: string): string {
  if (IS_DEV) return _useWpPageLink(name, fallback);
  if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
    const win = window as any;
    if (win.forgeWpHydration?.pageLinks?.[name]) {
      return win.forgeWpHydration.pageLinks[name];
    }
  }
  return fallback
    ? \\\`__FORGEWP_PAGELINK_\\\${name}_DEFAULT_\\\${encodeURIComponent(fallback)}__\\\`
    : \\\`__FORGEWP_PAGELINK_\\\${name}__\\\`;
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
        // Polylang multi-language query support
        const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage;
        if (currentLang) {
          params.append('lang', currentLang);
        }

        const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home || '';
        let apiBase = '';
        if (homeUrl) {
          try {
            apiBase = new URL(homeUrl).pathname.replace(/\\/$/, '');
          } catch (e) {}
        }
        const fetchUrl = \\\`\\\${apiBase}/wp-json/wp/v2/\\\${endpoint}?\\\${params.toString()}\\\`;
        console.log(\\\`[useWpQuery] Fetching CPT "\\\${postType}" from URL:\\\`, fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(
            \\\`WordPress API returned \\\${response.status}: \\\${response.statusText}\\\`,
          );
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from WordPress API');
        }
        console.log(\\\`[useWpQuery] Successfully loaded \\\${data.length} items for CPT "\\\${postType}"\\\`);

        const cleanHtml = (html: string) => {
          if (!html) return '';
          return decodeHtmlEntities(html.replace(/<\\\\/?[^>]+(>|$)/g, '')).trim();
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
            customFields: { ...(wp.meta || {}), ...(wp.acf || {}) },
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
    return defaultValue || \\\`[taxonomy: \\\${taxonomy}]\\\`;
  }
  return \\\`__FORGEWP_TAXONOMY_LIST_\\\${taxonomy}__\\\`;
}

// ── useWpTerms — fetch all terms for a given taxonomy ─────────────────────────
// Dev:  reads \\\`_taxonomy_<name>\\\` key from mock-data.json
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
    const raw: any[] = (mockData as any)?.[\\\`_taxonomy_\\\${taxonomy}\\\`] || [];
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
    const currentLang = (window as any).forgeWpLocale || (window as any).forgeWpTranslations?.currentLanguage;
    const langParam = currentLang ? \\\`&lang=\\\${currentLang}\\\` : '';
    const fetchUrl = \\\`\\\${apiBase}/wp-json/wp/v2/\\\${endpoint}?per_page=100&_fields=id,name,slug,description,count,meta\\\${langParam}\\\`;
    console.log(\\\`[useWpTerms] Fetching taxonomy "\\\${taxonomy}" from URL:\\\`, fetchUrl);
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(\\\`WP Terms API \\\${taxonomy}: \\\${res.status}\\\`);
        return res.json();
      })
      .then((data: any[]) => {
        if (cancelled) return;
        console.log(\\\`[useWpTerms] Successfully loaded \\\${data.length} terms for taxonomy "\\\${taxonomy}"\\\`);
        setTerms(
          data.map((t) => ({
            id: t.id,
            name: typeof t.name === 'string' ? decodeHtmlEntities(t.name) : '',
            slug: t.slug || '',
            description: t.description || '',
            count: t.count || 0,
            meta: t.meta || {},
          }))
        );
        setError(null);
      })
      .catch((err: any) => {
        if (!cancelled) {
          console.error(\\\`[useWpTerms] Error loading taxonomy "\\\${taxonomy}":\\\`, err);
          setError(err.message || \\\`Failed to load \\\${taxonomy} terms\\\`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taxonomy]);

  return { terms, loading, error };
}`;

const normTarget = targetHooksBlock.replace(/\r\n/g, '\n');
const normReplacement = replacementHooksBlock.replace(/\r\n/g, '\n');

if (!content.includes(normTarget)) {
  console.error("Error: Could not find targetHooksBlock in blueprints.js! File might be modified or offsets misaligned.");
  process.exit(1);
}

content = content.replace(normTarget, normReplacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully replaced all data hooks in blueprints.js!");
