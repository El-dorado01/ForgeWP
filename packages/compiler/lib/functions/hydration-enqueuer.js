import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function buildHydrationEnqueuerPhp(config, assets, mainJs, uniqueMetaKeys, uniqueRichTextKeys, repeaterFieldsPhp, manifestPairs, optionsPairs, themeModsPairs, page_links_php, fontsEnqueue, i18nKeysPhp, headlessScript, currentUserHydrationField, defaultLoginField) {
  const css = assets.cssFile.replace(/^assets\//, '');

  // Only forms need restUrl/restNonce/forms in the hydration payload — kept
  // out entirely for themes without a `forms` config so their generated
  // output stays byte-identical.
  const hasForms = config.forms && Object.keys(config.forms).length > 0;
  const formsHydrationFields = hasForms
    ? `
                'restUrl' => esc_url_raw( rest_url( 'forgewp/v1' ) ),
                'restNonce' => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
                'forms' => forgewp_forms_hydration_payload(),`
    : '';

  let hydrationEnqueue = '';
  if (mainJs) {
    hydrationEnqueue = `
    // Enqueue React runtime entrypoint and dynamic Selective Hydration assets
    $js_path = get_template_directory() . '/assets/${mainJs}';
    if (file_exists($js_path)) {
        wp_enqueue_script(
            '${config.textDomain}-react-runtime',
            $theme_uri . '/assets/${mainJs}',
            array(),
            FORGEWP_THEME_VERSION,
            true
        );
${headlessScript}

        $menu_locations = get_nav_menu_locations();
        $hydrated_menus = array();
        $registered_nav_menus = get_registered_nav_menus();
        $registered_locations = is_array($registered_nav_menus) ? array_keys($registered_nav_menus) : array();
        $current_lang = '';
        if (function_exists('pll_current_language')) {
            $current_lang = pll_current_language();
        } elseif (defined('ICL_LANGUAGE_CODE')) {
            $current_lang = ICL_LANGUAGE_CODE;
        }
        if (empty($current_lang)) {
            if (function_exists('pll_default_language')) {
                $current_lang = pll_default_language();
            } else {
                $current_lang = get_locale();
                if (strpos($current_lang, '_') !== false) {
                    $parts = explode('_', $current_lang);
                    $current_lang = $parts[0];
                }
            }
        }
        foreach ($registered_locations as $loc) {
            $base_loc = $loc;
            if (strpos($loc, '___') !== false) {
                $parts = explode('___', $loc);
                $base_loc = $parts[0];
            }
            
            $menu_id = forgewp_get_menu_id_for_lang($base_loc, $current_lang);
            $raw_items = $menu_id ? wp_get_nav_menu_items($menu_id) : array();
            $menu_items = is_array($raw_items) ? $raw_items : array();
            $items_list = array();
            foreach ($menu_items as $item) {
                $items_list[] = array(
                    'title' => $item->title,
                    'url' => $item->url
                );
            }
            $hydrated_menus[$base_loc] = $items_list;
            if (!empty($current_lang)) {
                $hydrated_menus[$base_loc . '___' . $current_lang] = $items_list;
            }
        }

        $page_links = array();
${page_links_php}

        // Inject hydration manifest mappings dynamically
        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'window.forgeWpHydration = Object.assign(window.forgeWpHydration || {}, ' . wp_json_encode(array(
                'themeUri' => $theme_uri,
                'menus' => $hydrated_menus,
                'pageLinks' => $page_links,
                'loginField' => get_option( 'forgewp_auth_login_field', '${defaultLoginField}' ),${currentUserHydrationField}${formsHydrationFields}
                'manifest' => array(
${manifestPairs}
                ),
                'siteSettings' => array(
                    'options' => array(
${optionsPairs}
                    ),
                    'theme_mods' => array(
${themeModsPairs}
                    ),
                ),
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ');',
            'before'
        );

        // Enqueue Micro-Hydrator orchestrator script
        wp_enqueue_script(
            '${config.textDomain}-hydrator',
            $theme_uri . '/assets/forgewp-hydrator.js',
            array('${config.textDomain}-react-runtime'),
            FORGEWP_THEME_VERSION,
            true
        );

        // Integrate dynamic translation dictionary and Polylang / WPML multi-language data
        $i18n_keys = array(
${i18nKeysPhp}
        );
        if (function_exists('pll_register_string')) {
            foreach ($i18n_keys as $key) {
                pll_register_string($key, $key, '${config.textDomain}');
            }
        }
        $current_lang = '';
        if (function_exists('pll_current_language')) {
            $current_lang = pll_current_language();
        }
        if (empty($current_lang)) {
            $current_lang = get_locale();
        }

        $json_dict = array();
        $translations_file = get_template_directory() . '/translations.json';
        if (file_exists($translations_file)) {
            $json_data = json_decode(file_get_contents($translations_file), true);
            if (is_array($json_data) && isset($json_data[$current_lang])) {
                $json_dict = $json_data[$current_lang];
            }
        }

        $translated_dict = array();
        if (is_array($json_dict)) {
            $translated_dict = $json_dict;
        }
        foreach ($i18n_keys as $key) {
            if (!isset($translated_dict[$key])) {
                $translated_dict[$key] = function_exists('pll__') ? pll__($key) : __($key, '${config.textDomain}');
            }
        }

        $translations = array();
        $home_urls = array();
        if (function_exists('pll_the_languages')) {
            $langs = pll_the_languages(array('raw' => 1));
            if (is_array($langs)) {
                foreach ($langs as $l) {
                    $translations[$l['slug']] = $l['url'];
                    if (function_exists('pll_home_url')) {
                        $home_urls[$l['slug']] = pll_home_url($l['slug']);
                    }
                }
            }
        }
        if (empty($home_urls)) {
            $home_urls[$current_lang] = home_url('/');
        }

        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'window.forgeWpTranslations = ' . wp_json_encode(array(
                'currentLanguage' => $current_lang,
                'urls' => $translations,
                'homeUrls' => $home_urls,
                'translations' => $translated_dict
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';',
            'before'
        );

        // Static key lists — compile-time-known, independent of whether the
        // current request actually resolves to a post (a 404 or archive page
        // has no $post_id, but $front_page_id below is looked up regardless,
        // so these must never be scoped inside the "$post_id > 0" branch —
        // that previously left them undefined whenever the visited URL had
        // no singular post, throwing "Undefined variable" + "foreach() on
        // null" the moment page_on_front's own hydration ran).
        $registered_keys = array(${Array.from(uniqueMetaKeys).map(k => `'${k}'`).join(', ')});
        $rich_text_keys = array(${uniqueRichTextKeys.map(k => `'${k}'`).join(', ')});
        $repeater_fields_map = array(
${repeaterFieldsPhp}
        );

        $post_custom_fields = array();
        $post_id = get_the_ID();
        if ($post_id > 0) {
            foreach ($registered_keys as $key) {
                if (array_key_exists($key, $repeater_fields_map)) {
                    $val = forgewp_get_repeater_field($key, $repeater_fields_map[$key], $post_id);
                    // Omit empty so useWpMeta falls back to schema defaults
                    if (is_array($val) && count($val) === 0) {
                        continue;
                    }
                    $post_custom_fields[$key] = $val;
                } else {
                    $val = null;
                    if (function_exists('get_field')) {
                        $val = get_field($key, $post_id);
                    }
                    if ($val === null || $val === false) {
                        $val = get_post_meta($post_id, $key, true);
                        if (is_string($val) && (strpos($val, '[') === 0 || strpos($val, '{') === 0)) {
                            $decoded = json_decode($val, true);
                            if (json_last_error() === JSON_ERROR_NONE) {
                                $val = $decoded;
                            }
                        }
                    }
                    // Match forgewp_get_meta_value: empty → omit (JS uses schema defaults)
                    if ($val === null || $val === false || $val === '' || (is_array($val) && count($val) === 0)) {
                        continue;
                    }
                    if (in_array($key, $rich_text_keys) && is_string($val)) {
                        $val = wpautop($val);
                    }
                    $post_custom_fields[$key] = $val;
                }
            }
        }

        $extra_posts_hydration = array();
        $front_page_id = get_option('page_on_front');
        if ($front_page_id > 0 && $front_page_id != $post_id) {
            $front_custom_fields = array();
            foreach ($registered_keys as $key) {
                if (array_key_exists($key, $repeater_fields_map)) {
                    $val = forgewp_get_repeater_field($key, $repeater_fields_map[$key], $front_page_id);
                    if (is_array($val) && count($val) === 0) {
                        continue;
                    }
                    $front_custom_fields[$key] = $val;
                } else {
                    $val = null;
                    if (function_exists('get_field')) {
                        $val = get_field($key, $front_page_id);
                    }
                    if ($val === null || $val === false) {
                        $val = get_post_meta($front_page_id, $key, true);
                        if (is_string($val) && (strpos($val, '[') === 0 || strpos($val, '{') === 0)) {
                            $decoded = json_decode($val, true);
                            if (json_last_error() === JSON_ERROR_NONE) {
                                $val = $decoded;
                            }
                        }
                    }
                    if ($val === null || $val === false || $val === '' || (is_array($val) && count($val) === 0)) {
                        continue;
                    }
                    if (in_array($key, $rich_text_keys) && is_string($val)) {
                        $val = wpautop($val);
                    }
                    $front_custom_fields[$key] = $val;
                }
            }
            $extra_posts_hydration[$front_page_id] = array(
                'id' => $front_page_id,
                'customFields' => $front_custom_fields
            );
        }

        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'if (!window.forgeWpHydration) { window.forgeWpHydration = {}; } ' .
            'window.forgeWpHydration.post = ' . wp_json_encode(array(
                'id' => $post_id,
                // Cast so empty maps encode as {} not [] (JSON)
                'customFields' => (object)$post_custom_fields
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';' .
            'window.forgeWpHydration.posts = ' . wp_json_encode((object)$extra_posts_hydration, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';',
            'before'
        );
    }

    if (!function_exists('${config.textDomain.replace(/-/g, '_')}_script_loader_tag')) {
        function ${config.textDomain.replace(/-/g, '_')}_script_loader_tag($tag, $handle, $src) {
            if (in_array($handle, array('${config.textDomain}-react-runtime', '${config.textDomain}-hydrator'), true)) {
                $tag = preg_replace_callback('/(<script\\b[^>]*src=[^>]*>)/i', function($matches) {
                    $script_open = $matches[1];
                    $script_open = preg_replace('/\\stype\\s*=\\s*([\\\'"])[^\\\'"]*\\1/i', '', $script_open);
                    $script_open = preg_replace('/<script\\b/i', '<script type="module"', $script_open);
                    return $script_open;
                }, $tag, 1);
            }
            return $tag;
        }
        add_filter('script_loader_tag', '${config.textDomain.replace(/-/g, '_')}_script_loader_tag', 10, 3);
    }
    `;
  }

  const mainAssetEnqueuer = `
/**
 * Enqueue compiled theme assets.
 */
function forgewp_enqueue_assets(): void {
    $theme_uri = get_template_directory_uri();
    $css_path = get_template_directory() . '/assets/${css}';
${fontsEnqueue}

    if (file_exists($css_path)) {
        wp_enqueue_style(
            '${config.textDomain}-app',
            $theme_uri . '/assets/${css}',
            array(),
            FORGEWP_THEME_VERSION
        );
    }
${hydrationEnqueue}
}
add_action('enqueue_block_assets', 'forgewp_enqueue_assets');
`;

  return mainAssetEnqueuer;
}
