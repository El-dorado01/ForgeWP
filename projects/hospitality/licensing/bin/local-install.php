<?php
declare(strict_types=1);
// Local-only setup helper; never included in the plugin ZIP.
if (PHP_SAPI !== 'cli') exit;
define('WP_USE_THEMES', false);
define('WP_HTTP_BLOCK_EXTERNAL', true);
require rtrim($argv[1] ?? '', '/\\') . '/wp-load.php';
if (wp_parse_url(home_url(), PHP_URL_HOST) !== 'hospitality-2035.local') throw new RuntimeException('Local Hospitality site only.');
if (!in_array('--configure-test', $argv, true)) {
    echo edd_is_test_mode() ? "EDD TEST MODE\n" : "EDD LIVE MODE\n";
    foreach (get_posts(['post_type' => 'download', 'posts_per_page' => 50]) as $product) echo $product->ID . ': ' . $product->post_title . "\n";
    exit;
}
if (!edd_is_test_mode()) throw new RuntimeException('Enable local EDD test mode before using this setup helper.');
$product = (int) ($argv[2] ?? 0);
if (get_post_type($product) !== 'download') throw new RuntimeException('Expected an existing EDD product ID.');
require_once ABSPATH . '/wp-admin/includes/plugin.php';
$result = activate_plugin('hospitality-2035-licensing/hospitality-licensing.php');
if (is_wp_error($result)) throw new RuntimeException($result->get_error_message());
require_once WP_PLUGIN_DIR . '/hospitality-2035-licensing/bootstrap.php';
$settings = \Hospitality2035\Licensing\Plugin::settings();
$master = \Hospitality2035\Licensing\Storage::importMaster(dirname(__DIR__, 2) . '/public/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf');
$config = json_decode(file_get_contents(dirname(__DIR__) . '/config/preview.json'), true, 512, JSON_THROW_ON_ERROR);
$settings = array_replace($settings, $config['license_page'], ['enabled' => true, 'allow_live' => false, 'preview' => true, 'product_id' => $product, 'master' => $master]);
update_option('h2035_settings', $settings, false);
echo "Local plugin activated and configured for TEST orders with the temporary private master.\n";
echo admin_url('edit.php?post_type=download&page=h2035-licensing') . "\n";
