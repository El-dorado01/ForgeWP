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
import { ServicesPage } from "./pages/ServicesPage";
import { CaseStudiesPage } from "./pages/CaseStudiesPage";
import { AboutUsPage } from "./pages/AboutUsPage";
import { ContactPage } from "./pages/ContactPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { HelpPage } from "./pages/HelpPage";
import { SignInPage } from "./pages/SignInPage";
import { SingleServicePage } from "./pages/SingleServicePage";
export default function AppRoutes() {
  return (
    <Switch>
      {/* Home preview */}
      <Route path="/" component={HomePage} />

      <Route path="/services" component={ServicesPage} />

      <Route path="/case-studies" component={CaseStudiesPage} />

      <Route path="/contact" component={ContactPage} />

      <Route path="/privacy" component={PrivacyPolicyPage} />

      <Route path="/terms" component={TermsOfServicePage} />

      <Route path="/help" component={HelpPage} />

      <Route path="/login" component={SignInPage} />

      <Route path="/service/:id" component={SingleServicePage} />

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
