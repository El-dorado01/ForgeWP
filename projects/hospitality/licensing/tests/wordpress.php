<?php
declare(strict_types=1);
// Local-only integration. No Stripe API requests, charges or real emails.
if (PHP_SAPI !== 'cli') exit;
$root = dirname(__DIR__);
$private = $root . '/output/integration-' . bin2hex(random_bytes(6));
define('H2035_PRIVATE_DIR', $private);
define('WP_USE_THEMES', false);
define('WP_HTTP_BLOCK_EXTERNAL', true);
require rtrim($argv[1] ?? '', '/\\') . '/wp-load.php';
if (wp_parse_url(home_url(), PHP_URL_HOST) !== 'hospitality-2035.local') throw new RuntimeException('Local Hospitality site only.');
require_once $root . '/bootstrap.php';

use Hospitality2035\Licensing\Plugin;
use Hospitality2035\Licensing\Store;
use Hospitality2035\Licensing\Storage;

function checkLicense(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: $message\n";
}
function denied(callable $action, string $message): void {
    try { $action(); } catch (RuntimeException $error) { checkLicense(true, $message); return; }
    throw new RuntimeException('Expected denial: ' . $message);
}

Store::install();
global $wpdb;
$table = Store::table();
$before = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table");
$originalSettings = get_option('h2035_settings', null);
$mailCount = 0;
$mailMessages = [];
$mailGuard = static function ($return, $args) use (&$mailCount, &$mailMessages) { $mailCount++; $mailMessages[] = $args; return true; };
add_filter('pre_wp_mail', $mailGuard, PHP_INT_MAX, 2);
$admin = get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ID']);
wp_set_current_user((int) $admin[0]);
$wpdb->query('START TRANSACTION');
$orders = [];
try {
    $master = Storage::importMaster($root . '/../public/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf');
    checkLicense(is_file(Storage::file($master)), 'Temporary master copied to private storage');
    $product = wp_insert_post(['post_type' => 'download', 'post_status' => 'publish', 'post_title' => 'Licensing integration test']);
    update_post_meta($product, 'edd_download_files', [0 => ['name' => 'Licensed study', 'file' => home_url('/h2035-private-document.pdf')]]);
    $settings = Plugin::settings();
    $settings = array_replace($settings, ['enabled' => true, 'preview' => true, 'allow_live' => false, 'invoice_enabled' => false, 'product_id' => $product, 'master' => $master]);
    $settings['notification_to'] = 'licensing-test@example.invalid';
    $settings['notification_subject'] = 'Neue Lizenz {license_number} – {company}';
    $settings['notification_body'] = "Bestellung {order_number} ({order_id})\nUnternehmen: {company}\nLizenz: {license_number}\nTyp: {license_type}\nUmfang: {license_scope}\nProdukt: {product_name}";
    update_option('h2035_settings', $settings, false);
    // Regression: EDD settings can hide Company even though licensing requires it.
    $originalCart = EDD()->cart->get_contents();
    $originalPost = $_POST;
    $hiddenFields = static fn() => array_fill_keys(['company', 'country', 'address', 'city', 'zip', 'phone'], 0);
    $licensedCart = static fn() => [['id' => $product, 'quantity' => 1, 'options' => []]];
    add_filter('edd_get_option_checkout_address_fields', $hiddenFields, 5);
    add_filter('edd_cart_contents', $licensedCart, PHP_INT_MAX);
    try {
        $visible = \EDD\Forms\Checkout\Registry::get_checkout_fields();
        checkLicense($visible['company'] === 1 && $visible['address'] === 1 && $visible['zip'] === 1, 'Managed cart shows company and full billing even when EDD settings hide them');
        $required = \EDD\Forms\Checkout\Registry::get_required_fields();
        checkLicense(isset($required['company'], $required['card_address'], $required['card_city'], $required['card_zip']), 'Visible license billing fields are marked required');
        $addressForm = new \EDD\Checkout\Address();
        $addressForm->is_block = false;
        ob_start();
        $addressForm->render();
        $checkoutHtml = ob_get_clean();
        checkLicense((bool) preg_match('/<input[^>]*name="company"[^>]*required|<input[^>]*required[^>]*name="company"/', $checkoutHtml), 'Native EDD checkout renders a required Company input');
        $_POST = ['company' => 'Testfirma GmbH', 'card_address' => 'Teststraße 1', 'card_city' => 'Berlin', 'card_zip' => '10557', 'billing_country' => 'DE'];
        edd_clear_errors();
        Plugin::validateCheckout();
        checkLicense(!edd_get_errors(), 'Complete visible billing passes actual checkout validator');
        $_POST['company'] = '';
        Plugin::validateCheckout();
        checkLicense((edd_get_errors()['h2035_checkout'] ?? '') === 'Bitte geben Sie Ihren Unternehmensnamen an.', 'Missing company produces a specific useful message');
    } finally {
        edd_clear_errors();
        $_POST = $originalPost;
        remove_filter('edd_cart_contents', $licensedCart, PHP_INT_MAX);
        EDD()->cart->contents = $originalCart;
        remove_filter('edd_get_option_checkout_address_fields', $hiddenFields, 5);
    }
    $fixture = static function (string $status, string $company, string $country = 'DE', string $mode = 'test') use ($product, &$orders): int {
        $id = (int) edd_add_order(['status' => $status, 'type' => 'sale', 'gateway' => 'stripe', 'mode' => $mode, 'email' => 'license-test@example.invalid', 'payment_key' => wp_generate_password(32, false), 'subtotal' => 249, 'tax' => 47.31, 'total' => 296.31, 'currency' => 'EUR']);
        $orders[] = $id;
        edd_add_order_item(['order_id' => $id, 'product_id' => $product, 'product_name' => 'Test study', 'quantity' => 1, 'amount' => 249, 'subtotal' => 249, 'tax' => 47.31, 'total' => 296.31, 'status' => $status]);
        edd_add_order_address(['order_id' => $id, 'type' => 'billing', 'name' => 'Test Buyer', 'address' => 'Teststraße 1', 'city' => 'Berlin', 'postal_code' => '10557', 'country' => $country]);
        edd_update_order_meta($id, 'company_name', $company);
        return $id;
    };
    $first = $fixture('pending', 'Müller & Partner GmbH');
    Plugin::enroll($first);
    checkLicense(is_array(edd_get_order_meta($first, '_h2035_enrollment', true)), 'Eligible checkout snapshots master, terms and company');
    denied(fn() => Plugin::prepare($first), 'Pending order cannot generate a license');
    checkLicense(Store::get($first) === null, 'Pending order consumes no license record');
    // Simulate an EDD confirmed status, without contacting Stripe or sending stock receipts.
    edd_update_order($first, ['status' => 'complete']);
    foreach (edd_get_order_items(['order_id' => $first]) as $item) edd_update_order_item($item->id, ['status' => 'complete']);
    Plugin::complete($first);
    $a = Store::get($first);
    checkLicense($a && $a->status === 'ready', 'Confirmed test order generates personalized PDF');
    checkLicense(str_starts_with($a->number, 'TEST-H2035-'), 'Test licenses clearly separated from live numbering');
    checkLicense(Plugin::verifiedFile($a), 'Stored PDF hash matches private deliverable');
    checkLicense(edd_get_order_meta($first, '_h2035_license_number', true) === $a->number, 'License number associated with EDD order');
    ob_start();
    do_action('edd_order_receipt_after_table', edd_get_order($first), []);
    $receipt = ob_get_clean();
    checkLicense(str_contains($receipt, '<dt>Unternehmen</dt><dd>Müller &amp; Partner GmbH') && str_contains($receipt, $a->number), 'EDD receipt hook shows saved company and matching license');
    edd_update_order_meta($first, 'company_name', 'Changed billing company');
    ob_start();
    Plugin::receiptDetails(edd_get_order($first));
    $receiptSnapshot = ob_get_clean();
    checkLicense(str_contains($receiptSnapshot, 'Müller &amp; Partner GmbH') && !str_contains($receiptSnapshot, 'Changed billing company'), 'Receipt company matches issued license snapshot after metadata edits');
    edd_update_order_meta($first, 'company_name', 'Müller & Partner GmbH');
    Plugin::complete($first);
    $again = Store::get($first);
    checkLicense($again->number === $a->number && $again->file_hash === $a->file_hash, 'Repeated processing preserves number and PDF');
    checkLicense($mailCount === 1, 'Repeated processing does not repeat the DICON ready notification');
    $message = $mailMessages[0];
    checkLicense($message['to'] === 'licensing-test@example.invalid', 'Admin-configured notification recipient is used');
    checkLicense(str_contains($message['subject'], $a->number) && str_contains($message['subject'], 'Müller & Partner GmbH') && str_starts_with($message['subject'], '[TEST] '), 'Custom subject expands license/company and retains TEST marker');
    checkLicense(str_contains($message['message'], 'Unternehmen: Müller & Partner GmbH') && !str_contains($message['message'], '{order_number}') && str_contains($message['message'], 'Produkt: Licensing integration test'), 'Custom body expands order, company, license and product');
    $untrusted = clone $a;
    $snapshot = json_decode($a->snapshot, true);
    $snapshot['holder'] = 'Firma {license_number}';
    $untrusted->snapshot = wp_json_encode($snapshot);
    $rendered = \Hospitality2035\Licensing\Notification::render($untrusted, edd_get_order($first), $settings);
    checkLicense(str_contains($rendered['body'], 'Unternehmen: Firma {license_number}'), 'Tokens embedded in buyer data are not evaluated');
    foreach ([['notification_to' => "invalid\r\nBcc: injected@example.invalid"], ['notification_subject' => "Subject\r\nBcc: injected@example.invalid"], ['notification_body' => '{unknown_tag}'], ['notification_body' => '']] as $badTemplate) {
        try {
            \Hospitality2035\Licensing\Notification::validateSettings(array_replace($settings, $badTemplate));
            throw new RuntimeException('Invalid email settings accepted');
        } catch (InvalidArgumentException $error) { checkLicense(true, 'Invalid email/template input rejected'); }
    }
    $order = edd_get_order($first);
    $orderItems = $order->get_items();
    $item = reset($orderItems);
    $url = edd_get_download_file_url($item, $order->email, 0);
    // EDD's download controller validates the query against site_url(), not index.php.
    wp_parse_str((string) wp_parse_url($url, PHP_URL_QUERY), $signedArgs);
    $url = add_query_arg($signedArgs, site_url());
    checkLicense(is_string($url) && edd_validate_url_token($url), 'Native EDD signed download link validates');
    checkLicense(!edd_validate_url_token(add_query_arg('eddfile', '999999:999999:0', $url)), 'Tampered order/product token rejected by EDD');
    $dieHandler = static fn() => static function () { throw new RuntimeException('EDD denied expired link'); };
    add_filter('wp_die_handler', $dieHandler);
    try { denied(fn() => edd_validate_url_token(add_query_arg('ttl', time() - 86400, $url)), 'Expired signed link denied by EDD'); }
    finally { remove_filter('wp_die_handler', $dieHandler); }
    $other = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);
    $key = 'h2035_' . md5(Store::table() . ':' . $first);
    Store::lock($first, static function () use ($other, $key) {
        checkLicense((int) $other->get_var($other->prepare('SELECT GET_LOCK(%s, 0)', $key)) === 0, 'Concurrent connection cannot process a locked order');
    });
    checkLicense((int) $other->get_var($other->prepare('SELECT GET_LOCK(%s, 0)', $key)) === 1, 'Order lock released after processing');
    $other->get_var($other->prepare('SELECT RELEASE_LOCK(%s)', $key));
    $other->close();
    $settings['scope'] = 'Changed future license terms';
    update_option('h2035_settings', $settings, false);
    checkLicense(Plugin::prepare($first)->file_hash === $a->file_hash, 'Settings edits do not alter an already issued PDF');
    $second = $fixture('complete', 'Zürich & Söhne GmbH');
    Plugin::enroll($second);
    $b = Plugin::prepare($second);
    checkLicense((int) $b->id === (int) $a->id + 1 && $a->number !== $b->number, 'Next paid order gets the next sequential number');
    checkLicense($a->file_name !== $b->file_name && $a->file_hash !== $b->file_hash, 'Separate buyers receive separate private documents');
    checkLicense(Plugin::deliveryFile($first, (int) $product) !== Plugin::deliveryFile($second, (int) $product), 'Delivery resolves by authorized order, not shared master');
    denied(fn() => Plugin::deliveryFile($first, (int) $product + 1), 'Product/order mismatch denied');
    $settings = array_replace($settings, [
        'invoice_enabled' => true, 'invoice_seller_confirmed' => false,
        'invoice_seller_name' => 'DICON – TESTDATEN',
        'invoice_seller_address' => "Musterstraße 1\n10117 Berlin\nDeutschland",
        'invoice_seller_tax' => 'TEST – keine gültige Steuernummer',
        'invoice_seller_footer' => 'Automatischer Rechnungstest mit deutschen Umlauten.',
    ]);
    update_option('h2035_settings', $settings, false);
    \Hospitality2035\Licensing\Invoice::process($first);
    $invoice = Store::get($first);
    $invoiceData = json_decode($invoice->invoice_snapshot, true);
    checkLicense(\Hospitality2035\Licensing\Invoice::verifiedFile($invoice), 'Paid order generates private invoice PDF with matching hash');
    checkLicense(str_starts_with($invoice->invoice_number, 'TEST-H2035-RE-' . wp_date('Y') . '-'), 'Invoice has separate TEST number and year');
    checkLicense($invoiceData['subtotal'] === 24900 && $invoiceData['tax'] === 4731 && $invoiceData['total'] === 29631 && $invoiceData['currency'] === 'EUR', 'Invoice preserves saved net/VAT/gross totals and currency');
    checkLicense($invoiceData['company'] === 'Müller & Partner GmbH' && $invoiceData['license_number'] === $a->number && str_contains($invoiceData['buyer_address'], '10557 Berlin'), 'Invoice links buyer address, company and issued license');
    $invoiceMail = end($mailMessages);
    checkLicense(count($invoiceMail['attachments']) === 1 && reset($invoiceMail['attachments']) === Storage::file($invoice->invoice_file) && $invoiceMail['to'] === 'license-test@example.invalid', 'Customer invoice email includes the correct private PDF attachment');
    checkLicense(str_starts_with($invoiceMail['subject'], '[TEST] ') && (bool) $invoice->invoice_emailed, 'Invoice email keeps TEST marker and records successful handoff');
    $countBeforeReplay = $mailCount;
    \Hospitality2035\Licensing\Invoice::process($first);
    checkLicense($mailCount === $countBeforeReplay && Store::get($first)->invoice_number === $invoice->invoice_number, 'Invoice replay does not duplicate number or successful email');
    $settings['invoice_seller_name'] = 'Changed future issuer';
    update_option('h2035_settings', $settings, false);
    checkLicense(\Hospitality2035\Licensing\Invoice::prepare($first)->invoice_hash === $invoice->invoice_hash, 'Issued invoice stays unchanged after seller edits');
    ob_start(); Plugin::receiptDetails(edd_get_order($first)); $invoiceReceipt = ob_get_clean();
    checkLicense(str_contains($invoiceReceipt, 'h2035_invoice=') && str_contains($invoiceReceipt, $invoice->invoice_number), 'Authorized order receipt displays invoice PDF link and number');
    checkLicense(\Hospitality2035\Licensing\Invoice::canAccess(edd_get_order($first)), 'Administrator can access the invoice');
    wp_set_current_user(0);
    checkLicense(!\Hospitality2035\Licensing\Invoice::canAccess(edd_get_order($first)), 'Anonymous user without matching purchase session cannot access invoice');
    wp_set_current_user((int) $admin[0]);
    $discounted = $fixture('complete', 'Discount GmbH');
    edd_update_order($discounted, ['discount' => 49.8, 'tax' => 37.85, 'total' => 237.05]);
    Plugin::enroll($discounted); Plugin::prepare($discounted);
    $discountInvoice = \Hospitality2035\Licensing\Invoice::prepare($discounted);
    $discountData = json_decode($discountInvoice->invoice_snapshot, true);
    checkLicense($discountData['discount'] === 4980 && $discountData['net'] === 19920 && $discountData['tax'] === 3785 && $discountData['total'] === 23705, 'Discounted invoice preserves saved 20 percent reduction and rounded VAT');
    checkLicense($discountInvoice->invoice_number !== $invoice->invoice_number && $discountInvoice->invoice_file !== $invoice->invoice_file, 'Different customers get distinct invoice numbers and files');
    $blockInvoiceMail = static fn($result, $args) => !empty($args['attachments']) ? false : $result;
    add_filter('pre_wp_mail', $blockInvoiceMail, PHP_INT_MAX, 2);
    \Hospitality2035\Licensing\Invoice::process($discounted);
    remove_filter('pre_wp_mail', $blockInvoiceMail, PHP_INT_MAX);
    checkLicense(Store::get($discounted)->invoice_error !== '' && !(bool) Store::get($discounted)->invoice_emailed, 'Failed invoice mail remains retryable without losing PDF');
    \Hospitality2035\Licensing\Invoice::process($discounted);
    checkLicense((bool) Store::get($discounted)->invoice_emailed && Store::get($discounted)->invoice_number === $discountInvoice->invoice_number, 'Failed email retry reuses the invoice and completes handoff');
    $liveSeries = Store::nextInvoiceNumber('H2035-RE', 'live', wp_date('Y'));
    checkLicense(!str_starts_with($liveSeries, 'TEST-') && str_ends_with($liveSeries, '-000001'), 'Live invoice counter is independent of TEST counter');
    $nextYear = Store::nextInvoiceNumber('H2035-RE', 'test', (string) ((int) wp_date('Y') + 1));
    checkLicense(str_ends_with($nextYear, '-000001'), 'New invoice year starts its own series');
    $automatic = $fixture('complete', 'Automatic Invoice GmbH');
    Plugin::enroll($automatic);
    Plugin::complete($automatic);
    $autoRow = Store::get($automatic);
    checkLicense($autoRow->status === 'ready' && (bool) $autoRow->invoice_emailed && \Hospitality2035\Licensing\Invoice::verifiedFile($autoRow), 'Completed-order pipeline automatically generates and dispatches invoice');
    $pendingInvoice = $fixture('pending', 'Pending Invoice GmbH');
    Plugin::enroll($pendingInvoice);
    denied(fn() => \Hospitality2035\Licensing\Invoice::prepare($pendingInvoice), 'Pending order cannot issue an invoice');
    $settings['invoice_enabled'] = false;
    update_option('h2035_settings', $settings, false);
    edd_update_order($first, ['status' => 'refunded']);
    denied(fn() => Plugin::deliveryFile($first, (int) $product), 'Refunded order cannot download');
    $foreign = $fixture('complete', 'Ausland GmbH', 'AT');
    Plugin::enroll($foreign);
    checkLicense(!edd_get_order_meta($foreign, '_h2035_enrollment', true), 'Non-German billing cannot enroll');
    denied(fn() => Plugin::prepare($foreign), 'Non-German order cannot issue license');
    denied(fn() => Plugin::validateBilling('Company', 'Street', 'Vienna', '1010', 'AT'), 'International checkout policy rejects before payment');
    $live = $fixture('complete', 'Live Test GmbH', 'DE', 'live');
    Plugin::enroll($live);
    denied(fn() => Plugin::prepare($live), 'Live order blocked while temporary master is in use');
    $unconfirmedInvoiceSettings = array_replace($settings, ['invoice_enabled' => true, 'invoice_seller_confirmed' => false]);
    denied(fn() => \Hospitality2035\Licensing\Invoice::snapshot(edd_get_order($live), $a, $unconfirmedInvoiceSettings), 'Unconfirmed invoice seller data cannot be used for a live invoice');
    $bad = $fixture('complete', '');
    Plugin::enroll($bad);
    checkLicense(!edd_get_order_meta($bad, '_h2035_enrollment', true), 'Missing company cannot enroll');
    $failure = $fixture('complete', 'Retry GmbH');
    Plugin::enroll($failure);
    $enrollment = edd_get_order_meta($failure, '_h2035_enrollment', true);
    $savedMaster = Storage::file($master);
    rename($savedMaster, $savedMaster . '.holding');
    try { denied(fn() => Plugin::prepare($failure), 'Missing master fails closed'); }
    finally { rename($savedMaster . '.holding', $savedMaster); }
    $failed = Store::get($failure);
    $retried = Plugin::prepare($failure);
    checkLicense($failed->number === $retried->number && $retried->status === 'ready', 'Retry repairs generation without assigning another license');
    checkLicense(current_user_can('manage_options'), 'Admin fixture available for settings UI');
    ob_start();
    \Hospitality2035\Licensing\Admin::page();
    $html = ob_get_clean();
    checkLicense(str_contains($html, 'Lizenzumfang') && str_contains($html, 'name="master"') && str_contains($html, $retried->number), 'Admin page renders settings and license list');
    checkLicense(str_contains($html, 'name="notification_subject"') && str_contains($html, 'name="notification_body"') && str_contains($html, 'name="notification_to"'), 'Admin page renders editable recipient, subject and body controls');
    wp_set_current_user(0);
    ob_start();
    \Hospitality2035\Licensing\Admin::page();
    checkLicense(ob_get_clean() === '', 'Unauthenticated user cannot render admin records');
} finally {
    foreach ($orders as $id) {
        wp_clear_scheduled_hook('h2035_retry', [$id]);
        wp_clear_scheduled_hook('h2035_invoice_retry', [$id]);
    }
    $wpdb->query('ROLLBACK');
    if ($originalSettings === null) delete_option('h2035_settings');
    else update_option('h2035_settings', $originalSettings, false);
    wp_cache_flush();
    remove_filter('pre_wp_mail', $mailGuard, PHP_INT_MAX);
    foreach (glob($private . '/*.pdf') ?: [] as $file) unlink($file);
    if (is_dir($private)) rmdir($private);
}
checkLicense((int) $wpdb->get_var("SELECT COUNT(*) FROM $table") === $before, 'Test orders and license rows rolled back');
checkLicense(!is_dir($private), 'Private test files removed');
