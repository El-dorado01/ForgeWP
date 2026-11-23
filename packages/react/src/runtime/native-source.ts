import type {
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
  FormResource,
  FormsCollectionResource,
  I18nResource,
} from './registry.js';
import { normalizeSiteSettings } from './registry.js';

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
    return canonical as FormResource;
  }
  const legacy = hydration?.forms?.[name];
  if (legacy && typeof legacy === 'object') {
    return {
      name,
      mode: legacy.mode === 'shortcode' ? 'shortcode' : 'native',
      fieldLabels:
        legacy.fieldLabels && typeof legacy.fieldLabels === 'object'
          ? legacy.fieldLabels
          : {},
      fields: Array.isArray(legacy.fields) ? legacy.fields : [],
      ...(typeof legacy.submitUrl === 'string' ? { submitUrl: legacy.submitUrl } : {}),
    };
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

function normalizeNativeFormsCollection(
  hydration: Record<string, any>,
): FormsCollectionResource | undefined {
  const canonical = hydration.resources?.forms;
  if (canonical && typeof canonical === 'object' && canonical.forms) {
    return canonical as FormsCollectionResource;
  }
  const legacyForms = hydration.forms;
  if (!legacyForms || typeof legacyForms !== 'object') return undefined;
  const forms: Record<string, FormResource> = {};
  for (const [name, entry] of Object.entries(legacyForms)) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, any>;
    forms[name] = {
      name,
      mode: raw.mode === 'shortcode' ? 'shortcode' : 'native',
      fieldLabels:
        raw.fieldLabels && typeof raw.fieldLabels === 'object' ? raw.fieldLabels : {},
      fields: Array.isArray(raw.fields) ? raw.fields : [],
      ...(typeof raw.submitUrl === 'string' ? { submitUrl: raw.submitUrl } : {}),
    };
  }
  return { forms };
}

/**
 * Native WordPress hydration source.
 * Reads prefetched JSON payloads from `window.forgeWpHydration.resources[name]`
 * (falling back to legacy `forgeWpHydration.*` / `forgeWpTranslations` keys during
 * the Phase A transition).
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
    if (canonical !== undefined) {
      if (resource === 'site-settings') {
        return (normalizeSiteSettings(canonical) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      return canonical as ForgeWpResourceMap[K];
    }

    switch (resource) {
      case 'site-settings':
        return (normalizeSiteSettings(hydration.siteSettings) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      case 'forms':
        return normalizeNativeFormsCollection(hydration) as
          | ForgeWpResourceMap[K]
          | undefined;
      case 'menus':
        return (hydration.menus && typeof hydration.menus === 'object'
          ? hydration.menus
          : undefined) as ForgeWpResourceMap[K] | undefined;
      default:
        return undefined;
    }
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
