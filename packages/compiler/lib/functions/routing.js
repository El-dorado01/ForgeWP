import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildPhpIconSvgMapLiteral } from '../icon-registry.js';

export function buildRoutingPhp(config, pagesPhpArray, schemaDefaultsPhp, menuItemsPhpArray, socialSettingsPhp, postTypes) {
  const iconSvgMapPhp = buildPhpIconSvgMapLiteral();
  const autoCreationPhp = `
/**
 * Automatically create routes defined in menus.json and assign custom page templates upon theme activation.
 */
function forgewp_auto_create_pages_and_menus(): void {
    $activated_option = '${config.textDomain}_activated_' . str_replace('.', '_', FORGEWP_THEME_VERSION);
    $has_run = get_option($activated_option) === 'yes';

    $schema_defaults = array(
${schemaDefaultsPhp}
    );

    $pages = array(
${pagesPhpArray}
    );

    foreach ($pages as $p) {
        $slug_path = trim($p['slug'], '/');
        $parent_id = 0;
        $post_name = $slug_path;
        if (strpos($slug_path, '/') !== false) {
            $parts = explode('/', $slug_path);
            $post_name = array_pop($parts);
            $parent_path = implode('/', $parts);
            $parent_page = get_page_by_path($parent_path);
            if ($parent_page) {
                $parent_id = $parent_page->ID;
            }
        }

        $existing_page = get_page_by_path($slug_path);
        $page_id = 0;
        if (!$existing_page) {
            $page_args = array(
                'post_title'    => $p['title'],
                'post_name'     => $post_name,
                'post_parent'   => $parent_id,
                'post_status'   => 'publish',
                'post_type'     => 'page',
            );
            if (!empty($p['description'])) {
                $page_args['post_content'] = $p['description'];
            }
            $page_id = wp_insert_post($page_args);
            if (!is_wp_error($page_id) && $page_id > 0) {
                update_post_meta($page_id, '_wp_page_template', $p['template']);
                if (!empty($p['description'])) {
                    update_post_meta($page_id, '_forgewp_page_description', $p['description']);
                }
            }
        } else {
            $page_id = $existing_page->ID;
            $current_tpl = get_post_meta($page_id, '_wp_page_template', true);
            if ($current_tpl === 'page-placeholder.php' || empty($current_tpl) || (!$has_run && $current_tpl !== $p['template'])) {
                update_post_meta($page_id, '_wp_page_template', $p['template']);
            }
            if (!empty($p['title']) && ($existing_page->post_title !== $p['title'] && ($current_tpl === 'page-placeholder.php' || !$has_run))) {
                wp_update_post(array(
                    'ID'         => $page_id,
                    'post_title' => $p['title'],
                ));
            }
            if (!empty($p['description'])) {
                update_post_meta($page_id, '_forgewp_page_description', $p['description']);
            }
        }

        // Tag the page with a durable route marker, independent of whichever
        // template it's currently assigned (the template is user-editable in
        // wp-admin — e.g. switching to a generic block-based template — and
        // link resolution elsewhere (forgewp_resolve_route_page_id) must keep
        // working even after that happens). Runs unconditionally (not gated
        // by $has_run) so it self-heals on every request, including on sites
        // that were already activated before this marker was introduced.
        if ($page_id > 0) {
            $route_id = preg_replace('/^page-|\.php$/', '', $p['template']);
            if (get_post_meta($page_id, 'forgewp_route_id', true) !== $route_id) {
                update_post_meta($page_id, 'forgewp_route_id', $route_id);
            }
        }

        // Phase 3: Automatically seed default post meta fields if not already populated for ALL pages using this template
        if (isset($schema_defaults[$p['template']])) {
            $matching_pages = get_posts(array(
                'post_type'  => 'page',
                'post_status'=> 'any',
                'lang'       => '',
                'meta_query' => array(
                    array(
                        'key'     => '_wp_page_template',
                        'value'   => $p['template'],
                        'compare' => '='
                    )
                ),
                'posts_per_page' => -1
            ));
            
            $pages_to_seed = array();
            if ($page_id > 0) {
                $pages_to_seed[] = $page_id;
            }
            if (is_array($matching_pages)) {
                foreach ($matching_pages as $mp) {
                    if (!in_array($mp->ID, $pages_to_seed)) {
                        $pages_to_seed[] = $mp->ID;
                    }
                }
            }
            
            foreach ($pages_to_seed as $pid) {
                foreach ($schema_defaults[$p['template']] as $meta_key => $default_val) {
                    // If it is a JSON repeater, decode and seed individual ACF sub-fields
                    if (is_string($default_val) && (strpos($default_val, '[') === 0 || strpos($default_val, '{') === 0)) {
                        $decoded = json_decode($default_val, true);
                        if (is_array($decoded)) {
                            // Check if the repeater is already populated by checking its count meta
                            $current_count = get_post_meta($pid, $meta_key, true);
                            if (empty($current_count) || !is_numeric($current_count) || intval($current_count) === 0) {
                                // Seed the repeater count and values
                                update_post_meta($pid, $meta_key, count($decoded));
                                foreach ($decoded as $index => $row) {
                                    if (is_array($row)) {
                                        foreach ($row as $sub_key => $sub_val) {
                                            update_post_meta($pid, "{$meta_key}_{$index}_{$sub_key}", $sub_val);
                                        }
                                    }
                                }
                                
                                // Also store the raw JSON string as fallback for React direct hooks
                                update_post_meta($pid, "{$meta_key}_json_fallback", $default_val);
                            }
                            
                            // ALWAYS enforce ACF key reference mappings for fields to display in WP Admin
                            update_post_meta($pid, "_{$meta_key}", "field_{$meta_key}");
                            $count_to_map = get_post_meta($pid, $meta_key, true);
                            if (is_numeric($count_to_map)) {
                                for ($index = 0; $index < intval($count_to_map); $index++) {
                                    foreach (array_keys($decoded[0] ?? array()) as $sub_key) {
                                        update_post_meta($pid, "_{$meta_key}_{$index}_{$sub_key}", "field_{$meta_key}_{$sub_key}");
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    
                    $current_val = get_post_meta($pid, $meta_key, true);
                    if (empty($current_val)) {
                        update_post_meta($pid, $meta_key, $default_val);
                    }
                }
            }
        }
    }

    $menu_structure = array(
${menuItemsPhpArray}
    );

    if (!function_exists('forgewp_seed_menu_items')) {
        function forgewp_seed_menu_items($menu_id, $items, $parent_id = 0): void {
            if (!is_array($items)) return;
            foreach ($items as $item) {
                $item_title = $item['title'] ?? '';
                $item_url = $item['url'] ?? '';
                
                $object_id = 0;
                $object_type = 'custom';
                $target_url = $item_url;
                
                if (strpos($item_url, '/') === 0) {
                    $slug = trim($item_url, '/');
                    if ($slug === '') {
                        $target_url = home_url('/');
                    } else {
                        $page = get_page_by_path($slug);
                        if ($page) {
                            $object_id = $page->ID;
                            $object_type = 'page';
                            $target_url = get_permalink($page->ID);
                        } else {
                            $target_url = home_url($item_url);
                        }
                    }
                }
                
                $menu_item_args = array(
                    'menu-item-title'     => $item_title,
                    'menu-item-url'       => $target_url,
                    'menu-item-object-id' => $object_id,
                    'menu-item-object'    => $object_type === 'page' ? 'page' : '',
                    'menu-item-type'      => $object_type === 'page' ? 'post_type' : 'custom',
                    'menu-item-status'    => 'publish',
                    'menu-item-parent-id' => (int)$parent_id,
                );
                if (!empty($item['classes'])) {
                    $menu_item_args['menu-item-classes'] = is_array($item['classes']) ? implode(' ', $item['classes']) : $item['classes'];
                }
                if (!empty($item['description'])) {
                    $menu_item_args['menu-item-description'] = $item['description'];
                }
                if (!empty($item['target'])) {
                    $menu_item_args['menu-item-target'] = $item['target'];
                }
                if (!empty($item['attrTitle'])) {
                    $menu_item_args['menu-item-attr-title'] = $item['attrTitle'];
                }
                
                $item_id = wp_update_nav_menu_item($menu_id, 0, $menu_item_args);
                
                if (!is_wp_error($item_id) && $item_id > 0) {
                    if (!empty($item['badge'])) {
                        update_post_meta($item_id, '_forgewp_menu_badge', sanitize_text_field($item['badge']));
                    }
                    if (!empty($item['image'])) {
                        update_post_meta($item_id, '_forgewp_menu_image', esc_url_raw($item['image']));
                    }
                    if (!empty($item['icon'])) {
                        update_post_meta($item_id, '_forgewp_menu_icon', sanitize_text_field($item['icon']));
                    }
                    if (!empty($item['children']) && is_array($item['children'])) {
                        forgewp_seed_menu_items($menu_id, $item['children'], $item_id);
                    }
                }
            }
        }
    }

    $locations = get_theme_mod('nav_menu_locations');
    if (!is_array($locations)) {
        $locations = array();
    }

    foreach ($menu_structure as $location => $items) {
        $menu_name = ucfirst($location) . ' Navigation';
        $menu_exists = false;
        
        if (!empty($locations[$location])) {
            $menu_obj = wp_get_nav_menu_object($locations[$location]);
            if ($menu_obj) {
                $menu_exists = true;
            }
        }
        
        if (!$menu_exists) {
            $menu_obj = wp_get_nav_menu_object($menu_name);
            if ($menu_obj) {
                $menu_exists = true;
                $locations[$location] = $menu_obj->term_id;
                set_theme_mod('nav_menu_locations', $locations);
            }
        }
        
        if (!$menu_exists) {
            $menu_id = wp_create_nav_menu($menu_name);
            if (!is_wp_error($menu_id) && $menu_id > 0) {
                $locations[$location] = $menu_id;
                set_theme_mod('nav_menu_locations', $locations);
                forgewp_seed_menu_items($menu_id, $items, 0);
            }
        }
    }

    if (!$has_run) {
        update_option($activated_option, 'yes');
    }
}
add_action('after_switch_theme', 'forgewp_auto_create_pages_and_menus');
add_action('init', 'forgewp_auto_create_pages_and_menus', 99);

/**
 * Register customizer settings for theme modifications (e.g., footer_text).
 * This allows theme mods to be managed via WordPress Customizer and WP Admin.
 */
function forgewp_register_theme_customizer_settings($wp_customize): void {
    // Register footer_text theme modification
    $wp_customize->add_setting(
        'footer_text',
        array(
            'default'           => '',
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    $wp_customize->add_control(
        'footer_text',
        array(
            'label'       => __('Footer Text', '${config.textDomain}'),
            'section'     => 'title_tagline',
            'type'        => 'textarea',
            'description' => __('Custom text displayed in the theme footer.', '${config.textDomain}'),
        )
    );

    // ── Social Media Section ──
    $wp_customize->add_section(
        'forgewp_social_section',
        array(
            'title'       => __('Social Media Accounts', '${config.textDomain}'),
            'priority'    => 35,
            'description' => __('Manage your social media profile URLs.', '${config.textDomain}'),
        )
    );

${socialSettingsPhp}

    // ── Contact Information Section ──
    $wp_customize->add_section(
        'forgewp_contact_section',
        array(
            'title'       => __('Contact Information', '${config.textDomain}'),
            'priority'    => 36,
            'description' => __('Manage contact details used throughout the site.', '${config.textDomain}'),
        )
    );

    // contact_phone
    $wp_customize->add_setting(
        'contact_phone',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'sanitize_text_field',
        )
    );
    $wp_customize->add_control(
        'contact_phone',
        array(
            'label'   => __('Phone Number', '${config.textDomain}'),
            'section' => 'forgewp_contact_section',
            'type'    => 'text',
        )
    );

    // contact_email
    $wp_customize->add_setting(
        'contact_email',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'sanitize_email',
        )
    );
    $wp_customize->add_control(
        'contact_email',
        array(
            'label'   => __('Email Address', '${config.textDomain}'),
            'section' => 'forgewp_contact_section',
            'type'    => 'email',
        )
    );

    // contact_address
    $wp_customize->add_setting(
        'contact_address',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'sanitize_textarea_field',
        )
    );
    $wp_customize->add_control(
        'contact_address',
        array(
            'label'   => __('Address', '${config.textDomain}'),
            'section' => 'forgewp_contact_section',
            'type'    => 'textarea',
        )
    );

    // business_hours
    $wp_customize->add_setting(
        'business_hours',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'sanitize_text_field',
        )
    );
    $wp_customize->add_control(
        'business_hours',
        array(
            'label'   => __('Business Hours', '${config.textDomain}'),
            'section' => 'forgewp_contact_section',
            'type'    => 'text',
        )
    );
}
add_action('customize_register', 'forgewp_register_theme_customizer_settings');

/**
 * Set default footer_text on theme activation if not already set.
 */
function forgewp_set_default_footer_text(): void {
    if (!get_theme_mod('footer_text')) {
        set_theme_mod('footer_text', '© ' . date('Y') . ' ' . get_bloginfo('name') . '. ' . __('All rights reserved.', '${config.textDomain}'));
    }
}
add_action('after_switch_theme', 'forgewp_set_default_footer_text');
`;

  const templateResolutionsPhp = `
/**
 * Resolves the active template head HTML file path dynamically.
 */
function forgewp_resolve_head_target() {
    $dir = get_template_directory() . '/forgewp-static';
    
    // 1. Custom Page Template
    $template_slug = get_page_template_slug();
    if ($template_slug) {
        $clean_slug = str_replace(array('page-', '.php'), '', $template_slug);
        $target = "{$dir}/template-{$clean_slug}-head.html";
        if (file_exists($target)) {
            return $target;
        }
    }
    
    // 2. Singular Custom Post Type / Post / Page
    if (is_singular()) {
        $post_type = get_post_type();
        $target = "{$dir}/single-{$post_type}-head.html";
        if (file_exists($target)) {
            return $target;
        }
        $target = "{$dir}/single-head.html";
        if (file_exists($target)) {
            return $target;
        }
    }
    
    // 3. Taxonomy Archive
    if (is_tax()) {
        $tax = get_query_var('taxonomy');
        $target = "{$dir}/taxonomy-{$tax}-head.html";
        if (file_exists($target)) {
            return $target;
        }
        $target = "{$dir}/taxonomy-head.html";
        if (file_exists($target)) {
            return $target;
        }
    }
    
    // 4. Post Type Archive
    if (is_post_type_archive()) {
        $post_type = get_query_var('post_type');
        $target = "{$dir}/archive-{$post_type}-head.html";
        if (file_exists($target)) {
            return $target;
        }
    }
    
    // 5. General Archive / Category / Tag
    if (is_archive()) {
        $target = "{$dir}/archive-head.html";
        if (file_exists($target)) {
            return $target;
        }
    }
    
    // 6. Default Head
    return "{$dir}/head.html";
}

/**
 * Whether a known SEO plugin (Yoast, RankMath, All in One SEO, or SEOPress)
 * is currently active. Single source of truth — everywhere ForgeWP needs to
 * yield head-content/title/sitemap responsibility to a standard SEO plugin
 * calls this instead of re-deriving its own plugin-detection condition, so
 * the detected plugin list can't drift out of sync between call sites.
 */
function forgewp_seo_plugin_active() {
    return defined('WPSEO_VERSION')
        || class_exists('RankMath')
        || class_exists('All_in_One_SEO_Pack')
        || defined('AIOSEO_VERSION')
        || class_exists('SEOPress\\Services\\Title');
}

/**
 * Custom document title filter for ForgeWP.
 * Maps title enqueued via <WpHead /> in React to WordPress.
 */
function forgewp_custom_document_title( $title ) {
    if ( forgewp_seo_plugin_active() ) {
        return $title;
    }
    $target = forgewp_resolve_head_target();
    if ( file_exists( $target ) ) {
        ob_start();
        include $target;
        $content = ob_get_clean();
        if ( preg_match( '/<title>(.*?)<\\/title>/is', $content, $matches ) ) {
            return html_entity_decode( trim( $matches[1] ), ENT_QUOTES, 'UTF-8' );
        }
    }
    return $title;
}
add_filter( 'pre_get_document_title', 'forgewp_custom_document_title', 999 );

/**
 * Disable WordPress legacy emoji conversion to match native client-side rendering.
 */
function forgewp_disable_emojis(): void {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    add_filter('tiny_mce_plugins', 'forgewp_disable_emojis_tinymce');
    add_filter('wp_resource_hints', 'forgewp_disable_emojis_remove_dns_prefetch', 10, 2);
}
add_action('init', 'forgewp_disable_emojis');

function forgewp_disable_emojis_tinymce($plugins) {
    return is_array($plugins) ? array_diff($plugins, array('wpemoji')) : array();
}

function forgewp_disable_emojis_remove_dns_prefetch($urls, $relation_type) {
    if ('dns-prefetch' === $relation_type) {
        $emoji_svg_url = apply_filters('emoji_svg_url', 'https://s.w.org/images/core/emoji/2.2.1/svg/');
        $urls = array_diff($urls, array($emoji_svg_url));
    }
    return $urls;
}

/**
 * Isomorphic static translation bridge for ForgeWP.
 * Hooks into WordPress gettext to translate server-side static strings
 * using translations.json and the active Polylang language.
 */
function forgewp_gettext_translation_bridge($translated, $text, $domain) {
    if ($domain === '${config.textDomain}') {
        static $translations = null;
        static $translations_mtime = null;
        $file = get_template_directory() . '/translations.json';
        // Keyed on the file's mtime rather than just "already loaded once",
        // so a redeployed translations.json takes effect immediately within
        // this worker instead of only after it's recycled — PHP static
        // function-local variables otherwise persist across every request a
        // PHP-FPM worker serves, not just the one that first populated them.
        $current_mtime = file_exists($file) ? filemtime($file) : false;
        if ($translations === null || $translations_mtime !== $current_mtime) {
            if ($current_mtime !== false) {
                $translations = json_decode(file_get_contents($file), true);
            } else {
                $translations = array();
            }
            $translations_mtime = $current_mtime;
        }
        $type = '';
        if (function_exists('pll_current_language')) {
            $type = pll_current_language();
        }
        if (empty($type)) {
            $type = get_locale();
        }
        $type = substr($type, 0, 2);
        if (is_array($translations) && isset($translations[$type][$text])) {
            return $translations[$type][$text];
        }
    }
    return $translated;
}
add_filter('gettext', 'forgewp_gettext_translation_bridge', 10, 3);
add_filter('ngettext', 'forgewp_gettext_translation_bridge', 10, 3);

/**
 * Dynamic SVG theme icon rendering callback.
 * Maps dynamic icon slugs to inline SVGs from Lucide registry, custom uploads, or Dashicons.
 */
function forgewp_render_theme_icon($icon_slug, $class_name = '', $provider = 'lucide') {
    $icon_slug = is_string($icon_slug) ? sanitize_title($icon_slug) : '';
    if ($icon_slug === '') {
        return;
    }

    $svgs = array(
${iconSvgMapPhp}
    );

    $custom_svgs = get_option('forgewp_custom_icons', array());
    $svg = '';

    if ($provider === 'custom' && isset($custom_svgs[$icon_slug])) {
        $svg = $custom_svgs[$icon_slug];
    } elseif (isset($svgs[$icon_slug])) {
        $svg = $svgs[$icon_slug];
    } elseif (isset($custom_svgs[$icon_slug])) {
        $svg = $custom_svgs[$icon_slug];
    }

    if (!empty($svg)) {
        if (!empty($class_name)) {
            if (preg_match('/\\sclass="/', $svg)) {
                $svg = preg_replace('/\\sclass="([^"]*)"/', ' class="$1 ' . esc_attr($class_name) . '"', $svg, 1);
            } else {
                $svg = str_replace('<svg ', '<svg class="' . esc_attr($class_name) . '" ', $svg);
            }
        }
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted inline SVG registry
        echo $svg;
        return;
    }

    // Dashicons fallback (core admin font; also enqueued on frontend if theme uses dashicons)
    $dash = preg_replace('/^dashicons-/', '', $icon_slug);
    echo '<span class="dashicons dashicons-' . esc_attr($dash) . ( $class_name ? ' ' . esc_attr($class_name) : '' ) . '" aria-hidden="true"></span>';
}

/**
 * Prevent TinyMCE Classic Editor auto-resize height expansion feedback loop.
 */
function forgewp_disable_editor_autoresize($init_array) {
    if (isset($init_array['plugins'])) {
        $plugins = explode(',', $init_array['plugins']);
        $key = array_search('wpautoresize', $plugins);
        if ($key !== false) {
            unset($plugins[$key]);
            $init_array['plugins'] = implode(',', $plugins);
        }
    }
    return $init_array;
}
add_filter('tiny_mce_before_init', 'forgewp_disable_editor_autoresize');

/**
 * Ensure dedicated page-[slug].php and single-[post_type].php templates load if they exist in the theme,
 * overriding stale 'page-placeholder.php' assignments or WooCommerce default fallback hooks.
 * Also resolves SPA sub-routes (e.g. /account/*) so direct visits never 404.
 */
function forgewp_route_template_include(string $template): string {
    if (is_singular()) {
        $post_type = get_post_type();
        if ($post_type) {
            $single_template = get_template_directory() . '/single-' . $post_type . '.php';
            if (file_exists($single_template)) {
                return $single_template;
            }
        }
    }
    if (is_page()) {
        $post = get_queried_object();
        if ($post instanceof WP_Post) {
            $slug_template = get_template_directory() . '/page-' . $post->post_name . '.php';
            if (file_exists($slug_template)) {
                $current_meta = get_post_meta($post->ID, '_wp_page_template', true);
                if (empty($current_meta) || $current_meta === 'page-placeholder.php' || $current_meta === 'default') {
                    return $slug_template;
                }
            }
        }
    }

    // SPA sub-route and 404 fallback resolution
    $req_uri = $_SERVER['REQUEST_URI'] ?? '';
    $parsed_path = trim((string)parse_url($req_uri, PHP_URL_PATH), '/');

    // Strip WordPress install subfolder if present
    $site_path = trim((string)parse_url(home_url(), PHP_URL_PATH), '/');
    if ($site_path !== '' && strpos($parsed_path, $site_path) === 0) {
        $parsed_path = trim(substr($parsed_path, strlen($site_path)), '/');
    }

    if ($parsed_path !== '') {
        $dir = get_template_directory();

        // 1. Direct flat template match (e.g. account/orders -> page-account-orders.php)
        $flat_slug = str_replace('/', '-', $parsed_path);
        $flat_tpl = "{$dir}/page-{$flat_slug}.php";
        if (file_exists($flat_tpl)) {
            global $wp_query;
            if ($wp_query && $wp_query->is_404) {
                $wp_query->is_404 = false;
                $wp_query->is_page = true;
                status_header(200);
            }
            return $flat_tpl;
        }

        // 2. Parent section template match (e.g. account/orders/123 -> page-account.php)
        $parts = explode('/', $parsed_path);
        while (count($parts) > 1) {
            array_pop($parts);
            $parent_slug = implode('-', $parts);
            $parent_tpl = "{$dir}/page-{$parent_slug}.php";
            if (file_exists($parent_tpl)) {
                global $wp_query;
                if ($wp_query && $wp_query->is_404) {
                    $wp_query->is_404 = false;
                    $wp_query->is_page = true;
                    status_header(200);
                }
                return $parent_tpl;
            }
        }
    }

    return $template;
}
add_filter('template_include', 'forgewp_route_template_include', 99);
`;

  return `
${autoCreationPhp}
${templateResolutionsPhp}
`;
}
