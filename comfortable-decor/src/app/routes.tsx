import * as LoginPage from "./pages/LoginPage";
import * as SignUpPage from "./pages/SignUpPage";
import * as VerifyEmailPage from "./pages/VerifyEmailPage";
import * as ForgotPasswordPage from "./pages/ForgotPasswordPage";
import * as ResetPasswordPage from "./pages/ResetPasswordPage";
import type { ComponentType, ReactNode } from 'react';
import { Route, Switch } from '@forgewp/react';
import * as HomePage from './page';
import * as ShopPage from './pages/shop';
import * as StudioPage from './pages/studio';
import * as CategoryPage from './pages/category';
import * as CategoriesPage from './pages/categories';
import * as ProductDetailPage from './pages/product';
import * as AccountPage from './pages/account';
import * as WishlistPage from './pages/wishlist';
import * as CartPage from './pages/cart';
import * as LandingPage from './pages/landing';
import { PlaceholderPage } from './pages/placeholder';

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

/**
 * Local Developer Routes — ForgeWP.
 * Stage 1 storefront routes use mock data only.
 */
export default function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={withLayout(HomePage)} />
      <Route path="/login" component={withLayout(LoginPage)} />
      <Route path="/signup" component={withLayout(SignUpPage)} />
      <Route path="/verify-email" component={withLayout(VerifyEmailPage)} />
      <Route path="/forgot-password" component={withLayout(ForgotPasswordPage)} />
      <Route path="/reset-password" component={withLayout(ResetPasswordPage)} />

      <Route path="/studio" component={withLayout(StudioPage)} />
      <Route path="/shop" component={withLayout(ShopPage)} />
      <Route path="/categories" component={withLayout(CategoriesPage)} />
      <Route path="/category/:slug" component={withLayout(CategoryPage)} />
      <Route path="/product/:slug" component={withLayout(ProductDetailPage)} />
      <Route path="/landing" component={withLayout(LandingPage)} />

      <Route path="/search" component={withLayout(ShopPage)} />

      <Route path="/cart" component={withLayout(CartPage)} />

      <Route path="/checkout">
        {() =>
          withLayout(PlaceholderPage)({
            title: 'Checkout',
            description: 'Conversion-focused checkout UI (mock only) — next phase.',
          })
        }
      </Route>

      <Route path="/order-confirmation">
        {() => withLayout(PlaceholderPage)({ title: 'Order confirmation' })}
      </Route>

      <Route path="/account" component={withLayout(AccountPage)} />
      <Route path="/account/orders" component={withLayout(AccountPage)} />
      <Route path="/account/orders/:id" component={withLayout(AccountPage)} />
      <Route path="/account/downloads" component={withLayout(AccountPage)} />
      <Route path="/account/addresses" component={withLayout(AccountPage)} />
      <Route path="/account/payment-methods" component={withLayout(AccountPage)} />
      <Route path="/account/payments" component={withLayout(AccountPage)} />
      <Route path="/account/details" component={withLayout(AccountPage)} />
      <Route path="/account/edit-account" component={withLayout(AccountPage)} />
      <Route path="/account/trade" component={withLayout(AccountPage)} />

      <Route path="/wishlist" component={withLayout(WishlistPage)} />

      <Route path="/about">
        {() =>
          withLayout(PlaceholderPage)({
            title: 'About',
            description: 'Editorial brand story page (Demo 34 energy) — next phase.',
          })
        }
      </Route>
      <Route path="/contact">
        {() => withLayout(PlaceholderPage)({ title: 'Contact' })}
      </Route>
      <Route path="/faq">
        {() => withLayout(PlaceholderPage)({ title: 'FAQ' })}
      </Route>
      <Route path="/shipping">
        {() => withLayout(PlaceholderPage)({ title: 'Shipping & Delivery' })}
      </Route>
      <Route path="/returns">
        {() => withLayout(PlaceholderPage)({ title: 'Returns & Refunds' })}
      </Route>
      <Route path="/privacy">
        {() => withLayout(PlaceholderPage)({ title: 'Privacy Policy' })}
      </Route>
      <Route path="/terms">
        {() => withLayout(PlaceholderPage)({ title: 'Terms & Conditions' })}
      </Route>

      <Route path="/blog">
        {() => withLayout(PlaceholderPage)({ title: 'Journal' })}
      </Route>
      <Route path="/blog/:slug">
        {() => withLayout(PlaceholderPage)({ title: 'Article' })}
      </Route>

      <Route>
        {withLayout(PlaceholderPage)({
          title: 'Page not found',
          description: 'This route does not exist yet. Return home or browse the shop.',
        })}
      </Route>
    </Switch>
  );
}
