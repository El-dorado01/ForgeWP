import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function buildHydrationEnqueuerPhp(config, assets, mainJs, uniqueMetaKeys, uniqueRichTextKeys, repeaterFieldsPhp, manifestPairs, optionsPairs, themeModsPairs, page_links_php, fontsEnqueue, i18nKeysPhp, headlessScript, currentUserHydrationField, defaultLoginField, providersPhp = '') {
  const css = assets.cssFile.replace(/\\/g, '/');

  // Only forms need restUrl/restNonce in the hydration payload — kept
  // out entirely for themes without a `forms` config so their generated
  // output stays byte-identical. Form schemas live under `resources.forms`.
  const hasForms = config.forms && Object.keys(config.forms).length > 0;
  const formsHydrationFields = hasForms
    ? `
                'restUrl' => esc_url_raw( rest_url( 'forgewp/v1' ) ),
                'restNonce' => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',`
    : '';
  const phpStringLiteral = (value) =>
    `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const usesLocalFormsProvider =
    hasForms && config.i18n?.provider === 'local';
  const localLanguageFallbackPhp =
    usesLocalFormsProvider
      ? `
            $forgewp_locales = array(${(config.i18n.locales || []).map(phpStringLiteral).join(', ')});
            $forgewp_request_path = isset($_SERVER['REQUEST_URI']) ? parse_url(wp_unslash($_SERVER['REQUEST_URI']), PHP_URL_PATH) : '';
            $forgewp_home_path = rtrim((string) parse_url(home_url('/'), PHP_URL_PATH), '/');
            if ($forgewp_home_path !== '' && strpos($forgewp_request_path, $forgewp_home_path . '/') === 0) {
                $forgewp_request_path = substr($forgewp_request_path, strlen($forgewp_home_path));
            }
            $forgewp_path_segments = explode('/', trim((string) $forgewp_request_path, '/'));
            $forgewp_path_locale = sanitize_key(reset($forgewp_path_segments));
            if (in_array($forgewp_path_locale, $forgewp_locales, true)) {
                $current_lang = $forgewp_path_locale;
            } else {
                $current_lang = ${phpStringLiteral(config.i18n.defaultLocale || config.i18n.locales?.[0] || 'en')};
            }`
      : `
            $current_lang = get_locale();
            if (strpos($current_lang, '_') !== false) {
                $parts = explode('_', $current_lang);
                $current_lang = $parts[0];
            }`;
  const currentLanguageSetupPhp = hasForms
    ? `        if (function_exists('pll_current_language')) {
            $current_lang = pll_current_language();
        }
        if (empty($current_lang) && defined('ICL_LANGUAGE_CODE')) {
            $current_lang = ICL_LANGUAGE_CODE;
        }`
    : `        if (function_exists('pll_current_language')) {
            $current_lang = pll_current_language();
        } elseif (defined('ICL_LANGUAGE_CODE')) {
            $current_lang = ICL_LANGUAGE_CODE;
        }`;

  let hydrationEnqueue = '';
  if (mainJs) {
    hydrationEnqueue = `
    // Enqueue React runtime entrypoint and dynamic Selective Hydration assets
    $js_path = get_template_directory() . '/${mainJs}';
    if (file_exists($js_path)) {
        wp_enqueue_script(
            '${config.textDomain}-react-runtime',
            $theme_uri . '/${mainJs}',
            array(),
            filemtime($js_path),
            true
        );
${headlessScript}

        $current_lang = '';
${currentLanguageSetupPhp}
        if (empty($current_lang)) {
            if (function_exists('pll_default_language') && pll_default_language()) {
                $current_lang = pll_default_language();
            } else {
${localLanguageFallbackPhp}
            }
        }
        // Inject hydration manifest mappings dynamically
        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'window.forgeWpHydration = Object.assign(window.forgeWpHydration || {}, ' . wp_json_encode(array(
                'themeUri' => $theme_uri,
                'loginField' => get_option( 'forgewp_auth_login_field', '${defaultLoginField}' ),${currentUserHydrationField}${formsHydrationFields}
                'manifest' => array(
${manifestPairs}
                ),${providersPhp}
                'resources' => array(
                    'site-settings' => function_exists('forgewp_site_settings_resource') ? forgewp_site_settings_resource() : null,
                    'menus' => function_exists('forgewp_menus_resource') ? forgewp_menus_resource(forgewp_resource_lang(null)) : null,
                    'routes' => function_exists('forgewp_routes_resource') ? forgewp_routes_resource(forgewp_resource_lang(null)) : null,
                    'i18n' => function_exists('forgewp_i18n_resource') ? forgewp_i18n_resource(forgewp_resource_lang(null), forgewp_resource_path(home_url(isset($_SERVER['REQUEST_URI']) ? (string) wp_parse_url(wp_unslash($_SERVER['REQUEST_URI']), PHP_URL_PATH) : '/'))) : null,${hasForms ? `
                    'forms' => function_exists('forgewp_forms_resource') ? forgewp_forms_resource($current_lang) : null,` : ''}
                ),
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ');',
            'before'
        );

        // Enqueue Micro-Hydrator orchestrator script
        $hydrator_path = get_template_directory() . '/assets/forgewp-hydrator.js';
        wp_enqueue_script(
            '${config.textDomain}-hydrator',
            $theme_uri . '/assets/forgewp-hydrator.js',
            array('${config.textDomain}-react-runtime'),
            file_exists($hydrator_path) ? filemtime($hydrator_path) : FORGEWP_THEME_VERSION,
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
${hasForms ? `        $current_lang = forgewp_forms_resolve_lang($current_lang);\n` : `        $current_lang = '';
        if (function_exists('pll_current_language')) {
            $current_lang = pll_current_language();
        }
        if (empty($current_lang)) {
            $current_lang = get_locale();
        }
`}

        // Translations are served by resources.i18n (docs/resource-contracts.md §7).

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
        // forgewp_resolve_front_page_id() — not the raw page_on_front option
        // — so this hydrates the CURRENT-language homepage's own fields (a
        // Polylang site has a separate post per language), not whichever
        // post happens to be the raw, non-language-aware option value.
        $front_page_id = forgewp_resolve_front_page_id();
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
    $css_path = get_template_directory() . '/${css}';
${fontsEnqueue}

    if (file_exists($css_path)) {
        wp_enqueue_style(
            '${config.textDomain}-app',
            $theme_uri . '/${css}',
            array(),
            filemtime($css_path)
        );
    }

    // enqueue_block_assets also fires inside the block editor (wp-admin and its
    // canvas iframe). The theme CSS above belongs there; the front-end island
    // runtime and hydrator do not — the Next.js runtime assigns window.React
    // (React 19), replacing the React that WordPress core's editor runs on and
    // crashing it (React error #525, blank editor).
    if (is_admin()) {
        return;
    }
${hydrationEnqueue}
}
add_action('enqueue_block_assets', 'forgewp_enqueue_assets');
`;

  return mainAssetEnqueuer;
}
