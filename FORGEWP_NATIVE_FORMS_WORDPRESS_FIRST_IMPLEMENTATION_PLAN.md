- **Phase 2 — Code complete; staging mail verification open:** added an opt-in `confirmation` contract, validation of its developer-owned email field and merge tags, and a separate plain-text `wp_mail()` receipt path. Focused compiler tests cover default-off, valid configuration, invalid recipient fields, and unknown merge tags. Verify actual delivery and failure logging with WordPress staging mail transport.

# ForgeWP Native Forms: WordPress-First Implementation Plan

**Status:** In progress — Phase 0 code fixes and core Phase 1 admin improvements implemented; staging/security and later phases remain open  
**Prepared:** 2026-10-03  
**Owner:** ForgeWP framework  
**Scope:** Improve the existing native form path without replacing WordPress, creating a competing form-builder product, or removing plugin integrations.

## 1. Goal and Product Boundary

Improve ForgeWP native forms for common site forms while keeping WordPress as the platform and the source of admin, permissions, scheduling, storage, mail transport, and privacy APIs.

ForgeWP should provide a clean, theme-authored form contract and integrate it with WordPress. It should not become a general visual form-builder plugin or an event-management system.

The existing plugin shortcode path remains supported. When a site needs an established plugin's specialized workflows, the site owner should be able to create the form in that plugin and place its shortcode in WordPress content rendered through `BlockArea` / `the_content()`.

## 2. Verified Current State

### Form declaration and fields

- Forms are declared in `wp.config.ts` or discovered from `cms/forms/<name>.ts` using `defineWpForm()`.
- Inline `wp.config.ts` declarations override discovered same-name form declarations.
- Native forms have developer-owned fields in the form contract. These are a stable allowlist used by the backend.
- `clientFields.enabled` adds optional WordPress-managed fields. `<WpFormFields>` renders those fields inside developer-owned React markup.
- `mode: 'shortcode'` generates no native endpoint, native storage, or client-field editor. `WpShortcode` renders a developer-supplied shortcode. Editors may instead insert a plugin shortcode with the WordPress core Shortcode block inside post content; those are separate workflows.

### Submission, email, and storage

- `submitWpForm()` simulates success in local Vite. It does not exercise server validation, delivery, or storage.
- In WordPress, the generated endpoint is `/wp-json/forgewp/v1/forms/{name}/submit`.
- The endpoint validates declared fields, sanitizes values, applies a rate limit, honeypot, and time trap, and calls `wp_mail()` for the configured recipient.
- The notification currently goes to `mailTo`; it is not an automatic confirmation email to the submitter.
- `storeSubmissions` defaults to enabled and saves entries in the private `forgewp_submission` CPT. Submitted fields are stored as post meta.
- Auth verification/reset emails also use WordPress mail delivery, but they are separate flows with different triggers, templates, and settings. SMTP configuration belongs to WordPress/site infrastructure and should not be duplicated in Forms settings.

### Admin field editor and permissions

- The generated Forms screen manages client-owned fields for forms already declared by the developer. It does not create form definitions and does not accept arbitrary plugin shortcodes.
- The generated screen now groups forms into panels, shows developer-owned fields read-only, and renders client-owned fields as responsive field cards with labeled controls, reorder/remove actions, stable machine keys, and save/conflict status feedback. Compiler tests cover generated structure, but WordPress keyboard-only/narrow-admin behavior still needs staging verification.
- `formsAdminCapability` now controls both the Forms screen and stored-submission CPT. It defaults to `manage_options`; lowering it intentionally grants access to stored personal data. A live role/capability matrix has not yet been checked in WordPress.
- Submission storage uses a private CPT with the configured capability mapped to record-level actions. CSV export, email-matched WordPress privacy exporter/eraser hooks, and opt-in per-form permanent deletion are implemented; verify actual roles, privacy requests, downloads, and WP-Cron behavior in WordPress staging.

### Phase progress (2026-10-03)

- **Phase 0 — Code complete; environment audit open:** added `is_email()` validation after sanitization and corrected mail/storage failure messages with server-side logging and identical visitor-facing success text. Compiler tests cover those branches. A live WordPress roles/access audit, privacy exporter/eraser check, and staging mail-failure test remain outstanding.
- **Phase 1 — Code complete; staging review open:** added the `formsAdminCapability` setting and replaced the fixed-width table with responsive accessible field cards, a developer-owned field inventory, stable keys, and save/conflict feedback. Focused generator tests pass. Manual WordPress admin testing at narrow widths and with keyboard-only navigation remains outstanding.
- **Phase 2 — Code complete; staging mail verification open:** added the opt-in `confirmation` contract, compile-time validation of its developer-owned email field and merge tags, and a separate plain-text `wp_mail()` receipt path. Compiler tests cover default-off, valid/invalid recipients, and merge-tag restrictions. Verify delivery and failure behavior with WordPress staging mail transport.
- **Phase 3 — Core code complete; policy/staging verification open:** added capability-protected CSV export with explicit unchecked field selection, form/date filters, UTF-8 output, formula-injection neutralization, form-scoped values, submission language, and no IP-hash export; registered WordPress personal-data exporter/eraser hooks using a site-salted email HMAC plus declared email fields for legacy entries; added opt-in per-form permanent deletion via daily WP-Cron. There is no legal-hold exemption. Focused compiler tests (76) and generated-PHP lint pass. Verify actual roles, exports/privacy requests, cron scheduling, and retention/legal-hold policy in WordPress staging before enabling deletion.
- **Phase 4 — Deferred:** event registration remains a separate plugin/add-on staging pilot, not part of the general native forms implementation.

### Relevant implementation files

- `packages/compiler/lib/functions/forms.js`
- `packages/compiler/lib/index.d.ts`
- `packages/compiler/lib/load-config.js`
- `packages/compiler/bin/make-form.js`
- `packages/compiler/test/functions/forms.test.js`
- `packages/react/src/hooks.ts` (`submitWpForm`)
- `packages/react/src/components/WpFormFields.tsx`
- `packages/compiler/templates/wordpress.tsx`
- `packages/compiler/lib/functions/hydration-enqueuer.js`
- `forgewp-docs/content/13. Forms, Search & Interactivity/01-native-forms.md`

## 3. Non-Negotiable Design Rules

1. Keep plain React markup and `submitWpForm()` as the native authoring model; do not require a proprietary `<WpForm>` tree.
2. Keep plugin mode as an explicit escape hatch. Do not reimplement a third-party plugin's workflow in ForgeWP merely to make one project work.
3. Preserve existing `forms` config behavior by default. New email, retention, capability, and export behavior must be additive or explicitly opt-in.
4. Use WordPress APIs and conventions: `wp_mail()`, REST routes, capabilities, nonces, admin UI patterns, WP-Cron or Action Scheduler where appropriate, privacy exporter/eraser hooks, and established CSV response handling.
5. Keep field ownership explicit: developer-owned fields remain code/schema-owned; client-owned fields are editable only where `clientFields.enabled` is configured.
6. Treat submissions as potentially sensitive personal data. Audit who can read, export, retain, and delete them before shipping new admin functionality.
7. Separate general-purpose forms features from event-specific policies such as capacity, waitlisting, attendance, or approval workflows.

## 4. Phase 0: Audit and Decisions

Do not begin UI polish until the current data-access and delivery contracts are explicit.

### Required audit

- Verify the actual WordPress roles that can list, view, edit, export, and delete `forgewp_submission` posts and their post meta.
- Determine whether core personal-data export/eraser hooks cover stored form submissions; add forms-specific hooks if they do not.
- Confirm the generated endpoint's behavior when storage succeeds but `wp_mail()` fails, and ensure the response cannot imply data loss when the entry was stored.
- Confirm current select, email, checkbox, required, max-length, and unknown-field validation behavior against implementation and docs. Specifically, the code currently calls `sanitize_email()`; verify whether valid-format checking with `is_email()` is also performed before promising it in docs.
- Decide whether a client editor should be able to manage only `clientFields` or whether form creation/editing is in scope. Default recommendation: form definitions remain developer-owned; the client can edit only explicitly delegated fields.

### Exit criteria

- A role/permission matrix exists for the Forms editor and stored submissions.
- Personal-data export, erasure, retention, and email-failure semantics are documented.
- Config changes and defaults for subsequent phases are agreed before modifying public types.

## 5. Phase 1: Improve the WordPress Admin Field Editor

Keep the existing field ownership model. Improve the admin experience without building a competing form-design canvas.

### Scope

- Replace the horizontally scrolling 900px table with a responsive field list/editor that uses WordPress admin conventions and core styles/components available to the framework.
- Group fields by form and clearly distinguish developer-owned fields (read-only in this screen) from client-owned fields (editable here).
- Keep add, remove, reorder, label, type, required, placeholder, and select-options controls keyboard-accessible and screen-reader labeled.
- Keep generated machine names stable after creation; do not silently rename fields when labels change.
- Show validation/conflict messages beside the affected field and a clear saved/failed status.
- Preserve the current language-tab behavior for multilingual forms.
- Do not let this screen create new native form contracts or arbitrary plugin shortcode definitions in this phase.

### Configurable access

Add an optional capability setting, for example `adminCapability`, at an intentionally chosen scope (global Forms admin or per-form only if there is a demonstrated need).

- Backward-compatible default: `manage_options`.
- Validate that the configured capability is a non-empty WordPress capability string.
- Apply the same capability check to page rendering, AJAX saves, submission views, and future export/delete actions.
- Do not accept a role name as a substitute for a capability; roles vary by site and plugins.
- Document the security effect of granting field or submission access to lower-privilege roles.

### Acceptance criteria

- Existing themes with no new setting behave exactly as before.
- Admins can edit client-owned fields; developer-owned field definitions remain protected.
- The editor works at narrow admin viewport widths and with keyboard-only navigation.
- Unauthorized users cannot view or mutate protected form settings through either the UI or direct AJAX requests.
- Tests cover default capability behavior, configured capability behavior, nonce failures, field collisions, sanitization, multilingual save, and duplicate field names.

## 6. Phase 2: Submitter Confirmation Email

Add an explicit, backward-compatible confirmation setting without changing the existing admin notification contract.

### Proposed config shape

The exact names should be settled during API review. A possible shape is:

```ts
forms: {
  contact: {
    // Existing admin notification fields remain unchanged.
    confirmation: {
      enabled: true,
      emailField: 'email',
      subject: 'We received your message',
      body: 'Hello {name}, we received your message.',
    },
  },
}
```

### Required behavior

- Default disabled so existing forms send no additional email.
- Send only to a validated email field declared by the developer; never accept an arbitrary recipient address from submitted data.
- Reuse `wp_mail()` and site mail transport. Do not introduce a second SMTP system or couple Forms to Auth email settings.
- Escape/strip header injection from subject and recipient inputs. Define plain-text versus HTML body behavior explicitly.
- Decide and document whether confirmation failure affects the submission response. Recommended: if the entry has already been stored, preserve the successful submission and report notification failure through server logging/admin observability rather than telling the visitor the form failed and inviting duplicate submissions.
- Avoid exposing sensitive submitted values in confirmations unless the developer explicitly includes allowed merge tags.

### Acceptance criteria

- Existing configs retain current behavior.
- Valid configured recipients receive a confirmation; invalid/missing recipient values do not.
- Admin notification and submitter confirmation can be enabled independently.
- Tests cover mail success/failure, invalid email, header injection, and storage/notification failure combinations.

## 7. Phase 3: Submission Export and WordPress Privacy

### CSV export

Add an export action to the WordPress submissions screen using normal admin capability checks, nonce verification, and streaming response headers.

- Filter by form and date range before export.
- Export only fields belonging to the selected forms and escape CSV formula-leading characters (`=`, `+`, `-`, `@`, tab, carriage return) to prevent spreadsheet formula execution.
- Make PII columns explicit; do not export IP hashes by default.
- Support UTF-8 and preserve multilingual labels/values.
- Audit log the export event without logging submission contents.

### Privacy and retention

- Register WordPress personal-data exporter and eraser integration for ForgeWP submission records when supported by the stored identifiers.
- Add an optional per-form retention policy. No automatic deletion by default; preserve existing behavior unless configured.
- If enabled, schedule cleanup with WP-Cron or the site's established scheduler. Make the policy explicit about delete vs anonymize, age calculation, failed/unscheduled cron behavior, and exclusions for legal holds.
- Purge associated post meta when deleting/anonymizing a submission.
- Keep raw IP out of storage; if a hashed IP is retained for anti-abuse, document its retention and threat model.

### Acceptance criteria

- Only authorized roles can export or change retention settings.
- CSV export handles commas, quotes, newlines, Unicode, and spreadsheet formula injection safely.
- WordPress privacy export/erase requests include the supported stored submission fields.
- Retention is opt-in, form-specific, testable, and does not delete entries from other forms.

## 8. Phase 4: Plugin Integration and Event Registration Pilot

Do not build event capacity, waitlist, or approval into the general native form core until a concrete need justifies a separate event-workflow layer.

### Preferred pilot path

Keep `hospitality_event` as the event source of truth and embed a plugin-managed form shortcode in the event post content through the WordPress Shortcode block. The CPT single template already renders content via `BlockArea`/`the_content()`.

A candidate stack to validate is:

- Gravity Forms for the registration form, entry storage, notifications, and entry export.
- Gravity Flow for human review/approval and workflow history.
- Gravity Wiz GP Inventory for event capacity, shared or date-scoped inventory.

Current vendor documentation indicates that some waitlist behavior and approval-aware inventory handling involve snippets/integration rather than being a turnkey default. Treat them as pilot risks, not guaranteed features. Confirm current license tiers and compatibility before purchase.

### Pilot decisions and checks

- Decide when a seat is reserved: at submission, at approval, or after confirmation. Pending approvals must not accidentally allow overbooking.
- Decide whether a full event closes registration, accepts waitlist entries, or accepts applications pending manual review.
- Ensure every entry is associated with the correct `hospitality_event` post. Test a hidden event identifier/permalink field or separate form strategy; do not assume the shortcode knows the parent CPT automatically.
- Keep marketing consent separate, unchecked by default, and stored independently from event-registration consent.
- Confirm CSV exports include the event identity, approval status, and timestamps needed by staff.
- Configure privacy notice, data retention/deletion, and role access in the selected plugin and any add-ons.
- Verify whether registrations can be edited, approved, declined, waitlisted, and exported without direct database access.

### ForgeWP shortcode boundary

- A developer-authored `forms.mode: 'shortcode'` contract plus `<WpShortcode>` is not an admin form catalog. Its config shortcode value is not automatically editable in wp-admin.
- A client-created plugin form can be inserted directly with the core WordPress Shortcode block inside the CPT content. This requires no new `forms` entry, but Vite cannot execute the plugin shortcode.
- If the pilot proves the client needs a centralized shortcode picker/editor, scope that separately as optional integration metadata. Do not duplicate a plugin's form builder inside ForgeWP.

### Pilot exit criteria

Proceed with the plugin stack if it satisfies capacity, approval, confirmation, export, privacy, and client editing requirements with acceptable paid add-ons and manageable maintenance. Otherwise, write a separate event-registration extension specification; do not expand the general form schema ad hoc.

## 9. Implementation Sequence and Gates

1. **Security/data audit:** establish submission-read permissions, privacy export/erase behavior, current validation accuracy, and failure semantics.
2. **Admin editor + capability:** ship only after role matrix, migration defaults, and authorization tests are agreed.
3. **Confirmation email:** preserve existing admin notification and default-off behavior; verify mail failure semantics.
4. **CSV export + privacy/retention:** ship with PII safeguards, WP privacy integration, and retention tests.
5. **Event plugin pilot:** validate the candidate stack on staging with one event, including capacity lifecycle and waitlist behavior.
6. **Docs and upgrade notes:** update `forgewp-docs` for every public config/runtime/admin behavior change; explain migration and WP plugin prerequisites.

Each phase is independently reviewable. Do not bundle it into one large forms rewrite.

## 10. Non-Goals

- Do not replace WordPress roles, capabilities, REST, `wp_mail()`, WP-Cron, privacy tools, or admin conventions.
- Do not build a general drag-and-drop form builder in ForgeWP.
- Do not make the Forms field editor create arbitrary server endpoints at runtime.
- Do not make event capacity, check-in, or waitlisting default semantics of every native form.
- Do not promise that shortcode plugins render in local Vite or that a plugin shortcode is automatically editable through ForgeWP's Forms screen.
- Do not enable automatic production fixture seeding as part of the forms improvements.

## 11. Validation Checklist

- `pnpm --dir packages/compiler exec vitest run test/functions/forms.test.js` plus any new focused tests.
- `pnpm --dir packages/compiler run test` for cross-cutting PHP/config changes.
- `pnpm --dir packages/react run typecheck` for public React API changes.
- Hospitality fixture and route checks for any form preview or plugin shortcode work.
- Export inspection for REST routes, capabilities, CPT storage, scheduled cleanup, and generated admin pages.
- Manual WordPress staging checks with Administrator and the intended editor role.
- End-to-end mail verification on staging; local `submitWpForm()` simulation is not a delivery test.
- CSV inspection in spreadsheet software, including malicious formula-like values.
- `forgewp-docs` typecheck and production build when docs change.
