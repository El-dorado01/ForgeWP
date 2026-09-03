/**
 * Collects local page routes that exist in the React app (menus + routes.tsx)
 * but have no compiled custom template yet. These must still become WordPress
 * pages — otherwise redirect_canonical() guesses a similar CPT slug
 * (e.g. /about → /product/about-a-chair-aa51/).
 */

const RESERVED_FIRST_SEGMENTS = new Set([
  'product',
  'products',
  'product-category',
  'product-tag',
  'shop',
  'cart',
  'checkout',
  'my-account',
  'category',
  'categories',
  'tag',
  'author',
  'feed',
  'search',
  'wp-admin',
  'wp-json',
  'wp-content',
  'wp-includes',
]);

function titleFromSlug(slug) {
  const leaf = slug.split('/').filter(Boolean).pop() || slug;
  return leaf
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function consider(url, title, description, seen, out) {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/http')
  ) {
    return;
  }
  const pathOnly = trimmed.split('?')[0].split('#')[0];
  const slug = pathOnly.replace(/^\//, '').replace(/\/$/, '');
  if (!slug || slug.includes('/') || slug.includes(':') || slug.includes('*')) return;

  const first = slug.split('/')[0];
  if (RESERVED_FIRST_SEGMENTS.has(first)) return;
  if (seen.has(slug)) return;

  seen.add(slug);
  const entry = {
    slug,
    title: (title && String(title).trim()) || titleFromSlug(slug),
    template: 'page-placeholder.php',
  };
  if (description && String(description).trim()) {
    entry.description = String(description).trim();
  }
  out.push(entry);
}

function walkMenuItems(items, seen, out) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    consider(item.url, null, item.description || null, seen, out);
    if (item.children) walkMenuItems(item.children, seen, out);
  }
}

/**
 * @param {{ menus?: Record<string, any>, routesSource?: string, existingSlugs?: string[] }} opts
 * @returns {Array<{ slug: string, title: string, description?: string, template: string }>}
 */
export function collectFallbackPageRoutes({
  menus = {},
  routesSource = '',
  existingSlugs = [],
} = {}) {
  const seen = new Set(
    (existingSlugs || []).map((s) => String(s).replace(/^\/+|\/+$/g, '')).filter(Boolean),
  );
  const out = [];

  if (routesSource) {
    // Match either <Route ...>...</Route> blocks or self-closing <Route ... />
    const routeBlockRegex = /<Route\b([\s\S]*?)(?:<\/Route>|\/>)/gi;
    let match;
    while ((match = routeBlockRegex.exec(routesSource)) !== null) {
      const block = match[1];
      const pathMatch = block.match(/path\s*=\s*['"]\/([^'"`]+)['"]/i);
      if (pathMatch) {
        const titleMatch = block.match(/\btitle\s*[:=]\s*['"`]([^'"`]+)['"`]/i);
        const descMatch = block.match(/\bdescription\s*[:=]\s*['"`]([^'"`]+)['"`]/i);
        const title = titleMatch ? titleMatch[1] : null;
        const desc = descMatch ? descMatch[1] : null;
        consider('/' + pathMatch[1], title, desc, seen, out);
      }
    }

    // Fallback: any standalone path="/..." in routesSource not caught by block regex
    for (const m of routesSource.matchAll(/path\s*=\s*['"]\/([^'"`]+)['"]/g)) {
      consider('/' + m[1], null, null, seen, out);
    }
  }

  for (const [location, items] of Object.entries(menus || {})) {
    if (location.startsWith('_')) continue;
    walkMenuItems(items, seen, out);
  }

  return out;
}
