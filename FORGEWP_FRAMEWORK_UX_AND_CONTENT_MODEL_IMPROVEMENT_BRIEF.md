# ForgeWP UX and Content Model: Remaining Work

Scope: live WordPress acceptance, component-install UX, remaining module documentation, Bing submission, and companion WordPress plugin export. Completed implementation and documentation tasks are removed from this brief; it tracks remaining work only. WooCommerce remains a separate workstream.

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

- [ ] Verify native Forms and stored-submission access with real WordPress roles, plus keyboard/narrow-admin editing and notification/receipt delivery and failure behavior. The generated implementation exists in `packages/compiler/lib/functions/forms.js`; the staging work recorded in [the forms plan](docs/archive/FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md) remains open. Acceptance: configured capabilities govern both editing and submission access, admin controls are usable, and mail failures match the documented response contract.
- [ ] Verify Forms CSV downloads, personal-data export/erasure and scheduled retention in WordPress. CSV, privacy hooks and WP-Cron cleanup are implemented in `packages/compiler/lib/functions/forms.js`; permanent deletion is opt-in. Acceptance: exports respect permissions/field selection, privacy requests target the right records, and cleanup follows the agreed retention policy before deletion is enabled.

## Native Forms: deferred UX and capability improvements

These are future candidates from the archived forms brainstorm, not current implementation commitments. Preserve the intentional developer/client field-ownership boundary: client fields remain editable within the developer-defined slot; expanding control over developer-owned structure or validation is not an improvement item.

- [ ] Expand the native field contract: assess radio groups, multiple selections and hidden fields, plus server-enforced numeric `min`, `max` and `step`. Acceptance: supported fields work consistently in configuration, local preview, client-field editing where applicable, submission validation and stored/email output. File uploads are covered separately below.
- [ ] Improve the plugin-managed form experience: assess a useful local shortcode form preview and optional styling/adapter support for selected plugins. `WpShortcode` currently renders a placeholder locally. Define supported plugins and the limits of preview fidelity before implementation; preserve the shortcode escape hatch and native forms' plugin independence.
- [ ] Assess advanced native form capabilities: file uploads with explicit MIME/size/storage/attachment policies, optional CAPTCHA integration, multi-step flows and payment integrations. Scope these independently and define validation, failure/retry and delivery behavior before committing; they are deferred possibilities rather than requirements for every contact form.
- [ ] Server-render client-owned fields from the saved WordPress definitions. Acceptance: initial HTML reflects the active locale's saved fields (including an intentionally empty set), preserves developer-supplied markup and matches the hydrated form without duplicate fields or content swaps. Define no-JavaScript submission behavior separately; rendering alone does not provide it.

## Component installation UX

- [ ] Define and implement an inspectable, recoverable component-install plan. `packages/compiler/lib/add-component.js` currently invokes upstream installation, writes local overrides, then processes Tailwind plugins; the local metadata contract is not a general dependency installer. A later failure can leave a partially changed project. Acceptance: a dry run identifies sources/files/dependencies, local registry dependency fields have an explicit supported contract, and failure tests establish rollback or precise recovery instructions. The [registry review](docs/archive/component-registry-ux-review.md) records the proposal; this item does not claim transactional installs already exist.
- [ ] Make upstream overwrite behavior explicit and test it independently from local overrides. `add-component.js` protects existing ForgeWP-local files unless `--overwrite` is supplied, but delegates upstream components to `shadcn add --yes`. Acceptance: existing customized upstream files are tested against the selected CLI, help accurately states flag scope, and update/replacement behavior is documented without implying that local protection covers upstream installs.

## Public documentation discoverability

- [ ] Verify domain ownership in Bing Webmaster Tools and submit `https://www.forgewp.dev/sitemap.xml`. This requires the owner's account or DNS access.
- [ ] Review the Adapters, Agents, Webhooks and separate CLI-module documentation previews against their actual implementations before publishing them as guides. The docs project's `lib/docs-publication.ts` currently publishes only Core and Auth; the Core CLI reference is already included. Acceptance: each promoted module has accurate APIs/examples and verification, while unimplemented features remain clearly labeled proposals.

Crawler eligibility and reader exports can support retrieval. They do not guarantee model training, automatic whole-site crawling, indexing or recommendations.

## Companion WordPress plugin export

- [ ] Add an explicitly configured companion-plugin source directory and export a separate installable plugin ZIP alongside the theme.
- [ ] Package plugin PHP, production Composer dependencies, assets and WordPress metadata; validate entry points and dependency availability. Preserve namespaces and file boundaries.
- [ ] Define activation, upgrade, deactivation and explicit uninstall behavior, capabilities, versioning and repeatable builds. Deactivation/theme switches must not delete persistent business records.
- [ ] Support independently installing/updating the theme and plugin, with export guidance and compatibility checks. Reject missing dependencies or accidentally bundled private masters, generated customer PDFs, credentials and development/test files.
- [ ] Validate an exported plugin in WordPress through activation, an update and a theme switch. Document when to use theme `src/server` versus a companion plugin.

Motivation: Hospitality 2035 needs EDD order-linked sequential licenses, PDF personalization, private delivery and admin settings to survive theme changes. The project plugin establishes requirements separately from framework implementation. Existing `src/server/*.php` remains theme-bound and is appended to exported `functions.php`.
