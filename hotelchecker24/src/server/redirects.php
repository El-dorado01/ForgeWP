<?php
/**
 * ── Template Redirect for Legacy Slugs ──
 * Redirects '/kontakt' to '/contact/' while preserving query parameters.
 */
add_action('template_redirect', function() {
    if (is_404()) {
        $request_uri = $_SERVER['REQUEST_URI'];
        // Remove query parameters and trailing slash for matching
        $path = parse_url($request_uri, PHP_URL_PATH);
        $path = rtrim($path, '/');
        
        if ($path === '/kontakt') {
            // Retrieve query string if any
            $query = parse_url($request_uri, PHP_URL_QUERY);
            $target = '/contact/';
            if ($query) {
                $target .= '?' . $query;
            }
            wp_redirect(home_url($target), 301);
            exit;
        }
    }
});
