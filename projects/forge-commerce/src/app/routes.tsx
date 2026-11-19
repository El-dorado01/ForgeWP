import type { ComponentType, ReactNode } from "react";
import { Route, Switch } from "@forgewp/react";
import HomePage from "./page";
import { ShopPage } from "./pages/ShopPage";

/**
 * Automatically discover all layouts in src/app/layouts via Vite eager glob.
 * Any layout file created (e.g. dashboard.tsx, auth.tsx, blank.tsx) is instantly
 * available without needing manual imports or registration.
 */
const layoutModules = import.meta.glob<Record<string, any>>('./layouts/*.{tsx,jsx,ts,js}', { eager: true });
const layouts: Record<string, ComponentType<{ children: ReactNode }>> = {};

for (const filePath in layoutModules) {
  const match = filePath.match(/\/([^/]+)\.(tsx|jsx|ts|js)$/);
  if (match) {
    const layoutName = match[1];
    const mod = layoutModules[filePath];
    const comp = mod.default || Object.values(mod).find((v) => typeof v === 'function');
    if (comp) {
      layouts[layoutName] = comp as ComponentType<{ children: ReactNode }>;
    }
  }
}

/**
 * Layout-aware wrapper for local React dev routing.
 * Resolves layout dynamically from `export const pageConfig = { layout: '...' }`
 */
function withLayout(componentOrModule: any, customConfig?: any) {
  return function PageWithLayout(props: any) {
    const Component =
      typeof componentOrModule === 'function'
        ? componentOrModule
        : componentOrModule?.default || (() => null);

    const config =
      customConfig ||
      componentOrModule?.pageConfig ||
      (Component as any)?.pageConfig ||
      {};

    const layoutKey = config.layout ?? 'default';

    if (layoutKey === false || layoutKey === 'blank') {
      const BlankLayout = layouts['blank'] || (({ children }: any) => <>{children}</>);
      return (
        <BlankLayout>
          <Component {...props} />
        </BlankLayout>
      );
    }

    const Layout = layouts[layoutKey] || layouts['default'] || (({ children }: any) => <>{children}</>);

    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
}

export default function AppRoutes() {
  const WrappedHomePage = withLayout(HomePage);
  const WrappedShopPage = withLayout(ShopPage);

  return (
    <Switch>
      {/* Home preview */}
      <Route path="/" component={WrappedHomePage} />
      <Route path="/shop" component={WrappedShopPage} />

      {/* Fallback route */}
      <Route>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
          <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
          <p className="mt-2 text-zinc-600">Page not found locally.</p>
          <div className="mt-4 flex flex-col items-center gap-2 text-sm">
            <a href="/" className="text-brand font-semibold hover:underline">← Go back home</a>
            <a href="/shop" className="text-zinc-500 font-mono hover:underline text-xs">→ Shop Catalog</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
