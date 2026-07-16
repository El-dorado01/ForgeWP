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
