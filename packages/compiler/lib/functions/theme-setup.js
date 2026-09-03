import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { generateDynamicAcfFieldPhp } from '../php-builders.js';

export function buildThemeSetupPhp(
  config,
  schemas,
  registeredTaxonomies,
  postTypes,
  uniqueMetaKeys,
  metaKeyTypes,
  metaKeysToSkip,
  socialKeys,
  defaultPasswordResetEmailSubject,
  defaultPasswordResetEmailBody,
  defaultVerificationEmailSubject,
  defaultVerificationEmailBody,
  defaultLoginField,
  defaultEmailVerificationEnabled,
  defaultRegistrationEnabled,
  defaultBlockLoginUntilVerified,
  menus = {}
) {
  const version = config.version.replace(/'/g, "\\'");
  const googleFonts = config.settings?.typography?.googleFonts || [];
  
  // Menus
  const navMenuLines = [];
  const registeredLocations = new Set();

  if (config.settings?.menus) {
    for (const [location, details] of Object.entries(config.settings.menus)) {
      const description = details.description || `${location} menu`;
      navMenuLines.push(`        '${location}' => __('${description.replace(/'/g, "\\'")}', '${config.textDomain}'),`);
      registeredLocations.add(location);
    }
  }

  if (menus) {
    for (const location of Object.keys(menus)) {
      if (location.startsWith('_')) continue;
      if (registeredLocations.has(location)) continue;

      const description = `${location.charAt(0).toUpperCase() + location.slice(1)} Navigation`;
      navMenuLines.push(`        '${location}' => __('${description}', '${config.textDomain}'),`);
      registeredLocations.add(location);
    }
  }

  const menuRegistration = navMenuLines.length > 0
    ? `register_nav_menus(array(
${navMenuLines.join('\n')}
    ));`
    : '';


  // Fonts enqueuing (self-hosted WOFF2 with remote fallback)
  const fontConfig = config.fonts?.google || config.settings?.typography?.googleFonts || [];
  const googleFontsList = Array.isArray(fontConfig) ? fontConfig : (fontConfig.families || []);
  let fontsEnqueueCode = '';

  if (googleFontsList.length > 0) {
    const fontFamilies = googleFontsList.map(f => {
      if (typeof f === 'string') {
        return f.replace(/\s+/g, '+');
      }
      if (f && typeof f === 'object') {
        const name = (f.family || '').replace(/\s+/g, '+');
        const weights = f.weights ? `:${f.weights.join(',')}` : '';
        return `${name}${weights}`;
      }
      return '';
    }).filter(Boolean).join('&family=');

    fontsEnqueueCode = `
    // Load custom typography (prefers local self-hosted WOFF2, falls back to remote)
    $fonts_file = get_template_directory() . '/assets/fonts/fonts.css';
    if (file_exists($fonts_file)) {
        wp_enqueue_style(
            'forgewp-fonts',
            get_theme_file_uri('assets/fonts/fonts.css'),
            array(),
            filemtime($fonts_file)
        );
    } elseif ( ! empty('${fontFamilies}') ) {
        wp_enqueue_style(
            'forgewp-google-fonts',
            'https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap',
            array(),
            null
        );
    }`;
  }

  // Dashicons on the frontend so WpIcon provider="dashicons" (and Lucide miss fallbacks) paint
  fontsEnqueueCode += `
    wp_enqueue_style('dashicons');
`;

  // Favicon dynamic registration
  let faviconPhp = '';
  if (config.favicon) {
    const faviconPath = config.favicon.replace(/^\//, ''); // Clean leading slash
    faviconPhp = `
/**
 * Enqueue Favicon dynamically in WordPress head (generated from wp.config.ts).
 */
function forgewp_add_favicon() {
    $uri = get_template_directory_uri() . '/${faviconPath}';
    $ext = strtolower(pathinfo($uri, PATHINFO_EXTENSION));
    $type = 'image/x-icon';
    if ($ext === 'svg') {
        $type = 'image/svg+xml';
    } elseif ($ext === 'png') {
        $type = 'image/png';
    } elseif ($ext === 'gif') {
        $type = 'image/gif';
    } elseif ($ext === 'jpg' || $ext === 'jpeg') {
        $type = 'image/jpeg';
    }
    echo '<link rel="icon" type="' . esc_attr($type) . '" href="' . esc_url($uri) . '">';
}
add_action('wp_head', 'forgewp_add_favicon');
`;
  }

  // XML Segmented Sitemaps
  let sitemapsPhp = '';
  if (config.seo && config.seo.sitemaps) {
    const { postTypes = [], taxonomies = [] } = config.seo.sitemaps;
    let postTypesLines = '';
    for (const pt of postTypes) {
      postTypesLines += `        $post_types['${pt}'] = get_post_type_object('${pt}');\n`;
    }
    let taxonomiesLines = '';
    for (const tax of taxonomies) {
      taxonomiesLines += `        $taxonomies['${tax}'] = get_taxonomy('${tax}');\n`;
    }
    sitemapsPhp = `
/**
 * Custom XML Segmented Sitemaps Configuration (generated from wp.config.ts).
 */
function forgewp_register_segmented_xml_sitemaps() {
    if (!function_exists('wp_sitemaps_get_server')) {
        return;
    }
    if (forgewp_seo_plugin_active()) {
        return;
    }
    add_filter('wp_sitemaps_post_types', function($post_types) {
${postTypesLines}        return $post_types;
    });
    add_filter('wp_sitemaps_taxonomies', function($taxonomies) {
${taxonomiesLines}        return $taxonomies;
    });
}
add_action('init', 'forgewp_register_segmented_xml_sitemaps', 99);
`;
  }

  // CPT Meta field registrations (Tier 2)
  let nativeMetaRegisters = '';
  if (uniqueMetaKeys.size > 0) {
    const metaArray = Array.from(uniqueMetaKeys);
    const ptListStr = postTypes.length > 0 ? postTypes.map(pt => `'${pt}'`).join(', ') : '';
    const allPtExpr = ptListStr ? `array_merge(array('post', 'page'), array(${ptListStr}))` : `array('post', 'page')`;

    nativeMetaRegisters = `
/**
 * Register native post meta fields for all templates (Tier 2 Structured Content).
 *
 * These same keys are also exposed via ACF local field groups (Tier 3, see
 * forgewp_register_acf_field_groups()) whenever ACF is active, and ACF registers its
 * own REST meta exposure for 'show_in_rest' field groups. Registering the same
 * object_type + meta_key twice (once here, once via ACF) creates two competing REST
 * meta registrations that WordPress does not support — the block editor's Document
 * sidebar / meta panel then fails to save with "Could not update the meta value of
 * X in database." This Tier 2 registration is therefore only a fallback for sites
 * without ACF installed; when ACF is active, it defers entirely to Tier 3.
 */
function forgewp_register_custom_post_meta(): void {
    if (function_exists('acf_add_local_field_group')) {
        return;
    }
    $post_types = ${allPtExpr};
    foreach ($post_types as $pt) {
${metaArray.filter(key => !metaKeysToSkip.has(key)).map(key => {
  const phpType = metaKeyTypes[key];
  return `        register_post_meta($pt, '${key}', array(
            'show_in_rest' => true,
            'single'       => true,
            'type'         => '${phpType}',
        ));`;
}).join('\n')}
    }
}
add_action('init', 'forgewp_register_custom_post_meta');
`;
  }

  // ACF Local Field Groups (Tier 3)
  let acfFieldGroups = '';
  if (Object.keys(schemas).length > 0 || registeredTaxonomies.length > 0) {
    const groups = [];
    for (const [templateSlug, schema] of Object.entries(schemas)) {
      const groupKey = `group_${templateSlug.replace(/-/g, '_')}`;
      const groupTitle = templateSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Content';
      
      let fieldsPhp = '    $fields = array();\n';
      for (const [key, field] of Object.entries(schema)) {
        fieldsPhp += generateDynamicAcfFieldPhp(key, field, templateSlug);
      }

      let locationRule = '';
      if (templateSlug === 'front-page') {
        locationRule = `array(
            array(
                array(
                    'param' => 'page_type',
                    'operator' => '==',
                    'value' => 'front_page',
                ),
            ),
        )`;
      } else if (templateSlug.startsWith('single-')) {
        let postType = templateSlug.replace('single-', '');
        if (postType.endsWith('-page')) {
          postType = postType.slice(0, -5);
        }
        locationRule = `array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => '${postType}',
                ),
            ),
        )`;
      } else {
        const pageTemplateName = `page-${templateSlug}.php`;
        locationRule = `array(
            array(
                array(
                    'param' => 'page_template',
                    'operator' => '==',
                    'value' => '${pageTemplateName}',
                ),
            ),
        )`;
      }

      groups.push(`    ${fieldsPhp}
    acf_add_local_field_group(array(
        'key' => '${groupKey}',
        'title' => '${groupTitle}',
        'fields' => $fields,
        'location' => ${locationRule},
        'menu_order' => 0,
        'position' => 'normal',
        'style' => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen' => '',
        'active' => true,
        'description' => 'Colocated React structured content fields managed by ForgeWP.',
        'show_in_rest' => true,
    ));`);
    }

    for (const tax of registeredTaxonomies) {
      const taxGroupKey = `group_taxonomy_${tax}`;
      const taxGroupTitle = tax.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Settings';
      groups.push(`    // Custom fields for taxonomy: ${tax}
    acf_add_local_field_group(array(
        'key' => '${taxGroupKey}',
        'title' => '${taxGroupTitle}',
        'fields' => array(
            array(
                'key' => 'field_${tax}_featured_image',
                'label' => 'Featured Image',
                'name' => 'featured_image',
                'type' => 'image',
                'instructions' => 'Set the cover/featured image for this term.',
                'required' => 0,
                'conditional_logic' => 0,
                'return_format' => 'url',
                'preview_size' => 'medium',
                'library' => 'all',
            ),
            array(
                'key' => 'field_${tax}_flag',
                'label' => 'Flag Emoji',
                'name' => 'flag',
                'type' => 'text',
                'instructions' => 'Set the flag emoji or brief code for this term (e.g. 🇩🇪 or DE).',
                'required' => 0,
                'conditional_logic' => 0,
                'default_value' => '🌍',
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'taxonomy',
                    'operator' => '==',
                    'value' => '${tax}',
                ),
            ),
        ),
        'menu_order' => 0,
        'position' => 'normal',
        'style' => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen' => '',
        'active' => true,
        'show_in_rest' => true,
    ));`);
    }

    acfFieldGroups = `
/**
 * Register Advanced Custom Fields (ACF) local field groups (Tier 3 Interoperability Presentation).
 */
function forgewp_register_acf_field_groups(): void {
    if ( ! function_exists('acf_add_local_field_group') ) {
        return;
    }
    
${groups.join('\n\n')}
}
add_action('acf/init', 'forgewp_register_acf_field_groups');
`;
  }

  // Social settings section customizer controls
  let socialSettingsPhp = '';
  for (const key of socialKeys) {
    const optionName = `social_${key}`;
    const capitalizedLabel = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    socialSettingsPhp += `
    // ${optionName}
    $wp_customize->add_setting(
        '${optionName}',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'esc_url_raw',
        )
    );
    $wp_customize->add_control(
        '${optionName}',
        array(
            'label'   => __('${capitalizedLabel} URL', '${config.textDomain}'),
            'section' => 'forgewp_social_section',
            'type'    => 'url',
        )
    );`;
  }

  // Main theme setup block
  const setupBlock = `
/**
 * Dynamic WordPress Theme Setup & Configuration.
 */
if ( ! function_exists( 'forgewp_theme_setup' ) ) :
    function forgewp_theme_setup() {
        // Essential theme features
        add_theme_support( 'post-thumbnails' );
        add_theme_support( 'title-tag' );
        add_theme_support( 'responsive-embeds' );
        add_theme_support( 'html5', array( 'style', 'script' ) );
        add_theme_support( 'align-wide' );
        // Gates Appearance → Menus in wp-admin (current_theme_supports('menus')).
        add_theme_support( 'menus' );

        // Navigation menus
        ${menuRegistration}
    }
endif;
add_action( 'after_setup_theme', 'forgewp_theme_setup' );

/**
 * WordPress redirect_canonical() guesses 404s with post_name LIKE '{slug}%'.
 * Visiting /about then 301s to /product/about-a-chair-aa51/ when no About page
 * exists. Local React routing never fuzzy-matches like that.
 */
add_filter('do_redirect_guess_404_permalink', '__return_false');

/**
 * Register core theme block categories.
 */
function forgewp_register_block_categories( $block_categories, $block_editor_context ) {
    return array_merge(
        $block_categories,
        array(
            array(
                'slug'  => 'forgewp-theme',
                'title' => __( 'ForgeWP Theme Blocks', '${config.textDomain}' ),
                'icon'  => 'layout',
            ),
            array(
                'slug'  => 'forgewp-design',
                'title' => __( 'ForgeWP Design Blocks', '${config.textDomain}' ),
                'icon'  => 'art',
            ),
            array(
                'slug'  => 'forgewp-content',
                'title' => __( 'ForgeWP Content Blocks', '${config.textDomain}' ),
                'icon'  => 'welcome-write-blog',
            ),
        )
    );
}
add_filter( 'block_categories_all', 'forgewp_register_block_categories', 10, 2 );

/**
 * Register Theme Options & Social Customizer section.
 */
function forgewp_customize_register( $wp_customize ) {
    $wp_customize->add_section(
        'forgewp_social_section',
        array(
            'title'      => __('Social Media Accounts', '${config.textDomain}'),
            'priority'   => 30,
        )
    );
${socialSettingsPhp}
}
add_action( 'customize_register', 'forgewp_customize_register' );

/**
 * Enqueue theme styles and Google Fonts dynamically.
 */
function forgewp_enqueue_theme_styles() {
    wp_enqueue_style(
        'forgewp-theme-styles',
        get_template_directory_uri() . '/style.css',
        array(),
        FORGEWP_THEME_VERSION
    );${fontsEnqueueCode}
}
add_action( 'wp_enqueue_scripts', 'forgewp_enqueue_theme_styles' );
add_action( 'enqueue_block_editor_assets', 'forgewp_enqueue_theme_styles' );
`;

  // "Hide page title" toggle — Document sidebar checkbox (forgewp-editor.js) reads/writes
  // this meta; page.php and template-forgewp-builder.php both check it before rendering
  // the title, so title visibility is no longer implied by which template is selected.
  const pageTitleMetaPhp = `
/**
 * Register the "Hide page title" toggle exposed in the Page editor's Document sidebar.
 */
function forgewp_register_page_title_meta(): void {
    register_post_meta('page', '_forgewp_hide_title', array(
        'show_in_rest' => true,
        'single'       => true,
        'type'         => 'boolean',
        // ForgeWP pages are block/section layouts — hide the core title by default.
        'default'      => true,
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        },
    ));
}
add_action('init', 'forgewp_register_page_title_meta');

/**
 * Whether the page title should be hidden.
 * Unset meta defaults to true (hide) to match the Document sidebar default.
 */
function forgewp_should_hide_page_title( $post_id = null ): bool {
    $post_id = $post_id ? (int) $post_id : (int) get_the_ID();
    if ( $post_id <= 0 ) {
        return true;
    }
    if ( ! metadata_exists( 'post', $post_id, '_forgewp_hide_title' ) ) {
        return true;
    }
    return (bool) get_post_meta( $post_id, '_forgewp_hide_title', true );
}
`;

  return `
define('FORGEWP_THEME_VERSION', '${version}');
${setupBlock}
${faviconPhp}
${sitemapsPhp}
${nativeMetaRegisters}
${acfFieldGroups}
${pageTitleMetaPhp}
`;
}
