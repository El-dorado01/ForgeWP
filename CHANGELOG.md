# Changelog

All notable changes to the published ForgeWP packages. Versions follow
[semantic versioning](https://semver.org); before 1.0, a minor version
(0.5 → 0.6) can contain breaking changes.

## 2026-11-25: release from GitHub

| Package | Version |
| --- | --- |
| `@forgewp/compiler` | 0.6.0 → **0.6.1** |
| `@forgewp/react` | 0.6.0 → **0.6.1** |
| `create-forgewp` | 0.6.0 → **0.6.1** |
| `@forgewp/woocommerce` | 0.2.0 → **0.2.1** |
| `@forgewp/auth` | 0.1.3 → **0.1.4** |
| `@forgewp/ui` | 0.4.5 → **0.4.6** |
| `@forgewp/plugin-seo` | 0.4.4 → **0.4.5** |

No code changes. The first release published by GitHub Actions with npm
trusted publishing: every package now links to its source in the ForgeWP
repository and carries a provenance statement showing it was built there.

## 2026-11-25: pre-beta

| Package | Version |
| --- | --- |
| `@forgewp/compiler` | 0.5.0 → **0.6.0** |
| `@forgewp/react` | 0.5.0 → **0.6.0** |
| `create-forgewp` | 0.5.0 → **0.6.0** |
| `@forgewp/woocommerce` | 0.1.1 → **0.2.0** |
| `@forgewp/auth` | 0.1.2 → 0.1.3 |
| `@forgewp/ui` | 0.4.4 → 0.4.5 |
| `@forgewp/plugin-seo` | 0.4.3 → 0.4.4 |

### Breaking changes

- **WooCommerce routes.** The old cart, checkout and wishlist routes
  (`/cart/add`, `/cart/sync`, `/checkout/process`, `/wishlist/toggle`, …) are
  removed. `@forgewp/woocommerce` 0.2 uses the new routes (`/cart/items`,
  `/checkout`, …). Prices are whole numbers in the currency's smallest unit
  (`2950` = $29.50); show them with `formatMoney()`.
- **Security token for changes.** On the WordPress site itself, a logged-in
  visitor's changes (cart, wishlist, account, checkout) need the page's
  `X-WP-Nonce`. ForgeWP's hooks send it; add it to your own `fetch()` calls.
- **Decoupled builds fail loudly.** A Next.js build or request that cannot
  reach WordPress now retries once and then stops with an error, instead of
  silently showing sample data.
- **Companion Plugin.** Every export also creates `<slug>-companion`: the
  backend (content types, REST API, forms, sign-in, settings). The theme keeps
  a built-in copy, so one theme ZIP still works on its own.

### New

- **Your own plugin code** in `src/server/plugin/`: folders, namespaced
  classes, Composer libraries (installed at export), CSS and templates,
  setup hooks (`forgewp_companion_ready`, `_activated`, `_upgraded`,
  `_deactivated`, `_uninstall`), and a **Settings → Companion** page with a
  "delete data on uninstall" checkbox (off by default).
- **`transformBackendPhp`** hook for compiler plugins.
- **SEO and editable fields in decoupled mode** (`/seo`, `/editables`), with
  Yoast, Rank Math, Polylang and WPML.
- **Smaller exports**, with no quality loss: WebP `src`, originals left out once
  replaced, a 2560px size cap, lossless PNG → WebP, merged duplicate fonts. A
  warning lists large unused files; `assets.exclude` leaves files out.
- **Quieter export output**: steps, a summary and grouped warnings;
  `--verbose` lists everything.
- `@forgewp/woocommerce`: one shared cart (`useWpCart` / `WpCartProvider`),
  cart tokens for shops on another domain, gateway-safe checkout,
  `WpCheckoutSubmitButton`, and components usable in Next.js server pages.

### Fixed

- Activating the Companion Plugin next to the active ForgeWP theme now runs
  its activation step.
- `export --validate` no longer fails for interactive islands with a hyphen
  in their name.
- Composer works on Windows (`composer.bat`).
- `@forgewp/plugin-seo` accepts compiler 0.5 and later (npm refused to
  install it next to compiler 0.6).
