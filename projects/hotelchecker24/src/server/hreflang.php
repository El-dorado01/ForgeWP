<?php
/**
 * ── x-default hreflang ──
 * Polylang outputs reciprocal DE/EN hreflang tags correctly on its own, but
 * has no built-in x-default option. Adds the missing
 * <link rel="alternate" hreflang="x-default"> pointing at the site's
 * default-language version of the current page (falling back to the
 * homepage if the current page has no default-language translation).
 */
add_action('wp_head', function () {
    if (!function_exists('pll_default_language') || !function_exists('pll_the_languages')) {
        return;
    }

    $default_lang = pll_default_language();
    if (empty($default_lang)) {
        return;
    }

    $languages = pll_the_languages(array('raw' => 1));
    if (!is_array($languages)) {
        return;
    }

    $default_url = null;
    $current_url = null;
    foreach ($languages as $lang) {
        if (empty($lang['url'])) {
            continue;
        }
        if (isset($lang['slug']) && $lang['slug'] === $default_lang) {
            $default_url = $lang['url'];
        }
        if (!empty($lang['current_lang'])) {
            $current_url = $lang['url'];
        }
    }

    // No default-language translation of this specific page exists — fall
    // back to the current page itself rather than omitting x-default.
    if (empty($default_url)) {
        $default_url = $current_url;
    }
    if (empty($default_url) && function_exists('pll_home_url')) {
        $default_url = pll_home_url($default_lang);
    }

    if (!empty($default_url)) {
        echo '<link rel="alternate" hreflang="x-default" href="' . esc_url($default_url) . '" />' . "\n";
    }
}, 5);
