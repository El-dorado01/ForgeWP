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

/**
 * Canonical `auth-me` resource contract (docs/resource-contracts.md §9).
 */
export interface AuthMeUserContract {
  id: number;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  roles: string[];
  capabilities: string[];
  emailVerified?: boolean;
  [key: string]: unknown;
}

export interface AuthMeResource {
  authenticated: boolean;
  user: AuthMeUserContract | null;
}

/**
 * Canonical `post` / `posts` contracts (docs/resource-contracts.md §10, §12a).
 */
export interface PostAuthorContract {
  id: number;
  name: string;
}

export interface PostImageContract {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  srcset?: string;
}

export interface PostTermRefContract {
  id: number;
  slug: string;
  name: string;
  path: string;
}

export interface PostBlockContract {
  blockName: string | null;
  attrs?: Record<string, unknown>;
  innerHTML?: string;
  innerBlocks?: PostBlockContract[];
}

export interface PostResource {
  id: number;
  type: string;
  slug: string;
  lang?: string;
  /** Entity-decoded plain text (no HTML entities, §12a). */
  title: string;
  /** Rendered HTML (`the_excerpt` filters). */
  excerpt: string;
  /** Rendered HTML (`the_content` filters; omitted on list items). */
  content?: string;
  date: string;
  modified: string;
  permalink: string;
  path: string;
  author: PostAuthorContract | null;
  featuredImage: PostImageContract | null;
  terms: Record<string, PostTermRefContract[]>;
  /** Only ForgeWP-registered public meta keys (omitted on list items). */
  fields?: Record<string, unknown>;
  /** Gutenberg blocks for `<BlockArea>` parity (present on single posts, §12a). */
  blocks?: PostBlockContract[];
  protected: boolean;
}

export interface PostsListResource {
  type: string;
  lang?: string;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  items: PostResource[];
}

/**
 * Canonical `terms` / `term` contracts (docs/resource-contracts.md §11).
 */
export interface TermResource {
  id: number;
  taxonomy?: string;
  lang?: string;
  slug: string;
  name: string;
  description: string;
  count: number;
  parent: number;
  path: string;
  permalink: string;
}

export interface TermsListResource {
  taxonomy: string;
  lang?: string;
  items: TermResource[];
}

/**
 * Canonical `comments` contracts (docs/resource-contracts.md §12, §12a).
 */
export interface CommentAuthorContract {
  name: string;
  avatarUrl?: string;
  url?: string;
}

export interface CommentResource {
  id: number;
  parentId: number;
  author: CommentAuthorContract;
  date: string;
  content: string;
  children: CommentResource[];
}

export interface CommentsListResource {
  post: number;
  open: boolean;
  page: number;
  perPage: number;
  total: number;
  items: CommentResource[];
}

export interface ForgeWpResourceMap {
  'site-settings': SiteSettingsResource;
  forms: FormsCollectionResource;
  menus: MenusCollectionResource;
  routes: RoutesResource;
  i18n: I18nResource;
  seo: Record<string, any>;
  editables: Record<string, any>;
  'auth-me': AuthMeResource;
  post: PostResource;
  posts: PostsListResource;
  term: TermResource;
  terms: TermsListResource;
  comments: CommentsListResource;
}

export type ForgeWpResourceName = keyof ForgeWpResourceMap;

export interface ForgeWpResourceParams {
  /** Optional single-item path segment (e.g. form slug, menu location, `post/slug`, `category/news`). */
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
  post: defineResource({
    name: 'post',
    restPath: '/posts',
    cacheTags: ['posts'],
    auth: 'public',
  }),
  posts: defineResource({
    name: 'posts',
    restPath: '/posts',
    cacheTags: ['posts'],
    auth: 'public',
  }),
  term: defineResource({
    name: 'term',
    restPath: '/terms',
    cacheTags: ['terms'],
    auth: 'public',
  }),
  terms: defineResource({
    name: 'terms',
    restPath: '/terms',
    cacheTags: ['terms'],
    auth: 'public',
  }),
  comments: defineResource({
    name: 'comments',
    restPath: '/comments',
    cacheTags: ['comments'],
    auth: 'public',
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

/**
 * Normalizes canonical `GET /wp-json/forgewp/v1/auth/me` or hydration
 * `resources['auth-me']` payloads into `AuthMeResource` (docs/resource-contracts.md §9).
 * Always fails closed to `{ authenticated: false, user: null }` on invalid/missing payloads.
 */
export function normalizeAuthMeResource(raw: any): AuthMeResource {
  if (!raw || typeof raw !== 'object') {
    return { authenticated: false, user: null };
  }
  const rawUser = raw.user;
  const isAuthenticated =
    raw.authenticated === true &&
    Boolean(rawUser && typeof rawUser === 'object' && !Array.isArray(rawUser));

  if (!isAuthenticated) {
    return { authenticated: false, user: null };
  }

  const roles = Array.isArray(rawUser.roles)
    ? rawUser.roles.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim())
    : [];
  const capabilities = Array.isArray(rawUser.capabilities)
    ? rawUser.capabilities
        .filter((c: unknown) => typeof c === 'string' && c.trim())
        .map((c: string) => c.trim())
    : rawUser.capabilities && typeof rawUser.capabilities === 'object'
      ? Object.entries(rawUser.capabilities)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([cap]) => cap)
      : [];

  return {
    authenticated: true,
    user: {
      ...rawUser,
      id: typeof rawUser.id === 'number' ? rawUser.id : Number(rawUser.id || 0),
      username: String(rawUser.username || ''),
      displayName: String(rawUser.displayName || rawUser.username || ''),
      roles,
      capabilities,
    },
  };
}

/**
 * Checks whether an `AuthMeResource` satisfies an optional `allowed` role/capability
 * requirement (any-of matching across `user.roles` and `user.capabilities`).
 */
export function isAuthMeAllowed(
  auth: AuthMeResource | null | undefined,
  allowed?: string | string[],
): boolean {
  if (!auth || !auth.authenticated || !auth.user) {
    return false;
  }
  const required = (Array.isArray(allowed) ? allowed : typeof allowed === 'string' ? allowed.split(',') : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (required.length === 0) {
    return true;
  }
  const roleSet = new Set(auth.user.roles || []);
  const capSet = new Set(auth.user.capabilities || []);
  return required.some((entry) => roleSet.has(entry) || capSet.has(entry));
}

function decodePlainTextEntities(value: string): string {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Normalizes a single post or list item into `PostResource` (`docs/resource-contracts.md` §10, §12a).
 */
export function normalizePostResource(
  raw: any,
  opts: { isListItem?: boolean; fallbackType?: string } = {},
): PostResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const slug = String(raw.slug || '').trim();
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id || 0);
  if (!slug && !id) return null;

  const isProtected = raw.protected === true;
  const rawTitle =
    typeof raw.title === 'object' && raw.title !== null
      ? raw.title.rendered ?? raw.title.raw ?? ''
      : raw.title ?? '';
  const rawExcerpt =
    typeof raw.excerpt === 'object' && raw.excerpt !== null
      ? raw.excerpt.rendered ?? ''
      : raw.excerpt ?? '';
  const rawContent =
    typeof raw.content === 'object' && raw.content !== null
      ? raw.content.rendered ?? ''
      : raw.content;

  let author: PostAuthorContract | null = null;
  if (raw.author && typeof raw.author === 'object') {
    author = {
      id: typeof raw.author.id === 'number' ? raw.author.id : Number(raw.author.id || 0),
      name: String(raw.author.name || ''),
    };
  } else if (typeof raw.author === 'string' && raw.author.trim()) {
    author = { id: 0, name: raw.author.trim() };
  }

  let featuredImage: PostImageContract | null = null;
  if (raw.featuredImage && typeof raw.featuredImage === 'object' && raw.featuredImage.url) {
    featuredImage = {
      url: String(raw.featuredImage.url),
      alt: String(raw.featuredImage.alt || ''),
      ...(typeof raw.featuredImage.width === 'number' ? { width: raw.featuredImage.width } : {}),
      ...(typeof raw.featuredImage.height === 'number' ? { height: raw.featuredImage.height } : {}),
      ...(typeof raw.featuredImage.srcset === 'string' && raw.featuredImage.srcset
        ? { srcset: raw.featuredImage.srcset }
        : {}),
    };
  } else if (typeof raw.featuredImage === 'string' && raw.featuredImage.trim()) {
    featuredImage = { url: raw.featuredImage.trim(), alt: '' };
  }

  const terms: Record<string, PostTermRefContract[]> = {};
  if (raw.terms && typeof raw.terms === 'object' && !Array.isArray(raw.terms)) {
    for (const [tax, list] of Object.entries(raw.terms)) {
      if (!Array.isArray(list)) continue;
      terms[tax] = list
        .filter((t) => t && typeof t === 'object')
        .map((t: any) => ({
          id: typeof t.id === 'number' ? t.id : Number(t.id || 0),
          slug: String(t.slug || ''),
          name: decodePlainTextEntities(String(t.name || '')),
          path: String(t.path || `/${tax}/${t.slug || ''}/`),
        }));
    }
  }

  const permalink = String(raw.permalink || raw.path || '/');
  const resolvedPath =
    typeof raw.path === 'string' && raw.path.trim()
      ? raw.path.trim()
      : permalink.startsWith('/')
        ? permalink
        : `/${slug || id}`;

  const out: PostResource = {
    id,
    type: String(raw.type || raw.postType || opts.fallbackType || 'post'),
    slug,
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    title: decodePlainTextEntities(String(rawTitle)),
    excerpt: isProtected ? '' : String(rawExcerpt || ''),
    date: String(raw.date || ''),
    modified: String(raw.modified || raw.date || ''),
    permalink,
    path: resolvedPath,
    author,
    featuredImage,
    terms,
    protected: isProtected,
  };

  if (!opts.isListItem) {
    out.content = isProtected ? '' : String(rawContent ?? '');
    if (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)) {
      out.fields = { ...raw.fields };
    } else if (raw.customFields && typeof raw.customFields === 'object' && !Array.isArray(raw.customFields)) {
      out.fields = { ...raw.customFields };
    } else {
      out.fields = {};
    }
    out.blocks = Array.isArray(raw.blocks)
      ? raw.blocks
      : Array.isArray(raw.forgewp_blocks)
        ? raw.forgewp_blocks
        : [];
  }

  return out;
}

/**
 * Normalizes `GET /wp-json/forgewp/v1/posts` or `resources.posts` into `PostsListResource`.
 */
export function normalizePostsListResource(
  raw: any,
  fallbackType = 'post',
): PostsListResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : null;
  if (!rawItems) return null;

  const type = String(raw.type || fallbackType || 'post');
  const items: PostResource[] = [];
  for (const entry of rawItems) {
    const normalized = normalizePostResource(entry, { isListItem: true, fallbackType: type });
    if (normalized) items.push(normalized);
  }

  const page = typeof raw.page === 'number' && raw.page > 0 ? raw.page : 1;
  const perPage =
    typeof raw.perPage === 'number' && raw.perPage > 0
      ? Math.min(raw.perPage, 100)
      : Math.max(items.length, 10);
  const total = typeof raw.total === 'number' && raw.total >= 0 ? raw.total : items.length;
  const totalPages =
    typeof raw.totalPages === 'number' && raw.totalPages >= 0
      ? raw.totalPages
      : total > 0
        ? Math.ceil(total / perPage)
        : 0;

  return {
    type,
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    page,
    perPage,
    total,
    totalPages,
    items,
  };
}

/**
 * Normalizes a single taxonomy term into `TermResource` (`docs/resource-contracts.md` §11).
 */
export function normalizeTermResource(
  raw: any,
  fallbackTaxonomy?: string,
): TermResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const slug = String(raw.slug || '').trim();
  const name = decodePlainTextEntities(String(raw.name || ''));
  if (!slug && !name) return null;
  const taxonomy =
    typeof raw.taxonomy === 'string' && raw.taxonomy.trim()
      ? raw.taxonomy.trim()
      : fallbackTaxonomy;
  const pathVal =
    typeof raw.path === 'string' && raw.path.trim()
      ? raw.path.trim()
      : taxonomy
        ? `/${taxonomy}/${slug}/`
        : `/${slug}/`;

  return {
    id: typeof raw.id === 'number' ? raw.id : Number(raw.id || 0),
    ...(taxonomy ? { taxonomy } : {}),
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    slug,
    name,
    description: String(raw.description || ''),
    count: typeof raw.count === 'number' ? raw.count : Number(raw.count || 0),
    parent: typeof raw.parent === 'number' ? raw.parent : Number(raw.parent || 0),
    path: pathVal,
    permalink: String(raw.permalink || pathVal),
  };
}

/**
 * Normalizes `GET /wp-json/forgewp/v1/terms/<taxonomy>` into `TermsListResource`.
 */
export function normalizeTermsListResource(
  raw: any,
  fallbackTaxonomy = 'category',
): TermsListResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : null;
  if (!rawItems) return null;
  const taxonomy = String(raw.taxonomy || fallbackTaxonomy || 'category');
  const items: TermResource[] = [];
  for (const entry of rawItems) {
    const normalized = normalizeTermResource(entry, taxonomy);
    if (normalized) items.push(normalized);
  }
  return {
    taxonomy,
    ...(typeof raw.lang === 'string' && raw.lang.trim() ? { lang: raw.lang.trim() } : {}),
    items,
  };
}

/**
 * Normalizes a single comment (and its threaded `children`) into `CommentResource` (§12).
 */
export function normalizeCommentResource(raw: any): CommentResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id || 0);
  const rawAuthor = raw.author && typeof raw.author === 'object' ? raw.author : {};
  const author: CommentAuthorContract = {
    name: decodePlainTextEntities(
      String(rawAuthor.name || raw.authorName || raw.author_name || 'Anonymous'),
    ),
    ...(typeof rawAuthor.avatarUrl === 'string' && rawAuthor.avatarUrl
      ? { avatarUrl: rawAuthor.avatarUrl }
      : {}),
    ...(typeof rawAuthor.url === 'string' ? { url: rawAuthor.url } : { url: '' }),
  };

  const children: CommentResource[] = [];
  if (Array.isArray(raw.children)) {
    for (const child of raw.children) {
      const normalized = normalizeCommentResource(child);
      if (normalized) children.push(normalized);
    }
  }

  return {
    id,
    parentId: typeof raw.parentId === 'number' ? raw.parentId : Number(raw.parentId ?? raw.parent ?? 0),
    author,
    date: String(raw.date || ''),
    content: String(raw.content || ''),
    children,
  };
}

/**
 * Normalizes `GET /wp-json/forgewp/v1/comments?post=<id>` into `CommentsListResource`.
 */
export function normalizeCommentsListResource(
  raw: any,
  fallbackPostId = 0,
): CommentsListResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : null;
  if (!rawItems) return null;

  const items: CommentResource[] = [];
  for (const entry of rawItems) {
    const normalized = normalizeCommentResource(entry);
    if (normalized) items.push(normalized);
  }

  const page = typeof raw.page === 'number' && raw.page > 0 ? raw.page : 1;
  const perPage = typeof raw.perPage === 'number' && raw.perPage > 0 ? raw.perPage : 50;
  const total = typeof raw.total === 'number' && raw.total >= 0 ? raw.total : items.length;

  return {
    post: typeof raw.post === 'number' ? raw.post : Number(raw.post || fallbackPostId || 0),
    open: raw.open !== false,
    page,
    perPage,
    total,
    items,
  };
}
