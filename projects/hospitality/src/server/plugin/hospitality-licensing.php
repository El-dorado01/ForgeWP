<?php
/**
 * Hospitality 2035 Licensing — flat entry file for the Companion Plugin and theme copy (§16).
 */
defined('ABSPATH') || exit;

add_action('forgewp_companion_activated', array('Hospitality2035\\Licensing\\Store', 'install'));

add_action('forgewp_companion_upgraded', function () {
    if ((int) get_option('h2035_schema') !== 2) {
        \Hospitality2035\Licensing\Store::install();
    }
});

add_action('forgewp_companion_uninstall', array('Hospitality2035\\Licensing\\Store', 'uninstall'));

if (!defined('WP_UNINSTALL_PLUGIN')) {
    $h2035_boot = function () {
        if (!function_exists('edd_get_order')) {
            add_action('admin_notices', function () {
                echo '<div class="notice notice-error"><p>Hospitality Licensing benötigt Easy Digital Downloads 3 oder neuer.</p></div>';
            });
            return;
        }
        \Hospitality2035\Licensing\Plugin::boot();
    };

    if (did_action('plugins_loaded')) {
        $h2035_boot();
    } else {
        add_action('plugins_loaded', $h2035_boot);
    }
}
