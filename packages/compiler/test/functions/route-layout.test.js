/**
 * Layout resolution must follow the same order local React uses in
 * withLayout: the route argument, then the page module's pageConfig, then
 * "default". It must not depend on a component being named SiteNavigation.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  layoutOwnsDocument,
  readPageConfigLayout,
  readRouteLayout,
  resolveFrontPageLayout,
} from '../../lib/route-layout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const routes = `
<Route
  path='/'
  component={withLayout(HomePage, { layout: 'blank' })}
/>
<Route path={'/studio'} component={withLayout(StudioPage, { layout: false })} />
<Route path="/events" component={withLayout(EventsPage)} />
<Route path="/about">
  {withLayout(AboutPage, { layout: 'blank' })}
</Route>
`;

describe('readRouteLayout', () => {
  it('reads a blank override from a self-closing route, including path={\'/\'}', () => {
    expect(readRouteLayout(routes, '/')).toBe('blank');
    expect(readRouteLayout(routes, '/studio')).toBe(false);
  });

  it('returns undefined when the route does not set layout, so pageConfig can apply', () => {
    expect(readRouteLayout(routes, '/events')).toBeUndefined();
  });

  it('reads layout from a route body, not only from a component prop', () => {
    expect(readRouteLayout(routes, '/about')).toBe('blank');
  });

  it('returns undefined when the route is absent', () => {
    expect(readRouteLayout(routes, '/missing')).toBeUndefined();
    expect(readRouteLayout('', '/')).toBeUndefined();
  });
});

describe('readPageConfigLayout', () => {
  it('reads a string layout and a false layout', () => {
    expect(
      readPageConfigLayout(`export const pageConfig = { layout: 'default' };`),
    ).toBe('default');
    expect(
      readPageConfigLayout(
        `export const pageConfig = definePageConfig({ layout: 'blank' });`,
      ),
    ).toBe('blank');
    expect(
      readPageConfigLayout(`export const pageConfig = { layout: false };`),
    ).toBe(false);
  });

  it('returns undefined when the page module does not declare a layout', () => {
    expect(readPageConfigLayout(`export default function Page() {}`)).toBeUndefined();
  });
});

describe('resolveFrontPageLayout', () => {
  it('lets the route override beat pageConfig', () => {
    expect(
      resolveFrontPageLayout({
        pageSource: `export const pageConfig = { layout: 'default' };`,
        routesSource: routes,
      }),
    ).toBe('blank');
  });

  it('falls back to pageConfig, then to default', () => {
    expect(
      resolveFrontPageLayout({
        pageSource: `export const pageConfig = { layout: 'default' };`,
        routesSource: `<Route path="/events" component={withLayout(EventsPage)} />`,
      }),
    ).toBe('default');
    expect(resolveFrontPageLayout({ pageSource: '', routesSource: '' })).toBe(
      'default',
    );
  });
});

describe('layoutOwnsDocument', () => {
  it('is true only for blank and false', () => {
    expect(layoutOwnsDocument('blank')).toBe(true);
    expect(layoutOwnsDocument(false)).toBe(true);
    expect(layoutOwnsDocument('default')).toBe(false);
    expect(layoutOwnsDocument(undefined)).toBe(false);
  });
});

describe('shell contract is not a named-component special case', () => {
  const generateTheme = readFileSync(
    path.join(__dirname, '../../lib/generate-theme.js'),
    'utf8',
  );
  const renderTheme = readFileSync(
    path.join(__dirname, '../../lib/render-theme.mts'),
    'utf8',
  );

  it('does not reconstruct heroPassed or watch the first main section', () => {
    for (const src of [generateTheme, renderTheme]) {
      expect(src).not.toContain('heroPassed');
      expect(src).not.toContain('hero-aware');
      expect(src).not.toContain('heroAware');
      expect(src).not.toContain('SiteNavigation');
    }
  });

  it('hydrates the outermost island and leaves nested markers to that tree', () => {
    expect(generateTheme).toContain(
      'parent.hasAttribute("data-forgewp-hydrate")',
    );
  });

  it('accepts wrapped React component exports in both hydration runtimes', () => {
    const reactAdapter = readFileSync(
      path.join(__dirname, '../../lib/react-adapter.js'),
      'utf8',
    );
    for (const src of [generateTheme, reactAdapter]) {
      expect(src).toContain('isReactComponentType(module.default)');
      expect(src).toContain('Symbol.for("react.forward_ref")');
      expect(src).toContain('Symbol.for("react.memo")');
      expect(src).toContain('isReactComponentType(component)');
    }
  });
});
