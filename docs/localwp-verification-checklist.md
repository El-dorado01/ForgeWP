# LocalWP Verification Checklist (plugin-dependent paths)

**For:** the agent running on the founder's machine with LocalWP and a visible browser.  
**Why:** the cloud sandbox cannot download plugins from wordpress.org, so everything below depends on a third-party plugin and has only been verified without it. Everything else (Phase A–C core, Companion Plugin, redirects, auth guards, posts/terms/comments, security rules) is already verified live in the cloud sandbox.  
**Prepared by:** Claude, 2026-11-23. Pull `main` first.

Follow `.github/skills/wordpress-e2e-acceptance/SKILL.md` for setup (`.env.localwp`, `scripts/wp-e2e-browser.mjs --headed`, Mailpit). Use a fresh LocalWP site per project, or reset between projects.

---

## 0. Before you start

1. `pnpm install` at the repo root, then in each project below: `pnpm forgewp doctor`, then `pnpm forgewp export --no-zip`.
2. Every export now produces **two** packages in `.forgewp/out/`: `<slug>` (theme) and `<slug>-companion` (plugin). Install the theme; install the plugin where a step says so.
3. Plugins to install from wordpress.org in LocalWP: **WooCommerce**, **Events Manager**, **Polylang**, **Yoast SEO**, **Rank Math** (one SEO plugin at a time), **MailPoet**.
4. Turn on `WP_DEBUG` and `WP_DEBUG_LOG`. After every section, `wp-content/debug.log` must have no fatal errors or ForgeWP warnings.

---

## 1. forge-commerce (WooCommerce)

Theme `forge-commerce` active, WooCommerce active and set up (currency, a shipping zone, "Cash on delivery" and "Direct bank transfer" enabled), a few simple products and one variable product, one downloadable product.

### 1a. Native storefront
| Step | Expected |
|---|---|
| Browse `/shop/`, a product, the cart | Pages render, no console errors, no 404 requests |
| Add to cart, change quantity, remove, clear | Cart updates; totals correct |
| Apply a coupon | Discount applied |
| Shipping rates | Rates for the zone appear |
| Checkout as guest with Cash on delivery | Order created; confirmation email in Mailpit |
| Log in, checkout with saved address | Order on the account |
| Account: orders, order detail, downloads | Lists correct, download link works |
| Wishlist toggle and sync | Persists across reload and login |
| Product review: submit, see, delete own | Works; others cannot delete it |

### 1b. Security (new 2026-11-23, must pass)
Run these from a page on a **different origin** (e.g. a scratch HTML file served on another port) while logged in to the shop in the same browser:
| Step | Expected |
|---|---|
| `fetch('<shop>/wp-json/forgewp/v1/cart', { credentials: 'include' })` | Response is the guest cart, not the logged-in user's |
| A plain HTML `<form method="POST" action="<shop>/wp-json/forgewp/v1/cart/add">` with a product id, submitted within 2 minutes of logging in | Item is **not** added to the logged-in user's cart |
| Same with `/checkout/process` and the review submit route | No order / no review created as the user |
| In DevTools → Application → Cookies, the `wordpress_logged_in_*` cookie | Has `SameSite=Lax` |
| `define('FORGEWP_AUTH_COOKIE_SAMESITE', 'off')` in wp-config.php, log in again | Cookie has no SameSite (then remove the define) |

### 1c. Companion Plugin with WooCommerce
| Step | Expected |
|---|---|
| Install and activate `forge-commerce-companion`, keep the theme | Store works unchanged; no admin notice |
| Switch to Twenty Twenty-Five | `GET /wp-json/forgewp/v1/cart`, `/products`, `/customer/orders` (with a logged-in nonce) still work |
| Deactivate the plugin, switch back to the theme | Theme's built-in backend takes over; cart, orders, wishlist intact |

### 1d. Decoupled (optional if time allows)
Run the project's decoupled mode against LocalWP (same domain via a Next.js rewrite of `/wp-json/*`, or `FORGEWP_FRONTEND_ORIGIN`) and repeat 1a's cart and checkout steps. Report whatever does not work; WooCommerce on the new runtime is still open Phase C work, so failures here are expected input, not blockers.

---

## 2. hospitality (Events Manager)

Theme `hospitality`, Events Manager active, one event with bookings enabled.

| Step | Expected |
|---|---|
| Event page booking form | Shows the extra fields from `src/server/plugin/event-booking-fields.php` |
| Book as guest | Booking stored; admin booking table shows the extra columns |
| Booking confirmation email (Mailpit) | Custom placeholders from `event-booking-email-fields.php` are filled |
| `/studie` | 301 to `/studie/hospitality-2035/` (now a `redirects` rule in `wp.config.ts`), query string kept |
| Activate `hospitality-companion`, switch to Twenty Twenty-Five | Booking fields and email placeholders still work (they live in the plugin now) |

---

## 3. hotelchecker24 (Polylang, MailPoet, SEO plugins)

Theme `hotelchecker24`, Polylang with German (default) and English, MailPoet with a list.

| Step | Expected |
|---|---|
| `/` and `/de/` (or the German home per Polylang settings) | Both render; language switcher links correct |
| `GET /wp-json/forgewp/v1/i18n?lang=en&path=/kontakt/` | `urls` and `homeUrls` come from Polylang and match the switcher |
| `GET /wp-json/forgewp/v1/menus?lang=de` and `?lang=en` | Menus per language |
| `?lang=fr` on `i18n`, `menus`, `routes` | `404 FORGEWP_LOCALE_NOT_FOUND` |
| `<head>` on a German and an English page | hreflang tags from `src/server/theme/hreflang.php` |
| Newsletter form (MailPoet route in `src/server/plugin/mailpoet.php`) | Subscriber added to the list |
| `/kontakt` | Redirects to `/contact/` **only** if `/kontakt` would 404 (`ifNotFound` rule) |
| Yoast active: page source | Yoast's title/meta/schema present; ForgeWP's own head meta not duplicated |
| Switch to Rank Math | Same with Rank Math |

---

## 4. Report back

Use this format, one block per project, and attach screenshots of anything that fails:

```markdown
### <project> — LocalWP — <date>
WordPress <version>, plugins: <name version, ...>
Passed: <section.step list>
Failed: <section.step> — <what happened> — <debug.log excerpt / console errors / request + response>
Not run: <section.step> — <why>
```

Hand the reports to the founder; Claude and Gemini will turn failures into fixes.
