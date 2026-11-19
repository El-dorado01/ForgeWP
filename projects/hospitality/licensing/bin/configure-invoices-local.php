<?php
declare(strict_types=1);
// Explicit local-only setup and delivery to the local Mailpit capture server.
if (PHP_SAPI !== 'cli') exit;
define('WP_USE_THEMES', false);
define('WP_HTTP_BLOCK_EXTERNAL', true);
require rtrim($argv[1] ?? '', '/\\') . '/wp-load.php';
if (wp_parse_url(home_url(), PHP_URL_HOST) !== 'hospitality-2035.local' || !edd_is_test_mode()) throw new RuntimeException('Only the Local Hospitality site in test mode is supported.');
require_once dirname(__DIR__) . '/bootstrap.php';
\Hospitality2035\Licensing\Store::install();
$settings = \Hospitality2035\Licensing\Plugin::settings();
$backup = dirname(__DIR__) . '/output/settings.before-invoices.json';
if (!file_exists($backup)) file_put_contents($backup, wp_json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
$sample = json_decode(file_get_contents(dirname(__DIR__) . '/config/invoice-preview.json'), true, 512, JSON_THROW_ON_ERROR);
foreach (['name', 'address', 'tax', 'footer'] as $field) {
    if ($settings['invoice_seller_' . $field] === '') $settings['invoice_seller_' . $field] = $sample['seller_' . $field];
}
$settings['invoice_enabled'] = true;
$settings['invoice_seller_confirmed'] = false;
\Hospitality2035\Licensing\Invoice::validateSettings($settings);
update_option('h2035_settings', $settings, false);
echo "Local invoice settings enabled with explicitly unconfirmed TEST issuer data. Checkout currency/tax settings unchanged.\n";
$id = (int) ($argv[2] ?? 0);
if (!$id) exit;
$order = edd_get_order($id);
if (!$order || $order->mode !== 'test' || $order->status !== 'complete') throw new RuntimeException('Expected an existing completed TEST order.');
// This is runtime-only: no saved SMTP/provider settings are read or changed.
add_action('phpmailer_init', static function ($mailer) {
    $mailer->isSMTP();
    $mailer->Host = '127.0.0.1';
    $mailer->Port = 10019;
    $mailer->SMTPAuth = false;
    $mailer->SMTPSecure = '';
    $mailer->SMTPAutoTLS = false;
    $mailer->Username = '';
    $mailer->Password = '';
}, PHP_INT_MAX);
\Hospitality2035\Licensing\Invoice::process($id);
$row = \Hospitality2035\Licensing\Store::get($id);
if (!$row || !$row->invoice_emailed || !\Hospitality2035\Licensing\Invoice::verifiedFile($row)) throw new RuntimeException('Local invoice generation or Mailpit handoff failed.');
echo 'Local test invoice generated and handed to Mailpit: ' . $row->invoice_number . "\n";
