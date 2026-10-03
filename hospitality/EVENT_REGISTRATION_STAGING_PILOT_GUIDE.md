# Hospitality 2035 Event Registration: Staging Pilot Guide

**Purpose:** Pilot plugin-managed registration for the existing Berlin and Zürich `hospitality_event` CPT posts without changing production data or replacing the current event content model.

**Recommended pilot stack:** Gravity Forms + Gravity Flow + Gravity Wiz GP Inventory. Treat this as a candidate stack, not an approved purchase or a guarantee that every workflow is available without an add-on/snippet. Confirm current licenses, versions, and compatibility on staging first.

**Staging-only warning:** Do not collect real attendee data in this pilot. Use test names and addresses, route mail to a sandbox mailbox, and do not copy staging entries into production.

## 1. What the Pilot Must Prove

A successful pilot must demonstrate all of the following for each event:

- The entry is clearly associated with Berlin or Zürich.
- The configured capacity cannot be exceeded, including when more than one visitor submits near the same time.
- A submission has an explicit status: received/pending, approved/confirmed, declined, or waitlisted.
- The visitor receives a message that accurately reflects that status. A pending request must not be described as a confirmed seat.
- Organizers can find, review, export, and remove/anonymize entries according to the agreed retention policy.
- Marketing consent is separate from registration and is not preselected.
- The editor can place or remove the correct form on the corresponding event post without changing theme code.

Do not open registration publicly until the client confirms event date, venue, capacity, participant terms, and the exact approval policy.

## 2. Roles and Responsibilities

The site administrator or client must perform the WordPress admin and licensed-plugin actions. ForgeWP code does not install plugins, purchase licenses, or configure Gravity Forms feeds.

| Role                   | Pilot responsibility                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Site administrator     | Backup/restore staging, install and license plugins, create forms, configure roles, run the test matrix  |
| Event owner/approver   | Decide capacity and approval rules, review test submissions, confirm wording and organizer access        |
| Developer              | Add or verify shortcode placement in the CPT content, test the exported theme, support integration fixes |
| Legal/privacy reviewer | Approve registration notice, marketing consent, retention period, and privacy handling                   |

Never send passwords, API keys, or license keys through chat. Enter them directly in the staging WordPress admin.

## 3. Prepare Staging

1. Ask the host/site administrator to create or refresh a staging copy of the site and database. Do not use the production database for the pilot.
2. Open the staging URL in a browser and log in to its WordPress admin. Confirm the address is the staging domain, not the public DICON site.
3. In the dashboard, open **Pages** and confirm the `/events` overview loads. Open **Veranstaltungen** and confirm the Berlin and Zürich event posts load at their `/events/<post-slug>` URLs.
4. Back up the staging database and files before plugin installation.
5. In the hosting panel or the site's mail-sandbox plugin, route outgoing staging mail to a test inbox. Submit a harmless test message and confirm no real recipient receives it.
6. In the caching plugin/host panel, exclude the two event pages from full-page cache during capacity tests, or purge cache before each test. Stale cached forms can show incorrect availability.
7. Record WordPress, PHP, Hospitality theme, Gravity Forms, Gravity Flow, and GP Inventory versions and license tiers.
8. Use fictional attendee data only. Mark forms, entries, and email subjects with `STAGING`.

## 4. Confirm Business Rules Before Form Setup

Record these decisions with the client/event owner. Do not invent values in wp-admin.

| Decision           | Required answer                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Capacity           | Confirmed seat count for Berlin and Zürich independently                                                                        |
| Registration state | Does submission reserve a provisional seat, or does approval reserve it?                                                        |
| Approval           | Required for everyone, or only after capacity is reached? Who approves?                                                         |
| Rejection          | Does rejection release a reserved seat automatically? What message is sent?                                                     |
| Waitlist           | Offer one after capacity is reached? Is it first-come-first-served?                                                             |
| Confirmation       | Send receipt immediately, and final confirmation only after approval?                                                           |
| Event changes      | What happens if the date, venue, or event is cancelled?                                                                         |
| Data retention     | How long are registrations retained? Who may access or export them?                                                             |
| Marketing consent  | Is it needed? If yes, use separate, optional, unchecked-by-default consent text approved by the client.                         |
| Attendance cost    | Confirm whether registration is free or paid. Do not configure payment during this pilot unless the event is confirmed as paid. |

### Capacity policy to test first

A conservative policy is to treat each valid submission as a provisional hold while it is pending, then confirm or release that hold on approval/decline. The pilot must prove the selected inventory/status integration actually behaves this way. Do not assume that Gravity Flow approval automatically reserves or releases GP Inventory capacity.

If pending submissions do not reserve capacity, simultaneous pending requests can exceed the number of seats before an approver acts. If rejected entries continue counting against inventory, capacity may remain blocked. Either case is a pilot failure until corrected by supported plugin configuration or a deliberately scoped integration.

## 5. Install and Configure the Candidate Plugins

Do these steps while logged in to the **staging WordPress admin**. Gravity Forms and its add-ons are commercial products; obtain the plugin ZIP and license through the client's authorized vendor account. Do not paste license keys into chat.

1. In the left dashboard menu, open **Plugins → Add New Plugin → Upload Plugin**.
2. Click **Choose File**, select the Gravity Forms ZIP downloaded from the authorized account, click **Install Now**, then click **Activate Plugin**.
3. Open the Gravity Forms settings/license screen shown by the installed version, enter the staging license directly in wp-admin, and verify the license is accepted.
4. Repeat **Plugins → Add New Plugin → Upload Plugin** for the Gravity Flow ZIP. Install and activate it only if the agreed event process needs manual approval or workflow steps; then activate its license in its settings screen.
5. Repeat the upload/install/activate steps for GP Inventory from the authorized Gravity Wiz account. Activate its license and confirm its Inventory controls appear in the Gravity Forms editor.
6. Open **Plugins → Installed Plugins** and confirm all required plugins are active. Record exact versions and license tier in the Decision Record at the end of this guide.
7. Read the linked official documentation for the installed versions before relying on snippets. In particular, do not add an approval-aware inventory snippet or waitlist snippet directly to production without reviewing and testing its code in staging.

Official references:

- [Gravity Forms notifications](https://docs.gravityforms.com/configuring-notifications/)
- [Gravity Forms entry CSV export](https://docs.gravityforms.com/exporting-form-entries/)
- [Gravity Forms personal-data settings](https://docs.gravityforms.com/personal-data-settings/)
- [Gravity Flow](https://www.gravityforms.com/add-ons/gravity-flow/)
- [GP Inventory](https://gravitywiz.com/documentation/gravity-forms-inventory/)
- [GP Inventory waitlist snippet](https://gravitywiz.com/snippet-library/gpi-waiting-list/)
- [GP Inventory: count Gravity Flow approved entries](https://gravitywiz.com/snippet-library/gpi-limit-by-gravityflow-approved-entries-only/)

The Inventory docs describe product/choice inventory, shared/scoped capacity, sold-out behavior, and integration points. The waitlist and approved-only examples are snippets, so treat them as code to review and test, not as a built-in turnkey waitlist guarantee.

## 6. Create One Form Per Event for the First Pilot

Use separate forms initially because the project already has distinct Berlin and Zürich registration paths. This makes form identity, exports, capacity, and shortcode placement easier to audit. Do not start with a combined event dropdown and shared inventory unless the client specifically needs that design.

### Fields for both forms

Use the client-approved field list. The project brief currently calls for:

- First name
- Last name
- Company
- Function/role
- Email address
- Optional separate marketing consent, if approved

Do not make marketing consent required for event registration. For the pilot, do not add guest quantity unless the client decides how additional attendees affect capacity.

### Create the Berlin form

1. In wp-admin, open **Forms → New Form** (the exact menu label may differ slightly by version).
2. Name it `Hospitality 2035 Berlin Registration STAGING` and click **Create Form**.
3. In the form editor, add **First Name**, **Last Name**, **Company**, **Function**, and **Email** fields. Mark the client-approved fields required and ensure Email uses an email field type.
4. If approved wording is ready, add a separate optional, unchecked marketing-consent checkbox.
5. Add a capacity-controlled product or choice field supported by the installed GP Inventory version. For this initial one-person-per-entry pilot, configure each accepted entry to use one seat.
6. Click **Save Form** and note the form ID shown in the form list/editor URL.

### Create the Zürich form

Repeat the same steps with the name `Hospitality 2035 Zürich Registration STAGING`. Keep its form ID and inventory separate from Berlin. Separate forms make event identity clear in the Entries screen and CSV exports without trusting a visitor-editable hidden field.

### Set temporary test capacity

In each form editor, open the capacity field's GP Inventory/Perks settings and set inventory to **2** for staging tests only. Save and check the plugin's Inventory view. Replace this test number with the client-confirmed capacity only during approved production setup.

## 7. Configure Approval, Inventory, Waitlist, and Notifications

### Approval workflow

If approval is required:

1. Open **Forms → [Berlin Registration STAGING] → Settings → Workflow** (Gravity Flow may expose this under a similarly named Workflow tab/menu).
2. Add an **Approval** step and assign it to the named event approver or a dedicated staging role.
3. Configure the approved path to send the final confirmation and the declined path to send a clear decline message.
4. Configure the receipt to say the request is pending, not that a seat is confirmed.
5. If waitlisting is required, define whether a full event accepts waitlist entries and how a freed seat is offered. Do not assume a waitlist exists without the tested add-on/snippet.
6. Save the workflow, then repeat for Zürich or duplicate the workflow and verify every form reference is changed.

Use **Users → Add New** to create a dedicated staging approver account with the least privileges supported by the plugin. Log in as that account in a private browser window and confirm it can review/approve the entry but cannot administer plugins, themes, or unrelated settings.

### Inventory behavior

1. Open **Forms → [Event Registration STAGING] → Edit**. Select the capacity-controlled field, open its field settings, and find the GP Inventory/Perks section.
2. Confirm whether inventory counts every submitted entry, only approved entries, or a configured payment/status state.
3. Set the staging inventory to 2, save the field and form, then inspect the plugin's Inventory dashboard to confirm the available count.
4. Test what happens when a pending entry is rejected, trashed, deleted, or edited.
5. Test two submissions close together when only one test seat remains. Confirm no overbooking occurs.
6. If using the approved-only snippet, verify how pending requests are serialized/approved so two approvals cannot both consume the last seat.
7. If using the waitlist snippet, confirm it collects waitlist entries without consuming a regular seat and that notification/promotion to a released seat works as the client expects.

### Notifications

For each form, open **Forms → [Event Registration STAGING] → Settings → Notifications**. Edit the default admin notification and add attendee notifications as needed. Use separate workflow notifications for approval/decline outcomes when those depend on Gravity Flow status.

Configure separate messages for:

- **Receipt:** “We received your registration request; this is not yet a confirmed place.”
- **Approval:** clear confirmation plus event details and attendee instructions.
- **Decline:** clear outcome and contact path.
- **Waitlist:** clear waitlist status and what happens next.
- **Organizer:** submission details and a direct link to the entry/workflow item.

Use Gravity Forms notifications and/or Gravity Flow workflow notifications as appropriate. Test them through the staging mail sandbox and verify sender/domain deliverability. ForgeWP Auth and native forms both use WordPress mail infrastructure, but neither automatically configures SMTP deliverability for this plugin.

## 8. Place the Form on the Existing Event CPT Page

The theme's `src/app/single-hospitality_event.tsx` renders CPT post content via `BlockArea`, which exports to WordPress `the_content()`. Therefore plugin shortcodes or the plugin's own Gutenberg block can render inside each event post's content.

For each staging `hospitality_event` post:

1. In wp-admin, open **Veranstaltungen → All Veranstaltungen** and click **Edit** for Berlin.
2. In the block editor, keep the existing Hospitality Event Hero and Event Details Layout blocks.
3. Click the **+** inserter after the event details. Search for **Shortcode** and insert the core WordPress Shortcode block. (If the installed Gravity Forms version provides a native Gravity Forms block, that can be tested as an alternative.)
4. In another tab, open **Forms → Forms**, copy the Berlin form's shortcode from its Embed/Shortcode action, then return to the event editor and paste it into the Shortcode block. A typical shortcode looks like `[gravityform id="12" title="false" description="false" ajax="true"]`; replace the example ID with the actual staging form ID.
5. Click **Update**. Use **Preview → Preview in new tab** and verify the form appears after the event details.
6. Submit one clearly labeled staging entry and confirm it appears under **Forms → Entries → [Berlin Registration STAGING]** with the correct workflow status.
7. Repeat the steps for Zürich using only the Zürich form shortcode on the Zürich event post.

This is not the ForgeWP `forms.mode: 'shortcode'` workflow. The client creates/manages the form in Gravity Forms and inserts its shortcode in the event content. Local Vite cannot execute Gravity Forms shortcodes; test this step in WordPress staging.

## 9. Privacy, Retention, Access, and Export

### Privacy and consent

For each form, open **Forms → [Event Registration STAGING] → Settings → Personal Data**.

- Enable the form in WordPress personal-data export/erasure.
- Choose the attendee email field as the identifier, then select which fields should be exported/erased.
- Use the client-approved privacy notice and retention period; this guide is not legal advice.
- Keep marketing consent separate from the registration agreement, optional, and unchecked by default. Verify it is stored as its own field and can be excluded from consent when not selected.
- Decide whether the form stores IP addresses and whether the project has a justified need for them.

### Retention

- On the same **Personal Data** settings screen, choose the approved retention policy per form only after approval: retain, trash after a period, or permanently delete after a period.
- Verify the scheduled cleanup behavior in staging. Gravity Forms documents cleanup as a daily cron task, so deletion may occur later than the exact configured day.
- Test both personal-data erasure and retention cleanup on test entries; confirm deleting/trashing entries updates inventory as intended.

### Permissions

- In wp-admin, open **Users → Add New** and create a dedicated staging event-staff user with the minimum required capabilities supported by Gravity Forms/Flow.
- In the relevant plugin role/capability settings, grant only the abilities the role needs; exact controls vary by installed edition/add-ons.
- Test viewing submissions, approving entries, exporting CSV, editing forms, and changing inventory separately.
- Do not use a shared administrator login as the acceptance test.

### CSV export

For each event form, open **Forms → Import/Export → Export Entries**:

1. Export active entries only, then repeat with pending/declined/waitlisted states as needed.
2. Include the fields required by event staff, event identity, entry status, and submission/approval timestamps.
3. Exclude unnecessary personal data and internal fields.
4. Open the CSV in the tool organizers will use and verify Unicode, commas, quotes, and multi-line values.
5. Confirm only the intended event form's entries were exported.

Gravity Forms provides an entry export screen with field selection, entry-status filters, conditional logic, and date ranges. Verify the current installed version and permissions on staging.

## 10. Staging Test Matrix

Use fictional data only. Record the result and screenshot/export reference for each row.

| Test                                         | Expected result                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Valid Berlin request                         | Entry is tied to the Berlin form; attendee gets receipt marked pending; organizer gets notification |
| Valid Zürich request                         | Entry is tied to the Zürich form; no cross-event capacity is consumed                               |
| Missing required email/name                  | Plugin blocks submission with field-level error                                                     |
| First request under capacity                 | Correct pending/hold behavior matches the agreed policy                                             |
| Submit at exact capacity                     | Correct remaining-seat/full message; no extra confirmed place                                       |
| Submit after capacity                        | Rejected or placed on waitlist according to the agreed policy                                       |
| Reject a pending request                     | Inventory is released or the documented manual release procedure works                              |
| Approve a request                            | Correct confirmation email and final status; capacity count remains accurate                        |
| Two near-simultaneous final-seat submissions | At most the allowed number get a confirmed/held seat                                                |
| Waitlist promotion                           | A freed seat is offered once; acceptance consumes it once; expiry/rejection advances safely         |
| Marketing consent omitted                    | Registration still succeeds; consent remains false/absent                                           |
| Marketing consent selected                   | Separate consent value is recorded with entry timestamp and approved wording/version                |
| Export                                       | Correct form/status/date range and expected columns; no unrelated form entries                      |
| Personal-data export/erase                   | Test attendee can be found and exported/erased through supported WordPress tools                    |
| Retention cleanup                            | Only entries for the configured form/age are affected; inventory behavior is understood             |
| Event slug/content change                    | Registration remains on the correct event post; exported entry still identifies event               |
| Shortcode disabled/plugin unavailable        | Failure is detected before launch; page does not silently claim registration is working             |

**Go/no-go:** Do not accept production registrations until no-overbooking, approval, waitlist, consent, access, export, and privacy tests pass on the exact plugin/add-on versions selected.

## 11. Production Rollout and Rollback

### Before rollout

- Obtain client approval for event dates, capacity, venue, registration policy, consent/legal wording, retention, and plugin costs.
- Back up WordPress files/database and record current `/events` CPT slugs and event content.
- Install and license the verified plugin/add-on versions on production; do not copy the staging database wholesale.
- Recreate or import forms/workflows/inventory with production IDs, then verify each shortcode points at the production form.
- Add the production form block/shortcode to the correct CPT event post and test with a controlled internal registration.
- Disable staging-only test notifications and ensure production sender/domain settings are correct.

### Rollback

- Remove or disable the registration block/shortcode on the affected event post.
- Disable the form or close submissions in the plugin before deleting data.
- Preserve/export submitted entries according to the approved retention policy.
- Do not delete the `hospitality_event` post or replace the CPT template as a form rollback step.

## 12. Decision Record

Fill this in after the pilot; do not treat the candidate stack as selected until verified.

- Gravity Forms version/license tier: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Gravity Flow version/license tier: **\*\*\*\***\_\_\_\_**\*\*\*\***
- GP Inventory version/license tier: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Waitlist implementation (built-in/add-on/snippet/custom): **\*\*\*\***\_\_\_\_**\*\*\*\***
- Capacity policy for pending requests: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Event-to-entry association method: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Approved/rejected/waitlisted status flow: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Retention period and deletion behavior: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Marketing consent wording/version owner: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Organizer role and capabilities: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Pilot result and remaining blockers: **\*\*\*\***\_\_\_\_**\*\*\*\***
