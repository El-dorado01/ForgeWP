import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  generateAcfFieldPhp,
  generateDynamicAcfFieldPhp,
} from './php-builders.js';

function generatePhpArgs(queryObj) {
  const phpLines = [];
  phpLines.push(`$args = array(`);
  
  if (queryObj.postType && typeof queryObj.postType === 'string') {
    phpLines.push(`        'post_type' => '${queryObj.postType}',`);
  } else {
    phpLines.push(`        'post_type' => 'post',`);
  }
  
  if (queryObj.postsPerPage !== undefined) {
    const ppp = parseInt(queryObj.postsPerPage, 10);
    phpLines.push(`        'posts_per_page' => ${isNaN(ppp) ? 10 : ppp},`);
  } else {
    phpLines.push(`        'posts_per_page' => 10,`);
  }
  
  if (queryObj.orderby) {
    phpLines.push(`        'orderby' => '${queryObj.orderby}',`);
  }
  if (queryObj.order) {
    phpLines.push(`        'order' => '${queryObj.order}',`);
  }
  
  if (queryObj.categoryName) {
    if (String(queryObj.categoryName).startsWith('__DYNAMIC_')) {
      const varName = String(queryObj.categoryName).replace(/^__DYNAMIC_/, '').replace(/__$/, '');
      phpLines.push(`        'category_name' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
    } else {
      phpLines.push(`        'category_name' => '${queryObj.categoryName}',`);
    }
  }
  
  phpLines.push(`        'paged' => $paged,`);
  
  if (queryObj.taxQuery && Array.isArray(queryObj.taxQuery) && queryObj.taxQuery.length > 0) {
    phpLines.push(`        'tax_query' => array(`);
    for (const taxQ of queryObj.taxQuery) {
      phpLines.push(`            array(`);
      phpLines.push(`                'taxonomy' => '${taxQ.taxonomy}',`);
      phpLines.push(`                'field' => '${taxQ.field || 'slug'}',`);
      
      const termsVal = taxQ.terms;
      if (typeof termsVal === 'string' && termsVal.startsWith('__DYNAMIC_')) {
        const varName = termsVal.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
        phpLines.push(`                'terms' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
      } else if (Array.isArray(termsVal)) {
        const termsPhp = termsVal.map(t => typeof t === 'string' ? `'${t}'` : t).join(', ');
        phpLines.push(`                'terms' => array(${termsPhp}),`);
      } else if (typeof termsVal === 'string') {
        phpLines.push(`                'terms' => '${termsVal}',`);
      } else {
        phpLines.push(`                'terms' => ${termsVal},`);
      }
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }
  
  if (queryObj.metaQuery && Array.isArray(queryObj.metaQuery) && queryObj.metaQuery.length > 0) {
    phpLines.push(`        'meta_query' => array(`);
    if (queryObj.metaRelation) {
      phpLines.push(`            'relation' => '${queryObj.metaRelation}',`);
    }
    for (const metaQ of queryObj.metaQuery) {
      phpLines.push(`            array(`);
      phpLines.push(`                'key' => '${metaQ.key}',`);
      if (metaQ.compare) {
        phpLines.push(`                'compare' => '${metaQ.compare}',`);
      }
      if (metaQ.value !== undefined) {
        const val = metaQ.value;
        if (typeof val === 'string' && val.startsWith('__DYNAMIC_')) {
          const varName = val.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
          phpLines.push(`                'value' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
        } else if (typeof val === 'string') {
          phpLines.push(`                'value' => '${val}',`);
        } else {
          phpLines.push(`                'value' => ${val},`);
        }
      }
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }
  
  phpLines.push(`    );`);
  return phpLines.join('\n');
}

/**
 * Generate functions.php template string
 *
 * @param {import('./types.js').ForgeWPThemeConfig} config
 * @param {import('./types.js').ForgeWPBuildAssets} assets
 */
export function buildFunctionsPhp(
  config,
  assets,
  blockSlugs = [],
  themeRoot = '',
  pagesToAutoCreate = [],
  menus = {},
  hydrationData = null,
  i18nKeys = [],
  schemas = {},
  queries = [],
) {
  const css = assets.cssFile.replace(/^assets\//, '');
  
  let seoPluginsPhp = '';
  if (config.seo && config.seo.plugins) {
    const { yoast, rankMath } = config.seo.plugins;
    if (yoast) {
      seoPluginsPhp += `
/**
 * Automatically integrate ForgeWP enqueued schemas with Yoast SEO Schema Graph.
 */
add_filter('wpseo_schema_graph', function($graph) {
    $target = forgewp_resolve_head_target();
    if (file_exists($target)) {
        ob_start();
        include $target;
        $content = ob_get_clean();
        if (preg_match_all('/<script type="application\\/ld\\+json">(.*?)<\\/script>/is', $content, $matches)) {
            foreach ($matches[1] as $json_str) {
                $decoded = json_decode(trim($json_str), true);
                if (is_array($decoded) && is_array($graph)) {
                    $graph[] = $decoded;
                }
            }
        }
    }
    return $graph;
});
`;
    }
    if (rankMath) {
      seoPluginsPhp += `
/**
 * Automatically integrate ForgeWP enqueued schemas with RankMath JSON-LD.
 */
add_filter('rank_math/json_ld', function($data, $jsonld) {
    $target = forgewp_resolve_head_target();
    if (file_exists($target)) {
        ob_start();
        include $target;
        $content = ob_get_clean();
        if (preg_match_all('/<script type="application\\/ld\\+json">(.*?)<\\/script>/is', $content, $matches)) {
            foreach ($matches[1] as $json_str) {
                $decoded = json_decode(trim($json_str), true);
                if (is_array($decoded) && is_array($data)) {
                    $data[] = $decoded;
                }
            }
        }
    }
    return $data;
}, 99, 2);
`;
    }
  }
  
  // Built-in Favicon Support
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

  // Built-in XML Segmented Sitemaps
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
    if (defined('WPSEO_VERSION') || class_exists('RankMath') || class_exists('All_in_One_SEO_Pack') || defined('AIOSEO_VERSION')) {
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
  const version = config.version.replace(/'/g, "\\'");
  const googleFonts = config.settings?.typography?.googleFonts || [];

  // Load site-settings.json to discover social media options dynamically
  let socialKeys = ['facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'linkedin', 'pinterest']; // default fallbacks
  try {
    const siteSettingsPath = path.join(themeRoot, 'cms', 'site-settings.json');
    if (existsSync(siteSettingsPath)) {
      const siteSettings = JSON.parse(readFileSync(siteSettingsPath, 'utf8'));
      const optionsKeys = Object.keys(siteSettings.options || {});
      const discoveredSocials = optionsKeys
        .filter(k => k.startsWith('social_'))
        .map(k => k.replace(/^social_/, ''));
      if (discoveredSocials.length > 0) {
        socialKeys = Array.from(new Set([...socialKeys, ...discoveredSocials]));
      }
    }
  } catch (e) {
    // fallback to defaults if read fails
  }

  let socialSettingsPhp = '';
  for (const key of socialKeys) {
    const optionName = `social_${key}`;
    const capitalizedLabel = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    socialSettingsPhp += `
    // \${optionName}
    \$wp_customize->add_setting(
        '${optionName}',
        array(
            'type'              => 'option',
            'default'           => '',
            'sanitize_callback' => 'esc_url_raw',
        )
    );
    \$wp_customize->add_control(
        '${optionName}',
        array(
            'label'   => __('${capitalizedLabel} URL', '${config.textDomain}'),
            'section' => 'forgewp_social_section',
            'type'    => 'url',
        )
    );`;
  }

  const uniqueMetaKeys = new Set();
  const metaKeyTypes = {};
  const metaKeysToSkip = new Set();

  for (const [templateSlug, schema] of Object.entries(schemas)) {
    for (const [key, field] of Object.entries(schema)) {
      uniqueMetaKeys.add(key);
      const typeMap = {
        text: 'string',
        richText: 'string',
        image: 'string',
        boolean: 'boolean',
        repeater: 'string',
      };
      metaKeyTypes[key] = typeMap[field.type] || 'string';
      if (field.skipRegisterMeta === true || field.customType === 'relationship') {
        metaKeysToSkip.add(key);
      }
    }
  }

  const uniqueRichTextKeys = [];
  for (const [templateSlug, schema] of Object.entries(schemas)) {
    for (const [key, field] of Object.entries(schema)) {
      if (field.type === 'richText' && !uniqueRichTextKeys.includes(key)) {
        uniqueRichTextKeys.push(key);
      }
    }
  }

  let postTypes = [];
  let registeredTaxonomies = [];
  const polylangMetaStrings = [];
  for (const [templateSlug, schema] of Object.entries(schemas)) {
    for (const [key, field] of Object.entries(schema)) {
      if ((field.type === 'text' || field.type === 'richText') && field.default) {
        polylangMetaStrings.push(field.default);
      }
    }
  }

  const uniquePolylangStrings = Array.from(new Set([
    ...i18nKeys,
    ...polylangMetaStrings
  ]));

  const i18nKeysPhp = uniquePolylangStrings
    .map((k) => `        '${k.replace(/'/g, "\\'")}',`)
    .join('\n');
  const wpBlockStylesLine = config.presets?.wordpressCoreStyles === false
    ? ''
    : "    add_theme_support('wp-block-styles');\n";

  let cptRegistration = '';
  try {
    const mockDataPath = path.join(themeRoot, 'cms', 'mock-data.json');
    if (existsSync(mockDataPath)) {
      const mockData = JSON.parse(readFileSync(mockDataPath, 'utf8'));
      postTypes = Object.keys(mockData).filter(
        (k) =>
          k !== 'posts' &&
          k !== 'pages' &&
          k !== 'post' &&
          k !== 'page' &&
          k !== 'menus' &&
          k !== 'attachment' &&
          !k.startsWith('_'),  // Underscore-prefixed keys are taxonomy definitions, not CPTs
      );
      if (postTypes.length > 0) {
        // Dynamic Taxonomy Scan from post _terms
        const taxonomiesSet = new Set();
        const postTypeTaxonomies = {}; // Map postType -> Set of taxonomies
        const postTypeNativeTaxonomies = {}; // Map postType -> Set of native taxonomies
        
        for (const pt of postTypes) {
          if (pt.length > 20) {
            throw new Error(
              `Custom Post Type "${pt}" inferred from mock-data.json exceeds the WordPress limit of 20 characters. Please shorten the key.`
            );
          }
          postTypeTaxonomies[pt] = new Set();
          postTypeNativeTaxonomies[pt] = new Set();
          const items = mockData[pt];
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item._terms && typeof item._terms === 'object') {
                for (const tax of Object.keys(item._terms)) {
                  if (tax !== 'category' && tax !== 'post_tag') {
                    taxonomiesSet.add(tax);
                    postTypeTaxonomies[pt].add(tax);
                  } else {
                    postTypeNativeTaxonomies[pt].add(tax);
                  }
                }
              }
            }
          }
        }

        registeredTaxonomies = Array.from(taxonomiesSet);

        cptRegistration = `
/**
 * Register dynamic Custom Post Types inferred from local mock data.
 */
function forgewp_register_custom_post_types() {
${postTypes
  .map(
    (pt) => {
      let singular = pt.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      let plural = singular + 's';
      const ptConfig = config.postTypes?.[pt];
      if (ptConfig?.labels?.singular) {
        singular = ptConfig.labels.singular;
      }
      if (ptConfig?.labels?.plural) {
        plural = ptConfig.labels.plural;
      }
      const nativeTaxes = Array.from(postTypeNativeTaxonomies[pt] || []);
      const taxonomiesLine = nativeTaxes.length > 0 
        ? `\n        'taxonomies'  => array('${nativeTaxes.join("', '")}'),`
        : '';
      const nativeTaxesCalls = nativeTaxes.map(tax => `\n    register_taxonomy_for_object_type('${tax}', '${pt}');`).join('');
      return `    register_post_type('${pt}', array(
         'labels'      => array(
             'name'               => __('${plural}', '${config.textDomain}'),
             'singular_name'      => __('${singular}', '${config.textDomain}'),
             'menu_name'          => __('${plural}', '${config.textDomain}'),
             'name_admin_bar'     => __('${singular}', '${config.textDomain}'),
             'add_new'            => __('Add New', '${config.textDomain}'),
             'add_new_item'       => __('Add New ${singular}', '${config.textDomain}'),
             'new_item'           => __('New ${singular}', '${config.textDomain}'),
             'edit_item'          => __('Edit ${singular}', '${config.textDomain}'),
             'view_item'          => __('View ${singular}', '${config.textDomain}'),
             'all_items'          => __('All ${plural}', '${config.textDomain}'),
             'search_items'       => __('Search ${plural}', '${config.textDomain}'),
             'not_found'          => __('No ${plural} found.', '${config.textDomain}'),
         ),
         'public'      => true,
         'has_archive' => true,
         'show_in_rest'=> true,${taxonomiesLine}
         'supports'    => array('title', 'editor', 'thumbnail', 'custom-fields', 'excerpt'),
         'menu_icon'   => 'dashicons-admin-post',
     ));${nativeTaxesCalls}`;
    }
  )
  .join('\n')}

${registeredTaxonomies
  .map((tax) => {
    const associatedPostTypes = postTypes.filter((pt) => postTypeTaxonomies[pt].has(tax));
    const taxLabel = tax.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `    register_taxonomy('${tax}', array('${associatedPostTypes.join("', '")}'), array(
        'labels'            => array(
            'name'              => '${taxLabel}s',
            'singular_name'     => '${taxLabel}',
            'search_items'      => 'Search ${taxLabel}s',
            'all_items'         => 'All ${taxLabel}s',
            'parent_item'       => 'Parent ${taxLabel}',
            'parent_item_colon' => 'Parent ${taxLabel}:',
            'edit_item'         => 'Edit ${taxLabel}',
            'update_item'       => 'Update ${taxLabel}',
            'add_new_item'      => 'Add New ${taxLabel}',
            'new_item_name'     => 'New ${taxLabel} Name',
            'menu_name'         => '${taxLabel}s',
        ),
        'hierarchical'      => true,
        'public'            => true,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'show_in_rest'      => true,
    ));`;
  })
  .join('\n\n')}
}
add_action('init', 'forgewp_register_custom_post_types');
${(() => {
  const translatablePtKeys = Object.entries(config.postTypes || {})
    .filter(([_, ptc]) => ptc.translatable)
    .map(([key]) => key);
  let php = translatablePtKeys.length > 0
    ? `\n// Automatically register custom post types for Polylang translation support
add_filter('pll_get_post_types', function($post_types, $is_settings) {
${translatablePtKeys.map((pt) => `    $post_types['${pt}'] = '${pt}';`).join('\n')}
    return $post_types;
}, 10, 2);`
    : '';

  if (translatablePtKeys.length > 0) {
    php += `\n\n// Add REST API language filtering support for custom post types under Polylang
function forgewp_rest_query_language_filter($args, $request) {
    $lang = $request->get_param('lang');
    if (!empty($lang)) {
        $args['lang'] = sanitize_text_field($lang);
    } elseif (function_exists('pll_current_language')) {
        $args['lang'] = pll_current_language();
    }
    return $args;
}
`;
    translatablePtKeys.forEach((pt) => {
      php += `add_filter('rest_${pt}_query', 'forgewp_rest_query_language_filter', 10, 2);\n`;
    });
  }

  if (registeredTaxonomies.length > 0) {
    php += `\n\n// Automatically register custom taxonomies for Polylang translation support
add_filter('pll_get_taxonomies', function($taxonomies, $is_settings) {
${registeredTaxonomies.map((tax) => `    $taxonomies['${tax}'] = '${tax}';`).join('\n')}
    return $taxonomies;
}, 10, 2);`;

    const taxArrayStr = registeredTaxonomies.map(tax => `'${tax}'`).join(', ');
    php += `\n\n// Automatically expose custom taxonomy metadata in WordPress REST API
add_action('rest_api_init', function() {
    $taxonomies = array(${taxArrayStr});
    foreach ($taxonomies as $tax) {
        register_rest_field($tax, 'meta', array(
            'get_callback' => function($term) use ($tax) {
                $term_id = $term['id'];
                
                // Retrieve values using ACF if available, or direct term meta as fallback
                $featured_image = function_exists('get_field') ? get_field('featured_image', 'term_' . $term_id) : null;
                $flag = function_exists('get_field') ? get_field('flag', 'term_' . $term_id) : null;
                
                if (empty($featured_image)) {
                    $featured_image = get_term_meta($term_id, 'featured_image', true);
                }
                if (empty($flag)) {
                    $flag = get_term_meta($term_id, 'flag', true);
                }
                
                return array(
                    'featured_image' => !empty($featured_image) ? $featured_image : '',
                    'flag'           => !empty($flag) ? $flag : ''
                );
            },
            'update_callback' => null,
            'schema'          => null,
        ));
    }
});`;
  }

  if (translatablePtKeys.length > 0 || registeredTaxonomies.length > 0) {
    const ptArrayStr = translatablePtKeys.map(pt => `'${pt}'`).join(', ');
    const taxArrayStr = registeredTaxonomies.map(tax => `'${tax}'`).join(', ');
    php += `\n\n// Automatically enable Polylang translation support for custom post types and taxonomies in WP Admin settings
add_action('admin_init', function() {
    $options = get_option('polylang');
    if (is_array($options)) {
        $modified = false;
        
        $cpts_to_enable = array(${ptArrayStr});
        if (!isset($options['post_types'])) {
            $options['post_types'] = array();
        }
        foreach ($cpts_to_enable as $cpt) {
            if (!in_array($cpt, $options['post_types'])) {
                $options['post_types'][] = $cpt;
                $modified = true;
            }
        }
        
        $taxonomies_to_enable = array(${taxArrayStr});
        if (!isset($options['taxonomies'])) {
            $options['taxonomies'] = array();
        }
        foreach ($taxonomies_to_enable as $tax) {
            if (!in_array($tax, $options['taxonomies'])) {
                $options['taxonomies'][] = $tax;
                $modified = true;
            }
        }
        
        if ($modified) {
            update_option('polylang', $options);
            flush_rewrite_rules();
        }
    }
});

// Automatically filter out Polylang internal hidden taxonomies from relationship fields to prevent empty selections and '0' labels
add_filter('get_object_taxonomies', function($taxonomies, $object, $output) {
    if (is_admin() && is_array($taxonomies)) {
        foreach ($taxonomies as $key => $tax) {
            $tax_name = is_object($tax) ? $tax->name : $tax;
            if ($tax_name === 'post_translations' || $tax_name === 'term_translations' || strpos($tax_name, 'pll_') === 0) {
                unset($taxonomies[$key]);
            }
        }
        if ($output !== 'objects') {
            $taxonomies = array_values($taxonomies);
        }
    }
    return $taxonomies;
}, 99, 3);`;
  }
  return php;
})()}
`;
      }
    }
  } catch (e) {}

  let fontsEnqueue = '';
  let preconnectFilter = '';

  if (googleFonts.length > 0) {
    const fontsParam = googleFonts
      .map((f) => encodeURIComponent(f))
      .join('&family=');
    fontsEnqueue = `
    // Enqueue Google Fonts (dynamic preset via wp.config.ts)
    wp_enqueue_style(
        '${config.textDomain}-google-fonts',
        'https://fonts.googleapis.com/css2?family=${fontsParam}&display=swap',
        array(),
        null
    );`;

    preconnectFilter = `
/**
 * Add preconnect resource hints for Google Fonts performance.
 */
function forgewp_google_fonts_resource_hints(array $urls, string $relation_type): array {
    if (wp_style_is('${config.textDomain}-google-fonts', 'queue') && 'preconnect' === $relation_type) {
        $urls[] = array(
            'href' => 'https://fonts.googleapis.com',
            'crossorigin' => 'anonymous',
        );
        $urls[] = array(
            'href' => 'https://fonts.gstatic.com',
            'crossorigin' => 'anonymous',
        );
    }
    return $urls;
}
add_filter('wp_resource_hints', 'forgewp_google_fonts_resource_hints', 10, 2);
`;
  }

  let blocksRegistration = '';
  if (blockSlugs.length > 0) {
    blocksRegistration = `
/**
 * Register dynamic Gutenberg blocks compiled by ForgeWP.
 */
function forgewp_register_dynamic_blocks(): void {
    $blocks = array(${blockSlugs.map((s) => `'${s.name.replace('forgewp/', '')}'`).join(', ')});
    foreach ($blocks as $block) {
        register_block_type(__DIR__ . '/blocks/' . $block);
    }
}
add_action('init', 'forgewp_register_dynamic_blocks');

/**
 * Enqueue Block Editor JavaScript to dynamically render block interfaces.
 */
function forgewp_enqueue_block_editor_assets(): void {
    wp_enqueue_script(
        'forgewp-editor-script',
        get_template_directory_uri() . '/assets/forgewp-editor.js',
        array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render'),
        FORGEWP_THEME_VERSION,
        true
    );

    wp_localize_script(
        'forgewp-editor-script',
        'forgeWpBlocks',
        json_decode('${JSON.stringify(blockSlugs).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')
    );
}
add_action('enqueue_block_editor_assets', 'forgewp_enqueue_block_editor_assets');
`;
  }

  let registerMenusPhp = '';
  const menuLocations = Object.keys(menus).filter((k) => !k.startsWith('_'));
  if (menuLocations.length > 0) {
    registerMenusPhp = `
    // Register custom navigation menus from sitemap config
    register_nav_menus(array(
${menuLocations.map((loc) => `        '${loc}' => __('${loc.charAt(0).toUpperCase() + loc.slice(1)} Navigation', '${config.textDomain}'),`).join('\n')}
    ));`;
  }

  const pagesPhpArray = pagesToAutoCreate
    .map((p) => {
      return `        array(
            'title'    => '${p.title.replace(/'/g, "\\'")}',
            'slug'     => '${p.slug.replace(/'/g, "\\'")}',
            'template' => '${p.template.replace(/'/g, "\\'")}',
        )`;
    })
    .join(',\n');

  const menuItemsPhpArray = Object.entries(menus)
    .filter(([loc]) => !loc.startsWith('_'))
    .map(([loc, items]) => {
      const itemsPhp = items
        .map((item) => {
          return `            array(
                'title' => '${item.title.replace(/'/g, "\\'")}',
                'url'   => '${item.url.replace(/'/g, "\\'")}',
            )`;
        })
        .join(',\n');
      return `        '${loc}' => array(
${itemsPhp}
        )`;
    })
    .join(',\n');

  const schemaDefaultsPhpLines = [];
  for (const [templateSlug, schema] of Object.entries(schemas)) {
    const templateName = `page-${templateSlug}.php`;
    const fieldsPhpLines = [];
    for (const [key, field] of Object.entries(schema)) {
      if (field && typeof field.default !== 'undefined') {
        let defaultValStr = '';
        if (typeof field.default === 'object') {
          defaultValStr = JSON.stringify(field.default);
        } else {
          defaultValStr = String(field.default);
        }
        const escapedVal = defaultValStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        fieldsPhpLines.push(`            '${key}' => '${escapedVal}',`);
      }
    }
    if (fieldsPhpLines.length > 0) {
      schemaDefaultsPhpLines.push(`        '${templateName}' => array(
${fieldsPhpLines.join('\n')}
        )`);
    }
  }
  const schemaDefaultsPhp = schemaDefaultsPhpLines.join(',\n');

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
        $existing_page = get_page_by_path($p['slug']);
        $page_id = 0;
        if (!$existing_page) {
            if (!$has_run) {
                $page_id = wp_insert_post(array(
                    'post_title'    => $p['title'],
                    'post_name'     => $p['slug'],
                    'post_status'   => 'publish',
                    'post_type'     => 'page',
                ));
                if (!is_wp_error($page_id) && $page_id > 0) {
                    update_post_meta($page_id, '_wp_page_template', $p['template']);
                }
            }
        } else {
            $page_id = $existing_page->ID;
            update_post_meta($page_id, '_wp_page_template', $p['template']);
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

    if (!$has_run) {
        $menu_structure = array(
${menuItemsPhpArray}
        );

        foreach ($menu_structure as $location => $items) {
            $menu_name = ucfirst($location) . ' Navigation';
            $menu_exists = wp_get_nav_menu_object($menu_name);
            
            if (!$menu_exists) {
                $menu_id = wp_create_nav_menu($menu_name);
                if (!is_wp_error($menu_id)) {
                    $locations = get_theme_mod('nav_menu_locations');
                    if (!is_array($locations)) {
                        $locations = array();
                    }
                    $locations[$location] = $menu_id;
                    set_theme_mod('nav_menu_locations', $locations);
                    
                    foreach ($items as $item) {
                        $item_title = $item['title'];
                        $item_url = $item['url'];
                        
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
                        
                        wp_update_nav_menu_item($menu_id, 0, array(
                            'menu-item-title'     => $item_title,
                            'menu-item-url'       => $target_url,
                            'menu-item-object-id' => $object_id,
                            'menu-item-object'    => $object_type === 'page' ? 'page' : '',
                            'menu-item-type'      => $object_type === 'page' ? 'post_type' : 'custom',
                            'menu-item-status'    => 'publish',
                        ));
                    }
                }
            }
        }
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

  let hydrationEnqueue = '';
  if (hydrationData && hydrationData.mapping) {
    const mainJs = hydrationData.mainJsFile.replace(/^.*?[/\\]?assets[/\\]/, '');
    const manifestPairs = Object.entries(hydrationData.mapping)
      .map(([key, val]) => {
        const cleanVal = val.replace(/^.*?[/\\]?assets[/\\]/, '');
        return `                    '${key}' => 'assets/${cleanVal}'`;
      })
      .join(',\n');

    // Load mock site settings for hydration payloads
    let siteSettingsJson = {};
    const siteSettingsPath = path.join(themeRoot, 'cms', 'site-settings.json');
    if (existsSync(siteSettingsPath)) {
      try {
        siteSettingsJson = JSON.parse(readFileSync(siteSettingsPath, 'utf8'));
      } catch (e) {
        console.warn(
          'Failed to parse site-settings.json for hydration:',
          e.message,
        );
      }
    }

    // Generate dynamic PHP for options collection
    const optionKeys = Object.keys(siteSettingsJson.options || {});
    const optionsPairs = optionKeys
      .map((key) => {
        const defaultVal = siteSettingsJson.options[key];
        let phpDefault = 'false';
        if (typeof defaultVal === 'string') {
          phpDefault = `'${defaultVal.replace(/'/g, "\\'")}'`;
        } else if (typeof defaultVal === 'number' || typeof defaultVal === 'boolean') {
          phpDefault = String(defaultVal);
        }
        return `                        '${key}' => get_option('${key}', ${phpDefault})`;
      })
      .join(',\n');

    // Generate dynamic PHP for theme_mods collection
    const themeModKeys = Object.keys(siteSettingsJson.theme_mods || {});
    const themeModsPairs = themeModKeys
      .map((key) => {
        const defaultVal = siteSettingsJson.theme_mods[key];
        let phpDefault = 'false';
        if (typeof defaultVal === 'string') {
          phpDefault = `'${defaultVal.replace(/'/g, "\\'")}'`;
        } else if (typeof defaultVal === 'number' || typeof defaultVal === 'boolean') {
          phpDefault = String(defaultVal);
        } else if (typeof defaultVal === 'object' && defaultVal !== null) {
          phpDefault = 'array()';
        }
        return `                        '${key}' => get_theme_mod('${key}', ${phpDefault})`;
      })
      .join(',\n');

    const pageTemplateSlugs = pagesToAutoCreate.map((p) =>
      p.template.replace(/^page-/, '').replace(/\.php$/, ''),
    );

    let page_links_php = '';
    for (const slug of pageTemplateSlugs) {
      const safeVar = slug.replace(/[^a-zA-Z0-9]/g, '_');
      page_links_php += `        $get_pages_args_${safeVar} = array(
            'meta_key' => '_wp_page_template',
            'meta_value' => 'page-${slug}.php',
            'number' => 1
        );
        if (!empty($current_lang)) {
            $get_pages_args_${safeVar}['lang'] = $current_lang;
        }
        $matched_pages_${safeVar} = get_pages($get_pages_args_${safeVar});
        $page_links['${slug}'] = !empty($matched_pages_${safeVar}) ? get_permalink($matched_pages_${safeVar}[0]->ID) : '';\n`;
    }

    const repeaterFields = {};
    for (const [templateSlug, schema] of Object.entries(schemas)) {
      for (const [key, field] of Object.entries(schema)) {
        if (field.type === 'repeater' && field.fields) {
          repeaterFields[key] = Object.keys(field.fields);
        }
      }
    }
    const repeaterFieldsPhp = Object.entries(repeaterFields)
      .map(([metaKey, subKeys]) => {
        const subKeysStr = subKeys.map((k) => `'${k}'`).join(', ');
        return `                '${metaKey}' => array(${subKeysStr})`;
      })
      .join(',\n');

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
            'window.forgeWpHydration = ' . wp_json_encode(array(
                'themeUri' => $theme_uri,
                'menus' => $hydrated_menus,
                'pageLinks' => $page_links,
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
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';',
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

        $post_custom_fields = array();
        $post_id = get_the_ID();
        if ($post_id > 0) {
            $registered_keys = array(${Array.from(uniqueMetaKeys).map(k => `'${k}'`).join(', ')});
            $rich_text_keys = array(${uniqueRichTextKeys.map(k => `'${k}'`).join(', ')});
            $repeater_fields_map = array(
${repeaterFieldsPhp}
            );
            foreach ($registered_keys as $key) {
                if (array_key_exists($key, $repeater_fields_map)) {
                    $post_custom_fields[$key] = forgewp_get_repeater_field($key, $repeater_fields_map[$key], $post_id);
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
                    if (in_array($key, $rich_text_keys) && is_string($val)) {
                        $val = wpautop($val);
                    }
                    $post_custom_fields[$key] = $val;
                }
            }
        }

        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'if (!window.forgeWpHydration) { window.forgeWpHydration = {}; } window.forgeWpHydration.post = ' . wp_json_encode(array(
                'id' => $post_id,
                'customFields' => $post_custom_fields
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . ';',
            'before'
        );
    }

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
    `;
  }

  // ── Tier 2: Native Post Meta Registrations ──
  let nativeMetaRegisters = '';
  if (uniqueMetaKeys.size > 0) {
    const metaArray = Array.from(uniqueMetaKeys);
    
    // Convert postTypes array into PHP array declaration
    const ptListStr = postTypes.length > 0 ? postTypes.map(pt => `'${pt}'`).join(', ') : '';
    const allPtExpr = ptListStr ? `array_merge(array('post', 'page'), array(${ptListStr}))` : `array('post', 'page')`;

    nativeMetaRegisters = `
/**
 * Register native post meta fields for all templates (Tier 2 Structured Content).
 */
function forgewp_register_custom_post_meta(): void {
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

  // ── Tier 3: Advanced Custom Fields (ACF) local field groups ──
  let acfFieldGroups = '';
  if (Object.keys(schemas).length > 0 || registeredTaxonomies.length > 0) {
    const groups = [];
    for (const [templateSlug, schema] of Object.entries(schemas)) {
      const groupKey = `group_${templateSlug.replace(/-/g, '_')}`;
      const groupTitle = templateSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Content';
      
      let fieldsPhp = '    $fields = array();\n';
      for (const [key, field] of Object.entries(schema)) {
        fieldsPhp += generateDynamicAcfFieldPhp(key, field);
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

    // Custom fields for custom taxonomies (like destination countries)
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

  let queryEndpointsPhp = '';
  if (queries && queries.length > 0) {
    queryEndpointsPhp += `\n\n/**\n * ── Compiled REST Query Endpoints (Milestone 2) ──\n */\n`;
    queryEndpointsPhp += `
if (!function_exists('forgewp_format_rest_post')) {
    function forgewp_format_rest_post(\$post) {
        \$id = \$post->ID;
        \$title = get_the_title(\$post);
        \$excerpt = get_the_excerpt(\$post);
        
        \$content = apply_filters('the_content', \$post->post_content);
        \$date = get_the_date('', \$post);
        \$author = get_the_author_meta('display_name', \$post->post_author);
        
        \$featured_image = 'https://picsum.photos/seed/forgewp/1200/630';
        if (has_post_thumbnail(\$post)) {
            \$thumbnail_url = get_the_post_thumbnail_url(\$post, 'full');
            if (\$thumbnail_url) {
                \$featured_image = \$thumbnail_url;
            }
        }
        
        \$permalink = get_permalink(\$post);
        
        \$custom_fields = array();
        \$meta = get_post_meta(\$id);
        if (is_array(\$meta)) {
            foreach (\$meta as \$key => \$values) {
                \$val = isset(\$values[0]) ? maybe_unserialize(\$values[0]) : '';
                \$custom_fields[\$key] = \$val;
            }
        }
        
        if (function_exists('get_fields')) {
            \$acf_fields = get_fields(\$id);
            if (is_array(\$acf_fields)) {
                \$custom_fields = array_merge(\$custom_fields, \$acf_fields);
            }
        }
        
        \$terms_data = array();
        \$taxonomies = get_object_taxonomies(\$post->post_type);
        if (is_array(\$taxonomies)) {
            foreach (\$taxonomies as \$taxonomy) {
                \$terms = get_the_terms(\$post, \$taxonomy);
                if (is_array(\$terms)) {
                    \$terms_data[\$taxonomy] = array();
                    foreach (\$terms as \$t) {
                        \$terms_data[\$taxonomy][] = array(
                            'id' => \$t->term_id,
                            'slug' => \$t->slug,
                            'name' => html_entity_decode(\$t->name, ENT_QUOTES, 'UTF-8'),
                        );
                    }
                }
            }
        }
        
        return array(
            'ID' => \$id,
            'title' => \$title,
            'excerpt' => \$excerpt,
            'content' => \$content,
            'date' => \$date,
            'author' => \$author,
            'featuredImage' => \$featured_image,
            'permalink' => \$permalink,
            'customFields' => \$custom_fields,
            '_terms' => \$terms_data,
            'post_type' => \$post->post_type,
        );
    }
}
`;

    queryEndpointsPhp += `
add_action('rest_api_init', function() {`;
    for (const q of queries) {
      const cleanId = q.queryId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const querySlug = 'query-' + cleanId;
      const callbackName = 'forgewp_rest_query_' + cleanId.replace(/-/g, '_');
      queryEndpointsPhp += `
    register_rest_route('forgewp/v1', '/${querySlug}', array(
        'methods'             => 'GET',
        'callback'            => '${callbackName}',
        'permission_callback' => '__return_true',
    ));`;
    }
    queryEndpointsPhp += `
});
`;

    for (const q of queries) {
      const cleanId = q.queryId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const callbackName = 'forgewp_rest_query_' + cleanId.replace(/-/g, '_');
      const phpArgs = generatePhpArgs(q);
      
      queryEndpointsPhp += `
function ${callbackName}(WP_REST_Request \$request) {
    \$paged = \$request->get_param('page') ? intval(\$request->get_param('page')) : 1;
    \$s = \$request->get_param('search');
    if (empty(\$s)) {
        \$s = \$request->get_param('s');
    }
    
    ${phpArgs}
    
    if (!empty(\$s)) {
        \$args['s'] = sanitize_text_field(\$s);
    }
    
    \$lang = \$request->get_param('lang');
    if (!empty(\$lang)) {
        \$args['lang'] = sanitize_text_field(\$lang);
    }
    
    \$query = new WP_Query(\$args);
    \$posts = array();
    if (\$query->have_posts()) {
        while (\$query->have_posts()) {
            \$query->the_post();
            \$posts[] = forgewp_format_rest_post(\$query->post);
        }
        wp_reset_postdata();
    }
    
    return new WP_REST_Response(array(
        'posts'      => \$posts,
        'total'      => intval(\$query->found_posts),
        'totalPages' => intval(\$query->max_num_pages),
    ), 200);
}
`;
    }
  }

  return `<?php
/**
 * ${config.name} — generated by ForgeWP
 *
 * @package ${config.textDomain}
 */

if (! defined('ABSPATH')) {
    exit;
}

define('FORGEWP_THEME_VERSION', '${version}');

/**
 * Helper to fetch any repeater field, bypassing ACF internal formatting if needed.
 */
function forgewp_get_repeater_field($meta_key, $sub_field_keys, $post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    if (!$post_id) {
        return array();
    }
    
    $rows = array();
    
    // 1. Try get_field first
    if (function_exists('get_field')) {
        $val = get_field($meta_key, $post_id);
        if (is_array($val) && !empty($val)) {
            $rows = $val;
        }
    }
    
    // 2. Direct DB query using ACF structure
    if (empty($rows)) {
        $count = get_post_meta($post_id, $meta_key, true);
        if (is_numeric($count) && intval($count) > 0) {
            $count = intval($count);
            for ($i = 0; $i < $count; $i++) {
                $row = array();
                foreach ($sub_field_keys as $sub_key) {
                    $sub_val = get_post_meta($post_id, "{$meta_key}_{$i}_{$sub_key}", true);
                    if (is_string($sub_val) && (strpos($sub_val, '[') === 0 || strpos($sub_val, '{') === 0)) {
                        $decoded = json_decode($sub_val, true);
                        if (is_array($decoded)) {
                            $sub_val = $decoded;
                        }
                    }
                    $row[$sub_key] = $sub_val;
                }
                $rows[] = $row;
            }
        }
    }
    
    // 3. Fallback to json_fallback
    if (empty($rows)) {
        $fallback = get_post_meta($post_id, "{$meta_key}_json_fallback", true);
        if (is_string($fallback) && !empty($fallback)) {
            $decoded = json_decode($fallback, true);
            if (is_array($decoded)) {
                $rows = $decoded;
            }
        }
    }
    
    // 4. Raw JSON fallback
    if (empty($rows)) {
        $raw_meta = get_post_meta($post_id, $meta_key, true);
        if (is_string($raw_meta) && !empty($raw_meta)) {
            $decoded = json_decode($raw_meta, true);
            if (is_array($decoded)) {
                $rows = $decoded;
            }
        }
    }
    
    // Normalize rows to resolve image arrays/IDs to URLs
    if (is_array($rows)) {
        foreach ($rows as $index => $row) {
            if (is_array($row)) {
                foreach ($row as $sub_key => $sub_val) {
                    if (is_string($sub_val) && (strpos($sub_val, '[') === 0 || strpos($sub_val, '{') === 0)) {
                        $decoded = json_decode($sub_val, true);
                        if (is_array($decoded)) {
                            $sub_val = $decoded;
                        }
                    }
                    
                    if (is_array($sub_val) && isset($sub_val['url'])) {
                        $sub_val = $sub_val['url'];
                    } elseif (is_numeric($sub_val) && intval($sub_val) > 0 && get_post_type(intval($sub_val)) === 'attachment') {
                        $url = wp_get_attachment_image_url(intval($sub_val), 'full');
                        if ($url) {
                            $sub_val = $url;
                        }
                    }
                    
                    $rows[$index][$sub_key] = $sub_val;
                }
            }
        }
    }
    
    return is_array($rows) ? $rows : array();
}

/**
 * Helper to fetch and format page/post meta fields, resolving ACF formatting and attachments.
 */
function forgewp_get_meta_value($key, $default_val = '', $is_rich_text = false) {
    $post_id = get_the_ID();
    if (!$post_id) {
        return $default_val;
    }
    
    $val = null;
    
    // 1. Try get_field first if ACF is active
    if (function_exists('get_field')) {
        $val = get_field($key, $post_id);
    }
    
    // 2. Direct get_post_meta fallback
    if ($val === null || $val === false) {
        $val = get_post_meta($post_id, $key, true);
    }
    
    // 3. Fallback to default if empty
    if ($val === null || $val === false || $val === '') {
        return $default_val;
    }
    
    // 4. Resolve Image Arrays / Objects (ACF formats)
    if (is_array($val) && isset($val['url'])) {
        $val = $val['url'];
    }
    // 5. Resolve Attachment IDs to URLs
    elseif (is_numeric($val) && intval($val) > 0 && get_post_type(intval($val)) === 'attachment') {
        $url = wp_get_attachment_image_url(intval($val), 'full');
        if ($url) {
            $val = $url;
        }
    }
    
    // 6. Format and escape
    if ($is_rich_text) {
        return wpautop($val);
    } else {
        return esc_html($val);
    }
}

/**
 * Resolves the menu ID for a location and language, using WordPress nav menu locations.
 */
function forgewp_get_menu_id_for_lang($location, $lang = '') {
    $locations = get_nav_menu_locations();
    
    if (empty($locations) || !is_array($locations)) {
        return null;
    }
    
    // 1. Try to find the language-specific location key (e.g. primary___de)
    if (!empty($lang)) {
        $lang_key = $location . '___' . $lang;
        if (isset($locations[$lang_key])) {
            return $locations[$lang_key];
        }
    }
    
    // 2. Try to find the base location key (e.g. primary)
    if (isset($locations[$location])) {
        return $locations[$location];
    }
    
    // 3. Fallback to any matching key in the locations array
    foreach ($locations as $key => $val) {
        if ($key === $location || strpos($key, $location . '___') === 0) {
            return $val;
        }
    }
    
    return null;
}

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
add_action('wp_enqueue_scripts', 'forgewp_enqueue_assets');

/**
 * Theme supports.
 */
function forgewp_theme_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
${wpBlockStylesLine}    add_theme_support('editor-styles');

    // Load compiled theme stylesheet inside Gutenberg Block Editor
    add_editor_style('assets/${css}');
${registerMenusPhp}
}
add_action('after_setup_theme', 'forgewp_theme_setup');
${preconnectFilter}${blocksRegistration}${cptRegistration}${autoCreationPhp}${nativeMetaRegisters}${acfFieldGroups}

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
 * Custom document title filter for ForgeWP.
 * Maps title enqueued via <WpHead /> in React to WordPress.
 */
function forgewp_custom_document_title( $title ) {
    if ( defined('WPSEO_VERSION') || class_exists('RankMath') || class_exists('All_in_One_SEO_Pack') || defined('AIOSEO_VERSION') ) {
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
${seoPluginsPhp}

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
        if ($translations === null) {
            $file = get_template_directory() . '/translations.json';
            if (file_exists($file)) {
                $translations = json_decode(file_get_contents($file), true);
            } else {
                $translations = array();
            }
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
 * Maps dynamic icon slugs to inline SVGs from Lucide or custom developer uploads.
 */
function forgewp_render_theme_icon($icon_slug, $class_name = '', $provider = 'lucide') {
    $svgs = array(
        'award'  => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>',
        'shield' => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>',
        'globe'  => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>',
        'users'  => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    );

    $custom_svgs = get_option(\'forgewp_custom_icons\', array());
    if ($provider === \'custom\' && isset($custom_svgs[$icon_slug])) {
        $svg = $custom_svgs[$icon_slug];
    } else {
        $svg = isset($svgs[$icon_slug]) ? $svgs[$icon_slug] : '';
    }

    if (!empty($svg)) {
        if (!empty($class_name)) {
            $svg = str_replace('<svg ', '<svg class="' . esc_attr($class_name) . '" ', $svg);
        }
        echo $svg;
    }
}
${faviconPhp}${sitemapsPhp}${queryEndpointsPhp}

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
`;
}

