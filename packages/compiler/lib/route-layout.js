/**
 * Resolve the layout a route actually renders with.
 *
 * Local React (`withLayout`) uses, in order: the route's explicit layout
 * argument, then `export const pageConfig` on the page module, then
 * `"default"`. The exporter must follow that same order. It must not infer
 * a shell from a component name — projects name their navigation whatever
 * they want, and a page that opts out of the default layout owns its tree.
 */

/**
 * @param {string} source
 * @returns {string | false | undefined}
 */
export function readPageConfigLayout(source) {
  if (!source) return undefined;
  const match = source.match(
    /export\s+const\s+pageConfig\s*=\s*(?:definePageConfig\s*\(\s*)?\{[\s\S]*?\blayout\s*:\s*(?:(['"])([^'"]+)\1|(false))\s*[,}]/,
  );
  if (!match) return undefined;
  if (match[3] === 'false' || match[2] === 'false') return false;
  return match[2];
}

/**
 * Layout declared on a `<Route path="...">`, including `withLayout(Page, { layout })`.
 * `undefined` means the route does not override the page module.
 *
 * @param {string} source
 * @param {string} routePath
 * @returns {string | false | undefined}
 */
export function readRouteLayout(source, routePath) {
  if (!source) return undefined;
  const routeRe = /<Route\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Route>)/g;
  let match;
  while ((match = routeRe.exec(source))) {
    const chunk = `${match[1] || ''}\n${match[2] || ''}`;
    const pathMatch = chunk.match(/\bpath\s*=\s*(?:\{)?\s*(['"])([^'"]*)\1/);
    if (!pathMatch || pathMatch[2] !== routePath) continue;
    const layoutMatch = chunk.match(
      /\blayout\s*:\s*(?:(['"])([^'"]+)\1|(false))\s*[,}]/,
    );
    if (!layoutMatch) return undefined;
    if (layoutMatch[3] === 'false' || layoutMatch[2] === 'false') return false;
    return layoutMatch[2];
  }
  return undefined;
}

/**
 * @param {{ pageSource?: string, routesSource?: string }} [sources]
 * @returns {string | false}
 */
export function resolveFrontPageLayout({
  pageSource = '',
  routesSource = '',
} = {}) {
  const routeLayout = readRouteLayout(routesSource, '/');
  if (routeLayout !== undefined) return routeLayout;
  const pageLayout = readPageConfigLayout(pageSource);
  if (pageLayout !== undefined) return pageLayout;
  return 'default';
}

/**
 * A blank layout renders the page by itself. The exported template has to
 * keep that whole tree (and its client state) instead of wrapping the
 * default header/footer around an extracted `<main>`.
 *
 * @param {string | false | undefined} layout
 * @returns {boolean}
 */
export function layoutOwnsDocument(layout) {
  return layout === false || layout === 'blank';
}
