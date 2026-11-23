import { ForgeWpRuntimeError } from './errors.js';
import type { ForgeWpSource } from './native-source.js';
import {
  getResourceDefinition,
  normalizeAuthMeResource,
  normalizeCommentsListResource,
  normalizeFormResource,
  normalizeFormsCollection,
  normalizeI18nResource,
  normalizeMenusCollection,
  normalizePostResource,
  normalizePostsListResource,
  normalizeRoutesResource,
  normalizeSiteSettings,
  normalizeTermResource,
  normalizeTermsListResource,
  type ForgeWpResourceMap,
  type ForgeWpResourceName,
  type ForgeWpResourceParams,
  type FormsCollectionResource,
  type MenusCollectionResource,
} from './registry.js';

export interface RestSourceOptions {
  /** Base URL for `/wp-json/forgewp/v1` (e.g. `https://wp.example.com/wp-json/forgewp/v1` or `https://wp.example.com`). */
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

export interface PrimableForgeWpSource extends ForgeWpSource {
  prime<K extends ForgeWpResourceName>(
    resource: K,
    data: ForgeWpResourceMap[K],
    params?: ForgeWpResourceParams,
  ): void;
  clear(): void;
}

export function normalizeRestBaseUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/wp-json\/forgewp\/v1$/i.test(trimmed)) {
    return trimmed;
  }
  if (/\/wp-json$/i.test(trimmed)) {
    return `${trimmed}/forgewp/v1`;
  }
  return `${trimmed}/wp-json/forgewp/v1`;
}

function buildCacheKey(
  resource: ForgeWpResourceName,
  params?: ForgeWpResourceParams,
): string {
  const slug = params?.slug ? `/${params.slug}` : '';
  const queryEntries = params?.query
    ? Object.entries(params.query)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
    : [];
  const qs =
    queryEntries.length > 0
      ? `?${queryEntries.map(([k, v]) => `${k}=${String(v)}`).join('&')}`
      : '';
  return `${resource}${slug}${qs}`;
}

function normalizeResourcePayload<K extends ForgeWpResourceName>(
  resource: K,
  raw: unknown,
  params?: ForgeWpResourceParams,
): ForgeWpResourceMap[K] {
  if (resource === 'site-settings') {
    return (normalizeSiteSettings(raw) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'forms') {
    if (params?.slug) {
      const single = normalizeFormResource(raw, params.slug);
      if (single) {
        return {
          ...(single.lang ? { lang: single.lang } : {}),
          forms: { [single.name]: single },
        } as ForgeWpResourceMap[K];
      }
    }
    return (normalizeFormsCollection(raw) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'menus') {
    return (normalizeMenusCollection(raw, params?.slug) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'routes') {
    return (normalizeRoutesResource(raw) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'i18n') {
    return (normalizeI18nResource(raw) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'auth-me') {
    return normalizeAuthMeResource(raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'post') {
    const fallbackType = params?.slug ? params.slug.split('/')[0] : 'post';
    return (normalizePostResource(raw, { fallbackType }) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'posts') {
    const fallbackType =
      typeof params?.query?.type === 'string' && params.query.type
        ? params.query.type
        : 'post';
    return (normalizePostsListResource(raw, fallbackType) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'term') {
    const fallbackTaxonomy = params?.slug ? params.slug.split('/')[0] : undefined;
    return (normalizeTermResource(raw, fallbackTaxonomy) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'terms') {
    const fallbackTaxonomy = params?.slug ? params.slug.split('/')[0] : 'category';
    return (normalizeTermsListResource(raw, fallbackTaxonomy) ?? raw) as ForgeWpResourceMap[K];
  }
  if (resource === 'comments') {
    const fallbackPostId =
      params?.query?.post !== undefined ? Number(params.query.post) : 0;
    return (normalizeCommentsListResource(raw, fallbackPostId) ?? raw) as ForgeWpResourceMap[K];
  }
  return raw as ForgeWpResourceMap[K];
}

/**
 * Decoupled WordPress REST source.
 * Fetches canonical JSON from `/wp-json/forgewp/v1/<restPath>` and caches
 * resolved resources in memory for synchronous `peek()` reads.
 */
export function createRestSource(options: RestSourceOptions): PrimableForgeWpSource {
  const restBase = normalizeRestBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const cache = new Map<string, unknown>();

  function mergeFormsIntoCollectionCache(
    collection: FormsCollectionResource,
  ): void {
    const existing = cache.get('forms') as FormsCollectionResource | undefined;
    cache.set('forms', {
      ...(existing?.lang ? { lang: existing.lang } : {}),
      ...(collection.lang ? { lang: collection.lang } : {}),
      forms: {
        ...(existing?.forms || {}),
        ...(collection.forms || {}),
      },
    });
  }

  function mergeMenusIntoCollectionCache(
    collection: MenusCollectionResource,
  ): void {
    const existing = cache.get('menus') as MenusCollectionResource | undefined;
    cache.set('menus', {
      ...(existing?.lang ? { lang: existing.lang } : {}),
      ...(collection.lang ? { lang: collection.lang } : {}),
      menus: {
        ...(existing?.menus || {}),
        ...(collection.menus || {}),
      },
    });
  }

  function peek<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined {
    const exact = cache.get(buildCacheKey(resource, params));
    if (exact !== undefined) {
      return exact as ForgeWpResourceMap[K];
    }
    // Allow single-form peek('forms', { slug }) to hit the collection cache
    if (resource === 'forms' && params?.slug) {
      const coll = cache.get('forms') as FormsCollectionResource | undefined;
      const found = coll?.forms?.[params.slug];
      if (found) {
        return {
          ...(found.lang ? { lang: found.lang } : {}),
          forms: { [found.name]: found },
        } as ForgeWpResourceMap[K];
      }
    }
    // Allow single-menu peek('menus', { slug }) to hit the collection cache
    if (resource === 'menus' && params?.slug) {
      const coll = cache.get('menus') as MenusCollectionResource | undefined;
      const found = coll?.menus?.[params.slug];
      if (found) {
        return {
          ...(coll?.lang ? { lang: coll.lang } : {}),
          menus: { [params.slug]: found },
        } as ForgeWpResourceMap[K];
      }
    }
    return undefined;
  }

  function prime<K extends ForgeWpResourceName>(
    resource: K,
    data: ForgeWpResourceMap[K],
    params?: ForgeWpResourceParams,
  ): void {
    const normalized = normalizeResourcePayload(resource, data, params);
    cache.set(buildCacheKey(resource, params), normalized);
    if (resource === 'forms' && normalized && typeof normalized === 'object') {
      mergeFormsIntoCollectionCache(normalized as FormsCollectionResource);
    }
    if (resource === 'menus' && normalized && typeof normalized === 'object') {
      mergeMenusIntoCollectionCache(normalized as MenusCollectionResource);
    }
  }

  async function get<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): Promise<ForgeWpResourceMap[K] | undefined> {
    const isSessionScoped = resource === 'auth-me';
    const key = buildCacheKey(resource, params);
    if (!isSessionScoped && cache.has(key)) {
      return cache.get(key) as ForgeWpResourceMap[K];
    }

    if (!restBase) {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RUNTIME_UNCONFIGURED',
        `Cannot fetch ForgeWP resource "${resource}": no WordPress REST base URL is configured.`,
        { resource },
      );
    }

    if (typeof fetchImpl !== 'function') {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RESOURCE_FETCH_FAILED',
        `Cannot fetch ForgeWP resource "${resource}": global fetch is unavailable.`,
        { resource },
      );
    }

    const def = getResourceDefinition(resource);
    const slugSegment = params?.slug
      ? `/${params.slug
          .split('/')
          .filter(Boolean)
          .map((seg) => encodeURIComponent(seg))
          .join('/')}`
      : '';
    const search = new URLSearchParams();
    if (params?.query) {
      for (const [k, v] of Object.entries(params.query)) {
        if (v !== undefined) search.set(k, String(v));
      }
    }
    const qs = search.toString();
    const url = `${restBase}${def.restPath}${slugSegment}${qs ? `?${qs}` : ''}`;

    const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...(isSessionScoped
        ? { cache: 'no-store' as RequestCache }
        : options.cache
          ? { cache: options.cache }
          : {}),
    };
    const perResourceTags: string[] = [];
    if (resource === 'forms' && params?.slug) {
      perResourceTags.push(`form:${params.slug}`);
    } else if (resource === 'menus' && params?.slug) {
      perResourceTags.push(`menu:${params.slug}`);
    } else if (resource === 'i18n' && typeof params?.query?.lang === 'string' && params.query.lang) {
      perResourceTags.push(`i18n:${params.query.lang}`);
    } else if (resource === 'posts') {
      const postType = typeof params?.query?.type === 'string' && params.query.type ? params.query.type : 'post';
      perResourceTags.push(`type:${postType}`);
    } else if (resource === 'post' && params?.slug) {
      const postType = params.slug.split('/')[0];
      if (postType) perResourceTags.push(`type:${postType}`);
    } else if ((resource === 'terms' || resource === 'term') && params?.slug) {
      const tax = params.slug.split('/')[0];
      if (tax) perResourceTags.push(`taxonomy:${tax}`);
    } else if (resource === 'comments' && params?.query?.post !== undefined) {
      perResourceTags.push(`comments:post:${String(params.query.post)}`);
    }
    if (!isSessionScoped && (options.next || def.cacheTags.length > 0 || perResourceTags.length > 0)) {
      const mergedTags = Array.from(
        new Set([
          ...(def.cacheTags || []),
          ...perResourceTags,
          ...(options.next?.tags || []),
        ]),
      );
      init.next = {
        ...(options.next || {}),
        ...(mergedTags.length > 0 ? { tags: mergedTags } : {}),
      };
    }

    let response: Response;
    try {
      response = await fetchImpl(url, init);
    } catch (cause) {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RESOURCE_FETCH_FAILED',
        `Network error fetching ForgeWP resource "${resource}" from ${url}.`,
        { resource, cause },
      );
    }

    if (!response.ok) {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RESOURCE_FETCH_FAILED',
        `Failed to fetch ForgeWP resource "${resource}" from ${url} (HTTP ${response.status}).`,
        { resource, status: response.status },
      );
    }

    const json = await response.json();
    const normalized = normalizeResourcePayload(resource, json, params);
    if (!isSessionScoped) {
      cache.set(key, normalized);
      if (resource === 'forms' && normalized && typeof normalized === 'object') {
        mergeFormsIntoCollectionCache(normalized as FormsCollectionResource);
      }
      if (resource === 'menus' && normalized && typeof normalized === 'object') {
        mergeMenusIntoCollectionCache(normalized as MenusCollectionResource);
      }
    }
    return normalized as ForgeWpResourceMap[K];
  }

  return {
    kind: 'rest',
    peek,
    get,
    prime,
    clear: () => cache.clear(),
  };
}
