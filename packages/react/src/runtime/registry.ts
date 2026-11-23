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
      if ((entry as Record<string, unknown>).private === true) continue;
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

/**
 * Normalizes a single form payload (from `GET /wp-json/forgewp/v1/forms/<name>`,
 * `window.forgeWpHydration.resources.forms`, legacy `window.forgeWpHydration.forms`,
 * or local fixtures) into the canonical `FormResource` shape (docs/resource-contracts.md §2).
 */
export function normalizeFormResource(
  raw: any,
  fallbackName?: string,
): FormResource | null {
  if (!raw || typeof raw !== 'object') return null;

  const name =
    typeof raw.name === 'string' && raw.name.trim() !== ''
      ? raw.name.trim()
      : typeof fallbackName === 'string' && fallbackName.trim() !== ''
        ? fallbackName.trim()
        : '';
  if (!name) return null;

  const mode: 'native' | 'shortcode' =
    raw.mode === 'shortcode' ? 'shortcode' : 'native';

  const fieldLabels: Record<string, string> = {};
  if (raw.fieldLabels && typeof raw.fieldLabels === 'object' && !Array.isArray(raw.fieldLabels)) {
    for (const [k, v] of Object.entries(raw.fieldLabels)) {
      if (v !== undefined && v !== null) {
        fieldLabels[k] = String(v);
      }
    }
  }

  const rawFields = Array.isArray(raw.fields)
    ? raw.fields
    : Array.isArray(raw.clientFields)
      ? raw.clientFields
      : [];

  const fields: FormFieldContract[] = [];
  for (const item of rawFields) {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim()) {
      continue;
    }
    const f: FormFieldContract = {
      name: item.name.trim(),
      label: typeof item.label === 'string' ? item.label : item.name.trim(),
      type: typeof item.type === 'string' && item.type.trim() ? item.type.trim() : 'text',
      required: Boolean(item.required),
    };
    if (Array.isArray(item.options)) {
      f.options = item.options.map((opt: unknown) => String(opt));
    }
    if (typeof item.multiple === 'boolean') f.multiple = item.multiple;
    if (typeof item.min === 'number') f.min = item.min;
    if (typeof item.max === 'number') f.max = item.max;
    if (typeof item.step === 'number') f.step = item.step;
    if (typeof item.defaultValue === 'string') f.defaultValue = item.defaultValue;
    if (typeof item.placeholder === 'string') f.placeholder = item.placeholder;
    fields.push(f);
  }

  return {
    name,
    mode,
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    ...(typeof raw.submitUrl === 'string' && raw.submitUrl.trim()
      ? { submitUrl: raw.submitUrl.trim() }
      : {}),
    fieldLabels,
    fields,
  };
}

/**
 * Normalizes a forms collection payload (`GET /wp-json/forgewp/v1/forms` or
 * `window.forgeWpHydration.resources.forms` / legacy `window.forgeWpHydration.forms`)
 * into the canonical `FormsCollectionResource` shape.
 */
export function normalizeFormsCollection(raw: any): FormsCollectionResource | null {
  if (!raw || typeof raw !== 'object') return null;

  // Single-form object passed directly -> wrap into collection keyed by its name
  if (typeof raw.name === 'string' && (Array.isArray(raw.fields) || raw.fieldLabels)) {
    const single = normalizeFormResource(raw);
    if (!single) return null;
    return {
      ...(single.lang ? { lang: single.lang } : {}),
      forms: { [single.name]: single },
    };
  }

  const sourceMap =
    raw.forms && typeof raw.forms === 'object' && !Array.isArray(raw.forms)
      ? raw.forms
      : raw;

  const forms: Record<string, FormResource> = {};
  for (const [key, entry] of Object.entries(sourceMap)) {
    if (key === 'lang' && typeof entry === 'string') continue;
    const normalized = normalizeFormResource(entry, key);
    if (normalized) {
      forms[normalized.name] = normalized;
    }
  }

  return {
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    forms,
  };
}
