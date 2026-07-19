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

/*
 * ForgeWP content-width system — lets classic-template pages (page.php, single.php,
 * index.php, archive.php) support per-block wide/full alignment without a hardcoded
 * pixel cap. Sizes come from theme.json's settings.layout.contentSize/wideSize, which
 * WordPress automatically emits as these CSS custom properties.
 */
.forgewp-content-width {
  max-width: var(--wp--style--global--content-size, 720px);
  margin-left: auto;
  margin-right: auto;
}
.forgewp-content-width > .alignwide {
  max-width: var(--wp--style--global--wide-size, 1200px);
  margin-left: auto;
  margin-right: auto;
}
.forgewp-content-width > .alignfull {
  max-width: none;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
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
    color: 'color_picker',
    select: 'select',
    number: 'number',
    url: 'url',
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
  } else if (acfType === 'select' && field.options) {
    const choices = field.options.map(opt => {
      if (typeof opt === 'string') {
        return `'${opt.replace(/'/g, "\\'")}' => '${opt.replace(/'/g, "\\'")}'`;
      }
      return `'${String(opt.value).replace(/'/g, "\\'")}' => '${String(opt.label).replace(/'/g, "\\'")}'`;
    }).join(', ');
    php += `\n                'choices' => array(${choices}),`;
  } else if (acfType === 'number') {
    if (field.min !== undefined) php += `\n                'min' => ${field.min},`;
    if (field.max !== undefined) php += `\n                'max' => ${field.max},`;
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
export function generateDynamicAcfFieldPhp(key, field, templateSlug = '') {
  // ACF field 'key' must be globally unique across the whole install — it's
  // ACF's own internal registry identifier, distinct from 'name' (the actual
  // postmeta key, which SHOULD be shared across templates when two pages
  // both use e.g. "hero_subtitle" for their own hero section; that's fine,
  // each post has its own meta row). Without this namespace prefix, every
  // template reusing a common field name (hero_title, hero_subtitle, hero_badge, …)
  // generated the identical key (e.g. 'field_hero_subtitle'), so whichever
  // schema's field group ACF resolved that key against last effectively
  // dictated the formatting (text vs wysiwyg) for every OTHER template's
  // same-named field too — e.g. a richText hero_subtitle on one page could
  // make a plain-text hero_subtitle on another page get wpautop-wrapped.
  const keyNamespace = templateSlug ? templateSlug.replace(/-/g, '_') : '';
  const parentKeyPrefix = keyNamespace ? `field_${keyNamespace}` : '';
  const acfKey = parentKeyPrefix ? `${parentKeyPrefix}_${key}` : `field_${key}`;
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
    const fieldDef = generateAcfFieldPhp(key, field, parentKeyPrefix);
    return `    $fields[] = ${fieldDef.trim()};\n`;
  }

  const acfProDef = generateAcfFieldPhp(key, field, parentKeyPrefix);
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
      color: 'color_picker',
      select: 'select',
      number: 'number',
      url: 'url',
    };
    const subType = subTypeMap[subField.type] || 'text';

    fallbackPhp += `            $fields[] = array(
                'key' => "${parentKeyPrefix ? `${parentKeyPrefix}_` : 'field_'}${key}_" . $i . "_${subKey}",
                'label' => "${label.replace(/'/g, "\\'")}" . " " . ($i + 1) . ": ${subLabel.replace(/'/g, "\\'")}",
                'name' => "${key}_" . $i . "_${subKey}",
                'type' => '${subType}',`;

    if (subType === 'image') {
      fallbackPhp += `\n                'return_format' => 'url',`;
    } else if (subType === 'true_false') {
      fallbackPhp += `\n                'ui' => 1,`;
    } else if (subType === 'select' && subField.options) {
      const choices = subField.options.map(opt => {
        if (typeof opt === 'string') {
          return `'${opt.replace(/'/g, "\\'")}' => '${opt.replace(/'/g, "\\'")}'`;
        }
        return `'${String(opt.value).replace(/'/g, "\\'")}' => '${String(opt.label).replace(/'/g, "\\'")}'`;
      }).join(', ');
      fallbackPhp += `\n                'choices' => array(${choices}),`;
    } else if (subType === 'number') {
      if (subField.min !== undefined) fallbackPhp += `\n                'min' => ${subField.min},`;
      if (subField.max !== undefined) fallbackPhp += `\n                'max' => ${subField.max},`;
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
  // Yield metadata control to active SEO plugins to prevent duplication.
  // forgewp_seo_plugin_active() (functions.php) is the single source of
  // truth for this check — every place ForgeWP yields to a standard SEO
  // plugin uses the same function so the detected plugin list can't drift.
  if ( ! forgewp_seo_plugin_active() ) {
      $target = forgewp_resolve_head_target();
      if (file_exists($target)) {
          ob_start();
          include $target;
          $content = ob_get_clean();
          // Strip duplicate title tag so standard wp_head title-tag support outputs it cleanly
          echo preg_replace('/<title>.*?<\\/title>/is', '', $content);
      }
  }
  ?>
  <?php wp_head(); ?>
  <style>
    /* Reset WP link underlines to match React/Tailwind expected styling */
    a { text-decoration: none; }
    a:hover { text-decoration: none; }
    .underline { text-decoration: underline !important; }
    .hover\\:underline:hover { text-decoration: underline !important; }
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
 * Main template / front page — baked static markup by default.
 *
 * WordPress always prefers front-page.php for the site front page, which
 * normally ignores the page template dropdown. We still honor
 * "ForgeWP Builder" (template-forgewp-builder.php) when assigned to the
 * static front page so editors can switch to a block canvas.
 *
 * @package forgewp
 */

get_header();

$forgewp_use_builder = false;
if (is_front_page()) {
    $front_id = (int) get_option('page_on_front');
    if ($front_id > 0) {
        $tpl = get_page_template_slug($front_id);
        if ($tpl === 'template-forgewp-builder.php') {
            $forgewp_use_builder = true;
        }
    }
}

if ($forgewp_use_builder && have_posts()) {
    while (have_posts()) {
        the_post();
        $forgewp_hide_title = function_exists('forgewp_should_hide_page_title')
            ? forgewp_should_hide_page_title(get_the_ID())
            : true;
        echo '<main class="forgewp-builder-canvas">';
        if (!$forgewp_hide_title) {
            echo '<div class="forgewp-content-width">';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '</div>';
        }
        the_content();
        echo '</main>';
    }
} else {
    $markup_file = get_template_directory() . '/forgewp-static/content.html';

    if (is_front_page() && file_exists($markup_file)) {
        include $markup_file;
    } elseif (have_posts()) {
        echo '<main class="px-6 py-12">';
        while (have_posts()) {
            the_post();
            echo '<article class="mb-12">';
            echo '<div class="forgewp-content-width">';
            echo '<h1 class="text-3xl font-bold mb-4">' . get_the_title() . '</h1>';
            echo '</div>';
            echo '<div class="forgewp-content-width prose prose-zinc max-w-none">';
            the_content();
            echo '</div>';
            echo '</article>';
        }
        echo '</main>';
    }
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
            echo '<main class="px-6 py-12">';
            echo '<article>';
            echo '<div class="forgewp-content-width">';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '</div>';
            echo '<div class="forgewp-content-width prose prose-zinc max-w-none">';
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
    echo '<main class="forgewp-content-width px-6 py-12">';
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
            $forgewp_hide_title = function_exists('forgewp_should_hide_page_title')
                ? forgewp_should_hide_page_title(get_the_ID())
                : true;
            echo '<main class="px-6 py-12">';
            echo '<article>';
            if (!$forgewp_hide_title) {
                echo '<div class="forgewp-content-width">';
                echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
                echo '</div>';
            }
            echo '<div class="forgewp-content-width prose prose-zinc max-w-none">';
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

export function buildBuilderPagePhp() {
  return `<?php
/**
 * Template Name: ForgeWP Builder
 * Description: High-fidelity layout canvas for ForgeWP Gutenberg blocks.
 *
 * @package forgewp
 */

get_header();

if (have_posts()) {
    while (have_posts()) {
        the_post();
        $forgewp_hide_title = function_exists('forgewp_should_hide_page_title')
            ? forgewp_should_hide_page_title(get_the_ID())
            : true;
        echo '<main class="forgewp-builder-canvas">';
        if (!$forgewp_hide_title) {
            echo '<div class="forgewp-content-width">';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '</div>';
        }
        the_content();
        echo '</main>';
    }
}

get_footer();
`;
}
