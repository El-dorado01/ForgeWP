# Hospitality 2035 — Block Order Guide

This guide shows the recommended Gutenberg order when a page is composed with the **ForgeWP Builder** template. The blocks listed below are not automatically inserted into WordPress Pages by a theme export.

## Before arranging blocks

1. In WordPress, open **Pages** and edit the page you want to arrange.
2. In the page settings, select the **ForgeWP Builder** template.
3. Insert the blocks in the order shown below. Use List View to move blocks and inspect nested layouts.
4. Save the page and preview it on the front end.

The Hospitality theme also contains developer-authored page templates. Those templates keep their own section order; changing the page body will not rearrange sections unless that page is using ForgeWP Builder or its template renders the page body with a `BlockArea`. Keep EDD system-page templates and their required EDD blocks intact.

## Homepage — `/`

Arrange these top-level blocks from top to bottom:

1. **Hospitality Hero Section**
2. **Hospitality Study Section**
3. **Hospitality Audience Section**
4. **Hospitality Preview Section**
5. **Hospitality Events Section**
6. **Hospitality Licensing Section**
7. **Hospitality Automation Section**
8. **Hospitality Partners Section**
9. **Hospitality About Section**
10. **Hospitality Checkout Section**

The site navigation and footer are provided by the theme layout; do not add them as content blocks.

## Study — `/studie/hospitality-2035`

1. **Hospitality Study Hero**
2. **Hospitality Study Section**
3. **Hospitality Preview Section**
4. **Hospitality Partners Section**
5. **Hospitality Study License CTA**

`/studie` redirects to this page and does not need its own block layout.

## License comparison — `/lizenzen`

1. **Hospitality License Inquiry Hero**
2. **Hospitality License Options Intro**
3. **Hospitality License Plan Grid**
4. **Hospitality License Usage**

The plan grid is a shell containing three **Hospitality License Plan Card** blocks. The cards are seeded when the grid is inserted; edit, reorder, or remove them inside the grid.

## Single license checkout — `/checkout/single-license`

1. **Single License Hero**
2. **Single License Content Layout**
   - **Single License Checkout Information**
   - **Single License Purchase Panel**
     - **Single License Summary**
     - **Single License Price Details**
     - **EDD Buy Button Slot**
     - **Single License Return Link**

The layout and purchase panel are nested shells. Insert an EDD Buy Button inside its slot and select the correct EDD Download. Keep EDD's separate Checkout Page and settings configured in Easy Digital Downloads.

## Team and company license inquiries

Use this order on both `/lizenz/team` and `/lizenz/unternehmen`:

1. **Hospitality License Hero**
2. **Hospitality License Inquiry Layout**
   - **Hospitality License Inquiry Form**
   - **Hospitality License Inquiry Overview**

The inquiry hero matches the page template and includes the editable link back to all licenses. The inquiry layout seeds the form and overview as children. Keep both inside the layout shell to preserve the two-column design. Select the matching configured form on each page. Use **Hospitality License Inquiry Overview** on `/lizenz/team` and **Hospitality Company License Inquiry Overview** on `/lizenz/unternehmen`; both use the same presentation as their matching shipped page template.

## Events Manager pages

The event pages are supplied by the theme's page templates and Events Manager, not by Builder blocks:

- `/events` lists upcoming Events Manager events.
- `/events/[event-slug]` shows the selected event and its booking form.
- `/my-bookings` shows a visitor's bookings.

Create and edit events in **Events Manager**. Select the existing **Events** and **My Bookings** pages in **Events Manager → Settings → Pages**. Keep **WordPress Event Archives** disabled so there is one event listing route.

## Legal and contact pages

The legal and contact templates render the saved WordPress page body through a content area. Use normal Gutenberg paragraph, heading, list, and link blocks in the required order. If composing the page fully with ForgeWP Builder, use:

1. **Hospitality Legal Page Hero**
2. Legal copy as core Gutenberg blocks, or one or more **Hospitality Legal Document Section** blocks

Use this for `/impressum`, `/datenschutz`, `/agb-lizenzbedingungen`, `/widerrufsbelehrung`, `/vertrag-widerrufen`, and `/kontakt`. Keep the actual legal text editable in the WordPress page body.

## EDD system pages

Do not replace these pages with marketing blocks. Keep the matching template and EDD content block:

| Page purpose | EDD block/content |
| --- | --- |
| Checkout | EDD Checkout |
| Order history | EDD Order History |
| Receipt | EDD Receipt |
| Confirmation | EDD Confirmation |
| Products/shop | EDD Products |
| Transaction failed | EDD failure/status content |

The theme export creates templates, not WordPress Pages or EDD page mappings. Confirm the Pages and mappings in the EDD settings after importing the theme.
