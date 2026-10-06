import type { ComponentType, ReactNode } from 'react';
import { useEffect } from 'react';
import { Route, Switch, useWpPageLink, WpLink } from '@forgewp/react';
import * as HomePage from './page';

/**
 * Automatically discover all layouts in src/app/layouts via Vite eager glob.
 * Any layout file created (e.g. dashboard.tsx, auth.tsx, blank.tsx) is instantly
 * available without needing manual imports or registration.
 */
const layoutModules = import.meta.glob<Record<string, any>>(
  './layouts/*.{tsx,jsx,ts,js}',
  { eager: true },
);
const layouts: Record<string, ComponentType<{ children: ReactNode }>> = {};

for (const filePath in layoutModules) {
  const fileName = filePath.split('/').pop() ?? '';
  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex + 1) : '';
  const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : '';
  const supportedExtension = ['tsx', 'jsx', 'ts', 'js'].includes(extension);
  const match =
    supportedExtension && baseName ? [fileName, baseName, extension] : null;
  if (match) {
    const layoutName = match[1];
    const mod = layoutModules[filePath];
    const comp =
      mod.default || Object.values(mod).find((v) => typeof v === 'function');
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
      const BlankLayout =
        layouts['blank'] || (({ children }: any) => <>{children}</>);
      return (
        <BlankLayout>
          <Component {...props} />
        </BlankLayout>
      );
    }

    const Layout =
      layouts[layoutKey] ||
      layouts['default'] ||
      (({ children }: any) => <>{children}</>);

    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
}

/**
 * Local Developer Routes — ForgeWP.
 *
 * Edit this file to add new routes/components for your local Vite preview server.
 *
 * @example
 * // 1. Create a component in src/app/about.tsx
 * // 2. Import it here: import * as AboutPage from "./about";
 * // 3. Add the Route: <Route path="/about" component={withLayout(AboutPage)} />
 */
import { DieStudiePage } from './pages/DieStudiePage';
import { EventsPage } from './pages/EventsPage';
import { SingleHospitalityEventPreview } from './components/SingleHospitalityEventPreview';
import { LizenzenPage } from './pages/LizenzenPage';
import { EinzellizenzPage } from './pages/EinzellizenzPage';
import { TeamlizenzPage } from './pages/TeamlizenzPage';
import { UnternehmenslizenzPage } from './pages/UnternehmenslizenzPage';
import { ImpressumPage } from './pages/ImpressumPage';
import { DatenschutzPage } from './pages/DatenschutzPage';
import { AgbLizenzbedingungenPage } from './pages/AgbLizenzbedingungenPage';
import { WiderrufsbelehrungPage } from './pages/WiderrufsbelehrungPage';
import { VertragWiderrufenPage } from './pages/VertragWiderrufenPage';
import { KontaktPage } from './pages/KontaktPage';

function StudyRedirect() {
  useEffect(() => {
    const query = window.location.search;
    window.location.replace(`/studie/hospitality-2035${query}`);
  }, []);

  return null;
}

export default function AppRoutes() {
  const homeHref = useWpPageLink('front-page', '/');

  return (
    <Switch>
      {/* Home preview */}
      <Route
        path='/'
        component={withLayout(HomePage, { layout: 'blank' })}
      />

      <Route
        path='/studie'
        component={StudyRedirect}
      />

      <Route
        path='/studie/hospitality-2035'
        component={withLayout(DieStudiePage)}
      />

      <Route
        path='/events'
        component={withLayout(EventsPage)}
      />

      <Route
        path='/events/:slug'
        component={withLayout(SingleHospitalityEventPreview)}
      />

      <Route
        path='/lizenzen'
        component={withLayout(LizenzenPage)}
      />

      <Route
        path='/checkout/single-license'
        component={withLayout(EinzellizenzPage)}
      />

      <Route
        path='/lizenz/team'
        component={withLayout(TeamlizenzPage)}
      />

      <Route
        path='/lizenz/unternehmen'
        component={withLayout(UnternehmenslizenzPage)}
      />

      <Route
        path='/impressum'
        component={withLayout(ImpressumPage)}
      />

      <Route
        path='/datenschutz'
        component={withLayout(DatenschutzPage)}
      />

      <Route
        path='/agb-lizenzbedingungen'
        component={withLayout(AgbLizenzbedingungenPage)}
      />

      <Route
        path='/widerrufsbelehrung'
        component={withLayout(WiderrufsbelehrungPage)}
      />

      <Route
        path='/vertrag-widerrufen'
        component={withLayout(VertragWiderrufenPage)}
      />

      <Route
        path='/kontakt'
        component={withLayout(KontaktPage)}
      />

      {/* Fallback route */}
      <Route
        component={withLayout(() => (
          <div className='flex min-h-[60vh] flex-col items-center justify-center text-center p-6'>
            <h1 className='text-4xl font-bold font-serif text-zinc-950'>404</h1>
            <p className='mt-2 text-zinc-600'>Page not found locally.</p>
            <div className='mt-4 flex flex-col items-center gap-2 text-sm'>
              <WpLink
                href={homeHref}
                className='text-brand font-semibold hover:underline'
              >
                ← Go back home
              </WpLink>
            </div>
          </div>
        ))}
      />
    </Switch>
  );
}
