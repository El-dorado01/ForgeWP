# Events Manager Setup Guide

This guide is for setting up and testing Events Manager on your **local WordPress site**. That database does not contain event records yet, so you can create test events there without risking existing event data on the live site. It is written for the person working in WordPress admin and uses the settings shown in the screenshots in `edd-images`.

## 1. The short version

Use Events Manager locally to create events and test registrations. Events Manager is now the only event system used by the theme.

- The Hospitality theme supplies the design for `/events`, individual event pages, and `/my-bookings`.
- Events Manager stores the events, locations, and bookings and supplies the page content inside those designs.
- The local WordPress database has no existing event data, so you can create local test events without affecting the live site.

## 2. Local testing and the existing theme routes

1. Confirm the browser address is your local WordPress site before creating events or changing plugin settings.
2. Use fictional names and email addresses for registrations. Local test emails should go to Mailpit or another local mailbox.
3. No existing event records need to be migrated in this local database. New events created in Events Manager will appear in its admin list and on the theme's event pages.
4. The theme no longer registers its own event content type, so there is no second theme event route competing with Events Manager.
5. Importing the theme does not delete any old WordPress records. On a site that already has old theme events, back up the site and confirm those records are no longer needed before retiring the old theme version.
6. These local changes do not change the live website. Do not export/import the local database to production without reviewing the content and settings first.

## 3. Set the Events Manager event address and listing page

The new `change-address.png` screenshot shows the correct place to change the event URL base.

1. Open **Events Manager → Settings → General** and find **Base Event Settings → Permalink Slug**.
2. Set the slug to `events`. Individual event addresses will then look like `/events/berlin-study-media-launch/`; the event's own slug supplies the last part.
3. Click **Save Changes (All)**.
4. In **Pages**, use one page with the slug `events`. If the old **Test Events** page already exists, change its title and address to **Events** and `/events` rather than creating a duplicate. Keep the existing **My Bookings** page at `/my-bookings`.
5. In **Events Manager → Settings → Pages**, select the **Events** page at `/events`. The exported Hospitality theme provides its design and renders the plugin's `[events_list]` shortcode there; you do not need to paste shortcode text into the editor.
6. Leave **WordPress Event Archives** disabled. The selected Events page is the listing; enabling the separate archive could make the two routes compete.
7. Set **My Bookings** to the page at `/my-bookings`. The Hospitality page template renders `[my_bookings]` inside the site's design.
8. Save the settings and refresh WordPress routes by opening **Settings → Permalinks** and clicking **Save Changes** once.
9. Test `/events`, an event detail page such as `/events/berlin-study-media-launch/`, and `/my-bookings`.

Older exports may have created two unused pages: **Events Manager** (`/events-manager`) and **Event Manager Bookings** (`/event-manager-bookings`). They are not the pages selected in Events Manager settings. Import the updated theme first, then move those two old pages to Trash. Keep **Events** (`/events`) and **My Bookings** (`/my-bookings`); the updated theme no longer creates the extra pages.

If WordPress still uses old routes after saving, open **Settings → Permalinks** and click **Save Changes** once to refresh them. Do not change the individual event slug and the base slug repeatedly; first confirm which route is handling the request.

## 4. Set the basic event options

Open **Events Manager → Settings → General**. Start with these settings:

1. **Events and locations:** Keep Events Manager's event and location features enabled. Use a location for each in-person event so that Berlin and Zürich details are stored with the event.
2. **Public event submissions:** Leave these off. The site team should create and manage events in WordPress admin.
3. **Time zone:** Use the WordPress setting **Settings → General → Timezone → Berlin** (or the named Europe/Berlin option). Berlin and Zürich use the same time zone. Enter each event's local start and end time, then check the displayed time on the website.
4. **Recurring events and time slots:** Leave them off unless an event really repeats or offers several booking times. They add choices that are not needed for a one-time event.
5. **Maps:** The screenshot shows the map feature enabled but no Google Maps key entered. Turn maps off for the first test. A map is optional; do not add a key until the site owner has approved it and its privacy implications have been reviewed.
6. **Location requirement:** For these in-person events, turn on the option that requires an event location. If an online event is added later, check how that event is displayed before changing this rule.
7. Save the settings.

Do not change unfamiliar formatting or advanced display options during the first pass. The plugin can be tested with its default appearance.

## 5. Set up the registration rules

Open **Events Manager → Settings → Bookings**. The screenshot currently shows guest bookings and booking approval enabled. Use the following as a cautious test setup:

1. **Guest bookings:** Keep enabled so a visitor can submit a booking without signing in first. Events Manager creates a WordPress account for the email address used.
2. **Approval:** Keep approval enabled for the first test. A new registration should be described as received or awaiting review, not as a confirmed place.
3. **Pending places:** Decide whether a pending registration should hold a place. If the setting **Reserved unconfirmed spaces?** is available, test it with the event's capacity before accepting real bookings. Do not assume it works as intended until the capacity test is complete.
4. **Overbooking and double bookings:** Keep both disabled.
5. **Cancellation:** Do not offer visitor cancellations until the event owner has decided the cancellation rules and any deadline.
6. **Login prompt:** If guest bookings are enabled, turn off a login prompt in the booking form if it is not needed.
7. **Capacity:** Set a small test capacity, such as two places, and use test registrations to check what happens when the event fills up.
8. **Currency and price:** The current theme's **Book Now** link only moves the visitor to the Events Manager booking form. The installed Events Manager setup has no payment gateway, and the EDD Stripe settings do not automatically apply to event bookings. EDD currently handles purchases for its own downloads; it is not connected to Events Manager. Do not accept paid event bookings until an event payment flow is chosen and tested. For the local test, use a free event or treat bookings as unpaid requests.
9. Save the settings.

For **My Bookings**, keep **Allow bookings with registered emails?** disabled. Events Manager warns that when this is enabled, a logged-out visitor can book with an email already tied to an account, but that guest booking will not appear on that account's My Bookings page. Visitors must sign in with the WordPress account used for the booking; bookings made with a new email use the account Events Manager creates.

### Registration fields and privacy

1. In **Events Manager → Settings → General**, open the **Privacy Policy and Consent** area.
2. Add the approved privacy wording and link it to the site's Privacy Policy page. The policy must describe the actual systems used on the site, including Events Manager and any maps or external services that remain enabled.
3. Only require a consent checkbox if the approved wording and the site's privacy setup call for one. A privacy notice is not the same as permission to send marketing.
4. Do not add a newsletter or marketing opt-in as a required event registration field. If marketing permission is requested later, it must be a separate, optional, unchecked choice.
5. Test a registration as a visitor and confirm the privacy link is visible before submission.
6. Check whether the installed Events Manager version provides all required attendee fields. The plugin description lists custom booking fields as a Pro feature. If the form cannot collect the fields the event owner needs, do not launch with missing fields; confirm the required plugin edition or choose an approved alternative.

The plugin's privacy features can help with privacy requests, but they do not by themselves make the website legally compliant. The client must still provide and approve the final privacy text and retention rules.

## 6. Set up email messages

Open **Events Manager → Settings → Emails**.

1. Set a sender name and sender email address approved for the website. Do not leave these blank for launch.
2. Use the **Test Email Settings** control and send to a test mailbox. The screenshot shows a test sent to `dev-email@wpengine.local`; that is a development address, not a production sender.
3. Keep local WordPress routed to Mailpit or another test mailbox so no test message reaches a real customer.
4. Review the messages for pending, confirmed, cancelled, rejected, and event-owner notifications.
5. Make pending messages say that the request was received and is awaiting review. Only the confirmed message should promise a place.
6. Replace sample wording with the client's approved wording. Check the event name, date, venue, contact address, and next steps in every message.
7. Test the automatic message sent after a visitor registers, then test approval, rejection, and cancellation messages with test registrations.

## 7. Formatting and event list settings

Open **Events Manager → Settings → Formatting** and **Pages**.

1. Keep the default formatting for the first test. Do not enable advanced formatting or paste code into the format boxes.
2. For the test Events page, show future events and sort by start date, earliest first. This matches the normal order for upcoming events.
3. Keep the list short while testing; the screenshot currently shows ten events per list.
4. Leave the full calendar off unless the owner wants a calendar view.
5. Do not include cancelled events in the normal list.
6. Leave WordPress search inclusion off unless the owner wants events mixed into the site's general search results.
7. Save the settings and check the selected event list page on desktop and mobile.

### Improve the default appearance

The new `styling.png` screenshot shows **Styling Options (Advanced)**. Events Manager does provide ways to take control of its appearance; the site is not stuck with the default design.

1. First test that event listing, event details, registration, and My Bookings work with plugin styling enabled.
2. In **Events Manager → Settings → General → Styling Options (Advanced)**, the **Enable All Styling**, **Enable Theme Styling**, and individual component options control which plugin styles are added. Do not disable all styling before replacement styles are ready.
3. The Hospitality theme now supplies custom page layouts for the event list, individual event pages, and My Bookings. Its CSS also restyles the plugin's event cards, event details, booking form, and bookings table.
4. For a gradual redesign, disable styling only for the components the Hospitality theme is ready to style, such as **Events list page**, **Event pages**, **Event booking forms**, and **My bookings page**. Keep the plugin's form and booking behavior; these settings affect presentation, not the booking workflow.
5. The theme's event list uses `[events_list limit="10" scope="future"]`; an individual event page uses `[event]`; and My Bookings uses `[my_bookings]`. The shortcode markers become WordPress `do_shortcode()` calls in the exported theme. Local React preview shows placeholders because the plugin only runs inside WordPress.
6. The plugin also supports upgrade-safe template copies in the active theme under `plugins/events-manager/` if CSS is not enough. Copy only the templates that need changes; do not edit the plugin's own files.
7. The event registration form shown on an event page and the **My bookings** page are different things. `[my_bookings]` shows a logged-in visitor their existing bookings; the event booking form is where they register for one event.
8. **Allow guest bookings** lets a visitor submit a booking without already being signed in; it does not make bookings public or remove the account requirement for **My Bookings**. Events Manager creates an account for a new email address. Keep **Allow bookings with registered emails?** disabled, or guest bookings made with an existing account's email may not appear on that account's My Bookings page.

For this theme, Events Manager remains responsible for event and booking data while Hospitality controls the listing, single-event, registration-form, and My Bookings presentation. The listing uses the Events page setting rather than the separate WordPress Event Archives option.

## 8. Add two local test events

Create a test copy of each event under **Events → Add Event** (the plugin may label this menu slightly differently):

1. Add one Berlin event and one Zürich event. Include “LOCAL TEST” in each title so nobody mistakes it for a real event.
2. Enter the title, event description, start and end date/time, location, and a featured image if required.
3. Add the location details in the plugin's Locations area. Check that the address and venue name are correct; do not rely on a map.
4. Set a small capacity. Local WordPress is not the public site, but still label each record “LOCAL TEST” while configuring it.
5. Add a test registration as a visitor. Confirm the event name and place count are correct in WordPress admin.
6. Approve one test registration and reject another. Confirm that the visitor receives the correct email for each status.
7. Fill the event to its test capacity, then try one more registration. Confirm that the plugin stops accepting places or clearly marks the event as full.
8. Check the event page and registration form on a phone-sized screen.
9. Remove the test registrations and test events when the checks are complete, or keep them clearly labelled as local test content.

## 9. Check the design and local URL behavior

The theme's `/events` page, individual event pages, and bookings page use Events Manager data and shortcodes. Events Manager is the single source for event content.

For each Events Manager test event, confirm:

- The Events Manager listing shows the test event and its correct link.
- The event list shows the correct title, date, location, image, and link.
- The individual event address opens the plugin event details and booking form.
- The visitor registration is linked to the correct event.
- A new registration triggers the expected automatic email. If approval is enabled, the first message must confirm receipt only; a place is confirmed only after approval.
- An administrator can export test attendee data from Events Manager as CSV, open it in Excel, and verify the required columns and character encoding. Do not promise native `.xlsx` export unless the installed version supports it.
- The listing, event details, and booking form appear inside the Hospitality page design.

If a page is empty, first check that Events Manager has the correct **Events** page selected, that the event is published, and that the event URL base is `events`.

## 10. Before launch

Do not open bookings to the public until the owner has confirmed:

- Event dates, venues, capacity, registration fields, and who approves registrations.
- Whether pending requests hold a place and what happens to a place after rejection or cancellation.
- Whether events are free or paid. If paid, confirm the correct payment setup and displayed prices before accepting money.
- Final privacy notice and any consent wording.
- Booking confirmation, pending, cancellation, and rejection messages.
- Automatic registration email and CSV attendee export tested in WordPress; confirm who can view/export attendee details and how long the data is kept.
- That marketing permission is separate and optional.
- That test emails, test events, and test registrations are removed or clearly marked.

## 11. The event system used by this theme

Events Manager is the only event system used by the current theme. The theme export does not create events or change plugin settings; create events in Events Manager and select the matching WordPress pages in its settings.

The older [Gravity Forms pilot guide](./EVENT_REGISTRATION_STAGING_PILOT_GUIDE.md) is only a fallback option; do not configure both registration systems for the same event.

## 12. Screenshot reference

The screenshots supplied for this setup are in [`edd-images`](./edd-images). They show the current General, Bookings, Emails, Formatting, and Pages settings. [`change-address.png`](./edd-images/change-address.png) shows **Base Event Settings → Permalink Slug**, where you change the event URL base. [`styling.png`](./edd-images/styling.png) shows the plugin styling controls and the components that can be switched to theme styling. Some areas, including privacy consent, are collapsed in the screenshots; verify their actual values in WordPress before launch.
