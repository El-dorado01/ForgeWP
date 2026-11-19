<?php

add_action('template_redirect', function () {
    $request_uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = untrailingslashit((string) parse_url($request_uri, PHP_URL_PATH));

    if ($path !== '/studie') {
        return;
    }

    $target = home_url('/studie/hospitality-2035/');
    $query = parse_url($request_uri, PHP_URL_QUERY);

    if (is_string($query) && $query !== '') {
        $target .= '?' . $query;
    }

    wp_safe_redirect($target, 301);
    exit;
});
