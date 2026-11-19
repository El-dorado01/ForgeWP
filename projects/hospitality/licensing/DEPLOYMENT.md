# Hospitality 2035 Licensing — deployment and handover

## Test deployment to STRATO

1. Back up the WordPress database and existing plugin files. Preserve any existing
   Hospitality private storage and invoice counters together with the database.
2. Upload `output/hospitality-2035-licensing.zip` through **Plugins → Add New → Upload
   Plugin**, activate it or replace the existing version. This is a plugin ZIP,
   separate from the ForgeWP theme export. Composer is not required on STRATO.
3. Keep EDD **Test Mode** enabled. Open **Downloads → Hospitality Licensing**. Keep
   **Vorläufiger Master / Vorschau** checked and live processing unchecked.
4. Check the private-storage notice. The default is a directory next to the public
   WordPress root. If PHP cannot create it, arrange an absolute writable directory
   outside the hosting document root, then define `H2035_PRIVATE_DIR` in wp-config.php.
   Do not work around a failure by choosing a public uploads/theme/plugin directory.
   Server web-root mappings must be checked on the actual hosting package.
5. Select the existing study product used by the purchase buttons. Product IDs differ
   between local and staging: do not copy local product ID 792 blindly.
6. Upload the temporary short study through **PDF-Master** for the initial test.
   Upload the final approved study here later; never place that master in public
   assets or the Media Library. The public short preview can remain available.
7. Configure license title, type, scope and before/after placement. Configure the
   admin notification recipient/subject/body. These settings do not migrate by
   copying the plugin ZIP; enter the values on the target site.
8. Enable PDF invoices, enter seller name, full address, tax/VAT identifier and any
   required company footer. Use explicitly marked sample data during testing if
   DICON has not confirmed the actual details. Leave the seller-confirmation/live
   controls off until those inputs and the standard PDF format are approved.
9. Keep the working SMTP/provider configuration and existing Stripe connection.
   Verify test-mode webhook delivery for the final domain. Do not share secrets in
   chat and do not change to live payments during these checks.

## Target-host acceptance

- Complete one German-address Stripe test purchase with company and full address.
- Verify the saved order's EUR/net/VAT/discount/gross values against the approved
  configuration. The invoice copies stored values; it does not configure taxes.
- Check the personalized study via confirmation-page and customer-email links.
- Check the admin license-ready notification and separate customer invoice email.
  Open its PDF attachment; compare company, address, invoice/license numbers, issue,
  service/payment dates, currency and amounts with the order.
- Download the same invoice from the order receipt. A new anonymous session without
  ownership/checkout authorization must be denied invoice access. No private master
  or customer file should have a directly accessible public URL.
- Verify repeat processing reuses the license/invoice and successful emails are not
  sent again. Verify another buyer gets different documents and numbers.
- Check international billing is blocked with DICON inquiry instructions. Check
  failed/unpaid orders cannot receive a license or invoice.
- Verify host support for MySQL advisory locks and the atomic invoice counter, PHP
  mbstring/memory limits, private write access and WP-Cron retries.

## Final release inputs

- DICON confirms the complete master PDF, license wording, holder mapping and layout.
- DICON confirms invoice issuer data, numbering prefix, footer and PDF format. This
  plugin generates standard PDF documents; it does not generate XRechnung/ZUGFeRD,
  automate invoice corrections/credit notes, or provide accounting-system exports.
- Switch off preview only after checking the final master. Confirm issuer details
  before explicitly enabling paid live-order processing.
- Change EDD/Stripe to live mode and configure its live connection/webhooks only
  with explicit authorization. A live charge requires separate authorization.

## Operations and recovery

- **Erneut verarbeiten** retries failed study/invoice generation or unsent email while
  reusing assigned numbers. Invoice email is sent once on normal successful replay.
  Transport handoff success does not guarantee recipient inbox delivery.
- PDF/issuer/order snapshots are retained. Editing settings or billing later does
  not rewrite an issued invoice. Coordinate corrections/refunds with DICON's
  accounting workflow; a refund blocks study delivery but preserves the original
  invoice for the authorized customer.
- Back up the license table, invoice-sequence table and private masters/PDFs together.
  Do not reset counters, manually renumber issued invoices or restore only one part
  of this state. Deactivating the plugin does not delete records/files.
- The framework companion-plugin export feature is recorded separately; this plugin
  is built by its own packaging script and survives a theme switch.
