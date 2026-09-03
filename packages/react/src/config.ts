/**
 * @forgewp/react/config
 *
 * Pure-TypeScript, JSX-free helpers for wp.config.ts and cms/site-options.ts.
 * Safe to import at build time via jiti without needing JSX transformation.
 */

export type WpOptionField = {
  _type: 'text' | 'url' | 'email' | 'textarea' | 'toggle' | 'number' | 'postPicker';
  label?: string;
  default?: string;
  postType?: string;
  min?: number;
  max?: number;
  step?: number;
  [key: string]: unknown;
};

export type WpOptionsSchema = Record<string, WpOptionField>;

/** Plain text input field. */
export function optionText(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'text' };
}

/** URL input field (sanitized with esc_url_raw server-side). */
export function optionUrl(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'url' };
}

/** Email input field. */
export function optionEmail(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'email' };
}

/** Multi-line textarea field. */
export function optionTextarea(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'textarea' };
}

/** Checkbox / boolean toggle field. */
export function optionToggle(config: Omit<WpOptionField, '_type'> = {}): WpOptionField {
  return { ...config, _type: 'toggle' };
}

/** Numeric input field. */
export function optionNumber(
  config: Omit<WpOptionField, '_type'> & { min?: number; max?: number; step?: number } = {}
): WpOptionField {
  return { ...config, _type: 'number' };
}

/**
 * Searchable post picker field — renders a Select2 AJAX-powered dropdown
 * in the Theme Options admin page that searches posts of the given post type.
 */
export function optionPostPicker(
  config: Omit<WpOptionField, '_type'> & { postType: string }
): WpOptionField {
  return { ...config, _type: 'postPicker' };
}

/**
 * Declare site-wide WordPress option metadata for the auto-generated
 * Appearance → Theme Options admin page.
 *
 * Place this in `cms/site-options.ts` (one file, one call per project).
 * The compiler reads this at build time — it has zero effect at runtime.
 *
 * @example
 * ```ts
 * import { defineWpOptions, optionPostPicker, optionText, optionUrl } from '@forgewp/react/config';
 *
 * export const siteOptions = defineWpOptions({
 *   hotel_of_the_month: optionPostPicker({ postType: 'hotel', label: 'Hotel of the Month', default: '6' }),
 *   contact_phone:      optionText({ label: 'Contact Phone' }),
 *   social_facebook:    optionUrl({ label: 'Facebook URL' }),
 * });
 * ```
 */
export function defineWpOptions(schema: WpOptionsSchema): WpOptionsSchema {
  // Runtime no-op — compiler reads source files statically.
  return schema;
}

export type WpFormFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';

export interface WpFormField {
  type: WpFormFieldType;
  label?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
  placeholder?: string;
}

export type WpFormFieldSeed = Array<WpFormField & { name: string }>;

export interface WpFormClientFieldsConfig {
  enabled: boolean;
  /**
   * Initial client-owned field set. A flat array is used for every configured
   * locale (fine for a single-language theme, or as a same-content starting
   * point before translating). For a theme with `i18n.locales.length > 1`,
   * provide a per-locale map instead so each language seeds independently.
   */
  seed: WpFormFieldSeed | Record<string, WpFormFieldSeed>;
}

export interface WpFormConfig {
  /**
   * 'native' (default): ForgeWP generates the REST endpoint, mail delivery,
   * optional submission storage, and the wp-admin field editor. Requires
   * `mailTo` and `fields`.
   *
   * 'shortcode': escape hatch for clients who want to self-manage a form
   * entirely inside a WordPress plugin (CF7, WPForms, Gravity…). Requires
   * `shortcode`. `mailTo`, `fields`, `clientFields`, and `storeSubmissions`
   * are ignored.
   */
  mode?: 'native' | 'shortcode';
  /** Default/example shortcode string for 'shortcode' mode. */
  shortcode?: string;
  /** 'admin' → get_option('admin_email'); a literal email; or 'option:some_key'. */
  mailTo?: string;
  /** Email subject line. Supports {field} interpolation from submitted values. */
  subject?: string;
  /** Dev-owned fields — the fixed part of the server-side allowlist. Required in 'native' mode. */
  fields?: Record<string, WpFormField>;
  clientFields?: WpFormClientFieldsConfig;
  /** Store each submission in the forgewp_submission CPT (client inbox). Default true. */
  storeSubmissions?: boolean;
}

/**
 * Declares one form's server-side contract — REST endpoint, mail delivery,
 * optional submission storage, and the wp-admin client-field editor.
 *
 * Place one call per file in `cms/forms/{form-name}.ts` (the filename becomes
 * the form's key, matching `cms/editables/{slug}.ts`'s convention) — the
 * compiler discovers every file in that directory automatically, so there's
 * no need to also list the form under `forms` in `wp.config.ts`.
 *
 * @example
 * ```ts
 * // cms/forms/contact.ts
 * import { defineWpForm } from '@forgewp/react/config';
 *
 * export const form = defineWpForm({
 *   mailTo: 'admin',
 *   subject: 'New contact form submission',
 *   fields: {
 *     name: { type: 'text', label: 'Name', required: true },
 *     email: { type: 'email', label: 'Email', required: true },
 *   },
 * });
 * ```
 */
export function defineWpForm(config: WpFormConfig): WpFormConfig {
  // Runtime no-op — the compiler reads source files statically.
  return config;
}

/**
 * Configuration options for a page component declared via `export const pageConfig`.
 */
export interface PageConfig {
  /**
   * Layout identifier to wrap this page with.
   * Resolves to `src/app/layouts/{layout}.tsx`.
   * Set to `'blank'` or `false` to render the page without any header/footer shell.
   * @default 'default'
   */
  layout?: string | false;

  /**
   * Whether to include the WordPress theme header on this page.
   * Can be a boolean or a custom header template name (e.g. `'minimal'`).
   * @default true
   */
  header?: boolean | string;

  /**
   * Whether to include the WordPress theme footer on this page.
   * Can be a boolean or a custom footer template name (e.g. `'minimal'`).
   * @default true
   */
  footer?: boolean | string;

  /**
   * Whether this page requires user authentication to access.
   * @default false
   */
  protected?: boolean;

  /**
   * Required user role(s) or capabilities to access this page.
   */
  allowed?: string | string[];

  /**
   * URL to redirect unauthorized visitors to.
   * @default '/login'
   */
  redirect?: string;

  [key: string]: any;
}

/**
 * Type-safe helper for declaring page configuration.
 *
 * @example
 * ```tsx
 * // src/app/pages/landing.tsx
 * import { definePageConfig } from '@forgewp/react';
 *
 * export const pageConfig = definePageConfig({
 *   layout: 'blank', // or header: false, footer: false
 * });
 * ```
 */
export function definePageConfig(config: PageConfig): PageConfig {
  return config;
}

// ── 5. CMS Seed & Mock Data Typing Helpers ────────────────────────────────────

export interface WpPostBase {
  id: number;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  date?: string;
  modified?: string;
  featuredImage?:
    | string
    | {
        id?: number;
        url: string;
        alt?: string;
        title?: string;
        caption?: string;
        width?: number;
        height?: number;
        sizes?: Record<string, { url: string; width?: number; height?: number }>;
        [key: string]: any;
      };
  status?: 'publish' | 'draft' | 'pending' | 'private' | 'trash' | string;
  _terms?: Record<string, Array<{ id?: number; slug: string; name: string }>>;
  meta?: Record<string, any>;
  [key: string]: any;
}

export type WpPostsConfig<TCustom = Record<string, any>> = {
  post?: WpPostBase[];
  page?: WpPostBase[];
} & {
  [K in keyof TCustom]?: Array<WpPostBase & TCustom[K]>;
} & {
  [postType: string]: any[];
};

/**
 * Type-safe helper for declaring WordPress posts, pages, and custom post type seeds
 * in `cms/mock-data.ts`.
 *
 * Provides strict autocomplete for core WordPress post fields (`title`, `excerpt`,
 * `content`, `featuredImage`, `_terms`), while allowing open custom meta fields for
 * custom post types (e.g. `project`, `event`, `property`).
 *
 * @example
 * ```ts
 * // cms/mock-data.ts
 * import { defineWpPosts } from '@forgewp/react/config';
 *
 * export const mockData = defineWpPosts({
 *   post: [
 *     { id: 1, slug: 'hello-world', title: 'Hello World', content: '<p>Welcome</p>' }
 *   ],
 *   project: [
 *     { id: 10, slug: 'loft', title: 'Loft', client: 'Studio A', year: 2026 }
 *   ]
 * });
 * ```
 */
export function defineWpPosts<TCustom = Record<string, any>>(
  posts: WpPostsConfig<TCustom>
): WpPostsConfig<TCustom> {
  return posts;
}

export interface WpMenuItem {
  id?: number | string;
  title: string;
  url: string;
  target?: '_blank' | '_self' | string;
  classes?: string[] | string;
  badge?: string;
  image?: string;
  description?: string;
  attrTitle?: string;
  children?: WpMenuItem[];
  [key: string]: any;
}

/**
 * Type-safe helper for declaring navigation menu trees in `cms/menus.ts`.
 * Supports hierarchical child items and custom menu attributes.
 *
 * @example
 * ```ts
 * // cms/menus.ts
 * import { defineWpMenus } from '@forgewp/react/config';
 *
 * export const menus = defineWpMenus({
 *   primary: [
 *     { title: 'Shop', url: '/shop' },
 *     {
 *       title: 'Categories',
 *       url: '/categories',
 *       children: [
 *         { title: 'Furniture', url: '/category/furniture' }
 *       ]
 *     }
 *   ],
 *   footer: [
 *     { title: 'Privacy Policy', url: '/privacy' }
 *   ]
 * });
 * ```
 */
export function defineWpMenus(
  menus: Record<string, WpMenuItem[]>
): Record<string, WpMenuItem[]> {
  return menus;
}

export interface WpUserSeed {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  roles: Array<
    'administrator' | 'editor' | 'author' | 'contributor' | 'subscriber' | 'customer' | string
  >;
  avatarUrl?: string;
  emailVerified?: boolean;
  [key: string]: any;
}

/**
 * Type-safe helper for declaring mock authentication users in `cms/users.ts`.
 */
export function defineWpUsers(users: WpUserSeed[]): WpUserSeed[] {
  return users;
}

/**
 * Type-safe helper for declaring custom role capability matrices in `cms/roles.ts`.
 */
export function defineWpRoles(
  roles: Record<string, string[]>
): Record<string, string[]> {
  return roles;
}

/**
 * Type-safe helper for declaring i18n localization dictionary strings in `cms/translations.ts`.
 */
export function defineTranslations(
  translations: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
  return translations;
}

/**
 * Type-safe helper for declaring WordPress Customizer theme modifications in `cms/theme-mods.ts`.
 */
export function defineWpThemeMods<T extends Record<string, any>>(mods: T): T {
  return mods;
}

export type ForgeWPSeedStrategy = boolean | 'once' | 'upsert' | 'force';

export interface ForgeWPSeedConfig {
  /**
   * Sync local products from `cms/products.ts` (or `products.json`) into WooCommerce.
   * Default: false
   */
  products?: ForgeWPSeedStrategy;
  /**
   * Sync mock posts, pages, and CPTs from `cms/mock-data.ts` (or `mock-data.json`).
   * Default: false
   */
  mockData?: ForgeWPSeedStrategy | Record<string, ForgeWPSeedStrategy>;
  /**
   * Automatically sideload remote CDN image URLs into the WordPress Media Library.
   * Default: true
   */
  sideloadImages?: boolean;
  /**
   * Safety guard: Only execute when WP_DEBUG is true or in development environments.
   * Default: true
   */
  developmentOnly?: boolean;
}


