---
name: wordpress-e2e-acceptance
description: 'Use when asked to test a ForgeWP theme or app end-to-end against a live LocalWP WordPress installation (including wp-admin workflows, Native WordPress vs. Decoupled visual and functional parity, and live bug fixing), or when given a one-shot prompt to build a new ForgeWP site and validate it end-to-end.'
---

# ForgeWP WordPress End-to-End Acceptance Testing

Use this skill to validate real ForgeWP themes and applications against the developer's local **LocalWP** WordPress sandbox in a visible browser session, fix scoped framework bugs at their source, log complex engineering gaps for joint review, and propose concrete DX/UX improvements.

---

## 1. Entry Modes

This skill supports two entry workflows:

### Mode A — Test an Existing ForgeWP App
Use when the user points to an existing ForgeWP project (e.g. a scaffolded Next.js, React/Vite, or HTML starter project in `projects/` or `packages/starter`).
1. Inspect the project's `package.json`, `wp.config.*`, `cms/`, and adapter (`nextjs`, `react`, or `html`).
2. Establish a clean baseline before exporting (`forgewp doctor`, build/typecheck).
3. Run the full End-to-End Acceptance Runbook in Section 3.

### Mode B — One-Shot Prompt: Build a New App + Test End-to-End
Use when the user gives a prompt describing a new site to create and verify end-to-end.
1. Scaffold a fresh project using the appropriate adapter (e.g. `node packages/create-forgewp/index.js <dir> --adapter nextjs --yes` or `--adapter react` / `--adapter html`) inside a test workspace directory outside `packages/` (or clean up temporary test projects if asked). Do not silently overwrite existing CI fixture projects unless explicitly instructed.
2. Build the requested site using idiomatic ForgeWP primitives (`createWpServerClient`, `defineEditable`, `defineWpForm` / `submitWpForm` / `WpFormFields`, `defineBlock` / `BlockArea`, `WpServerRequireAuth` / `WpServerAuthGate`, `next/link`, `next/image`, `next/font`, `@forgewp/auth`, `@forgewp/plugin-seo`, `@forgewp/woocommerce`).
3. Respect dual-mode portability principles recorded in `docs/dual-mode-portability-architecture.md` so Native WordPress and Decoupled modes stay aligned from the start.
4. Run the full End-to-End Acceptance Runbook in Section 3 on the generated project.

---

## 2. LocalWP Sandbox Configuration & Safety Rules

### Credentials & Paths
Read sandbox configuration from the repository-root gitignored file `.env.localwp` (template at `.env.localwp.example`):
- `FORGEWP_LOCALWP_URL` — Live LocalWP frontend URL
- `FORGEWP_LOCALWP_ADMIN_URL` — WordPress admin login/dashboard URL
- `FORGEWP_LOCALWP_USERNAME` — Local sandbox username
- `FORGEWP_LOCALWP_PASSWORD` — Local sandbox password
- `FORGEWP_LOCALWP_SITE_PATH` — LocalWP site root directory
- `FORGEWP_LOCALWP_THEMES_PATH` — LocalWP `wp-content/themes` directory for fast direct theme installs

**Security & Git Safety Rules:**
- **Never** hardcode, duplicate, or commit `.env.localwp` values into `.github/`, `docs/`, `packages/`, or test fixtures.
- Confirm `.env.localwp` remains ignored via `.env.*` in `.gitignore`.
- Never write persistent framework files inside LocalWP's theme folder — treat the LocalWP theme folder strictly as compiled export output and edit source files in the ForgeWP repository.

### Direct Theme Installation Workflow
Because the sandbox runs locally on disk, install exported themes directly instead of uploading ZIPs through PHP limits unless specifically testing the ZIP upload UI:
1. Run `pnpm forgewp export --no-zip` inside the target project (producing `.forgewp/out/<slug>`).
2. Cleanly replace `${FORGEWP_LOCALWP_THEMES_PATH}/<slug>` with `.forgewp/out/<slug>` (back up or remove stale files in that theme folder first so deleted templates/assets do not linger, or use `WORDPRESS_THEMES_PATH=$FORGEWP_LOCALWP_THEMES_PATH node scripts/sync-to-wp.mjs <project>` when testing workspace projects supported by that script).
3. Verify PHP syntax with `php -l` on exported `.php` files if any compiler PHP builder code was touched.

### Live Browser Prerequisite Check
- Prefer IDE browser tools (Chrome DevTools MCP / `/browser`) when connected, **or** use the IDE-agnostic visible Chrome runner built into the repository (`scripts/wp-e2e-browser.mjs`, backed by `openChrome({ headed: true })` in `packages/compiler/test/browser/chrome.mjs`), which launches a real visible Chrome window on desktop and works identically in Antigravity, VS Code, and terminal sessions.
- Run a quick read-only connectivity probe before starting UI verification:
  ```bash
  node scripts/wp-e2e-browser.mjs check-access --headed
  ```
- Inspect generated screenshots directly under `.forgewp/e2e-artifacts/` (Desktop + Mobile PNG captures + console/network JSON logs).
- Check whether the LocalWP site is running before troubleshooting code errors.
- If LocalWP is stopped or no Chrome binary/driver is available, stop cleanly and report the exact blocker — never claim live WordPress or visual verification passed without running it.

---

## 3. End-to-End Acceptance Runbook

Execute steps in order against the live LocalWP site while keeping the Chrome session observable:

### Step 1 — Preflight & Strict Native Export
1. Run `pnpm forgewp doctor` in the target project and resolve or note any diagnostics.
2. Export in strict native mode (`pnpm forgewp export --no-zip`).
3. Confirm generated output includes `style.css`, `functions.php`, page/hierarchy templates (`front-page.php`, `page-*.php`, `single*.php`, `archive*.php`, `404.php`), compiled blocks (`blocks/`), clean CSS stylesheets, and bundled JS islands (`assets/islands/`).
4. Copy `.forgewp/out/<slug>` directly into `${FORGEWP_LOCALWP_THEMES_PATH}/<slug>`.

### Step 2 — `wp-admin` Installation, Activation & Health
1. Open `FORGEWP_LOCALWP_ADMIN_URL` in Chrome and sign in using `.env.localwp` credentials.
2. Open **Appearance -> Themes**, locate the installed ForgeWP theme, and activate it (or re-verify active state if updating in place).
3. Check for zero PHP notices, warnings, or fatal errors in `wp-admin` and `wp-content/debug.log` (if enabled).
4. Verify auto-provisioned pages (`forgewp_route_id` markers), navigation menus, CPTs, Theme Options (`Appearance -> Theme Options` if configured), and registered custom Gutenberg blocks (`forgewp/*`).

### Step 3 — Native WordPress Frontend & Visual Verification
Browse `FORGEWP_LOCALWP_URL` across desktop and mobile viewports in Chrome:
1. **Visual & Asset Integrity:** Layout, spacing, typography/fonts (`next/font` or local fonts), colors, dark/light classes (`<html class>`, `<body class>`), images (`srcset`/media paths), CSS cascade, and zero unstyled flash or broken styles.
2. **HTML & Script Cleanliness:** Preserved author `<head>` scripts, zero leaked `/_next/` runtime scripts or React/SSR compile tokens in production HTML, zero 404 network responses, zero console errors.
3. **Interactivity & Routing:** Test client hydration islands (`<Hydrate>`, hotkeys, toggles, modals, drawers), internal links (`next/link`, `useWpPageLink`), dynamic `[slug]` single posts, archive pages, and non-existent route (`404.php`).

### Step 4 — Live Editorial & Slug Round-Trip in `wp-admin`
1. Open a page in the WordPress Gutenberg editor, edit a custom ForgeWP block or `BlockArea` / editable field, click **Save / Update**, and reload the editor to verify zero block validation errors.
2. Open the live WordPress frontend URL and confirm the edited content appears immediately without rebuilding or re-exporting.
3. Rename a page's URL slug in `wp-admin` and confirm navigation/links on the live Native frontend automatically resolve to the renamed permalink via durable `forgewp_route_id`.

### Step 5 — Feature-Specific End-to-End Checks (When Configured)
Run every suite that applies to the target project:
- **Native Forms (`cms/forms/*.ts`):**
  - Confirm SSR `<WpFormFields>` renders saved fields in initial HTML and matches hydrated React with zero duplicate fields or flash.
  - Test validation errors (client + WordPress REST server rejection) and happy-path submission across configured field types (`text`, `email`, `number` `min`/`max`/`step`, `radio`, `select`, `multiselect`, `checkbox`, developer-owned `hidden`).
  - Verify `wp-admin` **Forms** field editor (`clientFields` edits persist per language and appear immediately without rebuilding), **Form Submissions** inbox storage, CSV export, and real email delivery via LocalWP Mailpit.
  - Verify capability/role permissions when custom roles are configured.
- **Auth (`@forgewp/auth` / `WpServerRequireAuth` / `WpServerAuthGate` / `pageConfig.protected`):**
  - Verify login, real WordPress auth cookie persistence across page reloads, role/capability gates, protected page redirects, and logout (including valid REST nonces).
  - Test registration flows, email verification links/expiry (via LocalWP Mailpit), and password reset end-to-end when enabled.
- **WooCommerce / SEO / i18n:**
  - Verify shop/product/cart/checkout flows, Yoast/Rank Math SEO schema handoff (`forgewp_seo_plugin_active()`), or multilingual routes when enabled.

### Step 6 — Decoupled Mode Side-by-Side Parity Check
1. Start the project in Decoupled mode pointed at the live LocalWP backend:
   - `FORGEWP_DEPLOYMENT_MODE=decoupled`
   - `FORGEWP_WP_URL=<FORGEWP_LOCALWP_URL>`
2. Capture and inspect the **Native LocalWP URL** and **Decoupled `localhost` URL** side by side across desktop (`1440x900`) and mobile (`390x844`) using either `/browser` or:
   ```bash
   node scripts/wp-e2e-browser.mjs compare --native $FORGEWP_LOCALWP_URL --decoupled http://localhost:3000 --routes /,/about --headed
   ```
   - Inspect `.forgewp/e2e-artifacts/compare/*.png` and compare layout, typography, spacing, colors, dark/light theme behavior, horizontal overflow, and images between both modes.
   - Verify the Gutenberg edit from Step 4 and renamed page slug from Step 4 appear identically in Decoupled SSR without restarting the decoupled server (or note caching/revalidation friction).
   - Exercise interactive islands, navigation, forms, and auth boundaries in Decoupled mode and flag any Native <-> Decoupled asymmetry (such as `submitWpForm()` falling back to dev simulation, missing CORS/REST bridges, or un-enforced `WpServerRequireAuth` / `<WpShortcode>` gaps per `docs/dual-mode-portability-architecture.md`).

---

## 4. Fault Triage, Fix Policy & Improvement Brief Integration

Classify every issue discovered during live testing into one of three buckets:

### Bucket 1 — Scoped Bugs & Regressions (Fix Directly)
For clear implementation bugs, compiler edge cases, missing asset rewrites, broken PHP generation, CSS leaks, or hydration mismatches:
1. Trace the root cause to its owning source file in `packages/`.
2. Implement the smallest clean, backward-compatible fix.
3. Add or update focused unit/compiler/PHP regression tests.
4. Re-run relevant automated tests, re-export, re-sync to `FORGEWP_LOCALWP_THEMES_PATH`, and re-verify live in Chrome before marking fixed.

### Bucket 2 — Architectural or Complex Engineering Gaps (Log for Joint Review)
If a gap requires careful engineering design, breaking API/schema choices, security architecture trade-offs, or cross-package coordination:
- **Do not** hack around it silently or leave it undocumented.
- Record it in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` following `.github/skills/framework-improvement-brief/SKILL.md`:
  - **Observed behavior** (exact file paths, endpoint/markup behavior, live reproduction steps)
  - **Why it matters** (impact on Native, Decoupled, one-click switching, security, or editorial UX)
  - **Suggested improvement** (bounded engineering direction, avoiding unverified claims)
  - **Acceptance criteria** (observable behavior + verification required)
- Also update `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` checkboxes honestly when a live WordPress acceptance item is genuinely verified end-to-end against LocalWP.

### Bucket 3 — Proactive DX / UX Suggestions
Always evaluate the experience critically while testing, even if checks pass:
- Did scaffolding require manual fixes? Were `forgewp doctor` or export errors clear?
- Was anything awkward in `wp-admin` (Forms editor, Theme Options, Gutenberg previews, slug management)?
- Did switching between Native and Decoupled require extra manual glue or config?
Surface concise, actionable DX/UX improvement suggestions in the final report (and promote durable ones to `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` when appropriate).

---

## 5. Final Report Contract

Every E2E run using this skill must end with a concise structured summary:

1. **Target & Mode:** Project path/adapter and whether it was an existing app or one-shot prompt build.
2. **Environment Verified:** `FORGEWP_LOCALWP_URL`, active theme slug, decoupled `localhost` URL, and any plugin/theme state on the test site.
3. **Acceptance Results:** Passed vs. failed checks across Native WP, `wp-admin` edits/slugs, Forms/Auth modules, and Decoupled parity.
4. **Bugs Fixed Live:** Exact source files modified, tests added/passed, and live Chrome re-verification status.
5. **Engineering Gaps Logged:** Items added to or updated in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`.
6. **Proactive DX / UX Recommendations:** Concrete ergonomics improvements noticed during the run.
