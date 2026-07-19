<?php
/**
 * ── Meta Description & og:image Fallback ──
 * header.php yields <head> metadata entirely to the active SEO plugin
 * (matching header.php's own $seo_plugin_active check exactly) — correct
 * for singular posts/pages, which have per-item AIOSEO fields, but
 * AIOSEO's archive/taxonomy settings are commonly left blank, which is
 * exactly what the QA audit found: description and og:image missing on
 * non-detail pages.
 *
 * This only ever runs when an SEO plugin IS active (i.e. exactly the case
 * where the theme's own static <WpHead>-baked tags are skipped) — when no
 * plugin is active, the static head already provides these tags and this
 * file does nothing, so the two mechanisms never compete or duplicate.
 */
function forgewp_og_fallback_seo_plugin_active() {
    return defined('WPSEO_VERSION') ||
           class_exists('RankMath') ||
           class_exists('All_in_One_SEO_Pack') ||
           defined('AIOSEO_VERSION') ||
           class_exists('SEOPress\\Services\\Title');
}

add_action('wp_head', function () {
    if (!forgewp_og_fallback_seo_plugin_active()) {
        return;
    }
    ob_start();
}, 1);

add_action('wp_head', function () {
    if (!forgewp_og_fallback_seo_plugin_active()) {
        return;
    }

    $head_output = ob_get_clean();
    echo $head_output;

    $has_description = (strpos($head_output, 'name="description"') !== false) || (strpos($head_output, "name='description'") !== false);
    $has_og_image = (strpos($head_output, 'property="og:image"') !== false) || (strpos($head_output, "property='og:image'") !== false);
    $has_og_description = (strpos($head_output, 'property="og:description"') !== false) || (strpos($head_output, "property='og:description'") !== false);

    if ($has_description && $has_og_image && $has_og_description) {
        return;
    }

    $fallback_description = '';
    if (is_singular()) {
        $fallback_description = wp_strip_all_tags(get_the_excerpt());
    }
    if (empty($fallback_description)) {
        $fallback_description = get_bloginfo('description');
    }

    $fallback_image = '';
    if (is_singular() && has_post_thumbnail()) {
        $fallback_image = get_the_post_thumbnail_url(get_the_ID(), 'full');
    }
    if (empty($fallback_image)) {
        $fallback_image = get_template_directory_uri() . '/Logo/hotelchecker24-logo_farbe.svg';
    }

    if (!$has_description && !empty($fallback_description)) {
        echo '<meta name="description" content="' . esc_attr($fallback_description) . '" />' . "\n";
    }
    if (!$has_og_description && !empty($fallback_description)) {
        echo '<meta property="og:description" content="' . esc_attr($fallback_description) . '" />' . "\n";
    }
    if (!$has_og_image && !empty($fallback_image)) {
        echo '<meta property="og:image" content="' . esc_url($fallback_image) . '" />' . "\n";
    }
}, PHP_INT_MAX);
