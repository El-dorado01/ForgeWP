import { Route, Switch } from "wouter";
import HomePage from "./page";
import LoginPage from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

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

      <Route path={"/login"} component={LoginPage} />
      <Route path={"/signup"} component={SignUpPage} />
      <Route path={"/dashboard"} component={DashboardPage} />
      <Route path={"/verify-email"} component={VerifyEmailPage} />
      <Route path={"/forgot-password"} component={ForgotPasswordPage} />
      <Route path={"/reset-password"} component={ResetPasswordPage} />

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
