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
