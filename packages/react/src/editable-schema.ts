/**
 * Pure-TypeScript, JSX-free editable schema helpers for `@forgewp/react`.
 * Shared across client hooks (`@forgewp/react`), Next.js Server Components
 * (`@forgewp/react/server`), and config helpers (`@forgewp/react/config`).
 */

export interface FieldBase<T> {
  type:
    | 'text'
    | 'richText'
    | 'image'
    | 'repeater'
    | 'boolean'
    | 'color'
    | 'url'
    | 'select'
    | 'number'
    | 'icon';
  label?: string;
  default?: T;
  description?: string;
  required?: boolean;
  customType?: string;
  skipRegisterMeta?: boolean;
  postTypes?: string[];
}

export interface TextField extends FieldBase<string> {
  type: 'text';
}

export interface RichTextField extends FieldBase<string> {
  type: 'richText';
}

export interface ImageFieldVal {
  id?: number;
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface ImageField extends FieldBase<ImageFieldVal | string> {
  type: 'image';
}

export interface BooleanField extends FieldBase<boolean> {
  type: 'boolean';
}

export interface ColorField extends FieldBase<string> {
  type: 'color';
}

export interface UrlField extends FieldBase<string> {
  type: 'url';
}

export interface SelectField extends FieldBase<string> {
  type: 'select';
  options: (string | { label: string; value: string })[];
}

export interface NumberField extends FieldBase<number> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Icon slug stored as a string (e.g. "award", "map-pin").
 * Optional `options` allowlist limits the block-editor picker.
 */
export interface IconField extends FieldBase<string> {
  type: 'icon';
  /** Allowlist of icon slugs for the picker. Omit for the curated ForgeWP default set. */
  options?: string[];
  /** Icon library / package. Defaults to `lucide`. */
  provider?: string;
}

/** Fixed = locked row count (usually default.length). Dynamic = editors may add/remove/reorder within min/max. */
export type RepeaterMode = 'fixed' | 'dynamic';

export interface RepeaterField<
  T extends Record<string, any> = Record<string, any>,
> extends FieldBase<T[]> {
  type: 'repeater';
  fields: Record<keyof T, EditableField>;
  /**
   * `fixed` — row count locked (no add/remove/reorder that changes cardinality).
   * `dynamic` — editors may add/remove/reorder rows in the block sidebar.
   * @default 'dynamic'
   */
  mode?: RepeaterMode;
  /** Minimum rows when mode is `dynamic`. Ignored for fixed (uses default length). */
  min?: number;
  /** Maximum rows when mode is `dynamic`. Omit for unlimited. */
  max?: number;
}

export type EditableField =
  | TextField
  | RichTextField
  | ImageField
  | BooleanField
  | RepeaterField
  | ColorField
  | UrlField
  | SelectField
  | NumberField
  | IconField;

export type EditableSchema = Record<string, EditableField>;

export type InferFieldType<F> = F extends TextField
  ? string
  : F extends RichTextField
    ? string
    : F extends ColorField
      ? string
      : F extends UrlField
        ? string
        : F extends SelectField
          ? string
          : F extends IconField
            ? string
            : F extends NumberField
              ? number
              : F extends BooleanField
                ? boolean
                : F extends ImageField
                  ? ImageFieldVal
                  : F extends RepeaterField<infer U>
                    ? U[]
                    : any;

export type InferAttributes<T extends EditableSchema> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

/**
 * Declares a structured editable content schema in ForgeWP.
 * Enforces type safety and acts as a compiler hook.
 */
export function defineEditable<T extends EditableSchema>(schema: T): T {
  return schema;
}

/**
 * Extract default values from a `defineEditable` schema.
 * One schema → one defaults object for ACF/page meta, SSR, and props.
 */
export function getEditableDefaults<T extends EditableSchema>(
  schema: T,
): InferAttributes<T> {
  const out = {} as Record<string, unknown>;
  for (const [key, field] of Object.entries(schema) as [
    string,
    EditableField,
  ][]) {
    if (
      field &&
      typeof field === 'object' &&
      'default' in field &&
      field.default !== undefined
    ) {
      out[key] = field.default;
      continue;
    }
    switch (field?.type) {
      case 'boolean':
        out[key] = false;
        break;
      case 'number':
        out[key] = 0;
        break;
      case 'repeater':
        out[key] = [];
        break;
      case 'image':
        out[key] = '';
        break;
      default:
        out[key] = '';
    }
  }
  return out as InferAttributes<T>;
}

/**
 * One section contribution when composing a baked page schema from shared
 * block/section editables (see `cms/editables/`).
 */
export interface PageEditableSectionSource {
  /** Section schema from `defineEditable` (block-native keys) */
  schema: EditableSchema;
  /** Meta key prefix for ACF uniqueness on one page */
  prefix?: string;
  /** Optional renames: sectionKey → page suffix (after prefix) */
  rename?: Record<string, string>;
}

/**
 * Flatten section schemas into one page-level `defineEditable` schema.
 */
export function buildPageEditable(
  sections: PageEditableSectionSource[],
): EditableSchema {
  const out: EditableSchema = {};
  for (const { schema, prefix = '', rename = {} } of sections) {
    for (const [key, field] of Object.entries(schema)) {
      const suffix = rename[key] ?? key;
      const pageKey = `${prefix}${suffix}`;
      out[pageKey] = field;
    }
  }
  return out;
}

/**
 * Pick / rename fields from a page (or other) schema for a block attribute bag.
 */
export function pickEditable<T extends EditableSchema>(
  schema: T,
  map:
    | Partial<Record<string, keyof T & string>>
    | readonly (keyof T & string)[],
): EditableSchema {
  const out: EditableSchema = {};
  if (Array.isArray(map)) {
    for (const key of map) {
      const field = schema[key as string];
      if (field) out[key as string] = field;
    }
    return out;
  }
  for (const [attrKey, schemaKey] of Object.entries(map)) {
    if (!schemaKey) continue;
    const field = schema[schemaKey as string];
    if (field) out[attrKey] = field;
  }
  return out;
}

/**
 * Merge multiple editable schemas into one block attribute bag.
 */
export function mergeEditable(...parts: EditableSchema[]): EditableSchema {
  const out: EditableSchema = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    Object.assign(out, part);
  }
  return out;
}

export function text(options: Omit<TextField, 'type'> = {}): TextField {
  return { type: 'text', ...options };
}

export function richText(
  options: Omit<RichTextField, 'type'> = {},
): RichTextField {
  return { type: 'richText', ...options };
}

export function image(options: Omit<ImageField, 'type'> = {}): ImageField {
  return { type: 'image', ...options };
}

export function boolean(
  options: Omit<BooleanField, 'type'> = {},
): BooleanField {
  return { type: 'boolean', ...options };
}

export function color(options: Omit<ColorField, 'type'> = {}): ColorField {
  return { type: 'color', ...options };
}

export function url(options: Omit<UrlField, 'type'> = {}): UrlField {
  return { type: 'url', ...options };
}

export function select(options: Omit<SelectField, 'type'>): SelectField {
  return { type: 'select', ...options };
}

export function number(options: Omit<NumberField, 'type'> = {}): NumberField {
  return { type: 'number', ...options };
}

export function icon(options: Omit<IconField, 'type'> = {}): IconField {
  return { type: 'icon', provider: 'lucide', ...options };
}

export function repeater<T extends Record<string, any>>(
  options: Omit<RepeaterField<T>, 'type'>,
): RepeaterField<T> {
  const mode = options.mode ?? 'dynamic';
  return { type: 'repeater', ...options, mode };
}
