# LocalWP Verification Report & Handoff (R1)

**Date:** 2026-11-23  
**Environment:** LocalWP (`http://forgewp-test.local`), WordPress `7.1.5`, PHP `8.2.29`  
**Checklist:** [localwp-verification-checklist.md](localwp-verification-checklist.md)  
**Fixes Commit:** `b864db9` (`fix(compiler,projects): resolve LocalWP plugin verification issues`)  
**Related:** [phase-status-and-blog-urls.md](phase-status-and-blog-urls.md) §7 (R1)

**Installed plugins verified:**
- `WooCommerce 11.0.1`, `Forge Commerce Companion 0.1.0`
- `Events Manager 7.4.7`, `Hospitality 2035 Companion 0.1.0`
- `Polylang 3.8.4`, `MailPoet 5.28.0`, `Yoast SEO 28.9`, `Rank Math SEO 1.0.282`, `Hotelchecker24 Companion 1.0.0`

---

## 1. Checklist Reports (Initial Run Findings)

### forge-commerce — LocalWP — 2026-11-23
WordPress `7.1.5`, plugins: `WooCommerce 11.0.1`, `Forge Commerce Companion 0.1.0`

- **Passed:**
  - **1a. Browse pages:** `/`, `/shop/`, `/product/minimalist-wool-blazer/`, `/cart/`, `/checkout/`, and `/my-account/` rendered after disabling WooCommerce's default Coming Soon mode (`woocommerce_coming_soon = no`), with `0` console errors, `0` 404 requests, and `0` 5xx responses.
  - **1a. Cart CRUD:** Simple + variable product additions (`itemCount: 2`, total `637.00`), quantity update (`itemCount: 3`, total `922.00`), item removal (`1`), and cart clear (`0`) via `/wp-json/forgewp/v1/cart*`.
  - **1a. Coupon & shipping:** `SAVE10` applied (`discount: "28.50"`, `totalAfterCoupon: "268.50"`) and zone rate returned (`flat_rate:1`, `"US Flat Rate"`, cost `12`).
  - **1a. Guest Cash on Delivery checkout:** HTTP `200`, order `#35` (`total: "256.50"`, `status: "processing"`); Mailpit received 2 emails (`Your ForgeWP Test order has been received!` to `guest-e2e@forgewp-test.local` and `[ForgeWP Test]: You've got a new order: #35` to `dev-email@wpengine.local`).
  - **1a. Logged-in checkout & downloads (with `X-WP-Nonce`):** Order `#36` created, `/customer/orders` returned `ordersCount: 1`, `/customer/downloads` returned `downloadsCount: 1`, and the download URL served HTTP `200` (`"Forge Commerce Lookbook Download Content\n"`).
  - **1a. Wishlist (with `X-WP-Nonce`):** `POST /wishlist/toggle` (`200`, `[28]`), reload `GET /wishlist` (`200`, `[28]`), and `POST /wishlist/sync` (`200`, `[28, 29]`).
  - **1a. Product reviews:** Submitted as `eldorado` (`200`, `ratingCount: 1`), rejected deletion by `reviewer2` (`404 review_not_found`, `stillExistsAfterOtherDelete: 1`), deleted own review as `eldorado` (`200`, `ratingCountAfterOwnDelete: 0`).
  - **1b. Security:** `wordpress_logged_in_*` cookie had `sameSite: "Lax"` and `httpOnly: true`; cross-origin `fetch(..., { credentials: 'include' })` from `http://127.0.0.1:49963` returned guest cart (`itemCount: 0`); cross-origin plain HTML form `POST`s within 2 minutes of login did not mutate cart, orders (`0 -> 0`), or reviews (`1 -> 1`); defining `FORGEWP_AUTH_COOKIE_SAMESITE` as `'off'` omitted `SameSite` on re-login (`hasSameSiteProp: false`), after which the define was removed cleanly.
  - **1c. Companion Plugin with WooCommerce:** `forge-commerce-companion` active with `forge-commerce` theme worked (`cartStatus: 200`, `productsCount: 4`) with no ForgeWP admin notice; switching to Twenty Twenty-Five kept `/cart` (`200`), `/products` (`200`, `4`), and `/customer/orders` (`200`, `ordersTotal: 1`) working; deactivating the companion and switching back to `forge-commerce` preserved cart (`itemCount: 2`), orders (`1`), and wishlist (`[28, 29]`).
  - **`debug.log`:** Empty after Section 1.
- **Failed (initial run -> fixed in `b864db9`):**
  - **1a. Account order detail:** `GET /wp-json/forgewp/v1/customer/orders/36` (with `X-WP-Nonce`) returned HTTP `404` (`code: "rest_no_route"`). Root cause in `packages/compiler/lib/functions/rest-endpoints.js`: `'/customer/orders/(?P<id>[\d]+)'` inside a JS template literal compiled into PHP as `[d]+`.
  - **1a. Storefront navbar layout:** `<Navbar fixed />` overlapped the top of native WooCommerce headings/cart header on `/product/...` and `/cart/`.
- **Not run:**
  - **1d. Decoupled mode:** Marked optional in the checklist; deferred to R7.

---

### hospitality — LocalWP — 2026-11-23
WordPress `7.1.5`, plugins: `Events Manager 7.4.7`, `Hospitality 2035 Companion 0.1.0`

- **Passed:**
  - **Event page booking form:** Rendered `Unternehmen *` (`hospitality_company`) and `Funktion (optional)` (`hospitality_job_title`) fields alongside guest registration fields (`Booking successful.` after AJAX submit).
  - **Booking confirmation email (Mailpit):** Received `"Booking Confirmed"` containing `Company: ForgeWP GmbH` and `Job Title: CTO`; `booking_meta` in `wp_em_bookings` persisted both fields.
  - **Single booking detail in wp-admin:** Edit Booking (`booking_id=2`) rendered `Unternehmen: ForgeWP GmbH` and `Funktion: CTO` via `em_bookings_single_details_footer`.
  - **`/studie` redirect:** `/studie?utm_source=e2e&ref=checklist` returned HTTP `301` to `http://forgewp-test.local/studie/hospitality-2035/?utm_source=e2e&ref=checklist`.
  - **Companion Plugin (`hospitality-companion` on Twenty Twenty-Five):** Custom booking fields rendered, guest submission succeeded (`Booking successful.`), and Mailpit received `"Booking Confirmed"` with `Company: Companion Corp` and `Job Title: Lead`.
- **Failed (initial run -> fixed in `b864db9`):**
  - **Admin Bookings Table default columns:** Events → Bookings showed `Name`, `Event`, `Event Date(s)`, `Spaces`, `Status`, `Total` by default (`hasCompanyCol: false`, `hasJobCol: false`); `Unternehmen` and `Funktion` were registered in `em_bookings_table_cols_bookings_template` (column settings modal) but not enabled in the default `bookings` view columns.
  - **Logs/console notes:** One initial browser console entry (`"Uncaught (in promise)"` during native-theme event page test) and WP `debug.log` core notices for unregistered post type `shop_order_placehold` (`map_meta_cap`) + `action_scheduler_run_queue` cron leftover after deactivating WooCommerce (no PHP fatals or ForgeWP warnings).
- **Not run:**
  - None.

---

### hotelchecker24 — LocalWP — 2026-11-23
WordPress `7.1.5`, plugins: `Polylang 3.8.4`, `MailPoet 5.28.0`, `Yoast SEO 28.9`, `Rank Math SEO 1.0.282`

- **Passed:**
  - **`/` and `/en/` rendering & switcher:** With Polylang configured (`de` default, `en` secondary, `hide_default: true`, `redirect_lang: true`), `/` (`de-DE`, HTTP `200`) and `/en/` (`en-US`, HTTP `200`) rendered with `0` console errors and `0` 404s; clicking the Navbar language switch on `/` navigated to `/en/`. (`/de/` returned `404` while `hide_default: true` is active — `/` serves German per Polylang settings.)
  - **`GET /wp-json/forgewp/v1/i18n?lang=en&path=/kontakt/`:** HTTP `200` returning `"urls":{"de":"/kontakt/","en":"/en/contact/"}` and `"homeUrls":{"en":"/en/","de":"/"}` matching Polylang.
  - **`GET /wp-json/forgewp/v1/menus?lang=de` & `?lang=en`:** HTTP `200` returning distinct `primary` menu items (`de`: `Hotelvergleiche / Hotels / Über uns / Kontakt`; `en`: `Hotel Comparisons / Hotels / About Us / Contact`).
  - **Unknown locale `?lang=fr`:** `i18n`, `menus`, and `routes` all returned HTTP `404` (`code: "FORGEWP_LOCALE_NOT_FOUND"`).
  - **`<head>` hreflang tags:** `/` & `/en/` emitted `hreflang="de"`, `hreflang="en"`, and `hreflang="x-default"` (`src/server/theme/hreflang.php`); `/kontakt/` & `/en/contact/` emitted localized alternates + `x-default`.
  - **MailPoet REST subscription (`POST /wp-json/mailpoet/v1/subscribers`):** Returned HTTP `200` `{"status":"subscribed","email":"e2e-subscriber@forgewp-test.local"}`; `\MailPoet\API\API::MP('v1')->getSubscriber(...)` verified subscriber ID `8` in segment `3` (`Newsletter mailing list`).
  - **`/kontakt` `ifNotFound` redirect:** When published (`post_status: publish`), `/kontakt` trailing-slashed to `/kontakt/` (`301` -> `200`, no redirect to `/contact/`); when trashed, `/kontakt` and `/kontakt/` returned `301` to `/contact/`; after restoring post `46`, `/kontakt/` returned `200`.
  - **Yoast SEO (`28.9`):** `/` and `/kontakt/` emitted Yoast's `<title>`, `og:title`, canonical, and `@graph` JSON-LD (`titleCount: 1`, `jsonLdCount: 1`), without duplicating ForgeWP `<WpHead>` meta or fallback schema. (`og-fallback.php` supplied one `og:image` fallback because no Yoast OG image was set.)
  - **Rank Math SEO (`1.0.282`):** Once Rank Math's setup skip flag (`rank_math_registration_skip = true`) was set, `/` and `/kontakt/` emitted Rank Math's `<title>`, `og:title`, canonical, and `rank-math-schema` JSON-LD (`jsonLdCount: 1`) without duplication.
  - **`debug.log`:** Empty after Section 3.
- **Failed (initial run -> fixed in `b864db9`):**
  - **`/en/` `"Get Listed"` CTA link:** On `/en/`, the header CTA rendered `href="/contact/"` instead of `/en/contact/` because `forgewp_resource_path()` parsed Polylang-filtered `home_url('/')` (`.../en/`) and stripped `/en` from all `routes.pageLinks` paths during SSR hydration.
  - **Unconfigured Rank Math head fallback:** Before Rank Math's registration/setup wizard was completed (`RankMath\Helper::is_invalid_registration() === true`), Rank Math skipped registering its own `Frontend`/`Head`, while `forgewp_seo_plugin_active()` saw `class_exists('RankMath')` and suppressed ForgeWP's `<title>`, `<meta name="description">`, and fallback schema.
- **Not run:**
  - None.

---

## 2. Fixes Applied & Re-verified (`b864db9`)

All 5 issues above were fixed, re-exported across `hotelchecker24`, `hospitality`, and `forge-commerce`, deployed to LocalWP, and re-verified live:

1. **Order detail REST route regex (`packages/compiler/lib/functions/rest-endpoints.js`):**
   - Changed `'/customer/orders/(?P<id>[\d]+)'` to `'/customer/orders/(?P<id>\\d+)'`.
   - Re-verified live: `GET /wp-json/forgewp/v1/customer/orders/36` (with `X-WP-Nonce`) returned HTTP `200` with order `#36` JSON (`id: 36`, `total: 25`, `items: [{"productId": 30, "name": "Digital Style Guide"}]`).

2. **WooCommerce navbar spacing (`projects/forge-commerce/src/app/globals.css`):**
   - Added `padding-top: 7rem` for `body.single-product main`, `body.woocommerce-cart main`, `body.woocommerce-checkout main`, and `body.woocommerce-account main`.
   - Re-verified in Chrome: on `/product/minimalist-wool-blazer/` and `/cart/`, `main` computed `paddingTop` was `112px`, `headerBottom: 96`, and `h1Top` / `contentTop: 256` (zero navbar overlap).

3. **Events Manager Bookings default columns (`projects/hospitality/src/server/plugin/event-booking-fields.php`):**
   - Added `em_bookings_table_get_current_context` filter appending `hospitality_company` and `hospitality_job_title` when `$table->view === 'bookings'` and `is_array($context_settings['cols'])`.
   - Re-verified in `wp-admin` (`Events → Bookings`): table headers now show `Unternehmen` and `Funktion` with rows displaying `ForgeWP GmbH` / `CTO` and `Companion Corp` / `Lead`.

4. **Polylang `home_url` prefix stripping in resource paths (`packages/compiler/lib/functions/phase-c-resources.js`):**
   - Extracted `forgewp_raw_home_url()` reading unfiltered `get_option('home')` (guarded with `function_exists('get_option')` for standalone PHP test harnesses, falling back to `home_url('/')`) and used it in `forgewp_resource_path()` and `forgewp_routes_resource()`.
   - Re-verified in Chrome on `http://forgewp-test.local/en/`: `window.forgeWpHydration.resources.routes.pageLinks['kontakt-page']` resolved to `"/en/contact/"` and `"Get Listed"` rendered `href="/en/contact/"` (`0` console errors, `0` 404s).

5. **Unconfigured Rank Math SEO detection (`packages/compiler/lib/functions/routing.js`, `projects/hotelchecker24/src/server/theme/og-fallback.php`, `projects/hotelchecker24/src/server/theme/schemas.php`):**
   - Updated `forgewp_seo_plugin_active()` so Rank Math is only treated as active when `!RankMath\Helper::is_invalid_registration()`, and extracted `forgewp_schemas_seo_active()` in `schemas.php` / updated `og-fallback.php` to delegate to `forgewp_seo_plugin_active()`.
   - Re-verified live on `/kontakt/`: unconfigured Rank Math (`rank_math_registration_skip` unset) emits ForgeWP's `<title>`, `<meta name="description">`, `og:title`, and `ForgeWP Custom JSON-LD Schema`; configured Rank Math (`skip = true`) yields to Rank Math's `<title>`, `og:title`, and `rank-math-schema` with zero duplication and `0` lines in `debug.log`.

**Compiler tests:**
- Initial full `vitest run` (`@forgewp/compiler`) passed 123/128 files (870/876 tests) and exposed missing `get_option` stubs in 3 PHP harness tests plus 1 concurrency timeout.
- After adding the `function_exists('get_option')` guard, re-running all 4 affected test files (`phase-c-resources.test.js`, `next-decoupled-transport.test.js`, `next-menus-site-info.test.js`, `route-manifest-doctor.test.js`) passed (`4/4` files, `21/21` tests). *(The full 128-file suite was not re-run after that guard edit.)*

---

## 3. Open Observations & Handoff Notes for Next Agent

1. **`hotelchecker24` `after_switch_theme` route ID overwrite on re-activation:**
   - After `schemas.php` refactor, when `switch_theme('hotelchecker24')` ran again on the existing LocalWP DB, `http://forgewp-test.local/en/` emitted `"pageLinks":{"placeholder":"/en/contact/","home":"/en/","listicles-page":"/en/hotel-comparisons/"}` — `contact` (post `17`) got its `forgewp_route_id` updated to `placeholder` during `after_switch_theme` auto-page reconciliation. Worth inspecting `forgewp_auto_create_pages_and_menus()` so switching/reactivating a theme on an existing multilingual site never overwrites a non-placeholder `forgewp_route_id` (`kontakt-page`) with `placeholder`.
2. **Same-origin WooCommerce endpoints & `X-WP-Nonce`:**
   - `forgewp/v1/wishlist*`, `forgewp/v1/customer/*`, and `forgewp/v1/checkout/process` require `X-WP-Nonce` even on same-origin requests with valid WordPress login cookies (`401 unauthorized` without `X-WP-Nonce`). Frontend consumers must always forward `restNonce`.
3. **WooCommerce Blocks Cart line items on `forge-commerce`:**
   - Under `forge-commerce` (`/cart/`), WooCommerce Blocks Cart rendered skeleton placeholders for line-item rows/totals while the React header cart badge (`forgewp/v1/cart`) showed `1` item / `$297.00`. Native WC Blocks storefront compatibility vs React cart components should be reviewed when picking up R7.
4. **`hotelchecker24` newsletter form UI:**
   - `hotelchecker24` exposes `POST /wp-json/mailpoet/v1/subscribers` (`src/server/plugin/mailpoet.php`), which works against `MailPoet 5.28.0`, but no newsletter signup `<form>` is currently rendered in `projects/hotelchecker24/src/` components.
5. **Remaining checklist / test follow-ups:**
   - Checklist **1d (Decoupled WooCommerce mode)** was not run (tracked under **R7**).

---

## LocalWP Verification Addendum — 2026-11-24 (R2/R4/R5/R7 Live Site Checks)

- **Branch:** `feat/gemini-final-stretch` (branched from `main` at `bf10b40`)
- **WordPress site:** `http://forgewp-test.local` (WooCommerce `11.0.1`, Yoast SEO `28.9`, Rank Math `1.0.282`, ACF `6.8.2`, Polylang)
- **Debug log:** Cleared prior to runs; `wp-content/debug.log` ended clean (`0` bytes) after all runs below.

### 4(a) Route ID Persistence (`hotelchecker24`, commit `bf909e8`) — PASS
1. Exported `hotelchecker24` (`pnpm forgewp export --no-zip`), installed theme + companion plugin, and switched themes twice (`twentytwentyfive` <-> `hotelchecker24`).
2. Verified post `17`:
   - `wp post meta get 17 forgewp_route_id` -> `kontakt-page`
   - `_wp_page_template` -> `page-contact.php`
3. Verified `/en/` hydration `resources.routes.pageLinks`: `{"kontakt-page":"/en/contact/","home":"/en/","listicles-page":"/en/hotel-comparisons/"}`.

### 4(b) SEO Endpoint (`hotelchecker24`, Yoast SEO `28.9` & Rank Math `1.0.282`) — PARTIAL (2 open discrepancies)
Tested `/kontakt/`, `/hello-world/`, `/category/uncategorized/`, `/en/contact/`:
- **Yoast SEO `28.9`:** `GET /wp-json/forgewp/v1/seo?path=...` returned HTTP `200`, `provider: "yoast"`. REST `title`, `description`, `canonical`, `openGraph.title`, and `jsonLdCount` (`1`) matched rendered `<head>` tags across all 4 paths.
  - With `FORGEWP_FRONTEND_ORIGIN = 'https://app.example.test'`: `canonical`, `alternates.languages`, `openGraph.url`, and JSON-LD `@id` / `url` / `item` rewrote to `https://app.example.test`, while `ogImages` stayed on `http://forgewp-test.local/wp-content/themes/hotelchecker24/Logo/hotelchecker24-logo_farbe.svg`. **Note:** `WebPage.potentialAction[0].target` (`["http://forgewp-test.local/kontakt/"]`) remained on `forgewp-test.local` because `forgewp_seo_rewrite_json_ld()` in `packages/compiler/lib/functions/seo-resource.js` recurses only on `'@id'`, `'url'`, and `'item'`.
- **Rank Math `1.0.282` (`rank_math_registration_skip = 1`):** `GET /wp-json/forgewp/v1/seo?path=...` returned HTTP `200`, `provider: "rankmath"`. `canonical`, `description`, `alternates`, and `robots` matched `<head>`, **with 2 discrepancies:**
  1. REST returned `jsonLd: []` (`restJsonLdCount: 0`) while native page `<head>` rendered `1` JSON-LD block (`headJsonLdCount: 1`) because Rank Math skips its JSON-LD module under `REST_REQUEST`.
  2. REST `title` and `openGraph.title` used an en-dash (`"Kontakt – ForgeWP Test"`) while native `<head>` rendered a hyphen (`"Kontakt - ForgeWP Test"`).
- Note on native hydration: `hotelchecker24` native hydration check reported `resources.seo: undefined` in `verify-localwp.mjs`, whereas `hospitality` (`provider: "core"`) and `forge-commerce` (`provider: "core"`) populated `h.resources.seo`.

### 4(c) Editables & Repeaters (`hospitality` + ACF `6.8.2`) — PASS
1. Seeded attachment ID `6` and ACF repeater `partners_associations` (`[{"name":"ACF Live Partner","logo":6,"url":"https://partner.example.test"}]`) on `page_on_front` (`74`).
2. `GET /wp-json/forgewp/v1/editables?path=/` returned full attachment metadata (`id: 6`, `url`, `alt: "Hospitality Partner Logo Alt"`, `width: 1200`, `height: 1200`, `srcset`).
3. `window.forgeWpHydration.resources.editables` on `/` deep-equaled REST (`editables deepEqual: true`).
4. `GET /wp-json/forgewp/v1/editables?routeId=front-page` resolved post `26` (post `74` carries `forgewp_route_id=home` in this Polylang DB).

### 4(d) & 4(e) WooCommerce `11.0.1` (`forge-commerce`) — REST & Decoupled 1d PASS; Browser Check NOT RUN
1. **Cross-origin / Decoupled 1d (`FORGEWP_FRONTEND_ORIGIN = 'http://127.0.0.1:49999'`, `Origin: http://127.0.0.1:49999`, zero cookies):**
   - `GET /commerce/settings` -> `200` (`USD`, `symbol: '$'`, `minorUnit: 2`, `prefix: '$'`, `suffix: ''`).
   - `GET /products?contract=2&perPage=4` -> `200`, 4 items, minor-unit pricing (`price: 19500`, `regularPrice: 19500`, `salePrice: null`, `onSale: false`, `range: null`).
   - Guest cart via `X-ForgeWP-Cart-Token` only (no `Cookie` header): `POST /cart/items` (product `28`) -> `200` (`tokenPresent: true`, `itemCount: 1`, `total: 29700`); `GET /cart?contract=2` -> `200` (`itemCount: 1`, `total: 29700`); `POST /cart/coupons` (`SAVE10`) -> `200` (discount `2850`, `total: 26850`); `DELETE /cart/coupons/SAVE10` -> `200` (`coupons: []`, `total: 29700`).
   - `GET /checkout/gateways` -> `200`, returns `bacs` and `cod` with `id`, `title`, `description`, `icon`, `supports` (note: no `flow` property in payload).
   - `POST /checkout`: invalid `'stripe'` -> `400 invalid_payment_method`; `'bacs'` -> `200` (`orderId: 93`, `status: 'on-hold'`, `total: 30000`, `needsRedirect: false`); `'cod'` -> `200` (`orderId: 94`, `status: 'processing'`, `total: 30000`).
   - `GET /checkout/order?id=94&key=...` -> `200` (`number: '94'`, `status: 'processing'`, `totals.shipping: 1500`).
   - **Mailpit (`http://127.0.0.1:10024`):** Captured customer order-received emails (`cod@forgewp-test.local`, `bacs@forgewp-test.local`) and admin new-order emails for `#93` and `#94`.
2. **Authenticated customer, cart merge & wishlist (`?contract=2`, WP auth cookies + `X-WP-Nonce` from `#forgewp-session`):**
   - Anonymous `GET /customer/orders?contract=2` -> `401`.
   - `POST /auth/login` -> `200` (cookie-based session, 3 cookies set; no JWT `token` field; `restNonce` supplied in `<script id="forgewp-session">`).
   - `POST /cart/merge` (auth cookies + `X-WP-Nonce` + guest `X-ForgeWP-Cart-Token`) -> `200` (`itemCount: 1`, `total: 29700`).
   - Authed `POST /checkout` (`cod`) -> `200` (`orderId: 95`, `status: 'on-hold'`, `total: 32500`).
   - `GET /customer/orders?contract=2` (`200`, contract v2 keys including `path`) and `GET /customer/orders/95?contract=2` (`200`).
   - `GET /customer/profile` (`200`), `POST /customer/profile?contract=2` (`200`), `POST /customer/address?contract=2` (`200`), `GET /customer/downloads?contract=2` (`200`, `items: []`).
   - `POST /wishlist/items?contract=2` -> `GET /wishlist?contract=2` -> `DELETE /wishlist/items/28?contract=2` -> `200` (`[28]` -> `[28]` -> `[]`). **Note:** In Node `fetch`, `POST /wishlist/items?contract=2` with an authenticated `Cookie` header and omitted `X-WP-Nonce` also returned `200` rather than rejecting missing nonce (anonymous calls still return `401`).
3. **Browser & WooCommerce Blocks Cart Skeleton (`/shop/`, `/cart/`, `/product/.../`):** **PASS (Verified live in Chrome via `chrome-devtools` MCP)**
   - **Empty `/cart/`:** Settled cleanly (`skeletonCount: 0`, `isLoadingCount: 0`, `class="wp-block-woocommerce-cart alignwide"`), rendering `"Your cart is currently empty!"` and `New in store` products. All WooCommerce block JS/CSS assets (`cart-frontend.js`, `wc-cart-checkout-base-frontend.js`, `wc-cart-checkout-vendors-frontend.js`, `cart.css`) returned HTTP `200`, `0` failed requests, `0` console errors.
   - **`/shop/` & `/product/cashmere-ribbed-turtleneck/`:** `/shop/` rendered all 9 products with formatted currency (`$285.00`, `$340.00`, `$195.00`, etc.), Navbar started at `$0.00`, and `GET /wp-json/forgewp/v1/cart?contract=2` returned `200` (zero `/wc/store/v1/*` requests from `@forgewp/woocommerce`). Note: clicking `QUICK ADD` on `/shop/` only ran `e.stopPropagation()` without submitting an add-to-cart call, whereas clicking `Add to cart` on `/product/cashmere-ribbed-turtleneck/` added the item cleanly, stored `forgewp_cart_token`, and updated Navbar to `1 $207.00` (`$195.00` item + `$12.00` US Flat Rate).
   - **Filled `/cart/`:** Returning to `/cart/` rendered `.wp-block-woocommerce-filled-cart-block` cleanly with `0` skeletons (`skeletonCount: 0`, `isLoadingCount: 0`): `Cashmere Ribbed Turtleneck $195.00`, `Subtotal $195.00`, `US Flat Rate $12.00`, `Estimated total $207.00`, `Proceed to Checkout`, Navbar `1 $207.00`, `GET /wp-json/forgewp/v1/cart?contract=2` -> `200`, `0` console errors (only a dependency-detection warning from `order-attribution.min.js` accessing `wc.wcBlocksData`). The earlier R1 Blocks Cart skeleton issue no longer reproduces.

   - Run the full 128-file `pnpm --filter @forgewp/compiler test` suite in a clean pass after `b864db9`.
