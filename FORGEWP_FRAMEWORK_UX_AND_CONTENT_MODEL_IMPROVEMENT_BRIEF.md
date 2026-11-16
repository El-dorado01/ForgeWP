# ForgeWP UX and Content Model: Remaining Work

Scope: outstanding Auth runtime review, WordPress and browser acceptance, documentation discoverability, and companion WordPress plugin export. Completed implementation and documentation tasks are removed from this brief; it tracks remaining work only. WooCommerce remains a separate workstream.

## Auth runtime parity and security review

- [ ] Audit provider and standalone environment-option precedence, including browser globals, Vite variables and process-environment aliases. API-base normalization is shared, but the complete resolver is not unified.
- [ ] Verify initialization and session changes in a mounted browser: provider and standalone consumers, SSR/hydration, reloads, login/logout, and optional JWT recovery. Bundle/state-harness tests do not establish browser lifecycle behavior.
- [ ] Audit generated endpoint permission checks, request origins, cookies/nonces, redirects and rate limiting. Client UI gates and decoded JWT display state must not be treated as backend authorization.
- [ ] Decide the public password-recovery privacy contract. Recovery currently exposes WordPress account/delivery errors rather than a uniform account-existence response; assess account enumeration alongside origin and rate-limit behavior.

Preview reset tokens have no real expiry and do not replace mock login credentials. Account creation, simulated mail and preview sessions must remain distinct from WordPress accounts, inbox delivery and server-authorized sessions.

## Live WordPress acceptance

- [ ] Verify cookie/session persistence, expiry, logout failures and successful logout against an installed WordPress site, including subdirectory deployments and deployment-specific origins/caching.
- [ ] Verify default roles, approved signup metadata, capabilities and protected Pages against real WordPress users and server authorization.
- [ ] Verify registration with and without automatic login, verification-required sign-in, mail failure/retry, resend token replacement and verification-token expiry/single use.
- [ ] Verify password-recovery delivery, frontend reset URL routing, real reset-key expiry/single use, login with the new credentials, cookies and plugin password rules.
- [ ] Verify optional JWT issuance, backend validation, expiry, rejected/unreachable restoration, logout and cross-origin protected requests against the selected JWT backend.

Generated-PHP tests use WordPress stand-ins. They verify call ordering and error paths, not real password hashing, WordPress expiry, cookie behavior or inbox delivery.

## Documentation browser and hosted acceptance

- [ ] Verify desktop/mobile navigation, top-aligned module rail, docs version/Preview label, mobile social links and the Auth chapter structure in a rendered browser.
- [ ] Verify desktop/mobile Markdown copy, clipboard fallback/failure feedback, stacked Auth comparisons and Mermaid diagram rendering in a browser. Automated copy/serialization checks and production builds do not establish visual acceptance.
- [ ] Verify hosted documentation routes and readable article content, including direct links and extraction from generated HTML.

## Public documentation discoverability

- [ ] Add a configurable canonical deployment origin and page metadata/canonical URLs when the hosted domain is ready.
- [ ] Add sitemap and crawler policy; verify their URLs against the complete public route list. Avoid indexing unfinished module placeholders as complete product guides.
- [ ] Review introduction/installation coverage for React-to-WordPress search queries and submit the hosted site to search consoles.
- [ ] Optional AI-reader exports: generate an llms index, full/module Markdown and a compact agent guide from published docs. Verify complete block serialization and explicitly label unfinished feature areas.

Crawler eligibility and reader exports can support retrieval. They do not guarantee model training, automatic whole-site crawling, indexing or recommendations.

## Companion WordPress plugin export

- [ ] Add an explicitly configured companion-plugin source directory and export a separate installable plugin ZIP alongside the theme.
- [ ] Package plugin PHP, production Composer dependencies, assets and WordPress metadata; validate entry points and dependency availability. Preserve namespaces and file boundaries.
- [ ] Define activation, upgrade, deactivation and explicit uninstall behavior, capabilities, versioning and repeatable builds. Deactivation/theme switches must not delete persistent business records.
- [ ] Support independently installing/updating the theme and plugin, with export guidance and compatibility checks. Reject missing dependencies or accidentally bundled private masters, generated customer PDFs, credentials and development/test files.
- [ ] Validate an exported plugin in WordPress through activation, an update and a theme switch. Document when to use theme `src/server` versus a companion plugin.

Motivation: Hospitality 2035 needs EDD order-linked sequential licenses, PDF personalization, private delivery and admin settings to survive theme changes. The project plugin establishes requirements separately from framework implementation. Existing `src/server/*.php` remains theme-bound and is appended to exported `functions.php`.
