# ForgeWP UX and Content Model: Remaining Work

Scope: live WordPress acceptance, Bing submission, and companion WordPress plugin export. Completed implementation and documentation tasks are removed from this brief; it tracks remaining work only. WooCommerce remains a separate workstream.

Preview reset tokens have no real expiry and do not replace mock login credentials. Account creation, simulated mail and preview sessions must remain distinct from WordPress accounts, inbox delivery and server-authorized sessions.

## Live WordPress acceptance

- [ ] Verify cookie/session persistence, expiry, logout failures and successful logout against an installed WordPress site, including subdirectory deployments and deployment-specific origins/caching.
- [ ] Verify default roles, approved signup metadata, capabilities and protected Pages against real WordPress users and server authorization.
- [ ] Verify registration with and without automatic login, verification-required sign-in, mail failure/retry, resend token replacement and verification-token expiry/single use.
- [ ] Assess concurrent verification-token consumption. The current transient lookup/delete rejects sequential replay but is not atomic; establish and test a stronger consume contract if concurrent single-use is required.
- [ ] Verify password-recovery delivery, frontend reset URL routing, real reset-key expiry/single use, login with the new credentials, cookies and plugin password rules.
- [ ] Verify optional JWT issuance, backend validation, expiry, rejected/unreachable restoration, logout and cross-origin protected requests against the selected JWT backend.
- [ ] Verify Auth request guards and logout nonces in real WordPress: nonce expiry/caching, allowed frontend origins/CORS, trusted proxy addresses and edge/WAF throttling under concurrent traffic and shared NATs. Transient request counters are not an atomic distributed limiter.

Generated-PHP tests use WordPress stand-ins. They verify call ordering and error paths, not real password hashing, WordPress expiry, cookie behavior or inbox delivery.

## Public documentation discoverability

- [ ] Verify domain ownership in Bing Webmaster Tools and submit `https://www.forgewp.dev/sitemap.xml`. This requires the owner's account or DNS access.

Crawler eligibility and reader exports can support retrieval. They do not guarantee model training, automatic whole-site crawling, indexing or recommendations.

## Companion WordPress plugin export

- [ ] Add an explicitly configured companion-plugin source directory and export a separate installable plugin ZIP alongside the theme.
- [ ] Package plugin PHP, production Composer dependencies, assets and WordPress metadata; validate entry points and dependency availability. Preserve namespaces and file boundaries.
- [ ] Define activation, upgrade, deactivation and explicit uninstall behavior, capabilities, versioning and repeatable builds. Deactivation/theme switches must not delete persistent business records.
- [ ] Support independently installing/updating the theme and plugin, with export guidance and compatibility checks. Reject missing dependencies or accidentally bundled private masters, generated customer PDFs, credentials and development/test files.
- [ ] Validate an exported plugin in WordPress through activation, an update and a theme switch. Document when to use theme `src/server` versus a companion plugin.

Motivation: Hospitality 2035 needs EDD order-linked sequential licenses, PDF personalization, private delivery and admin settings to survive theme changes. The project plugin establishes requirements separately from framework implementation. Existing `src/server/*.php` remains theme-bound and is appended to exported `functions.php`.
