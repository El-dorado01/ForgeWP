import type {
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
  FormResource,
  I18nResource,
  PostResource,
  PostsListResource,
  TermResource,
} from './registry.js';
import {
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
} from './registry.js';

export interface ForgeWpSource {
  readonly kind: 'native' | 'rest' | 'fixture';
  peek<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined;
  get<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): Promise<ForgeWpResourceMap[K] | undefined>;
}

/**
 * NOTE: This file is the SOLE authorized boundary in `@forgewp/react` allowed
 * to read `window.forgeWpHydration`.
 * Direct reads from any other file in `packages/react/src/` are forbidden by
 * the hydration lint rule.
 */
function getWindowHydration(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  const hydration = (window as any).forgeWpHydration;
  return hydration && typeof hydration === 'object' ? hydration : null;
}

export function hasNativeHydration(): boolean {
  return getWindowHydration() !== null;
}

export function getNativeRestUrl(): string | null {
  const url = getWindowHydration()?.restUrl;
  return typeof url === 'string' && url.trim().length > 0
    ? url.replace(/\/+$/, '')
    : null;
}

export function getNativeRestNonce(): string | null {
  const nonce = getWindowHydration()?.restNonce;
  return typeof nonce === 'string' && nonce.length > 0 ? nonce : null;
}

export function getNativeThemeUri(): string {
  const uri = getWindowHydration()?.themeUri;
  return typeof uri === 'string' ? uri : '';
}

export function getNativePostMeta(): { id?: number | string; slug?: string } | null {
  const post = getWindowHydration()?.post;
  return post && typeof post === 'object' ? post : null;
}

export function getNativePageLink(name: string): string | null {
  const canonicalRoutes = getWindowHydration()?.resources?.routes;
  if (canonicalRoutes && typeof canonicalRoutes === 'object') {
    const normalized = normalizeRoutesResource(canonicalRoutes);
    if (normalized && typeof normalized.pageLinks[name] === 'string') {
      return normalized.pageLinks[name];
    }
  }
  return null;
}

export function getNativeMenu(location: string): any[] | null {
  const canonicalMenus = getWindowHydration()?.resources?.menus;
  if (canonicalMenus && typeof canonicalMenus === 'object') {
    const normalized = normalizeMenusCollection(canonicalMenus);
    if (normalized && Array.isArray(normalized.menus[location])) {
      return normalized.menus[location];
    }
  }
  return null;
}

export function getNativeForm(name: string): FormResource | null {
  const hydration = getWindowHydration();
  const canonical = hydration?.resources?.forms?.forms?.[name];
  if (canonical && typeof canonical === 'object') {
    return normalizeFormResource(canonical, name);
  }
  return null;
}

export function getNativeTranslations(): I18nResource | null {
  const canonical = getWindowHydration()?.resources?.i18n;
  if (canonical && typeof canonical === 'object') {
    const normalized = normalizeI18nResource(canonical);
    if (normalized) return normalized;
  }
  return null;
}

export function getNativePost(): PostResource | null {
  const canonical = getWindowHydration()?.resources?.post;
  if (canonical && typeof canonical === 'object') {
    return normalizePostResource(canonical);
  }
  return null;
}

export function getNativePosts(): PostsListResource | null {
  const canonical = getWindowHydration()?.resources?.posts;
  if (canonical && typeof canonical === 'object') {
    return normalizePostsListResource(canonical);
  }
  return null;
}

export function getNativeTerm(): TermResource | null {
  const canonical = getWindowHydration()?.resources?.term;
  if (canonical && typeof canonical === 'object') {
    return normalizeTermResource(canonical);
  }
  return null;
}

/**
 * Native WordPress hydration source.
 * Reads prefetched JSON payloads exclusively from `window.forgeWpHydration.resources[name]`.
 */
export function createNativeSource(): ForgeWpSource {
  function peek<K extends ForgeWpResourceName>(
    resource: K,
    _params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined {
    const hydration = getWindowHydration();
    if (!hydration) return undefined;

    const canonical = hydration.resources?.[resource];
    if (canonical !== undefined && canonical !== null) {
      if (resource === 'site-settings') {
        return (normalizeSiteSettings(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'forms') {
        return (normalizeFormsCollection(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'menus') {
        return (normalizeMenusCollection(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'routes') {
        return (normalizeRoutesResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'i18n') {
        return (normalizeI18nResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'auth-me') {
        return normalizeAuthMeResource(canonical) as ForgeWpResourceMap[K];
      }
      if (resource === 'post') {
        return (normalizePostResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'posts') {
        return (normalizePostsListResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'term') {
        return (normalizeTermResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'terms') {
        return (normalizeTermsListResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      if (resource === 'comments') {
        return (normalizeCommentsListResource(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      return canonical as ForgeWpResourceMap[K];
    }

    return undefined;
  }

  return {
    kind: 'native',
    peek,
    async get<K extends ForgeWpResourceName>(
      resource: K,
      params?: ForgeWpResourceParams,
    ): Promise<ForgeWpResourceMap[K] | undefined> {
      return peek(resource, params);
    },
  };
}
