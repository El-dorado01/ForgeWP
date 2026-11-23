import { ForgeWpRuntimeError } from './errors.js';

export type ForgeWpResourceAuth = 'public' | 'session';

export interface ForgeWpResourceDefinition<Name extends string = string> {
  readonly name: Name;
  /** Path relative to `/wp-json/forgewp/v1` (leading slash). */
  readonly restPath: string;
  /** Revalidation / invalidation cache tags. */
  readonly cacheTags: readonly string[];
  readonly auth: ForgeWpResourceAuth;
}

export interface SiteSettingsSiteMeta {
  name: string;
  description: string;
  url: string;
  homeUrl: string;
  language: string;
  logoUrl?: string;
}

/**
 * Canonical `site-settings` resource contract (docs/resource-contracts.md §1).
 */
export interface SiteSettingsResource {
  options: Record<string, string | number | boolean | null>;
  themeMods: Record<string, string | number | boolean | null>;
  site?: SiteSettingsSiteMeta;
}

export interface FormFieldContract {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  multiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string;
  placeholder?: string;
}

/**
 * Canonical single-form contract (docs/resource-contracts.md §2).
 */
export interface FormResource {
  name: string;
  mode: 'native' | 'shortcode';
  lang?: string;
  submitUrl?: string;
  fieldLabels: Record<string, string>;
  fields: FormFieldContract[];
}

export interface FormsCollectionResource {
  lang?: string;
  forms: Record<string, FormResource>;
}

export interface I18nResource {
  currentLanguage: string;
  translations: Record<string, any>;
  urls?: Record<string, string>;
  homeUrls?: Record<string, string>;
}

export interface ForgeWpResourceMap {
  'site-settings': SiteSettingsResource;
  forms: FormsCollectionResource;
  menus: Record<string, any[]>;
  routes: { homeUrl: string; basePath: string; routes: any[] };
  i18n: I18nResource;
  seo: Record<string, any>;
  editables: Record<string, any>;
  'auth-me': Record<string, any> | null;
}

export type ForgeWpResourceName = keyof ForgeWpResourceMap;

export interface ForgeWpResourceParams {
  /** Optional single-item path segment (e.g. form slug, menu location). */
  slug?: string;
  /** Optional query string parameters (e.g. `{ lang: 'en' }`). */
  query?: Record<string, string | number | boolean | undefined>;
}

export function defineResource<Name extends string>(
  def: ForgeWpResourceDefinition<Name>,
): ForgeWpResourceDefinition<Name> {
  return Object.freeze({
    ...def,
    cacheTags: Object.freeze([...def.cacheTags]),
  });
}

export const FORGEWP_RESOURCES: {
  readonly [K in ForgeWpResourceName]: ForgeWpResourceDefinition<K>;
} = Object.freeze({
  'site-settings': defineResource({
    name: 'site-settings',
    restPath: '/site-settings',
    cacheTags: ['site-settings', 'options'],
    auth: 'public',
  }),
  forms: defineResource({
    name: 'forms',
    restPath: '/forms',
    cacheTags: ['forms'],
    auth: 'public',
  }),
  menus: defineResource({
    name: 'menus',
    restPath: '/menus',
    cacheTags: ['menus'],
    auth: 'public',
  }),
  routes: defineResource({
    name: 'routes',
    restPath: '/routes',
    cacheTags: ['routes'],
    auth: 'public',
  }),
  i18n: defineResource({
    name: 'i18n',
    restPath: '/i18n',
    cacheTags: ['i18n'],
    auth: 'public',
  }),
  seo: defineResource({
    name: 'seo',
    restPath: '/seo',
    cacheTags: ['seo'],
    auth: 'public',
  }),
  editables: defineResource({
    name: 'editables',
    restPath: '/editables',
    cacheTags: ['editables'],
    auth: 'public',
  }),
  'auth-me': defineResource({
    name: 'auth-me',
    restPath: '/auth/me',
    cacheTags: ['auth'],
    auth: 'session',
  }),
});

export function getResourceDefinition<K extends ForgeWpResourceName>(
  name: K,
): ForgeWpResourceDefinition<K> {
  const def = FORGEWP_RESOURCES[name];
  if (!def) {
    throw new ForgeWpRuntimeError(
      'FORGEWP_UNKNOWN_RESOURCE',
      `Unknown ForgeWP resource "${String(name)}".`,
      { resource: String(name) },
    );
  }
  return def;
}

/**
 * Normalizes both canonical `{ options, themeMods, site }` payloads and
 * legacy `{ options, theme_mods }` hydration objects (including `{ _type, default }`
 * option descriptor records from local dev mocks) into the canonical
 * `SiteSettingsResource` contract shape.
 */
export function normalizeSiteSettings(raw: any): SiteSettingsResource | null {
  if (!raw || typeof raw !== 'object') return null;

  const toScalar = (val: unknown): string | number | boolean | null => {
    if (val === null) return null;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return val;
    }
    return val !== undefined ? String(val) : '';
  };

  const rawOptions = raw.options && typeof raw.options === 'object' ? raw.options : {};
  const options: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(rawOptions)) {
    if (entry !== null && typeof entry === 'object' && '_type' in (entry as Record<string, unknown>)) {
      options[key] = toScalar((entry as Record<string, unknown>).default);
    } else if (entry !== undefined) {
      options[key] = toScalar(entry);
    }
  }

  const rawMods =
    raw.themeMods && typeof raw.themeMods === 'object'
      ? raw.themeMods
      : raw.theme_mods && typeof raw.theme_mods === 'object'
        ? raw.theme_mods
        : {};
  const themeMods: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(rawMods)) {
    if (entry !== undefined) {
      themeMods[key] = toScalar(entry);
    }
  }

  const result: SiteSettingsResource = { options, themeMods };
  if (raw.site && typeof raw.site === 'object') {
    result.site = {
      name: String(raw.site.name || ''),
      description: String(raw.site.description || ''),
      url: String(raw.site.url || ''),
      homeUrl: String(raw.site.homeUrl || raw.site.url || ''),
      language: String(raw.site.language || ''),
      ...(raw.site.logoUrl ? { logoUrl: String(raw.site.logoUrl) } : {}),
    };
  }
  return result;
}
