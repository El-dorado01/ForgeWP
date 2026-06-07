/**
 * ForgeWP SEO Plugin
 *
 * Exposes hooks to validate configuration and automatically generate
 * sitemaps, favicons, and Yoast/RankMath integrations.
 *
 * @param {import('./index.d.ts').SeoPluginOptions} [options]
 * @returns {import('@forgewp/compiler').ForgeWPPlugin}
 */
export default function seoPlugin(options = {}) {
  const favicon = options.favicon;
  const sitemaps = options.sitemaps;
  const plugins = options.plugins || {};

  return {
    name: 'seo',

    validateConfig(config, themeRoot, { fs, path }) {
      const existsSync = fs.existsSync;

      // 1. Favicon Existence Checks
      const targetFavicon = favicon ?? config.favicon;
      if (targetFavicon !== undefined) {
        if (typeof targetFavicon !== 'string') {
          throw new Error(
            'favicon must be a string pointing to an asset file (e.g. "/Logo/favicon.svg")'
          );
        }
        const cleanedFavicon = targetFavicon.replace(/^\//, '');
        const path1 = path.join(themeRoot, cleanedFavicon);
        const path2 = path.join(themeRoot, 'public', cleanedFavicon);
        if (!existsSync(path1) && !existsSync(path2)) {
          console.warn(
            '\x1b[33m%s\x1b[0m',
            `⚠️  [ForgeWP Warning]: Favicon file not found at "${targetFavicon}". Please verify the file path exists in your theme directory.`
          );
        }
      }

      // 2. Sitemaps Duplicate Checks
      if (sitemaps !== undefined) {
        if (typeof sitemaps !== 'object' || sitemaps === null) {
          throw new Error('seoPlugin sitemaps configuration must be an object');
        }
        const { postTypes, taxonomies } = sitemaps;
        if (
          postTypes !== undefined &&
          (!Array.isArray(postTypes) || postTypes.some((pt) => typeof pt !== 'string'))
        ) {
          throw new Error('seoPlugin sitemaps.postTypes must be an array of strings');
        }
        if (postTypes && new Set(postTypes).size !== postTypes.length) {
          throw new Error('seoPlugin sitemaps.postTypes contains duplicate entries');
        }

        if (
          taxonomies !== undefined &&
          (!Array.isArray(taxonomies) || taxonomies.some((t) => typeof t !== 'string'))
        ) {
          throw new Error('seoPlugin sitemaps.taxonomies must be an array of strings');
        }
        if (taxonomies && new Set(taxonomies).size !== taxonomies.length) {
          throw new Error('seoPlugin sitemaps.taxonomies contains duplicate entries');
        }
      }
    },

    transformFunctionsPhp(php, config, themeRoot, { fs, path }) {
      let extraPhp = '';

      // A. Yoast & RankMath Graph Mergers
      const { yoast, rankMath } = plugins;
      if (yoast) {
        extraPhp += `
/**
 * Automatically integrate ForgeWP enqueued schemas with Yoast SEO Schema Graph.
 */
add_filter('wpseo_schema_graph', function($graph) {
    $target = forgewp_resolve_head_target();
    if (file_exists($target)) {
        ob_start();
        include $target;
        $content = ob_get_clean();
        if (preg_match_all('/<script type="application\\\\/ld\\\\+json">(.*?)<\\\\/script>/is', $content, $matches)) {
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
        extraPhp += `
/**
 * Automatically integrate ForgeWP enqueued schemas with RankMath JSON-LD.
 */
add_filter('rank_math/json_ld', function($data, $jsonld) {
    $target = forgewp_resolve_head_target();
    if (file_exists($target)) {
        ob_start();
        include $target;
        $content = ob_get_clean();
        if (preg_match_all('/<script type="application\\\\/ld\\\\+json">(.*?)<\\\\/script>/is', $content, $matches)) {
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

      // B. Custom Favicon head hooks
      const targetFavicon = favicon ?? config.favicon;
      if (targetFavicon) {
        const faviconPath = targetFavicon.replace(/^\//, ''); // Clean leading slash
        extraPhp += `
/**
 * Enqueue Favicon dynamically in WordPress head (generated from seoPlugin).
 */
function forgewp_add_favicon_plugin() {
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
add_action('wp_head', 'forgewp_add_favicon_plugin');
`;
      }

      // C. Sitemaps configuration
      if (sitemaps) {
        const { postTypes = [], taxonomies = [] } = sitemaps;
        let postTypesLines = '';
        for (const pt of postTypes) {
          postTypesLines += `        $post_types['${pt}'] = get_post_type_object('${pt}');\n`;
        }
        let taxonomiesLines = '';
        for (const tax of taxonomies) {
          taxonomiesLines += `        $taxonomies['${tax}'] = get_taxonomy('${tax}');\n`;
        }

        extraPhp += `
/**
 * Custom XML Segmented Sitemaps Configuration (generated from seoPlugin).
 */
function forgewp_register_segmented_xml_sitemaps_plugin() {
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
add_action('init', 'forgewp_register_segmented_xml_sitemaps_plugin', 99);
`;
      }

      return php + '\n' + extraPhp + '\n';
    },
  };
}
