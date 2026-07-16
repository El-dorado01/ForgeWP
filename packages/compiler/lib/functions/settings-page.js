/**
 * Generates a WordPress Admin settings page for all site options detected
 * via useWpOption() calls in the theme source.
 *
 * Options annotated with { postType: '...' } get a Select2 AJAX-powered
 * post picker instead of a plain text input — scales to thousands of posts.
 *
 * @param {Array<{name: string, label: string, defaultValue: string, postType?: string|null}>} wpOptions
 * @param {{textDomain: string}} config
 * @returns {string} PHP code to append to functions.php
 */
export function buildSettingsPagePhp(wpOptions, config) {
  if (!wpOptions || wpOptions.length === 0) return '';

  const textDomain  = config.textDomain || 'forgewp';
  const fnPrefix    = textDomain.replace(/-/g, '_');
  const pageSlug    = `${textDomain}-theme-options`;
  const optionGroup = `${fnPrefix}_theme_options`;
  const capability  = 'manage_options';
  const sectionId   = `${fnPrefix}_main_section`;
  const ajaxAction  = `${fnPrefix}_search_posts`;
  const nonceName   = `${fnPrefix}_search_posts_nonce`;

  const hasPostPicker = wpOptions.some(o => o.postType);

  // ── register_setting() calls ───────────────────────────────────────────────
  const registerCalls = wpOptions.map(({ name, label, defaultValue, postType }) => {
    // Post-picker fields store a post ID; sanitize as absint-compatible integer string
    const sanitize = postType
      ? 'absint'
      : (name.includes('url') || name.includes('link') ? 'esc_url_raw' : 'sanitize_text_field');
    return `
    register_setting('${optionGroup}', '${name}', array(
        'type'              => 'string',
        'sanitize_callback' => '${sanitize}',
        'default'           => '${(defaultValue || '').replace(/'/g, "\\'")}',
    ));`;
  }).join('\n');

  // ── add_settings_field() calls ─────────────────────────────────────────────
  const fieldCalls = wpOptions.map(({ name, label }) => {
    const escapedLabel = (label || name).replace(/'/g, "\\'");
    return `
    add_settings_field(
        '${name}',
        __('${escapedLabel}', '${textDomain}'),
        '${fnPrefix}_render_field_${name}',
        '${pageSlug}',
        '${sectionId}'
    );`;
  }).join('\n');

  // ── Individual field render callbacks ─────────────────────────────────────
  const fieldCallbacks = wpOptions.map(({ name, label, defaultValue, postType }) => {
    const escapedLabel   = (label || name).replace(/'/g, "\\'");
    const escapedDefault = (defaultValue || '').replace(/'/g, "\\'");

    if (postType) {
      // Select2-powered post picker
      return `
function ${fnPrefix}_render_field_${name}() {
    $value = get_option('${name}', '${escapedDefault}');
    $selected_title = '';
    if ($value && intval($value) > 0) {
        $selected_post  = get_post(intval($value));
        $selected_title = $selected_post ? $selected_post->post_title . ' (ID: ' . $value . ')' : '';
    }
    ?>
    <select id="<?php echo esc_attr('${name}'); ?>"
            name="<?php echo esc_attr('${name}'); ?>"
            class="forgewp-post-select"
            data-post-type="<?php echo esc_attr('${postType}'); ?>"
            data-nonce="<?php echo esc_attr(wp_create_nonce('${nonceName}')); ?>"
            style="min-width:400px">
        <?php if ($value && $selected_title) : ?>
            <option value="<?php echo esc_attr($value); ?>" selected>
                <?php echo esc_html($selected_title); ?>
            </option>
        <?php else : ?>
            <option value=""><?php _e('— Select a post —', '${textDomain}'); ?></option>
        <?php endif; ?>
    </select>
    <p class="description"><?php _e('${escapedLabel}', '${textDomain}'); ?></p>
    <?php
}`;
    }

    // Plain text input
    return `
function ${fnPrefix}_render_field_${name}() {
    $value = get_option('${name}', '${escapedDefault}');
    echo '<input type="text" id="${name}" name="${name}" value="' . esc_attr($value) . '" class="regular-text" />';
    echo '<p class="description">${escapedLabel}</p>';
}`;
  }).join('\n');

  // ── Select2 AJAX search handler (only emitted when there are postType options) ──
  const ajaxHandler = hasPostPicker ? `
/**
 * ForgeWP AJAX: search posts by type for the Theme Options post picker.
 */
if (!function_exists('${fnPrefix}_ajax_search_posts')) {
    function ${fnPrefix}_ajax_search_posts() {
        check_ajax_referer('${nonceName}', 'nonce');
        if (!current_user_can('${capability}')) {
            wp_send_json_error('Unauthorized', 403);
        }
        $post_type = isset($_GET['post_type']) ? sanitize_key($_GET['post_type']) : 'post';
        $search    = isset($_GET['search'])    ? sanitize_text_field($_GET['search']) : '';
        $results   = array();
        $query = new WP_Query(array(
            'post_type'      => $post_type,
            'post_status'    => 'publish',
            's'              => $search,
            'posts_per_page' => 40,
            'orderby'        => 'title',
            'order'          => 'ASC',
            'no_found_rows'  => true,
        ));
        foreach ($query->posts as $post) {
            $results[] = array(
                'id'   => $post->ID,
                'text' => $post->post_title . ' (ID: ' . $post->ID . ')',
            );
        }
        wp_send_json_success($results);
    }
    add_action('wp_ajax_${ajaxAction}', '${fnPrefix}_ajax_search_posts');
}
` : '';

  // ── Admin script enqueue (Select2 init + AJAX wiring) ─────────────────────
  // WordPress core does NOT ship a public 'select2' script/style handle — calling
  // wp_enqueue_script('select2') silently no-ops against an unregistered handle, which
  // means the library never loads and the field falls back to a plain <select> containing
  // only the single server-rendered <option> for the currently-stored value. We vendor our
  // own copy of Select2 into the exported theme (see generate-theme.js) and enqueue that.
  const select2Handle = `${fnPrefix}-select2`;
  const enqueueScript = hasPostPicker ? `
if (!function_exists('${fnPrefix}_enqueue_options_page_assets')) {
    function ${fnPrefix}_enqueue_options_page_assets($hook) {
        // Only load on our settings page
        if ($hook !== 'appearance_page_${pageSlug}') return;

        $select2_js  = get_template_directory() . '/assets/vendor/select2/select2.min.js';
        $select2_css = get_template_directory() . '/assets/vendor/select2/select2.min.css';
        if (!file_exists($select2_js)) return;

        wp_enqueue_script(
            '${select2Handle}',
            get_template_directory_uri() . '/assets/vendor/select2/select2.min.js',
            array('jquery'),
            FORGEWP_THEME_VERSION,
            true
        );
        if (file_exists($select2_css)) {
            wp_enqueue_style(
                '${select2Handle}',
                get_template_directory_uri() . '/assets/vendor/select2/select2.min.css',
                array(),
                FORGEWP_THEME_VERSION
            );
        }

        // Inline initialisation script
        $init_js = "
jQuery(function($) {
    $('.forgewp-post-select').each(function() {
        var \\$select   = $(this);
        var postType  = \\$select.data('post-type');
        var nonce     = \\$select.data('nonce');
        var ajaxUrl   = " . json_encode(admin_url('admin-ajax.php')) . ";
        \\$select.select2({
            placeholder: '— Type to search —',
            allowClear: true,
            minimumInputLength: 0,
            ajax: {
                url: ajaxUrl,
                dataType: 'json',
                delay: 250,
                data: function(params) {
                    return {
                        action:    '${ajaxAction}',
                        nonce:     nonce,
                        post_type: postType,
                        search:    params.term || '',
                    };
                },
                processResults: function(data) {
                    if (!data.success) return { results: [] };
                    return { results: data.data };
                },
                cache: true,
            },
        });
    });
});
        ";
        wp_add_inline_script('${select2Handle}', $init_js);
    }
    add_action('admin_enqueue_scripts', '${fnPrefix}_enqueue_options_page_assets');
}
` : '';

  return `
/**
 * ForgeWP Theme Options — Auto-generated from useWpOption() calls detected in source.
 * Manage these at Appearance → Theme Options in the WordPress admin.
 *
 * Options with a postType annotation use a Select2 AJAX-powered post picker
 * that scales to any number of posts without performance issues.
 */

${ajaxHandler}
${enqueueScript}

if (!function_exists('${fnPrefix}_register_settings')) {
    function ${fnPrefix}_register_settings() {
        ${registerCalls}

        add_settings_section(
            '${sectionId}',
            __('Theme Options', '${textDomain}'),
            '__return_false',
            '${pageSlug}'
        );

        ${fieldCalls}
    }
    add_action('admin_init', '${fnPrefix}_register_settings');
}

if (!function_exists('${fnPrefix}_add_options_page')) {
    function ${fnPrefix}_add_options_page() {
        add_theme_page(
            __('Theme Options', '${textDomain}'),
            __('Theme Options', '${textDomain}'),
            '${capability}',
            '${pageSlug}',
            '${fnPrefix}_render_options_page'
        );
    }
    add_action('admin_menu', '${fnPrefix}_add_options_page');
}

if (!function_exists('${fnPrefix}_render_options_page')) {
    function ${fnPrefix}_render_options_page() {
        if (!current_user_can('${capability}')) {
            wp_die(__('You do not have permission to access this page.', '${textDomain}'));
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <?php if (isset($_GET['settings-updated'])) : ?>
                <div id="message" class="notice notice-success is-dismissible">
                    <p><?php _e('Settings saved.', '${textDomain}'); ?></p>
                </div>
            <?php endif; ?>
            <form method="post" action="options.php">
                <?php
                    settings_fields('${optionGroup}');
                    do_settings_sections('${pageSlug}');
                    submit_button(__('Save Settings', '${textDomain}'));
                ?>
            </form>
        </div>
        <?php
    }
}

${fieldCallbacks}
`;
}
