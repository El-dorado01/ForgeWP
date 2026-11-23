import type { ForgeWpSource } from './native-source.js';
import {
  normalizeSiteSettings,
  type ForgeWpResourceMap,
  type ForgeWpResourceName,
  type ForgeWpResourceParams,
  type FormResource,
  type FormsCollectionResource,
  type I18nResource,
} from './registry.js';

export interface FixtureSourceOptions {
  siteSettings?: any;
  forms?: Record<string, any>;
  menus?: Record<string, any[]>;
  i18n?: Partial<I18nResource>;
  resources?: Partial<ForgeWpResourceMap>;
}

/**
 * Local development / test fixture source.
 * Reads explicit fixtures or `window._forgeWpMock*` globals and normalizes them
 * into canonical resource shapes. Never selected automatically in production.
 */
export function createFixtureSource(
  options: FixtureSourceOptions = {},
): ForgeWpSource {
  function peek<K extends ForgeWpResourceName>(
    resource: K,
    _params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined {
    const win = typeof window !== 'undefined' ? (window as any) : null;

    if (options.resources && options.resources[resource] !== undefined) {
      if (resource === 'site-settings') {
        return (normalizeSiteSettings(options.resources[resource]) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      return options.resources[resource] as ForgeWpResourceMap[K];
    }

    switch (resource) {
      case 'site-settings': {
        const raw = options.siteSettings ?? win?._forgeWpMockSiteSettings;
        return (normalizeSiteSettings(raw) ?? undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      case 'forms': {
        const rawForms = options.forms ?? win?._forgeWpMockForms;
        if (!rawForms || typeof rawForms !== 'object') return undefined;
        const forms: Record<string, FormResource> = {};
        for (const [name, entry] of Object.entries(rawForms)) {
          if (!entry || typeof entry !== 'object') continue;
          const obj = entry as Record<string, any>;
          forms[name] = {
            name,
            mode: obj.mode === 'shortcode' ? 'shortcode' : 'native',
            fieldLabels:
              obj.fieldLabels && typeof obj.fieldLabels === 'object'
                ? obj.fieldLabels
                : {},
            fields: Array.isArray(obj.fields) ? obj.fields : [],
          };
        }
        return { forms } as FormsCollectionResource as ForgeWpResourceMap[K];
      }
      case 'menus': {
        const raw = options.menus ?? win?._forgeWpMockMenus;
        return (raw && typeof raw === 'object' ? raw : undefined) as
          | ForgeWpResourceMap[K]
          | undefined;
      }
      case 'i18n': {
        const rawDict = options.i18n?.translations ?? win?._forgeWpMockTranslations;
        const rawLang =
          options.i18n?.currentLanguage ??
          win?.forgeWpLocale ??
          (rawDict && typeof rawDict === 'object'
            ? Object.keys(rawDict)[0]
            : undefined);
        if (!rawDict && !rawLang && !options.i18n) return undefined;
        return {
          currentLanguage: String(rawLang || 'en'),
          translations: rawDict && typeof rawDict === 'object' ? rawDict : {},
          ...(options.i18n?.urls ? { urls: options.i18n.urls } : {}),
          ...(options.i18n?.homeUrls ? { homeUrls: options.i18n.homeUrls } : {}),
        } as I18nResource as ForgeWpResourceMap[K];
      }
      default:
        return undefined;
    }
  }

  return {
    kind: 'fixture',
    peek,
    async get<K extends ForgeWpResourceName>(
      resource: K,
      params?: ForgeWpResourceParams,
    ): Promise<ForgeWpResourceMap[K] | undefined> {
      return peek(resource, params);
    },
  };
}
