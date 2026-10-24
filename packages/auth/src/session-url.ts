/** API base without a trailing slash; append /wp-json/... at the call site. */
export function normalizeAuthBase(base: string): string {
  return base.replace(/\/+$/, '');
}
