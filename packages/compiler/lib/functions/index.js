import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildThemeSetupPhp } from './theme-setup.js';
import { buildRoutingPhp } from './routing.js';
import { buildHydrationEnqueuerPhp } from './hydration-enqueuer.js';
import { buildRestEndpointsPhp } from './rest-endpoints.js';
import { buildSettingsPagePhp } from './settings-page.js';
import { buildFormsPhp } from './forms.js';

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
  wpOptions = [],
) {
  let hasAuth = false;
  try {
    const packageJsonPath = path.join(themeRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (
        (pkg.dependencies && pkg.dependencies['@forgewp/auth']) ||
        (pkg.devDependencies && pkg.devDependencies['@forgewp/auth']) ||
        (pkg.peerDependencies && pkg.peerDependencies['@forgewp/auth'])
      ) {
        hasAuth = true;
      }
    }
  } catch (e) {
    console.error('[DEBUG-BUILD] error:', e);
  }

  const defaultLoginField = config.auth?.loginField || 'usernameAndEmail';
  const defaultRegistrationEnabled = config.auth?.features?.registration !== false ? '1' : '0';
  const defaultEmailVerificationEnabled = config.auth?.features?.emailVerification === true ? '1' : '0';
  const defaultBlockLoginUntilVerified = config.auth?.features?.blockLoginUntilVerified === true ? '1' : '0';
  const defaultAutoLoginAfterSignup = config.auth?.features?.autoLoginAfterSignup !== false ? '1' : '0';
  const defaultDefaultRole = config.auth?.defaultRole || 'subscriber';
  const defaultVerificationEmailSubject = config.auth?.emails?.verification?.subject || 'Please Verify Your Email';
  const defaultVerificationEmailBody = config.auth?.emails?.verification?.body || 'Please click the link below to verify your email address:\n\n{verification_url}';
  const defaultPasswordResetEmailSubject = config.auth?.emails?.passwordReset?.subject || 'Password Reset Request';
  const defaultPasswordResetEmailBody = config.auth?.emails?.passwordReset?.body || 'Click this link to reset your password:\n\n{reset_url}';

  const reservedUsernames = config.auth?.reservedUsernames || ['admin', 'system', 'root'];
  const reservedUsernamesPhp = reservedUsernames.map(u => `'${u.toLowerCase().replace(/'/g, "\\'")}'`).join(', ');

  let currentUserHydrationField = '';
  if (hasAuth) {
    currentUserHydrationField = "\n                'currentUser' => forgewp_get_current_user_hydration_payload(),";
  }

  const css = assets.cssFile.replace(/^assets\//, '');
  
  // Schema-graph integration is gated on actual plugin presence at runtime
  // (defined('WPSEO_VERSION') / class_exists('RankMath')), not a separate
  // wp.config.ts flag — a manual opt-in flag can silently drift out of sync
  // with whichever plugin is actually installed, which previously meant a
  // developer could have Yoast active and forget to also set
  // config.seo.plugins.yoast, causing ForgeWP's schema to silently never
  // reach Yoast's graph. Emitting both integrations unconditionally (each
  // wrapped in its own presence check) makes this automatic instead.
  let seoPluginsPhp = `
/**
 * Automatically integrate ForgeWP enqueued schemas with Yoast SEO Schema Graph.
 */
if (defined('WPSEO_VERSION')) {
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
}

/**
 * Automatically integrate ForgeWP enqueued schemas with RankMath JSON-LD.
 */
if (class_exists('RankMath')) {
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
}
`;

  // Discover social media options dynamically from config.options
  let socialKeys = ['facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'linkedin', 'pinterest']; // default fallbacks
  if (config.options && typeof config.options === 'object') {
    const optionsKeys = Object.keys(config.options);
    const discoveredSocials = optionsKeys
      .filter(k => k.startsWith('social_'))
      .map(k => k.replace(/^social_/, ''));
    if (discoveredSocials.length > 0) {
      socialKeys = Array.from(new Set([...socialKeys, ...discoveredSocials]));
    }
  }

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
          !k.startsWith('_'),
      );
      if (postTypes.length > 0) {
        const taxonomiesSet = new Set();
        const postTypeTaxonomies = {};
        const postTypeNativeTaxonomies = {};
        
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

  const googleFonts = config.settings?.typography?.googleFonts || [];
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
    const customCategories = [];
    const seenCategories = new Set();
    for (const block of blockSlugs) {
      if (block.category && block.category.startsWith('forgewp-')) {
        const slug = block.category;
        if (!seenCategories.has(slug)) {
          seenCategories.add(slug);
          const rawName = slug.replace('forgewp-', '');
          const title = 'ForgeWP ' + rawName.charAt(0).toUpperCase() + rawName.slice(1);
          customCategories.push({ slug, title });
        }
      }
    }

    let categoriesHook = '';
    if (customCategories.length > 0) {
      const categoriesPhpArray = customCategories
        .map((c) => `        array('slug' => '${c.slug}', 'title' => '${c.title}')`)
        .join(',\n');

      categoriesHook = `
/**
 * Register custom block categories for ForgeWP.
 */
function forgewp_register_custom_block_categories($categories): array {
    return array_merge(
        $categories,
        array(
${categoriesPhpArray}
        )
    );
}
add_filter('block_categories_all', 'forgewp_register_custom_block_categories', 10, 2);
`;
    }

    // dualHostMeta: block attribute key → ACF/post meta key (from pickEditable maps)
    const dualHostByBlock = {};
    for (const b of blockSlugs) {
      if (b.dualHostMeta && typeof b.dualHostMeta === 'object' && Object.keys(b.dualHostMeta).length) {
        dualHostByBlock[b.name] = b.dualHostMeta;
      }
    }
    const dualHostJson = JSON.stringify(dualHostByBlock);

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
${categoriesHook}
/**
 * Dual-host sync: when a ForgeWP block with pickEditable fields is saved in
 * post content, copy attribute values into post meta (ACF keys).
 *
 * Baked page templates read useWpMeta / ACF — without this, editor block edits
 * never reach the visitor. Attribute name (e.g. stat1Value) maps to meta key
 * (e.g. trust_stat1_value) via dualHostMeta from pickEditable maps.
 *
 * Runs late (priority 99). Only syncs a field when the BLOCK's own attribute
 * value has actually changed since the last time this hook saw it (tracked
 * in a shadow map) — otherwise a block that's simply present but untouched
 * would keep re-writing its stale value over an edit made directly via the
 * ACF metabox in the same request. A genuine same-request conflict (both
 * the block AND the ACF field edited together) still resolves to the block
 * value, matching the original intent for that narrower case.
 */
function forgewp_sync_dual_host_block_meta( $post_id ): void {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
        return;
    }
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    // REST / CLI saves may not have a capability user in every context; only
    // skip when we can positively determine the user cannot edit.
    if ( is_user_logged_in() && ! current_user_can( 'edit_post', $post_id ) ) {
        return;
    }
    $map_by_block = json_decode( <<<'FORGEWP_DUAL_HOST'
${dualHostJson}
FORGEWP_DUAL_HOST
    , true );
    if ( ! is_array( $map_by_block ) || empty( $map_by_block ) ) {
        return;
    }
    $post = get_post( $post_id );
    if ( ! $post || empty( $post->post_content ) ) {
        return;
    }
    if ( ! function_exists( 'parse_blocks' ) ) {
        return;
    }
    $blocks = parse_blocks( $post->post_content );
    if ( ! is_array( $blocks ) ) {
        return;
    }
    $write_meta = static function( $post_id, $meta_key, $val ): void {
        // Prefer ACF so field formatting / reference keys stay consistent.
        if ( function_exists( 'update_field' ) ) {
            // update_field returns false on missing field definition; fall through.
            $ok = update_field( $meta_key, $val, $post_id );
            if ( $ok !== false ) {
                return;
            }
        }
        update_post_meta( $post_id, $meta_key, $val );
        if ( function_exists( 'acf_get_field' ) || function_exists( 'get_field' ) ) {
            update_post_meta( $post_id, '_' . $meta_key, 'field_' . $meta_key );
        }
    };
    $shadow_key = '_forgewp_dual_host_shadow';
    $shadow = get_post_meta( $post_id, $shadow_key, true );
    if ( ! is_array( $shadow ) ) {
        $shadow = array();
    }
    $shadow_changed = false;
    $walk = function( $list ) use ( &$walk, $map_by_block, $post_id, $write_meta, &$shadow, &$shadow_changed ) {
        foreach ( $list as $block ) {
            if ( empty( $block['blockName'] ) ) {
                if ( ! empty( $block['innerBlocks'] ) ) {
                    $walk( $block['innerBlocks'] );
                }
                continue;
            }
            $name = $block['blockName'];
            if ( isset( $map_by_block[ $name ] ) && is_array( $map_by_block[ $name ] ) ) {
                $attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
                foreach ( $map_by_block[ $name ] as $attr_key => $meta_key ) {
                    if ( ! is_string( $meta_key ) || $meta_key === '' ) {
                        continue;
                    }
                    // Only keys present in the serialized block — unchanged
                    // defaults may be omitted by WP and must not wipe meta.
                    if ( ! array_key_exists( $attr_key, $attrs ) ) {
                        continue;
                    }
                    $block_val = $attrs[ $attr_key ];
                    $block_val_changed = ! array_key_exists( $meta_key, $shadow ) || $shadow[ $meta_key ] !== $block_val;
                    if ( $block_val_changed ) {
                        $write_meta( $post_id, $meta_key, $block_val );
                        $shadow[ $meta_key ] = $block_val;
                        $shadow_changed = true;
                    }
                }
            }
            if ( ! empty( $block['innerBlocks'] ) ) {
                $walk( $block['innerBlocks'] );
            }
        }
    };
    $walk( $blocks );
    if ( $shadow_changed ) {
        update_post_meta( $post_id, $shadow_key, $shadow );
    }
}
add_action( 'save_post', 'forgewp_sync_dual_host_block_meta', 99, 1 );
// Block editor REST saves also fire save_post; these are belt-and-suspenders.
add_action( 'rest_after_insert_post', function( $post ) {
    if ( $post instanceof WP_Post ) {
        forgewp_sync_dual_host_block_meta( (int) $post->ID );
    }
}, 20, 1 );
add_action( 'rest_after_insert_page', function( $post ) {
    if ( $post instanceof WP_Post ) {
        forgewp_sync_dual_host_block_meta( (int) $post->ID );
    }
}, 20, 1 );

/**
 * Enqueue Block Editor JavaScript to dynamically render block interfaces.
 */
function forgewp_enqueue_block_editor_assets(): void {
    wp_enqueue_script(
        'forgewp-editor-script',
        get_template_directory_uri() . '/assets/forgewp-editor.js',
        array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render', 'wp-plugins', 'wp-editor', 'wp-edit-post', 'wp-data', 'wp-core-data'),
        file_exists(get_template_directory() . '/assets/forgewp-editor.js') ? filemtime(get_template_directory() . '/assets/forgewp-editor.js') : FORGEWP_THEME_VERSION,
        true
    );

    wp_localize_script(
        'forgewp-editor-script',
        'forgeWpBlocks',
        json_decode(<<<'FORGEWP_BLOCKS'
${JSON.stringify(blockSlugs.map(({ edit: _e, render: _r, ...b }) => b))}
FORGEWP_BLOCKS
        )
    );

    $editor_css_path = get_template_directory() . '/assets/${css}';
    $editor_css = '';
    if (file_exists($editor_css_path)) {
        $editor_css = file_get_contents($editor_css_path);
        $editor_css = preg_replace('/^@import\\s*(?:url\\([^)]+\\)|"[^"]+"|\\\'[^\\\']+\\\')\\s*;/m', '', $editor_css);
    }
    wp_add_inline_script(
        'forgewp-editor-script',
        'window.forgeWpEditorCss = ' . wp_json_encode($editor_css) . ';',
        'before'
    );
}
add_action('enqueue_block_editor_assets', 'forgewp_enqueue_block_editor_assets');

function forgewp_enqueue_block_styles(): void {
    wp_enqueue_style(
        'forgewp-editor-styles',
        get_template_directory_uri() . '/assets/${css}',
        array(),
        FORGEWP_THEME_VERSION
    );
    if (is_admin()) {
        wp_add_inline_style(
            'forgewp-editor-styles',
            '.editor-styles-wrapper .wp-block[class*="forgewp"] { overflow: visible; min-height: unset; }'
        );
    }
}
add_action('enqueue_block_assets', 'forgewp_enqueue_block_styles');

function forgewp_setup_editor_styles(): void {
    add_theme_support('editor-styles');
    add_editor_style('assets/${css}');
}
add_action('after_setup_theme', 'forgewp_setup_editor_styles');
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

  let manifestPairs = '';
  let optionsPairs = '';
  let themeModsPairs = '';
  let page_links_php = '';
  let repeaterFieldsPhp = '';

  if (hydrationData && hydrationData.mapping) {
    manifestPairs = Object.entries(hydrationData.mapping)
      .map(([key, val]) => {
        const cleanVal = val.replace(/^.*?[/\\]?assets[/\\]/, '');
        return `                    '${key}' => 'assets/${cleanVal}'`;
      })
      .join(',\n');

    let siteSettingsJson = {};
    const siteSettingsPath = path.join(themeRoot, 'cms', 'site-settings.json');
    if (existsSync(siteSettingsPath)) {
      try {
        siteSettingsJson = JSON.parse(readFileSync(siteSettingsPath, 'utf8'));
      } catch (e) {
        console.warn('Failed to parse site-settings.json for hydration:', e.message);
      }
    }

    optionsPairs = wpOptions
      .map((opt) => {
        const defaultVal = opt.defaultValue || '';
        const phpDefault = `'${defaultVal.replace(/'/g, "\\'")}'`;
        return `                        '${opt.name}' => get_option('${opt.name}', ${phpDefault})`;
      })
      .join(',\n');

    const themeModsObj = config.themeMods || siteSettingsJson.theme_mods || {};
    const themeModKeys = Object.keys(themeModsObj);
    themeModsPairs = themeModKeys
      .map((key) => {
        const defaultVal = themeModsObj[key];
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

    for (const slug of pageTemplateSlugs) {
      const safeVar = slug.replace(/[^a-zA-Z0-9]/g, '_');
      page_links_php += `        $__fwp_route_id_${safeVar} = forgewp_resolve_route_page_id('${slug}');
        $page_links['${slug}'] = $__fwp_route_id_${safeVar} ? get_permalink($__fwp_route_id_${safeVar}) : '';\n`;
    }

    const repeaterFields = {};
    for (const [templateSlug, schema] of Object.entries(schemas)) {
      for (const [key, field] of Object.entries(schema)) {
        if (field.type === 'repeater' && field.fields) {
          repeaterFields[key] = Object.keys(field.fields);
        }
      }
    }
    repeaterFieldsPhp = Object.entries(repeaterFields)
      .map(([metaKey, subKeys]) => {
        const subKeysStr = subKeys.map((k) => `'${k}'`).join(', ');
        return `                '${metaKey}' => array(${subKeysStr})`;
      })
      .join(',\n');
  }

  let headlessScript = '';
  if (config.headless) {
    const headlessApiUrl = config.headless.apiUrl || '';
    const headlessJwtAuth = !!config.headless.jwtAuth;
    headlessScript = `
        wp_add_inline_script(
            '${config.textDomain}-react-runtime',
            'window.FORGEWP_API_URL = ' . wp_json_encode('${headlessApiUrl}') . '; window.FORGEWP_JWT_AUTH = ${headlessJwtAuth ? 'true' : 'false'};',
            'before'
        );`;
  }

  const themeSetupPhp = buildThemeSetupPhp(
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
    menus
  );

  const routingPhp = buildRoutingPhp(
    config,
    pagesPhpArray,
    schemaDefaultsPhp,
    menuItemsPhpArray,
    socialSettingsPhp,
    postTypes
  );

  let mainJs = '';
  if (hydrationData && hydrationData.mainJsFile) {
    mainJs = hydrationData.mainJsFile.replace(/^.*?[/\\]?assets[/\\]/, '');
  }

  const hydrationEnqueuerPhp = buildHydrationEnqueuerPhp(
    config,
    assets,
    mainJs,
    uniqueMetaKeys,
    uniqueRichTextKeys,
    repeaterFieldsPhp,
    manifestPairs,
    optionsPairs,
    themeModsPairs,
    page_links_php,
    fontsEnqueue,
    i18nKeysPhp,
    headlessScript,
    currentUserHydrationField,
    defaultLoginField
  );

  const restEndpointsPhp = buildRestEndpointsPhp(
    config,
    queries,
    hasAuth,
    defaultPasswordResetEmailSubject,
    defaultPasswordResetEmailBody,
    defaultVerificationEmailSubject,
    defaultVerificationEmailBody,
    defaultLoginField,
    defaultEmailVerificationEnabled,
    defaultRegistrationEnabled,
    defaultBlockLoginUntilVerified,
    defaultAutoLoginAfterSignup,
    defaultDefaultRole,
    reservedUsernamesPhp
  );

  const formsPhp = buildFormsPhp(config);

  const _php = `<?php
/**
 * ${config.name} — generated by ForgeWP
 *
 * @package ${config.textDomain}
 */

if (! defined('ABSPATH')) {
    exit;
}

${themeSetupPhp}

${routingPhp}

${hydrationEnqueuerPhp}

${seoPluginsPhp}

${preconnectFilter}

${blocksRegistration}

${cptRegistration}

${restEndpointsPhp}

${formsPhp}

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
 * Resolves a ForgeWP route slug (e.g. "kontakt-page") to a WP post ID for the
 * current Polylang language, if any. Anchors on the "forgewp_route_id" post
 * meta set once at page-creation time (see forgewp_auto_create_pages_and_menus
 * in routing.js) rather than on the page's assigned template, because the
 * template is user-editable in wp-admin (e.g. switching a page to a generic
 * block-based template) and doing so must not break link resolution. Falls
 * back to the legacy "_wp_page_template" match for pages created before the
 * route-id marker existed. Once an anchor page is found, in any language,
 * resolves to the requested language's translation via Polylang — this means
 * only ONE language's page needs to carry the marker/template for every
 * language's link to resolve correctly.
 */
function forgewp_resolve_route_page_id($route_slug) {
    $anchor_pages = get_pages(array(
        'meta_key'   => 'forgewp_route_id',
        'meta_value' => $route_slug,
        'number'     => 1,
        // 'lang' => '': this lookup must search ALL languages to find the
        // anchor page, regardless of which language is currently being
        // viewed — without this, Polylang silently and implicitly restricts
        // get_pages() to the current page's language, so an anchor tagged
        // only on the German page would invisibly disappear from this query
        // while rendering an English page.
        'lang'       => '',
    ));
    $anchor_id = !empty($anchor_pages) ? $anchor_pages[0]->ID : 0;

    if (!$anchor_id) {
        $template_pages = get_pages(array(
            'meta_key'   => '_wp_page_template',
            'meta_value' => "page-{$route_slug}.php",
            'number'     => 1,
            'lang'       => '',
        ));
        $anchor_id = !empty($template_pages) ? $template_pages[0]->ID : 0;
    }

    if (!$anchor_id) {
        return 0;
    }

    $target_id = $anchor_id;
    if (function_exists('pll_get_post')) {
        $current_lang = function_exists('pll_current_language') ? pll_current_language() : '';
        if (!empty($current_lang)) {
            $translated_id = pll_get_post($anchor_id, $current_lang);
            if ($translated_id) {
                $target_id = $translated_id;
            }
        }
    }

    return $target_id;
}

/**
 * Helper to resolve a page's URL by its ForgeWP route slug. Used by Gutenberg
 * block components, which reference useWpPageLink() as plain source text and
 * can't go through the page-level token/regex substitution pipeline.
 */
function forgewp_resolve_page_link($slug, $fallback = '') {
    $target_id = forgewp_resolve_route_page_id($slug);
    return $target_id ? get_permalink($target_id) : $fallback;
}

/**
 * PHP counterpart of src/lib/section-padding.ts's sectionPaddingY(). render.php
 * has no JS runtime to fall back on, so cross-file dual-host layout helpers like
 * this one need a first-class PHP twin rather than being silently neutralized.
 * Keep the padding-token map in sync with SECTION_PADDING_Y in that file.
 */
function forgewp_section_padding_y($value, $fallback = 'md') {
    $map = array(
        'none' => '',
        'sm'   => 'py-4 sm:py-6',
        'md'   => 'py-8 sm:py-10',
        'lg'   => 'py-12 sm:py-16',
    );
    if (!empty($value) && isset($map[$value])) {
        return $map[$value];
    }
    return isset($map[$fallback]) ? $map[$fallback] : '';
}

/**
 * Every ForgeWP block automatically gets paddingY/paddingX attributes and this
 * helper resolves both into Tailwind classes, applied directly to the block's
 * own top-level element by the compiler — no per-block wiring needed. Replaces
 * the old pattern of importing resolveBlockPaddingY()/sectionPaddingY() from a
 * shared lib file per block, which required translating arbitrary cross-file
 * JS helpers into PHP and was a recurring source of bugs.
 */
function forgewp_padding_classes($attributes) {
    $py_map = array(
        'none' => '',
        'sm'   => 'py-4 sm:py-6',
        'md'   => 'py-8 sm:py-10',
        'lg'   => 'py-12 sm:py-16',
    );
    $px_map = array(
        'none' => '',
        'sm'   => 'px-4',
        'md'   => 'px-4 sm:px-6',
        'lg'   => 'px-4 sm:px-6 lg:px-8',
    );
    $py_value = isset($attributes['paddingY']) ? $attributes['paddingY'] : 'none';
    $px_value = isset($attributes['paddingX']) ? $attributes['paddingX'] : 'none';
    $py = isset($py_map[$py_value]) ? $py_map[$py_value] : '';
    $px = isset($px_map[$px_value]) ? $px_map[$px_value] : '';
    return trim($py . ' ' . $px);
}

/**
 * Helper to fetch and format page/post meta fields, resolving ACF formatting and attachments.
 */
function forgewp_get_meta_value($key, $default_val = '', $is_rich_text = false, $post_id = null) {
    if ($post_id === null || $post_id === false || $post_id === '') {
        $post_id = get_the_ID();
    }
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
`;
  // Append auto-generated Theme Options admin settings page
  const settingsPagePhp = buildSettingsPagePhp(wpOptions, config);
  return settingsPagePhp ? _php + settingsPagePhp : _php;
}
