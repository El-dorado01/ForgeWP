/**
 * R4 `seo` resource (docs/resource-contracts.md §13, approved with Claude's
 * answers). Backend code (Companion Plugin + theme fallback).
 *
 * One source for both modes: the tags WordPress actually prints in <head>.
 * - REST (`GET /forgewp/v1/seo?path=`): resolve the path explicitly to a
 *   published public object (front page, posts page, post, term, post type
 *   archive), set up the main query for it, run `wp_head`, parse the tags.
 * - Native (`resources.seo`): capture this page's own `wp_head` output while it
 *   is printed (no second run), parse it the same way, print it in the footer.
 * Whatever Yoast / Rank Math / AIOSEO / SEOPress / core print is what both
 * modes read, so neither depends on a plugin's internal PHP API.
 *
 * Note: PHP lives in a JS template literal. No backslashes, no `${`.
 */
export function buildSeoResourcePhp() {
  return `
/**
 * ── SEO resource (R4, resource-contracts.md §13) ──
 */
if (!function_exists('forgewp_seo_resource')) {
    function forgewp_seo_norm_path($path) {
        $path = (string) $path;
        if ($path === '' || strpos($path, '//') === 0 || preg_match('/^[a-z][a-z0-9+.-]*:/i', $path) || strpos($path, '..') !== false) {
            return null;
        }
        $path = preg_replace('/[?#].*$/', '', $path);
        $path = '/' . ltrim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/') . '/';
    }

    function forgewp_seo_same_path($a, $b) {
        $a = forgewp_seo_norm_path($a);
        return $a !== null && $a === forgewp_seo_norm_path($b);
    }

    function forgewp_seo_url_path($url) {
        $url = (string) $url;
        if ($url === '') {
            return '';
        }
        return function_exists('forgewp_resource_path') ? forgewp_resource_path($url) : wp_make_link_relative($url);
    }

    /** Language from a path prefix (Polylang), or ''. */
    function forgewp_seo_path_lang($path) {
        if (!function_exists('pll_languages_list')) {
            return '';
        }
        $first = explode('/', trim((string) $path, '/'))[0];
        return in_array($first, (array) pll_languages_list(array('fields' => 'slug')), true) ? $first : '';
    }

    function forgewp_seo_post_public($post) {
        return $post instanceof WP_Post && $post->post_status === 'publish' && is_post_type_viewable($post->post_type);
    }

    /**
     * Path → published public object. Returns array(type, id, object, postType) or null.
     * Types: front-page, posts-page, post, term, post-type-archive.
     */
    function forgewp_resolve_path_object($path) {
        $path = forgewp_seo_norm_path($path);
        if ($path === null) {
            return null;
        }
        $lang = forgewp_seo_path_lang($path);
        if ($path === '/' || ($lang !== '' && $path === '/' . $lang . '/')) {
            $front = get_option('show_on_front') === 'page' ? (int) get_option('page_on_front') : 0;
            if ($front && $lang !== '' && function_exists('pll_get_post')) {
                $front = (int) pll_get_post($front, $lang) ?: $front;
            }
            $front_post = $front ? get_post($front) : null;
            if ($front_post && forgewp_seo_post_public($front_post)) {
                return array('type' => 'front-page', 'id' => $front, 'object' => $front_post, 'postType' => 'page');
            }
            return array('type' => 'front-page', 'id' => null, 'object' => null, 'postType' => null);
        }

        $posts_page = (int) get_option('page_for_posts');
        if ($posts_page && get_option('show_on_front') === 'page') {
            if ($lang !== '' && function_exists('pll_get_post')) {
                $posts_page = (int) pll_get_post($posts_page, $lang) ?: $posts_page;
            }
            $posts_post = get_post($posts_page);
            if (forgewp_seo_post_public($posts_post) && forgewp_seo_same_path(forgewp_seo_url_path(get_permalink($posts_post)), $path)) {
                return array('type' => 'posts-page', 'id' => $posts_page, 'object' => $posts_post, 'postType' => 'page');
            }
        }

        $base = function_exists('forgewp_raw_home_url') ? forgewp_raw_home_url() : trailingslashit(home_url());
        $post_id = (int) url_to_postid($base . ltrim($path, '/'));
        if ($post_id) {
            $post = get_post($post_id);
            if (forgewp_seo_post_public($post) && forgewp_seo_same_path(forgewp_seo_url_path(get_permalink($post)), $path)) {
                $type = (int) get_option('page_for_posts') === $post_id ? 'posts-page' : 'post';
                return array('type' => $type, 'id' => $post_id, 'object' => $post, 'postType' => $post->post_type);
            }
        }

        $slug = basename(rtrim($path, '/'));
        foreach (get_taxonomies(array('public' => true), 'names') as $taxonomy) {
            $term = get_term_by('slug', $slug, $taxonomy);
            if ($term && !is_wp_error($term)) {
                $link = get_term_link($term);
                if (!is_wp_error($link) && forgewp_seo_same_path(forgewp_seo_url_path($link), $path)) {
                    return array('type' => 'term', 'id' => (int) $term->term_id, 'object' => $term, 'postType' => null);
                }
            }
        }

        foreach (get_post_types(array('public' => true), 'names') as $post_type) {
            $link = get_post_type_archive_link($post_type);
            if ($link && $post_type !== 'post' && forgewp_seo_same_path(forgewp_seo_url_path($link), $path)) {
                return array('type' => 'post-type-archive', 'id' => null, 'object' => null, 'postType' => $post_type);
            }
        }
        return null;
    }

    /** The current request's object, for native pages (null on 404, search, date archives…). */
    function forgewp_seo_current_target() {
        if (is_front_page()) {
            $id = get_option('show_on_front') === 'page' ? (int) get_queried_object_id() : 0;
            return array('type' => 'front-page', 'id' => $id ?: null, 'object' => $id ? get_post($id) : null, 'postType' => $id ? 'page' : null);
        }
        if (is_home()) {
            $id = (int) get_option('page_for_posts');
            return $id ? array('type' => 'posts-page', 'id' => $id, 'object' => get_post($id), 'postType' => 'page') : null;
        }
        $object = get_queried_object();
        if (is_singular() && forgewp_seo_post_public($object)) {
            return array('type' => 'post', 'id' => (int) $object->ID, 'object' => $object, 'postType' => $object->post_type);
        }
        if ((is_category() || is_tag() || is_tax()) && $object instanceof WP_Term) {
            return array('type' => 'term', 'id' => (int) $object->term_id, 'object' => $object, 'postType' => null);
        }
        if (is_post_type_archive()) {
            $type = get_query_var('post_type');
            return array('type' => 'post-type-archive', 'id' => null, 'object' => null, 'postType' => is_array($type) ? reset($type) : (string) $type);
        }
        return null;
    }

    /** Make the main query describe $target, as if WordPress had routed the request there. */
    function forgewp_seo_setup_query($target) {
        $vars = array();
        switch ($target['type']) {
            case 'front-page':
            case 'posts-page':
                if ($target['id']) {
                    $vars = array('page_id' => $target['id']);
                }
                break;
            case 'post':
                $vars = $target['postType'] === 'page' ? array('page_id' => $target['id']) : array('p' => $target['id'], 'post_type' => $target['postType']);
                break;
            case 'term':
                $term = $target['object'];
                if ($term->taxonomy === 'category') {
                    $vars = array('cat' => $term->term_id);
                } elseif ($term->taxonomy === 'post_tag') {
                    $vars = array('tag_id' => $term->term_id);
                } else {
                    $tax = get_taxonomy($term->taxonomy);
                    $vars = array(($tax && $tax->query_var) ? $tax->query_var : $term->taxonomy => $term->slug);
                }
                break;
            case 'post-type-archive':
                $vars = array('post_type' => $target['postType']);
                break;
        }
        $query = new WP_Query();
        $query->query($vars);
        $GLOBALS['wp_query'] = $query;
        $GLOBALS['wp_the_query'] = $query;
        if ($query->is_singular && $query->post) {
            $GLOBALS['post'] = $query->post;
            setup_postdata($query->post);
        }
        // Replay query changes WordPress would make before rendering. WooCommerce, for
        // themes without WooCommerce support, turns shop and product archives into a
        // stand-in page on template_redirect; native pages print that page's head.
        if (class_exists('WC_Template_Loader') && has_action('template_redirect', array('WC_Template_Loader', 'unsupported_theme_init'))) {
            WC_Template_Loader::unsupported_theme_init();
        }
    }

    // ── Parse <head> ──────────────────────────────────────────────────────────

    function forgewp_seo_text($value) {
        return trim(html_entity_decode(wp_strip_all_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    function forgewp_seo_parse_head($html) {
        $out = array('title' => '', 'description' => '', 'canonical' => '', 'robots' => '', 'og' => array(), 'ogImages' => array(), 'twitter' => array(), 'twitterImages' => array(), 'languages' => array(), 'jsonLd' => array());
        if (trim((string) $html) === '' || !class_exists('DOMDocument')) {
            return $out;
        }
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><html><head>' . $html . '</head><body></body></html>');
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $xpath = new DOMXPath($doc);
        $title = $xpath->query('//title');
        if ($title && $title->length) {
            $out['title'] = forgewp_seo_text($title->item(0)->textContent);
        }
        foreach ($xpath->query('//meta') as $meta) {
            $name = strtolower((string) ($meta->getAttribute('name') ?: $meta->getAttribute('property')));
            $content = (string) $meta->getAttribute('content');
            if ($name === 'description') {
                $out['description'] = forgewp_seo_text($content);
            } elseif ($name === 'robots') {
                $out['robots'] = strtolower($content);
            } elseif ($name === 'og:image' || $name === 'og:image:url') {
                $out['ogImages'][] = array('url' => $content);
            } elseif (strpos($name, 'og:image:') === 0 && !empty($out['ogImages'])) {
                $key = substr($name, 9);
                $last = count($out['ogImages']) - 1;
                if ($key === 'width' || $key === 'height') {
                    $out['ogImages'][$last][$key] = (int) $content;
                } elseif ($key === 'alt') {
                    $out['ogImages'][$last]['alt'] = forgewp_seo_text($content);
                }
            } elseif (strpos($name, 'og:') === 0) {
                $out['og'][substr($name, 3)] = $content;
            } elseif ($name === 'twitter:image') {
                $out['twitterImages'][] = $content;
            } elseif (strpos($name, 'twitter:') === 0) {
                $out['twitter'][substr($name, 8)] = $content;
            }
        }
        foreach ($xpath->query('//link') as $link) {
            $rel = strtolower((string) $link->getAttribute('rel'));
            if ($rel === 'canonical' && $out['canonical'] === '') {
                $out['canonical'] = (string) $link->getAttribute('href');
            } elseif ($rel === 'alternate' && $link->getAttribute('hreflang') !== '') {
                $out['languages'][(string) $link->getAttribute('hreflang')] = (string) $link->getAttribute('href');
            }
        }
        foreach ($xpath->query('//script[@type="application/ld+json"]') as $script) {
            $decoded = json_decode(trim((string) $script->textContent), true);
            if (is_array($decoded)) {
                $out['jsonLd'][] = $decoded;
            }
        }
        return $out;
    }

    function forgewp_seo_robots($raw) {
        $robots = array('index' => true, 'follow' => true);
        foreach (array_filter(array_map('trim', explode(',', (string) $raw))) as $directive) {
            if ($directive === 'noindex' || $directive === 'none') {
                $robots['index'] = false;
            }
            if ($directive === 'nofollow' || $directive === 'none') {
                $robots['follow'] = false;
            }
            if (strpos($directive, ':') !== false) {
                list($key, $value) = array_map('trim', explode(':', $directive, 2));
                if ($key === 'max-snippet') {
                    $robots['maxSnippet'] = (int) $value;
                } elseif ($key === 'max-image-preview') {
                    $robots['maxImagePreview'] = $value;
                } elseif ($key === 'max-video-preview') {
                    $robots['maxVideoPreview'] = (int) $value;
                }
            }
        }
        return $robots;
    }

    function forgewp_seo_provider() {
        if (defined('WPSEO_VERSION')) {
            return 'yoast';
        }
        // Rank Math counts only when registered (same rule as the theme's SEO-plugin check).
        $rank_math_helper = array('RankMath' . chr(92) . 'Helper', 'is_invalid_registration');
        if (class_exists('RankMath') && !(is_callable($rank_math_helper) && call_user_func($rank_math_helper))) {
            return 'rankmath';
        }
        if (defined('AIOSEO_VERSION') || class_exists('All_in_One_SEO_Pack')) {
            return 'aioseo';
        }
        if (defined('SEOPRESS_VERSION')) {
            return 'seopress';
        }
        return 'core';
    }

    /** Page URLs (not media) move to the frontend origin when FORGEWP_FRONTEND_ORIGIN is set. */
    function forgewp_seo_rewrite_url($url) {
        $url = (string) $url;
        $frontend = function_exists('forgewp_frontend_origins') ? forgewp_frontend_origins() : array();
        if ($url === '' || empty($frontend)) {
            return $url;
        }
        $backend = function_exists('forgewp_origin_of') ? forgewp_origin_of(function_exists('forgewp_raw_home_url') ? forgewp_raw_home_url() : home_url('/')) : '';
        $uploads = wp_get_upload_dir();
        if ($backend === '' || strpos($url, $backend) !== 0 || strpos($url, (string) $uploads['baseurl']) === 0 || strpos($url, '/wp-content/') !== false) {
            return $url;
        }
        // Whole-origin match only: cms.example.com must not match cms.example.com.evil.test.
        $next = substr($url, strlen($backend), 1);
        if ($next !== '' && $next !== false && !in_array($next, array('/', '?', '#'), true)) {
            return $url;
        }
        return rtrim($frontend[0], '/') . substr($url, strlen($backend));
    }

    /**
     * Every page URL in structured data moves to the frontend origin: @id, url,
     * item, and also SearchAction targets, breadcrumbs, sameAs entries, … (any
     * string, including strings inside arrays). forgewp_seo_rewrite_url() leaves
     * other domains and media files untouched.
     */
    function forgewp_seo_rewrite_json_ld($node) {
        if (is_string($node)) {
            return forgewp_seo_rewrite_url($node);
        }
        if (!is_array($node)) {
            return $node;
        }
        foreach ($node as $key => $value) {
            $node[$key] = forgewp_seo_rewrite_json_ld($value);
        }
        return $node;
    }

    function forgewp_seo_object_url($target) {
        switch ($target['type']) {
            case 'front-page':
                return function_exists('pll_home_url') ? pll_home_url() : home_url('/');
            case 'posts-page':
            case 'post':
                return (string) get_permalink($target['id']);
            case 'term':
                $link = get_term_link($target['object']);
                return is_wp_error($link) ? '' : (string) $link;
            case 'post-type-archive':
                return (string) get_post_type_archive_link($target['postType']);
        }
        return '';
    }

    /** Contract §13 payload from parsed head tags, with core fallbacks. */
    function forgewp_seo_build($head, $target, $path, $lang) {
        $post = ($target['object'] instanceof WP_Post) ? $target['object'] : null;
        $protected = $post && post_password_required($post);
        $title = $head['title'] !== '' ? $head['title'] : forgewp_seo_text(wp_get_document_title());
        $description = $head['description'];
        if ($description === '' && !$protected) {
            if ($post && in_array($target['type'], array('post', 'front-page', 'posts-page'), true)) {
                $description = forgewp_seo_text(get_the_excerpt($post));
            }
            if ($description === '' && $target['type'] === 'term') {
                $description = forgewp_seo_text(term_description($target['object']));
            }
            if ($description === '') {
                $description = forgewp_seo_text(get_bloginfo('description'));
            }
        }
        $canonical = $head['canonical'] !== '' ? $head['canonical'] : forgewp_seo_object_url($target);

        $images = $head['ogImages'];
        if (empty($images)) {
            $image_id = $post ? (int) get_post_thumbnail_id($post) : 0;
            if (!$image_id) {
                $image_id = (int) get_theme_mod('custom_logo');
            }
            $src = $image_id ? wp_get_attachment_image_src($image_id, 'full') : false;
            if ($src) {
                $images[] = array('url' => (string) $src[0], 'width' => (int) $src[1], 'height' => (int) $src[2], 'alt' => (string) get_post_meta($image_id, '_wp_attachment_image_alt', true));
            }
        }
        $og = $head['og'];
        $twitter = $head['twitter'];
        $twitter_images = !empty($head['twitterImages']) ? $head['twitterImages'] : array_map(function ($image) { return $image['url']; }, array_slice($images, 0, 1));
        $is_article = $post && $target['type'] === 'post' && $post->post_type === 'post';

        $payload = array(
            'path'        => $path,
            'lang'        => $lang,
            'provider'    => forgewp_seo_provider(),
            'objectType'  => $target['type'],
            'objectId'    => $target['id'] ? (int) $target['id'] : null,
            'title'       => $title,
            'description' => $protected ? '' : $description,
            'canonical'   => forgewp_seo_rewrite_url($canonical),
            'robots'      => forgewp_seo_robots($head['robots']),
            'openGraph'   => array(
                'title'       => forgewp_seo_text($og['title'] ?? $title),
                'description' => $protected ? '' : forgewp_seo_text($og['description'] ?? $description),
                'type'        => (string) ($og['type'] ?? ($is_article ? 'article' : 'website')),
                'url'         => forgewp_seo_rewrite_url((string) ($og['url'] ?? $canonical)),
                'siteName'    => forgewp_seo_text($og['site_name'] ?? get_bloginfo('name')),
                'locale'      => (string) ($og['locale'] ?? get_locale()),
                'images'      => array_values($images),
            ),
            'twitter'     => array(
                'card'        => (string) ($twitter['card'] ?? (!empty($twitter_images) ? 'summary_large_image' : 'summary')),
                'title'       => forgewp_seo_text($twitter['title'] ?? $title),
                'description' => $protected ? '' : forgewp_seo_text($twitter['description'] ?? $description),
                'site'        => (string) ($twitter['site'] ?? ''),
                'creator'     => (string) ($twitter['creator'] ?? ''),
                'images'      => array_values($twitter_images),
            ),
            'alternates'  => array(
                'canonical' => forgewp_seo_rewrite_url($canonical),
                'languages' => (object) array_map('forgewp_seo_rewrite_url', $head['languages']),
            ),
            'jsonLd'      => $protected ? array() : array_values(array_map('forgewp_seo_rewrite_json_ld', $head['jsonLd'])),
        );
        return apply_filters('forgewp_seo_resource', $payload, array('target' => $target, 'path' => $path, 'lang' => $lang));
    }

    // ── Head cache: the last head a logged-out visitor got for a path ────────
    //
    // Every logged-out page view (including our own loopback) stores its head
    // for 10 minutes, so GET /seo usually reads it without calling the site
    // again. That matters on hosts with few PHP workers, where a loopback can
    // wait behind the REST request that started it. Saving content, terms,
    // menus or settings clears every stored head.

    function forgewp_seo_head_cache_key($path) {
        $gen = (int) get_option('forgewp_seo_head_gen', 0);
        return 'forgewp_seo_head_' . md5($gen . '|' . (string) $path);
    }

    function forgewp_seo_head_cache_bump() {
        update_option('forgewp_seo_head_gen', (int) get_option('forgewp_seo_head_gen', 0) + 1, true);
    }
    foreach (array('save_post', 'deleted_post', 'edited_term', 'created_term', 'delete_term', 'wp_update_nav_menu', 'customize_save_after', 'switch_theme') as $forgewp_seo_hook) {
        add_action($forgewp_seo_hook, 'forgewp_seo_head_cache_bump');
    }
    add_action('updated_option', function ($option) {
        // SEO plugins, site title/description and permalinks change the head.
        if ($option !== 'forgewp_seo_head_gen' && preg_match('/^(wpseo|rank[-_]math|aioseo|seopress|blogname|blogdescription|permalink_structure|site_icon)/', (string) $option)) {
            forgewp_seo_head_cache_bump();
        }
    });

    // ── REST ──────────────────────────────────────────────────────────────────

    /**
     * The <head> of one of this site's own pages, fetched like a visitor would
     * (no cookies), or '' on any failure. Only ever called with the resolved
     * object's own permalink, never a caller-supplied URL. Filter
     * 'forgewp_seo_loopback_url' rewrites the address used to reach the site
     * from itself (for example behind a proxy or in a container).
     */
    function forgewp_seo_loopback_head($url) {
        $url = (string) $url;
        $home = wp_parse_url(function_exists('forgewp_raw_home_url') ? forgewp_raw_home_url() : home_url('/'));
        $parsed = wp_parse_url($url);
        if ($url === '' || empty($parsed['host']) || empty($home['host']) || strtolower($parsed['host']) !== strtolower($home['host'])) {
            return '';
        }
        // Remember a failing loopback for a minute instead of waiting on it every
        // time. Short on purpose: on small hosts a timeout often only means the
        // PHP workers were busy.
        if (get_transient('forgewp_seo_loopback_down')) {
            return '';
        }
        $response = wp_remote_get((string) apply_filters('forgewp_seo_loopback_url', $url), array(
            'timeout'     => 5,
            'redirection' => 2,
            'headers'     => array('Accept' => 'text/html'),
            'sslverify'   => (bool) apply_filters('https_local_ssl_verify', false),
        ));
        if (is_wp_error($response)) {
            set_transient('forgewp_seo_loopback_down', 1, MINUTE_IN_SECONDS);
            return '';
        }
        if ((int) wp_remote_retrieve_response_code($response) !== 200) {
            return '';
        }
        $body = (string) wp_remote_retrieve_body($response);
        $start = stripos($body, '<head');
        $end = stripos($body, '</head>');
        if ($start === false || $end === false || $end <= $start) {
            return '';
        }
        $start = strpos($body, '>', $start);
        return $start === false ? '' : substr($body, $start + 1, $end - $start - 1);
    }

    function forgewp_seo_switch_language($lang) {
        if ($lang === '') {
            return;
        }
        if (function_exists('PLL') && is_object(PLL()) && isset(PLL()->model) && method_exists(PLL()->model, 'get_language')) {
            $language = PLL()->model->get_language($lang);
            if ($language) {
                PLL()->curlang = $language;
                if (!empty($language->locale) && function_exists('switch_to_locale')) {
                    switch_to_locale($language->locale);
                }
            }
        } elseif (has_action('wpml_switch_language')) {
            do_action('wpml_switch_language', $lang);
        }
    }

    function forgewp_seo_rest($request) {
        $path = forgewp_seo_norm_path((string) $request->get_param('path'));
        if ($path === null) {
            return new WP_Error('FORGEWP_INVALID_PATH', 'A site-relative path is required.', array('status' => 400));
        }
        $requested_lang = (string) $request->get_param('lang');
        $lang = function_exists('forgewp_resource_lang') ? forgewp_resource_lang($requested_lang !== '' ? $requested_lang : (forgewp_seo_path_lang($path) ?: null)) : '';
        if (is_wp_error($lang)) {
            return $lang;
        }
        $target = forgewp_resolve_path_object($path);
        if ($target === null) {
            return new WP_Error('FORGEWP_SEO_NOT_FOUND', 'No published page at this path.', array('status' => 404));
        }
        forgewp_seo_setup_query($target);
        $cache_key = forgewp_seo_head_cache_key($path);
        $html = (string) get_transient($cache_key);
        // Read the page's real head, as a visitor gets it. A head captured inside
        // this REST request misses whatever plugins and themes prepare on
        // front-end-only hooks: Rank Math skips its title format and JSON-LD under
        // REST, and themes build schema on template_redirect. If the site cannot
        // reach itself, fall back to the in-request capture below.
        if ($html === '' && apply_filters('forgewp_seo_use_loopback', true, $target)) {
            $html = forgewp_seo_loopback_head(forgewp_seo_object_url($target));
        }
        if ($html === '') {
            // Last resort: render the head inside this request, in the page's
            // language (Polylang/WPML do not switch language for REST requests).
            forgewp_seo_switch_language(is_string($lang) ? $lang : '');
            $GLOBALS['forgewp_seo_capturing'] = true;
            ob_start();
            do_action('wp_head');
            $html = (string) apply_filters('forgewp_seo_theme_head', '') . (string) ob_get_clean();
            $GLOBALS['forgewp_seo_capturing'] = false;
        }
        $payload = forgewp_seo_build(forgewp_seo_parse_head($html), $target, $path, $lang);
        wp_reset_postdata();
        $response = new WP_REST_Response($payload, 200);
        $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return $response;
    }

    add_action('rest_api_init', function () {
        register_rest_route('forgewp/v1', '/seo', array(array('methods' => 'GET', 'callback' => 'forgewp_seo_rest', 'permission_callback' => '__return_true')));
    });

    // ── Native: capture this page's own head, print resources.seo in the footer ──

    function forgewp_seo_native_enabled() {
        return !is_admin() && !is_feed() && !wp_doing_ajax() && !(defined('REST_REQUEST') && REST_REQUEST) && empty($GLOBALS['forgewp_seo_capturing']);
    }

    // Capture this page's own head output. Start first, end last. If another
    // plugin or the theme still has its own output buffer open when wp_head
    // ends (hotelchecker24's og-fallback closes at PHP_INT_MAX too), leave ours
    // open and finish at the start of wp_footer, keeping only what precedes
    // </head>. Never close someone else's buffer.
    add_action('wp_head', function () {
        if (forgewp_seo_native_enabled()) {
            ob_start();
            $GLOBALS['forgewp_seo_head_level'] = ob_get_level();
            $GLOBALS['forgewp_seo_head_pending'] = false;
        }
    }, -99999);

    function forgewp_seo_finish_head_capture($cut_at_head_end) {
        $level = (int) ($GLOBALS['forgewp_seo_head_level'] ?? 0);
        if ($level === 0 || ob_get_level() !== $level) {
            return false;
        }
        $html = (string) ob_get_contents();
        ob_end_flush();
        if ($cut_at_head_end) {
            $end = stripos($html, '</head>');
            $html = $end === false ? $html : substr($html, 0, $end);
        }
        $GLOBALS['forgewp_seo_head_html'] = $html;
        $GLOBALS['forgewp_seo_head_level'] = 0;
        $GLOBALS['forgewp_seo_head_pending'] = false;
        return true;
    }

    add_action('wp_head', function () {
        if (!empty($GLOBALS['forgewp_seo_head_level']) && !forgewp_seo_finish_head_capture(false)) {
            $GLOBALS['forgewp_seo_head_pending'] = true;
        }
    }, PHP_INT_MAX);

    add_action('wp_footer', function () {
        if (!empty($GLOBALS['forgewp_seo_head_pending'])) {
            forgewp_seo_finish_head_capture(true);
        }
    }, -99999);

    add_action('wp_footer', function () {
        if (!forgewp_seo_native_enabled() || !isset($GLOBALS['forgewp_seo_head_html'])) {
            return;
        }
        $target = forgewp_seo_current_target();
        if ($target === null) {
            return;
        }
        $uri = isset($_SERVER['REQUEST_URI']) ? (string) wp_parse_url(wp_unslash($_SERVER['REQUEST_URI']), PHP_URL_PATH) : '/';
        $path = forgewp_seo_norm_path(forgewp_seo_url_path(home_url($uri))) ?: '/';
        $lang = function_exists('forgewp_resource_lang') ? forgewp_resource_lang(null) : '';
        $head = (string) apply_filters('forgewp_seo_theme_head', '') . (string) $GLOBALS['forgewp_seo_head_html'];
        $lang = is_wp_error($lang) ? '' : $lang;
        if (!is_user_logged_in() && empty($_GET) && !is_404()) {
            set_transient(forgewp_seo_head_cache_key($path), $head, 10 * MINUTE_IN_SECONDS);
        }
        $payload = forgewp_seo_build(forgewp_seo_parse_head($head), $target, $path, $lang);
        echo '<script>(function(h){h.resources=h.resources||{};h.resources.seo=' . wp_json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';})(window.forgeWpHydration=window.forgeWpHydration||{});</script>' . "\n";
    }, 100);
}
`;
}
