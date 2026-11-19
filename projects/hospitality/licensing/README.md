# Hospitality 2035 Licensing

Standalone WordPress plugin integrating EDD 3 with order-linked sequential licenses,
private PDF personalization, authorized downloads and automatic PDF invoices.
PHP 8.1+ and mbstring required.
The existing public short study is used only as the temporary test master. Never put
the final paid master into `public/` or the Media Library.

## WordPress setup

Build the separate plugin ZIP with `powershell -File bin/build-plugin.ps1`. Install
`output/hospitality-2035-licensing.zip` via Plugins → Add New → Upload Plugin. It is
independent of the ForgeWP theme export. No master, customer output, tests or CLI
utilities are included. Dependencies are bundled; Composer is not needed on the host.

Open Downloads → Hospitality Licensing. Choose the existing single-license EDD
product, upload the master directly into private storage, and set the title, type,
scope and before/after placement of the license page. New settings apply to future
orders; enrolled orders keep their original master/terms. Company name is taken
from EDD's order `company_name` metadata. Keep native EDD company/billing address
fields enabled. Exactly one study per order, Stripe gateway, positive paid total and
German billing address are required. Non-German customers see the DICON inquiry
address; checkout policy also runs on the server, including Stripe express overrides.

Enable processing for testing; keep “Vorläufiger Master / Vorschau” enabled while
using the short study. Live processing defaults off and is prohibited with a preview
master. No script switches Stripe/EDD payment mode or changes SMTP configuration.

Private storage defaults to `hospitality-2035-private` next to the WordPress public
directory. If the host prevents this location, define `H2035_PRIVATE_DIR` in
wp-config.php to an absolute writable directory **outside all public web roots**.
The plugin rejects locations inside ABSPATH, WP_CONTENT_DIR or DOCUMENT_ROOT.
Check the real hosting document root on deployment, especially subdirectory installs.
Directory/file permissions are restricted where supported. Back up this directory
together with the database; it contains masters and customer documents.

Existing EDD signed links are retained. After EDD verifies the link, expiry, order
entitlement and download limit, the plugin streams only that order's personalized
PDF. It performs the EDD download-log slot check too. Unpaid, refunded, wrong-product,
failed-generation and unenrolled managed orders cannot retrieve a shared master.
EDD links are bearer links: someone receiving a still-valid forwarded link has the
same access as the holder under EDD's configured policy. No new public file URLs
are created. Do not configure an EDD product file URL pointing to the final master.
Retain its single file row (which provides receipt/email links); use a non-sensitive
placeholder or public preview there while plugin delivery resolves the private PDF.

License records use the prefixed `hospitality_licenses` table with an auto-increment
sequence and unique EDD order ID. Connection-owned MySQL locks prevent simultaneous
processing of one order. Repeated events reuse the record/file. Numbers are
`H2035-000001` or `TEST-H2035-000001`; test and live share the underlying monotonic
sequence, and failed/rolled-back database inserts may leave gaps. This is a license
identifier, not an accounting invoice-number sequence. No deletion occurs on
deactivation/theme switch; explicit data removal is a separate maintenance task.

On successful generation, a separate license-ready notification is sent to the
admin-configured recipient (default `contact@dicon-beratung.de`). Configure recipient,
subject and plain-text body under Downloads → Hospitality Licensing →
Admin-Benachrichtigung bei fertiger Lizenz. Supported placeholders: `{order_number}`,
`{order_id}`, `{license_number}`, `{company}`, `{license_type}`, `{license_scope}`,
`{product_name}`. Unknown placeholders, empty templates, invalid recipients and
subject/header newlines are rejected. Test messages retain `[TEST]` automatically.
License terms/company are taken from the order's immutable snapshot. Edits affect
future or not-yet-successfully-sent notifications, not messages already sent.
Its sent flag prevents normal repeated processing from
duplicating notifications; successful wp_mail handoff does not prove inbox delivery.
Native EDD receipts/sales emails remain in place. Add `{hospitality_license}` to EDD
templates if desired; `_h2035_license_number` is saved as order metadata and the
receipt displays the company and number.

## PDF invoices (0.2.0)

Downloads → Hospitality Licensing → PDF-Rechnungen provides automatic invoice
generation/email dispatch, seller legal name, complete address, tax/VAT identifier,
optional company footer and invoice-number prefix. These details must be provided
and explicitly confirmed by DICON before enabling live invoicing. Local defaults
are deliberately marked sample issuer data, not assumed approved legal details.
Standard PDF is supported, not structured XRechnung/ZUGFeRD or PDF/A certification.
Client accounting acceptance of the format and issuer data remains a launch input.

After the managed Stripe order completes and its study PDF is ready, the plugin
allocates an invoice number, snapshots the seller, buyer address/company, product,
license, currency, subtotal, discount, tax, total, invoice/service/payment dates and
generates a private invoice PDF. Amounts are copied from that saved order in cents;
the invoice never changes the shop's currency, taxes, prices or historical orders.
It supports the initial single-product flow without additional order fees. An
unsupported net/discount/tax/total reconciliation fails instead of inventing values.
The stored order tax rate is used, with an inferred rounded rate from stored tax/net
only when legacy orders lack the rate. No new tax treatment is decided here.

Invoice counters are independent for each prefix, calendar year and test/live mode,
using an atomic MySQL increment in the `hospitality_invoice_sequences` table. Example:
`TEST-H2035-RE-2026-000001` versus `H2035-RE-2026-000001`. A unique order license row
retains the assigned invoice number, snapshot, filename/hash and mail-handoff flag.
Numbers are never reused; failed record writes can leave a documented allocation
gap. An upgrade adds invoice columns to the existing license table (schema 2), without
deleting existing licenses. Back up the database, counters and private files together.

The customer receives a separate invoice email with a correctly named PDF attachment;
native EDD purchase email and admin license notification remain in place. Successful
wp_mail handoff is tracked, so normal retries do not send duplicates. Failed generation
or mail schedules up to three cron retries; manual “Erneut verarbeiten” also retries.
As with any SMTP dispatch, a process crash after acceptance but before saving the flag
can result in another message on retry. Existing invoices never change after settings
or order edits, and deleted/corrupt files can be regenerated from their saved snapshot
without assigning another number. Corrections/credit notes and automated accounting
exports are not implemented; refunding does not rewrite an already issued invoice.

The receipt card and plugin admin list provide an invoice download. The endpoint
requires either administrator capability or EDD's existing order-owner/purchase-session
authorization. Knowing an order ID or the private filename does not grant access.
The PDF email attachment is available without a website session once received.
Invoices already issued remain available for the authorized owner even after refund;
the study download still obeys the stricter paid-status check.

Optional local tools (not packaged): `php bin/invoice-preview.php` makes a sample PDF;
`bin/configure-invoices-local.php WP_ROOT ORDER_ID` configures only the approved Local
hostname in EDD test mode and routes its optional test invoice email explicitly to
localhost Mailpit. It never changes saved SMTP, currency or tax configuration.

Generation failures leave the paid order/license intact. Up to three WP-Cron retries
are scheduled; Downloads → Hospitality Licensing also offers a manual retry and
admin-only PDF check. Retrying notification handoff is supported manually. Cron,
private-storage permissions and database GET_LOCK support must be verified on STRATO.
Pending orders enrolled before a theme switch keep their snapshot. Existing purchases
made before plugin setup are not automatically backfilled.

## Verification

```powershell
php tests/pdf.php
php tests/invoice-pdf.php
php -d mysqli.default_port=10023 tests/wordpress.php "C:/Users/hp/Local Sites/hospitality-2035/app/public"
```

The WordPress test refuses other hostnames, blocks external WordPress HTTP calls,
suppresses mail, creates synthetic test orders and rolls back records/cleans files.
It checks paid/pending/refunded eligibility, company/Germany rules, replay behavior,
separate files, signed-link tampering/expiry, concurrent database locks, settings
snapshots, generation retry and admin rendering/access. Invoice checks also cover
amounts/discount rounding, isolated counters, automatic dispatch/attachment, failed
mail retry, immutable snapshots and unauthorized access. Simulated completed orders
are **not** Stripe payment/webhook tests. User-confirmed local Stripe test purchases,
personalized delivery/email and theme-switch checks are recorded in HANDOFF.md;
target-host acceptance and the final approved master/issuer details remain required.

## Local preview

Requires PHP 8.1+, mbstring and Composer. From this directory:

```powershell
composer install --no-interaction --prefer-dist
php bin/preview.php
php tests/pdf.php
```

The current Windows PHP executable is `C:/xampp/php/php.exe`. If Composer needs the
installed but disabled ZIP extension, invoke its PHAR with `php -d extension=zip`.
During an archive-host outage, the official source files were downloaded from the
exact commits in `composer.lock` and every Git blob hash verified. The optional
`bin/fetch-official-dependencies.py` documents this fallback. Standard deployment
should install dependencies through Composer.

Edit `config/preview.json` to change the source PDF, output path, test holder and
number, title, license type/scope, margin, or license-page position (`before` or
`after`). Paths are relative to the configuration file. Existing output is never
overwritten; choose another output filename to generate a revised sample.

Output is under `licensing/output/`, outside the theme's public assets and excluded
from Git. Keep this source folder out of the web document root. The preview CLI
requires `preview: true` and the PDF prominently identifies itself as test output.
No new license terms have been approved; the sample wording is provisional.

The source pages are imported at their original sizes without drawing over their
content. A separate license page avoids guessing a blank area in the study. PDF
imports do not preserve interactive forms, annotations, signatures or bookmarks;
recheck the final master for those features and for import compatibility.

## Remaining acceptance

- Confirm numbering format, holder mapping, license text and layout with DICON.
- Replace the interim short study with the approved private master and review output.
- Confirm invoice issuer details/format and final email receipt on the target host.
- Repeat Stripe test checkout and browser invoice/study delivery on the target host.
- Verify private-path mapping, database locks, PHP resources and cron on STRATO.

No live installation or production payment-mode change is performed by building the
ZIP or generating a CLI preview.
