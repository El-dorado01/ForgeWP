import { Route, Switch } from "wouter";
import HomePage from "./page";
import QuerySandbox from "./query-sandbox";
import WpEditablePage from "./wp-editable";

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

      {/* Relational Query Engine Sandbox — verifies taxQuery, metaQuery, pagination */}
      <Route path="/query-sandbox" component={QuerySandbox} />

      {/* WpEditable Block Canvas Preview — verifies inline editing primitive */}
      <Route path="/wp-editable" component={WpEditablePage} />

      {/* Fallback route */}
      <Route>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
          <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
          <p className="mt-2 text-zinc-600">Page not found locally.</p>
          <div className="mt-4 flex flex-col items-center gap-2 text-sm">
            <a href="/" className="text-brand font-semibold hover:underline">← Go back home</a>
            <a href="/query-sandbox" className="text-zinc-500 font-mono hover:underline text-xs">→ Query Engine Sandbox</a>
            <a href="/wp-editable" className="text-zinc-500 font-mono hover:underline text-xs">→ WpEditable Canvas</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
