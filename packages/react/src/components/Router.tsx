import * as React from 'react';

/**
 * Route matching context providing current route parameters to child components.
 */
export const RouteParamsContext = React.createContext<Record<string, string>>({});

/**
 * Context indicating whether an active client-side <Router> is wrapping the tree.
 */
export const RouterActiveContext = React.createContext<boolean>(false);

/**
 * Context for static/SSR location matching.
 */
export const StaticLocationContext = React.createContext<string | null>(null);

/**
 * Normalizes a URL path by stripping protocol/domain and trailing slashes (except root "/").
 */
export function normalizePath(path: string): string {
  if (!path) return '/';
  const withoutDomain = path.replace(/^(?:https?:\/\/[^\/]+)?/, '');
  const clean = withoutDomain.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Returns current URL pathname and a navigation function for client-side routing.
 */
export function useLocation(): [string, (to: string, options?: { replace?: boolean }) => void] {
  const isInsideRouter = React.useContext(RouterActiveContext);
  const staticLocation = React.useContext(StaticLocationContext);
  const [pathname, setPathname] = React.useState<string>(() => {
    if (staticLocation) return normalizePath(staticLocation);
    if (typeof window === 'undefined') return '/';
    return normalizePath(window.location.pathname);
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setPathname(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = React.useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    const currentOrigin = window.location.origin;
    const isInternal = to.startsWith('/') || to.startsWith(currentOrigin);
    const targetPath = to.startsWith(currentOrigin) ? to.slice(currentOrigin.length) : to;
    const currentRoot = normalizePath(window.location.pathname).split('/')[1] || '';
    const targetRoot = normalizePath(targetPath).split('/')[1] || '';

    // If inside <Router> or navigating within the same root section (e.g. /account -> /account/orders)
    if (isInsideRouter || (isInternal && currentRoot === targetRoot && currentRoot !== '')) {
      if (options?.replace) {
        window.history.replaceState(null, '', to);
      } else {
        window.history.pushState(null, '', to);
      }
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    if (options?.replace) {
      window.location.replace(to);
    } else {
      window.location.href = to;
    }
  }, [isInsideRouter]);

  return [pathname, navigate];
}

/**
 * Returns current URL query search string (e.g. "?sort=price&category=chairs").
 */
export function useSearch(): string {
  const [search, setSearch] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search || '';
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setSearch(window.location.search || '');
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  return search;
}

/**
 * Matches a URL path pattern (e.g. "/product/:slug") against the current pathname.
 */
export function matchPath(
  pattern: string,
  pathname: string
): { matches: boolean; params: Record<string, string> } {
  if (!pattern || pattern === '*') {
    return { matches: true, params: {} };
  }

  const normPattern = normalizePath(pattern);
  const normPath = normalizePath(pathname);

  if (normPattern === normPath) {
    return { matches: true, params: {} };
  }

  const patternSegments = normPattern.split('/').filter(Boolean);
  const pathSegments = normPath.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const pSeg = patternSegments[i];
    const uSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      const paramKey = pSeg.slice(1);
      params[paramKey] = decodeURIComponent(uSeg);
    } else if (pSeg.toLowerCase() !== uSeg.toLowerCase()) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}

/**
 * Hook to test if current location matches a pattern and retrieve extracted params.
 */
export function useRoute<T extends Record<string, string> = Record<string, string>>(
  pattern: string
): [boolean, T | null] {
  const [pathname] = useLocation();
  const { matches, params } = matchPath(pattern, pathname);
  return [matches, matches ? (params as T) : null];
}

/**
 * Hook to access route parameters extracted by the parent <Route>,
 * with automatic fallback resolution for native WordPress templates.
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const contextParams = React.useContext(RouteParamsContext) as T;
  if (contextParams && Object.keys(contextParams).length > 0) {
    return contextParams;
  }

  if (typeof window !== 'undefined') {
    const win = window as any;
    const postSlug = win.forgeWpHydration?.post?.slug;
    const pathname = normalizePath(window.location.pathname);
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';

    const fallbackParams: Record<string, string> = {};
    if (postSlug) {
      fallbackParams.slug = postSlug;
      fallbackParams.id = String(win.forgeWpHydration?.post?.id || postSlug);
    } else if (lastSegment) {
      fallbackParams.slug = decodeURIComponent(lastSegment);
      fallbackParams.id = decodeURIComponent(lastSegment);
    }

    return fallbackParams as T;
  }

  return {} as T;
}

export interface RouterProps {
  children?: React.ReactNode;
  location?: string;
}

/**
 * Top-level Router container component.
 */
export function Router({ children, location }: RouterProps) {
  return (
    <RouterActiveContext.Provider value={true}>
      <StaticLocationContext.Provider value={location || null}>
        {children}
      </StaticLocationContext.Provider>
    </RouterActiveContext.Provider>
  );
}

export interface RouteProps {
  path?: string;
  component?: React.ComponentType<any>;
  children?: React.ReactNode | ((params: Record<string, string>) => React.ReactNode);
}

/**
 * Declarative route matching component.
 */
export function Route({ path, component: Component, children }: RouteProps) {
  const [pathname] = useLocation();
  const { matches, params } = path ? matchPath(path, pathname) : { matches: true, params: {} };

  if (!matches) {
    return null;
  }

  return (
    <RouteParamsContext.Provider value={params}>
      {Component ? (
        <Component params={params} />
      ) : typeof children === 'function' ? (
        children(params)
      ) : (
        children
      )}
    </RouteParamsContext.Provider>
  );
}

export interface SwitchProps {
  children?: React.ReactNode;
}

/**
 * Renders ONLY the first matching child <Route>.
 */
export function Switch({ children }: SwitchProps) {
  const [pathname] = useLocation();

  const childArray = React.Children.toArray(children);

  for (const child of childArray) {
    if (!React.isValidElement(child)) continue;

    const routePath = (child.props as any)?.path;

    if (!routePath) {
      // Fallback route (no path prop specified)
      return child;
    }

    const { matches } = matchPath(routePath, pathname);
    if (matches) {
      return child;
    }
  }

  return null;
}
