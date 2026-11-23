/**
 * Phase C resources: `menus`, `routes`, `i18n` (docs/resource-contracts.md
 * §5–§7 with Claude's approved amendments).
 *
 * Each resource has one PHP builder used by both its REST route and the
 * native forgeWpHydration.resources payload. Everything ships in the
 * Companion backend: declared menu locations and the translation dictionary
 * are embedded at export time, so the resources work unchanged when only the
 * Companion Plugin is active under another theme.
 */
import { loadTranslationsData } from './load-translations.js';

const b64 = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

/**
 * @param {object} config wp.config
 * @param {string} themeRoot
 * @param {string[]} declaredMenuLocations menu locations from cms/menus
 * @param {string[]} i18nKeys translation keys used in templates
 */
export function buildPhaseCResourcesPhp(config, themeRoot, declaredMenuLocations = [], i18nKeys = []) {
  const i18n = config.i18n && Array.isArray(config.i18n.locales) && config.i18n.locales.length > 0
    ? {
        locales: config.i18n.locales.map((l) => String(l).toLowerCase()),
        defaultLocale: String(config.i18n.defaultLocale || config.i18n.locales[0]).toLowerCase(),
        pathPrefix: config.i18n.provider === 'local',
      }
    : null;
  let dictionary = {};
  try {
    dictionary = themeRoot ? loadTranslationsData(themeRoot) || {} : {};
  } catch {
    dictionary = {};
  }
  const locations = Array.from(new Set(declaredMenuLocations.filter((l) => /^[A-Za-z0-9_-]+$/.test(l))));

  return `
/**
 * ── Phase C resources: menus, routes, i18n (docs/resource-contracts.md §5–§7) ──
 */
if (!function_exists('forgewp_resource_path')) {
    /** Unfiltered WordPress home URL with trailing slash (ignores Polylang's per-language home_url filter). */
    function forgewp_raw_home_url() {
        $raw_home = function_exists('get_option') ? get_option('home') : '';
        if (is_string($raw_home) && $raw_home !== '') {
            return rtrim($raw_home, '/') . '/';
        }
        return home_url('/');
    }

    /** Site-relative path for a URL on this site; external URLs are returned unchanged. */
    function forgewp_resource_path($url, &$external = null) {
        $url = (string) $url;
        $home = wp_parse_url(forgewp_raw_home_url());
        $parsed = wp_parse_url($url);
        $external = isset($parsed['host'], $home['host']) && strtolower($parsed['host']) !== strtolower($home['host']);
        if ($external) {
            return $url;
        }
        $base = isset($home['path']) ? rtrim($home['path'], '/') : '';
        $path = isset($parsed['path']) && $parsed['path'] !== '' ? $parsed['path'] : '/';
        if ($base !== '' && ($path === $base || strpos($path, $base . '/') === 0)) {
            $path = substr($path, strlen($base));
            $path = $path === '' ? '/' : $path;
        }
        return $path;
    }

    function forgewp_i18n_config() {
        return json_decode(base64_decode('${b64(i18n)}'), true);
    }

    /** Supported locale codes: configured, else Polylang/WPML, else the site locale. */
    function forgewp_i18n_locales() {
        $config = forgewp_i18n_config();
        if (is_array($config) && !empty($config['locales'])) {
            return $config['locales'];
        }
        if (function_exists('pll_languages_list')) {
            $list = pll_languages_list(array('fields' => 'slug'));
            if (is_array($list) && !empty($list)) {
                return array_values($list);
            }
        }
        if (function_exists('icl_get_languages')) {
            $list = icl_get_languages('skip_missing=0');
            if (is_array($list) && !empty($list)) {
                return array_values(array_keys($list));
            }
        }
        return array(strtolower(substr((string) get_locale(), 0, 2)));
    }

    function forgewp_i18n_default_locale() {
        $config = forgewp_i18n_config();
        if (is_array($config) && !empty($config['defaultLocale'])) {
            return $config['defaultLocale'];
        }
        if (function_exists('pll_default_language')) {
            $default = pll_default_language('slug');
            if (is_string($default) && $default !== '') {
                return $default;
            }
        }
        $locales = forgewp_i18n_locales();
        return $locales[0];
    }

    function forgewp_i18n_is_multilingual() {
        return count(forgewp_i18n_locales()) > 1;
    }

    /**
     * Resolves ?lang= (amendment 3): an explicit unknown code on a
     * multilingual site is a 404; single-language sites ignore it.
     */
    function forgewp_resource_lang($requested = null) {
        $requested = is_string($requested) ? strtolower(sanitize_key($requested)) : '';
        $locales = forgewp_i18n_locales();
        if ($requested !== '') {
            if (in_array($requested, $locales, true)) {
                return $requested;
            }
            if (count($locales) > 1) {
                return new WP_Error('FORGEWP_LOCALE_NOT_FOUND', 'Unknown language code.', array('status' => 404));
            }
        }
        $current = '';
        if (function_exists('pll_current_language')) {
            $current = (string) pll_current_language('slug');
        } elseif (defined('ICL_LANGUAGE_CODE')) {
            $current = (string) ICL_LANGUAGE_CODE;
        }
${config.forms && Object.keys(config.forms).length > 0 ? `        if ($current === '' && function_exists('forgewp_forms_resolve_lang')) {
            $resolved = forgewp_forms_resolve_lang(null);
            $current = is_string($resolved) && $resolved !== 'default' ? $resolved : '';
        }
` : ''}        $current = strtolower($current);
        return in_array($current, $locales, true) ? $current : forgewp_i18n_default_locale();
    }

    // ── menus (§5) ────────────────────────────────────────────────────────
    /** Declared (cms/menus) ∪ registered by the active theme ∪ assigned in theme state (amendment 2). */
    function forgewp_menu_location_keys() {
        $keys = json_decode(base64_decode('${b64(locations)}'), true);
        $keys = is_array($keys) ? $keys : array();
        $registered = get_registered_nav_menus();
        if (is_array($registered)) {
            $keys = array_merge($keys, array_keys($registered));
        }
        $assigned = get_nav_menu_locations();
        if (is_array($assigned)) {
            foreach (array_keys($assigned) as $key) {
                if (strpos((string) $key, '___') === false) {
                    $keys[] = (string) $key;
                }
            }
        }
        return array_values(array_unique(array_filter($keys, 'strlen')));
    }

    function forgewp_menu_items($location, $lang) {
        $menu_id = function_exists('forgewp_get_menu_id_for_lang') ? forgewp_get_menu_id_for_lang($location, $lang) : null;
        if (!$menu_id) {
            $locations = get_nav_menu_locations();
            $menu_id = isset($locations[$location]) ? (int) $locations[$location] : 0;
        }
        $raw_items = $menu_id ? wp_get_nav_menu_items($menu_id) : array();
        if (!is_array($raw_items)) {
            return array();
        }
        $by_id = array();
        foreach ($raw_items as $item) {
            $external = false;
            $path = forgewp_resource_path((string) $item->url, $external);
            $by_id[(int) $item->ID] = array(
                'id'          => (int) $item->ID,
                'parentId'    => (int) $item->menu_item_parent,
                'title'       => html_entity_decode(wp_strip_all_tags((string) $item->title), ENT_QUOTES, 'UTF-8'),
                'url'         => (string) $item->url,
                'path'        => $path,
                'external'    => (bool) $external,
                'target'      => !empty($item->target) ? (string) $item->target : '',
                'classes'     => is_array($item->classes) ? array_values(array_filter($item->classes)) : array(),
                'description' => isset($item->description) ? (string) $item->description : '',
                'attrTitle'   => isset($item->attr_title) ? (string) $item->attr_title : '',
                'children'    => array(),
            );
        }
        $tree = array();
        foreach ($by_id as $id => &$node) {
            $parent_id = $node['parentId'];
            unset($node['parentId']);
            if ($parent_id > 0 && isset($by_id[$parent_id])) {
                $by_id[$parent_id]['children'][] = &$node;
            } else {
                $tree[] = &$node;
            }
        }
        unset($node);
        return $tree;
    }

    function forgewp_menu_resource($location, $lang) {
        return array('location' => (string) $location, 'lang' => $lang, 'items' => forgewp_menu_items($location, $lang));
    }

    function forgewp_menus_resource($lang) {
        $menus = array();
        foreach (forgewp_menu_location_keys() as $location) {
            $menus[$location] = forgewp_menu_items($location, $lang);
        }
        return array('lang' => $lang, 'menus' => (object) $menus);
    }

    // ── routes (§6) ───────────────────────────────────────────────────────
    function forgewp_routes_resource($lang) {
        $home_url = forgewp_raw_home_url();
        $parsed_home = wp_parse_url($home_url);
        $base_path = isset($parsed_home['path']) ? rtrim($parsed_home['path'], '/') : '';
        $pages = get_posts(array(
            'post_type'      => 'page',
            'post_status'    => 'publish',
            'posts_per_page' => 200,
            'meta_key'       => 'forgewp_route_id',
            'orderby'        => 'menu_order title',
            'order'          => 'ASC',
            'lang'           => function_exists('pll_current_language') ? $lang : '',
        ));
        $routes = array();
        $page_links = array();
        foreach ($pages as $page) {
            if (!empty($page->post_password)) {
                continue;
            }
            $route_id = (string) get_post_meta($page->ID, 'forgewp_route_id', true);
            if ($route_id === '') {
                continue;
            }
            $permalink = get_permalink($page->ID);
            $path = forgewp_resource_path($permalink);
            $routes[] = array(
                'routeId'   => $route_id,
                'id'        => (int) $page->ID,
                'slug'      => (string) $page->post_name,
                'title'     => html_entity_decode(wp_strip_all_tags(get_the_title($page->ID)), ENT_QUOTES, 'UTF-8'),
                'path'      => $path,
                'permalink' => $permalink,
            );
            if (!isset($page_links[$route_id])) {
                $page_links[$route_id] = $path;
            }
        }
        return array(
            'homeUrl'   => rtrim($home_url, '/'),
            'basePath'  => $base_path,
            'lang'      => $lang,
            'routes'    => $routes,
            'pageLinks' => (object) $page_links,
        );
    }

    // ── i18n (§7) ─────────────────────────────────────────────────────────
    function forgewp_i18n_dictionary() {
        static $dictionary = null;
        if ($dictionary === null) {
            $dictionary = json_decode(base64_decode('${b64(dictionary)}'), true);
            $dictionary = is_array($dictionary) ? $dictionary : array();
        }
        return $dictionary;
    }

    function forgewp_i18n_resource($lang, $path = '') {
        $locales = forgewp_i18n_locales();
        $default = forgewp_i18n_default_locale();
        $dictionary = forgewp_i18n_dictionary();
        $translations = isset($dictionary[$lang]) && is_array($dictionary[$lang]) ? $dictionary[$lang] : array();
        $keys = json_decode(base64_decode('${b64(Array.from(new Set(i18nKeys)))}'), true);
        foreach ((is_array($keys) ? $keys : array()) as $key) {
            if (isset($translations[$key])) {
                continue;
            }
            if (function_exists('pll_translate_string')) {
                $translations[$key] = pll_translate_string($key, $lang);
            } else {
                $translations[$key] = $key;
            }
        }

        $urls = array();
        $home_urls = array();
        if (count($locales) > 1) {
            $config = forgewp_i18n_config();
            $path = '/' . ltrim((string) $path, '/');
            if (function_exists('pll_home_url')) {
                foreach ($locales as $code) {
                    $home_urls[$code] = forgewp_resource_path(pll_home_url($code));
                }
                $post_id = $path !== '/' ? url_to_postid(home_url($path)) : (int) get_option('page_on_front');
                if ($post_id && function_exists('pll_get_post_translations')) {
                    foreach (pll_get_post_translations($post_id) as $code => $translated_id) {
                        $urls[$code] = forgewp_resource_path(get_permalink($translated_id));
                    }
                }
            } elseif (is_array($config) && !empty($config['pathPrefix'])) {
                $segments = explode('/', trim($path, '/'));
                if (!empty($segments[0]) && in_array($segments[0], $locales, true)) {
                    array_shift($segments);
                }
                $rest = implode('/', array_filter($segments, 'strlen'));
                foreach ($locales as $code) {
                    $prefix = $code === $default ? '' : '/' . $code;
                    $home_urls[$code] = $prefix . '/';
                    $urls[$code] = $prefix . '/' . ($rest !== '' ? $rest . '/' : '');
                }
            }
        }

        return array(
            'currentLanguage' => $lang,
            'defaultLocale'   => $default,
            'locales'         => array_values($locales),
            'translations'    => (object) $translations,
            'urls'            => (object) $urls,
            'homeUrls'        => (object) $home_urls,
        );
    }

    // ── REST routes ───────────────────────────────────────────────────────
    function forgewp_phase_c_response($data, $tags) {
        if (is_wp_error($data)) {
            return $data;
        }
        $response = rest_ensure_response($data);
        $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        $response->header('X-ForgeWP-Cache-Tags', $tags);
        return $response;
    }

    add_action('rest_api_init', function () {
        register_rest_route('forgewp/v1', '/menus', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $lang = forgewp_resource_lang($request->get_param('lang'));
                return forgewp_phase_c_response(is_wp_error($lang) ? $lang : forgewp_menus_resource($lang), 'menus');
            },
        ));
        // Overrides the earlier bridge route of the same path (same shape plus lang, description, attrTitle, external).
        register_rest_route('forgewp/v1', '/menus/(?P<location>[a-zA-Z0-9_-]+)', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $location = sanitize_key((string) $request['location']);
                $lang = forgewp_resource_lang($request->get_param('lang'));
                return forgewp_phase_c_response(is_wp_error($lang) ? $lang : forgewp_menu_resource($location, $lang), 'menus,menu:' . $location);
            },
        ), true);
        register_rest_route('forgewp/v1', '/routes', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $lang = forgewp_resource_lang($request->get_param('lang'));
                return forgewp_phase_c_response(is_wp_error($lang) ? $lang : forgewp_routes_resource($lang), 'routes');
            },
        ), true);
        register_rest_route('forgewp/v1', '/i18n', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $lang = forgewp_resource_lang($request->get_param('lang'));
                if (is_wp_error($lang)) {
                    return $lang;
                }
                $path = (string) $request->get_param('path');
                return forgewp_phase_c_response(forgewp_i18n_resource($lang, $path), 'i18n,i18n:' . $lang);
            },
        ));
    }, 20);
}
`;
}
