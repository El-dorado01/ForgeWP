/**
 * Helper to build WordPress theme style.css file content.
 *
 * @param {import('./types.js').ForgeWPThemeConfig} config
 * @returns {string}
 */
export function buildStyleCss(config) {
  return `/*
Theme Name: ${config.name}
Theme URI: https://forgewp.dev
Author: ForgeWP
Description: ${config.description}
Version: ${config.version}
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${config.textDomain}
*/

/* Compiled styles are enqueued from assets/ via functions.php */
`;
}

/**
 * Generate Advanced Custom Fields (ACF) PHP array structure for a field.
 */
export function generateAcfFieldPhp(key, field, parentKey = '') {
  const acfKey = parentKey ? `${parentKey}_${key}` : `field_${key}`;
  const label = field.label || key.charAt(0).toUpperCase() + key.slice(1);
  const typeMap = {
    text: 'text',
    richText: 'wysiwyg',
    boolean: 'true_false',
    image: 'image',
    repeater: 'repeater',
  };
  const acfType = field.customType || typeMap[field.type] || 'text';

  let php = `            array(
                'key' => '${acfKey}',
                'label' => '${label.replace(/'/g, "\\'")}',
                'name' => '${key}',
                'type' => '${acfType}',`;

  if (field.default !== undefined) {
    if (typeof field.default === 'boolean') {
      php += `\n                'default_value' => ${field.default ? 1 : 0},`;
    } else if (typeof field.default === 'string') {
      php += `\n                'default_value' => '${field.default.replace(/'/g, "\\'")}',`;
    }
  }

  if (acfType === 'image') {
    php += `\n                'return_format' => 'url',`;
  } else if (acfType === 'relationship') {
    const pts = field.postTypes ? field.postTypes.map(pt => `'${pt}'`).join(', ') : '';
    const ptExpr = pts ? `array(${pts})` : `array()`;
    php += `\n                'post_type' => ${ptExpr},\n                'filters' => array('search', 'taxonomy'),\n                'return_format' => 'id',`;
  } else if (acfType === 'true_false') {
    php += `\n                'ui' => 1,`;
  } else if (acfType === 'repeater' && field.fields) {
    const subFieldsPhp = Object.entries(field.fields)
      .map(([subKey, subField]) => generateAcfFieldPhp(subKey, subField, acfKey))
      .join(',\n');
    php += `\n                'sub_fields' => array(
${subFieldsPhp}
                ),`;
  }

  php += `\n            )`;
  return php;
}

/**
 * Generate dynamic ACF fallback PHP generation block.
 */
export function generateDynamicAcfFieldPhp(key, field) {
  const acfKey = `field_${key}`;
  const label = field.label || key.charAt(0).toUpperCase() + key.slice(1);
  const typeMap = {
    text: 'text',
    richText: 'wysiwyg',
    boolean: 'true_false',
    image: 'image',
    repeater: 'repeater',
  };
  const acfType = typeMap[field.type] || 'text';

  if (acfType !== 'repeater') {
    const fieldDef = generateAcfFieldPhp(key, field);
    return `    $fields[] = ${fieldDef.trim()};\n`;
  }

  const acfProDef = generateAcfFieldPhp(key, field);
  const defaultRows = Array.isArray(field.default) ? field.default : [];
  const defaultRowCount = defaultRows.length || 4;

  let fallbackPhp = `    if ( function_exists('acf_is_pro') && acf_is_pro() ) {
        $fields[] = ${acfProDef.trim()};
    } else {
        $post_id = isset($_GET['post']) ? intval($_GET['post']) : (isset($_POST['post_ID']) ? intval($_POST['post_ID']) : 0);
        $count = $post_id ? intval(get_post_meta($post_id, '${key}', true)) : 0;
        if ($count <= 0) {
            $count = ${defaultRowCount};
        }
        for ($i = 0; $i < $count; $i++) {\n`;

  for (const [subKey, subField] of Object.entries(field.fields)) {
    const subLabel = subField.label || subKey.charAt(0).toUpperCase() + subKey.slice(1);
    const subTypeMap = {
      text: 'text',
      richText: 'wysiwyg',
      boolean: 'true_false',
      image: 'image',
    };
    const subType = subTypeMap[subField.type] || 'text';

    fallbackPhp += `            $fields[] = array(
                'key' => "field_${key}_" . $i . "_${subKey}",
                'label' => "${label.replace(/'/g, "\\'")}" . " " . ($i + 1) . ": ${subLabel.replace(/'/g, "\\'")}",
                'name' => "${key}_" . $i . "_${subKey}",
                'type' => '${subType}',`;

    if (subType === 'image') {
      fallbackPhp += `\n                'return_format' => 'url',`;
    } else if (subType === 'true_false') {
      fallbackPhp += `\n                'ui' => 1,`;
    }
    fallbackPhp += `\n            );\n`;
  }

  fallbackPhp += `        }
    }\n`;

  return fallbackPhp;
}

export function buildHeaderPhp(config) {
  return `<?php
/**
 * Theme header
 *
 * @package ${config.textDomain}
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php
  // Yield metadata control to active SEO plugins to prevent duplication
  $seo_plugin_active = defined('WPSEO_VERSION') ||
                       class_exists('RankMath') ||
                       class_exists('All_in_One_SEO_Pack') ||
                       defined('AIOSEO_VERSION') ||
                       class_exists('SEOPress\\\\Services\\\\Title');

  if ( ! $seo_plugin_active ) {
      $single_head = get_template_directory() . '/forgewp-static/single-head.html';
      $head_file = get_template_directory() . '/forgewp-static/head.html';
      $target = (is_single() && file_exists($single_head)) ? $single_head : $head_file;
      if (file_exists($target)) {
          $content = file_get_contents($target);
          // Strip duplicate title tag so standard wp_head title-tag support outputs it cleanly
          echo preg_replace('/<title>.*?<\\/title>/is', '', $content);
      }
  }
  ?>
  <?php wp_head(); ?>
  <style>
    /* Reset WP link underlines to match React/Tailwind expected styling */
    a { text-decoration: none !important; }
    a:hover { text-decoration: none !important; }
  </style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php
$header_file = get_template_directory() . '/forgewp-static/header.html';
if (file_exists($header_file)) {
    include $header_file;
}
?>
`;
}

export function buildFooterPhp(config) {
  return `<?php
/**
 * Theme footer
 *
 * @package ${config.textDomain}
 */
$footer_file = get_template_directory() . '/forgewp-static/footer.html';
if (file_exists($footer_file)) {
    include $footer_file;
}
wp_footer();
?>
</body>
</html>
`;
}

export function buildIndexPhp() {
  return `<?php
/**
 * Main template — displays ForgeWP compiled static markup
 *
 * @package forgewp
 */

get_header();

$markup_file = get_template_directory() . '/forgewp-static/content.html';

if (is_front_page() && file_exists($markup_file)) {
    include $markup_file;
} elseif (have_posts()) {
    echo '<main class="mx-auto max-w-3xl px-6 py-12">';
    while (have_posts()) {
        the_post();
        echo '<article class="mb-12">';
        echo '<h1 class="text-3xl font-bold mb-4">' . get_the_title() . '</h1>';
        echo '<div class="prose prose-zinc max-w-none">';
        the_content();
        echo '</div>';
        echo '</article>';
    }
    echo '</main>';
}

get_footer();
`;
}

export function buildSinglePhp() {
  return `<?php
/**
 * Single post template
 *
 * @package forgewp
 */

get_header();

$single_file = get_template_directory() . '/forgewp-static/single.html';
if (file_exists($single_file)) {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            include $single_file;
        }
    }
} else {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            echo '<main class="mx-auto max-w-3xl px-6 py-12">';
            echo '<article>';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '<div class="prose prose-zinc max-w-none">';
            the_content();
            echo '</div>';
            echo '</article>';
            echo '</main>';
        }
    }
}

get_footer();
`;
}

export function build404Php() {
  return `<?php
/**
 * 404 template
 *
 * @package forgewp
 */

get_header();

$notFound_file = get_template_directory() . '/forgewp-static/404.html';
if (file_exists($notFound_file)) {
    include $notFound_file;
} else {
    echo '<main class="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-24">';
    echo '<p class="text-base font-semibold text-zinc-900">404</p>';
    echo '<h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Page not found</h1>';
    echo '<p class="mt-6 text-base leading-7 text-zinc-600">Sorry, we couldn’t find the page you’re looking for.</p>';
    echo '</main>';
}

get_footer();
`;
}

export function buildArchivePhp() {
  return `<?php
/**
 * Archive template — category, tag, date, and author archives.
 * Loads the ForgeWP compiled archive.html which contains the WpLoop.
 *
 * @package forgewp
 */

get_header();

$archive_file = get_template_directory() . '/forgewp-static/archive.html';

if (file_exists($archive_file)) {
    include $archive_file;
} else {
    echo '<main class="mx-auto max-w-3xl px-6 py-12">';
    the_archive_title('<h1 class="text-3xl font-bold mb-8">', '</h1>');
    if (have_posts()) {
        echo '<div class="space-y-8">';
        while (have_posts()) {
            the_post();
            echo '<article>';
            echo '<h2 class="text-xl font-bold"><a href="' . get_permalink() . '">' . get_the_title() . '</a></h2>';
            echo '<div class="text-sm text-zinc-500 mt-1">' . get_the_date() . ' by ' . get_the_author() . '</div>';
            echo '<div class="mt-3 text-zinc-600">';
            the_excerpt();
            echo '</div>';
            echo '</article>';
        }
        echo '</div>';
    } else {
        echo '<p>No posts found.</p>';
    }
    echo '</main>';
}

get_footer();
`;
}

export function buildPagePhp() {
  return `<?php
/**
 * Static page template — WordPress pages (e.g. About, Contact).
 * Reuses single.html since static pages share the same title+content structure.
 *
 * @package forgewp
 */

get_header();

$page_file = get_template_directory() . '/forgewp-static/single.html';

if (file_exists($page_file)) {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            include $page_file;
        }
    }
} else {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            echo '<main class="mx-auto max-w-3xl px-6 py-12">';
            echo '<article>';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '<div class="prose prose-zinc max-w-none">';
            the_content();
            echo '</div>';
            echo '</article>';
            echo '</main>';
        }
    }
}

get_footer();
`;
}
