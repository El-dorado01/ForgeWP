<?php
/** E2E sandbox: route all wp_mail() through Mailpit (SMTP mailpit:1025). */
add_action('phpmailer_init', function ($m) {
    $m->isSMTP(); $m->Host = 'mailpit'; $m->Port = 1025; $m->SMTPAuth = false; $m->SMTPAutoTLS = false;
});
add_filter('wp_mail_from', function ($from) { return str_ends_with($from, '@localhost') ? 'wordpress@example.test' : $from; });
