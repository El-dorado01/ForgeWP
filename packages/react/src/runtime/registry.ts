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

export interface MenuItemContract {
  id: number | string;
  title: string;
  url: string;
  path: string;
  target?: string;
  classes?: string[];
  description?: string;
  attrTitle?: string;
  external?: boolean;
  children: MenuItemContract[];
}

/**
 * Canonical `menus` collection contract (docs/resource-contracts.md §5).
 */
export interface MenusCollectionResource {
  lang?: string;
  menus: Record<string, MenuItemContract[]>;
}

export interface RouteRecordContract {
  routeId: string;
  id: number;
  slug: string;
  title: string;
  path: string;
  permalink: string;
}

/**
 * Canonical `routes` resource contract (docs/resource-contracts.md §6).
 */
export interface RoutesResource {
  homeUrl: string;
  basePath: string;
  lang?: string;
  routes: RouteRecordContract[];
  pageLinks: Record<string, string>;
}

/**
 * Canonical `i18n` resource contract (docs/resource-contracts.md §7).
 */
export interface I18nResource {
  currentLanguage: string;
  defaultLocale?: string;
  locales?: string[];
  translations: Record<string, any>;
  urls?: Record<string, string>;
  homeUrls?: Record<string, string>;
}

export interface ForgeWpResourceMap {
  'site-settings': SiteSettingsResource;
  forms: FormsCollectionResource;
  menus: MenusCollectionResource;
  routes: RoutesResource;
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

function deriveRelativePathFromUrl(rawUrl: string): { path: string; external: boolean } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { path: '/', external: false };
  if (/^https?:\/\//i.test(trimmed)) {
    return { path: trimmed, external: true };
  }
  return {
    path: trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
    external: false,
  };
}

/**
 * Normalizes a menu item tree into the canonical `MenuItemContract[]` shape
 * (docs/resource-contracts.md §5).
 */
export function normalizeMenuItemsContract(
  items: any,
  prefix = 'item',
): MenuItemContract[] {
  if (!Array.isArray(items)) return [];
  const out: MenuItemContract[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item || typeof item !== 'object') continue;
    const rawUrl = String(item.url || item.path || '/');
    const derived = deriveRelativePathFromUrl(rawUrl);
    const resolvedPath =
      typeof item.path === 'string' && item.path.trim()
        ? item.path.trim()
        : derived.path;
    const external =
      typeof item.external === 'boolean'
        ? item.external
        : derived.external && resolvedPath === rawUrl;
    const classes = Array.isArray(item.classes)
      ? item.classes.filter(Boolean).map(String)
      : typeof item.classes === 'string' && item.classes.trim()
        ? item.classes.trim().split(/\s+/)
        : [];
    out.push({
      id: item.id !== undefined && item.id !== null ? item.id : `${prefix}-${idx + 1}`,
      title: String(item.title || ''),
      url: rawUrl,
      path: resolvedPath,
      ...(typeof item.target === 'string' && item.target ? { target: item.target } : {}),
      ...(classes.length > 0 ? { classes } : {}),
      ...(typeof item.description === 'string' ? { description: item.description } : {}),
      ...(typeof item.attrTitle === 'string' ? { attrTitle: item.attrTitle } : {}),
      ...(external ? { external: true } : {}),
      children: normalizeMenuItemsContract(item.children, `${prefix}-${idx + 1}`),
    });
  }
  return out;
}

/**
 * Normalizes canonical `GET /wp-json/forgewp/v1/menus`, single-location
 * `GET /wp-json/forgewp/v1/menus/<location>`, or legacy `{ primary: [...] }`
 * payloads into `MenusCollectionResource`.
 */
export function normalizeMenusCollection(
  raw: any,
  fallbackLocation?: string,
): MenusCollectionResource | null {
  if (!raw || typeof raw !== 'object') return null;

  // Single-menu response: { location, lang?, items: [...] }
  if (Array.isArray(raw.items)) {
    const loc =
      typeof raw.location === 'string' && raw.location.trim()
        ? raw.location.trim()
        : fallbackLocation || '';
    if (!loc) return null;
    return {
      ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
      menus: {
        [loc]: normalizeMenuItemsContract(raw.items),
      },
    };
  }

  const sourceMap =
    raw.menus && typeof raw.menus === 'object' && !Array.isArray(raw.menus)
      ? raw.menus
      : raw;

  const menus: Record<string, MenuItemContract[]> = {};
  for (const [loc, entries] of Object.entries(sourceMap)) {
    if (loc === 'lang' && typeof entries === 'string') continue;
    if (Array.isArray(entries)) {
      menus[loc] = normalizeMenuItemsContract(entries);
    }
  }

  return {
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    menus,
  };
}

/**
 * Normalizes canonical `GET /wp-json/forgewp/v1/routes` or hydration
 * `resources.routes` payloads into `RoutesResource`, deriving `pageLinks`
 * from `routes[]` when omitted.
 */
export function normalizeRoutesResource(raw: any): RoutesResource | null {
  if (!raw || typeof raw !== 'object') return null;

  const routes: RouteRecordContract[] = [];
  if (Array.isArray(raw.routes)) {
    for (const r of raw.routes) {
      if (!r || typeof r !== 'object') continue;
      const routeId = String(r.routeId || r.slug || '').trim();
      if (!routeId) continue;
      routes.push({
        routeId,
        id: typeof r.id === 'number' ? r.id : 0,
        slug: String(r.slug || routeId),
        title: String(r.title || ''),
        path: String(r.path || '/'),
        permalink: String(r.permalink || r.path || '/'),
      });
    }
  }

  const pageLinks: Record<string, string> = {};
  for (const r of routes) {
    pageLinks[r.routeId] = r.path;
  }
  if (raw.pageLinks && typeof raw.pageLinks === 'object' && !Array.isArray(raw.pageLinks)) {
    for (const [k, v] of Object.entries(raw.pageLinks)) {
      if (typeof v === 'string' && v.trim()) {
        pageLinks[k] = v;
      }
    }
  }

  return {
    homeUrl: String(raw.homeUrl || ''),
    basePath: String(raw.basePath || ''),
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    routes,
    pageLinks,
  };
}

/**
 * Normalizes canonical `GET /wp-json/forgewp/v1/i18n` or hydration
 * `resources.i18n` payloads into `I18nResource`.
 */
export function normalizeI18nResource(raw: any): I18nResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const currentLanguage =
    typeof raw.currentLanguage === 'string' ? raw.currentLanguage.trim() : '';
  if (!currentLanguage) return null;

  const urls =
    raw.urls && typeof raw.urls === 'object' ? (raw.urls as Record<string, string>) : undefined;
  const homeUrls =
    raw.homeUrls && typeof raw.homeUrls === 'object'
      ? (raw.homeUrls as Record<string, string>)
      : undefined;
  const explicitLocales = Array.isArray(raw.locales)
    ? raw.locales.filter((l: unknown) => typeof l === 'string' && l.trim()).map((l: string) => l.trim())
    : [];
  const derivedLocales =
    explicitLocales.length > 0
      ? explicitLocales
      : urls && Object.keys(urls).length > 0
        ? Object.keys(urls)
        : [currentLanguage];
  const defaultLocale =
    typeof raw.defaultLocale === 'string' && raw.defaultLocale.trim()
      ? raw.defaultLocale.trim()
      : currentLanguage;

  return {
    currentLanguage,
    defaultLocale,
    locales: derivedLocales,
    translations:
      raw.translations && typeof raw.translations === 'object' ? raw.translations : {},
    ...(urls ? { urls } : {}),
    ...(homeUrls ? { homeUrls } : {}),
  };
}
