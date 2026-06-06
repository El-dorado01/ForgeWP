import { Route, Switch } from "wouter";
import HomePage from "./page";
import { ListiclesPage } from "./pages/ListiclesPage";
import { HotelsPage } from "./pages/HotelsPage";
import { BerUnsPage } from "./pages/BerUnsPage";
import { KontaktPage } from "./pages/KontaktPage";
import { SingleListiclePage } from "./pages/SingleListiclePage";
import { SingleHotelPage } from "./pages/SingleHotelPage";
import { ImpressumPage } from "./pages/ImpressumPage";

/**
 * Local Developer Routes — ForgeWP.
 *
 * Edit this file to add new routes/components for your local Vite preview server.
 *
 * @example
 * // 1. Create a component in src/app/about.tsx
 * // 2. Import it here: import AboutPage from "./about";
 * // 3. Add the Route: <Route path="/about" component={AboutPage} />
 */

export default function AppRoutes() {
  return (
    <Switch>
      {/* Home preview */}
      <Route path="/" component={HomePage} />

      <Route path="/impressum" component={ImpressumPage} />

      <Route path="/hotelvergleiche" component={ListiclesPage} />
      <Route path="/hotelvergleich/:id" component={SingleListiclePage} />

      <Route path="/hotels" component={HotelsPage} />
      <Route path="/hotel/:id" component={SingleHotelPage} />

      <Route path="/contact" component={KontaktPage} />

      <Route path="/about" component={BerUnsPage} />

      {/* Fallback route */}
      <Route>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
          <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
          <p className="mt-2 text-zinc-600">Page not found locally.</p>
          <div className="mt-4 flex flex-col items-center gap-2 text-sm">
            <a href="/" className="text-brand font-semibold hover:underline">← Go back home</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
