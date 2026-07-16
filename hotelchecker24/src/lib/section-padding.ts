/**
 * Vertical section padding — baked page defaults + block attribute map.
 *
 * Baked templates hardcode a default (usually `md`). Gutenberg blocks expose
 * the same tokens via a `select` field on the block schema only (mergeEditable),
 * never on cms/editables page ACF.
 */
export type SectionPaddingY = 'none' | 'sm' | 'md' | 'lg';

export const SECTION_PADDING_Y: Record<SectionPaddingY, string> = {
  none: '',
  sm: 'py-4 sm:py-6',
  md: 'py-8 sm:py-10',
  lg: 'py-12 sm:py-16',
};

/** Options for `select({ options })` on block-only paddingY fields. */
export const PADDING_Y_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
] as const;

export function sectionPaddingY(
  value?: string | null,
  fallback: SectionPaddingY = 'md',
): string {
  if (value && value in SECTION_PADDING_Y) {
    return SECTION_PADDING_Y[value as SectionPaddingY];
  }
  return SECTION_PADDING_Y[fallback];
}

/**
 * Page host: always the baked default.
 * Block host: attribute prop (from sidebar select).
 */
export function resolveBlockPaddingY(
  setAttributes: unknown,
  prop: string | undefined,
  bakedDefault: SectionPaddingY,
): SectionPaddingY {
  if (!setAttributes) return bakedDefault;
  if (prop && prop in SECTION_PADDING_Y) return prop as SectionPaddingY;
  return bakedDefault;
}
