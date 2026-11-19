<?php
/**
 * Plugin Name: Hospitality 2035 Licensing
 * Description: Order-linked licenses, private personalized study delivery and PDF invoicing for Easy Digital Downloads.
 * Version: 0.2.1
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * Requires Plugins: easy-digital-downloads
 * Author: DICON
 * License: GPL-2.0-or-later
 */
defined('ABSPATH') || exit;

require_once __DIR__ . '/bootstrap.php';
register_activation_hook(__FILE__, ['Hospitality2035\Licensing\Store', 'install']);
add_action('plugins_loaded', static function () {
    if (!function_exists('edd_get_order')) {
        add_action('admin_notices', static function () {
            echo '<div class="notice notice-error"><p>Hospitality Licensing benötigt Easy Digital Downloads 3 oder neuer.</p></div>';
        });
        return;
    }
    \Hospitality2035\Licensing\Plugin::boot();
});
