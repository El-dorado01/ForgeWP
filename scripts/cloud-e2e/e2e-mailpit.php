<?php
/** E2E sandbox: route all wp_mail() through Mailpit (SMTP mailpit:1025). */
add_action('phpmailer_init', function ($m) {
    $m->isSMTP(); $m->Host = 'mailpit'; $m->Port = 1025; $m->SMTPAuth = false; $m->SMTPAutoTLS = false;
});
add_filter('wp_mail_from', function ($from) { return str_ends_with($from, '@localhost') ? 'wordpress@example.test' : $from; });
// Sandbox has no wordpress.org access: skip update checks so debug.log only shows real issues.
add_filter('automatic_updater_disabled', '__return_true');
foreach (['update_core', 'update_plugins', 'update_themes'] as $t) {
    add_filter("pre_site_transient_$t", fn() => (object) ['last_checked' => time(), 'updates' => [], 'response' => [], 'translations' => []]);
}
