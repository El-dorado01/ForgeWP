<?php
/**
 * Cloud E2E sandbox only (scripts/cloud-e2e): WordPress's public address is
 * http://localhost:8080, but inside the container the web server listens on
 * port 80. Let the site reach itself (loopback requests such as the SEO
 * resource's page fetch, WP-Cron, Site Health) by sending those requests to
 * 127.0.0.1 with the public Host header.
 */
add_filter('forgewp_seo_loopback_url', function ($url) {
    return str_replace('http://localhost:8080', 'http://127.0.0.1', (string) $url);
});
add_filter('http_request_args', function ($args, $url) {
    if (strpos((string) $url, 'http://127.0.0.1') === 0) {
        $args['headers'] = isset($args['headers']) && is_array($args['headers']) ? $args['headers'] : array();
        $args['headers']['Host'] = 'localhost:8080';
    }
    return $args;
}, 10, 2);
