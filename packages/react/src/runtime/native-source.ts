import type {
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
  FormResource,
  I18nResource,
} from './registry.js';
import {
  normalizeFormResource,
  normalizeFormsCollection,
  normalizeSiteSettings,
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
 * to read `window.forgeWpHydration` and `window.forgeWpTranslations`.
 * Direct reads from any other file in `packages/react/src/` are forbidden by
 * the hydration lint rule.
 */
function getWindowHydration(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  const hydration = (window as any).forgeWpHydration;
  return hydration && typeof hydration === 'object' ? hydration : null;
}

function getWindowTranslations(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  const translations = (window as any).forgeWpTranslations;
  return translations && typeof translations === 'object' ? translations : null;
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
  const links = getWindowHydration()?.pageLinks;
  if (links && typeof links === 'object' && typeof links[name] === 'string') {
    return links[name];
  }
  return null;
}

export function getNativeMenu(location: string): any[] | null {
  const menus = getWindowHydration()?.menus;
  if (menus && typeof menus === 'object' && Array.isArray(menus[location])) {
    return menus[location];
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
  const hydration = getWindowHydration();
  const canonical = hydration?.resources?.i18n;
  if (canonical && typeof canonical === 'object' && canonical.currentLanguage) {
    return canonical as I18nResource;
  }
  const legacy = getWindowTranslations();
  if (!legacy) return null;
  const currentLanguage =
    (typeof window !== 'undefined' && (window as any).forgeWpLocale) ||
    legacy.currentLanguage ||
    '';
  return {
    currentLanguage: String(currentLanguage),
    translations:
      legacy.translations && typeof legacy.translations === 'object'
        ? legacy.translations
        : {},
    ...(legacy.urls && typeof legacy.urls === 'object' ? { urls: legacy.urls } : {}),
    ...(legacy.homeUrls && typeof legacy.homeUrls === 'object'
      ? { homeUrls: legacy.homeUrls }
      : {}),
  };
}

/**
 * Native WordPress hydration source.
 * Reads prefetched JSON payloads from `window.forgeWpHydration.resources[name]`.
 */
export function createNativeSource(): ForgeWpSource {
  function peek<K extends ForgeWpResourceName>(
    resource: K,
    _params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined {
    const hydration = getWindowHydration();

    if (resource === 'i18n') {
      return (getNativeTranslations() ?? undefined) as ForgeWpResourceMap[K] | undefined;
    }

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
      return canonical as ForgeWpResourceMap[K];
    }

    if (resource === 'menus') {
      return (hydration.menus && typeof hydration.menus === 'object'
        ? hydration.menus
        : undefined) as ForgeWpResourceMap[K] | undefined;
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
