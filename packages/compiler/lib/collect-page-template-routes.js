function normalizePagePath(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    return '';
  }

  const path = url.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
  return path;
}

function pathToTemplateSlug(path) {
  return path.split('/').filter(Boolean).join('-').toLowerCase();
}

function titleToTemplateSlug(title) {
  const componentName =
    String(title)
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') + 'Page';

  return componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function flattenMenuItems(items, output = []) {
  if (!Array.isArray(items)) return output;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    output.push(item);
    flattenMenuItems(item.children, output);
  }

  return output;
}

/**
 * Maps compiled Page templates to their matching menu route and removes
 * duplicate templates that describe the same WordPress page path.
 */
export function collectPageTemplateRoutes(templateSlugs, menus = {}) {
  const items = Object.entries(menus)
    .filter(([location]) => !location.startsWith('_'))
    .flatMap(([, menuItems]) => flattenMenuItems(menuItems));
  const routes = new Map();

  for (const templateSlug of templateSlugs) {
    let matchedRoute = null;

    for (const item of items) {
      const path = normalizePagePath(item.url);
      if (!path) continue;

      if (titleToTemplateSlug(item.title) === templateSlug) {
        matchedRoute = {
          title: item.title,
          slug: path,
          score: 4,
        };
        break;
      }

      const routeSlug = pathToTemplateSlug(path);
      const templateRouteSlug = templateSlug.endsWith('-page')
        ? templateSlug.slice(0, -5)
        : templateSlug;
      if (routeSlug === templateRouteSlug) {
        matchedRoute = {
          title: item.title,
          slug: path,
          score: templateSlug.endsWith('-page') ? 3 : 2,
        };
        break;
      }
    }

    const fallbackSlug = templateSlug.endsWith('-page')
      ? templateSlug.slice(0, -5)
      : templateSlug;
    const route = matchedRoute || {
      title: fallbackSlug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      slug: fallbackSlug,
      score: 0,
    };
    const existing = routes.get(route.slug);

    if (!existing || route.score > existing.score) {
      routes.set(route.slug, {
        title: route.title,
        slug: route.slug,
        template: `page-${templateSlug}.php`,
        score: route.score,
      });
    }
  }

  return Array.from(routes.values(), ({ score, ...route }) => route);
}
