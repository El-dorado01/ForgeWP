import { Route, Switch } from "wouter";
import HomePage from "./page";

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
import { NewPage } from "./pages/NewPage";
import { MenPage } from "./pages/MenPage";
import { WomenPage } from "./pages/WomenPage";
import { HelpPage } from "./pages/HelpPage";
import { SignInPage } from "./pages/SignInPage";
export default function AppRoutes() {
  return (
    <Switch>
      {/* Home preview */}
      <Route path="/" component={HomePage} />

      <Route path="/new" component={NewPage} />

      <Route path="/men" component={MenPage} />

      <Route path="/women" component={WomenPage} />

      <Route path="/help" component={HelpPage} />

      <Route path="/login" component={SignInPage} />

      {/* Fallback route */}
      <Route>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
          <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
          <p className="mt-2 text-zinc-600">Page not found locally.</p>
          <a href="/" className="mt-4 text-brand font-semibold hover:underline">
            Go back home
          </a>
        </div>
      </Route>
    </Switch>
  );
}
