import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * @param {Object} options
 * @param {string} options.themeRoot
 * @param {string} options.outDir
 * @param {import('./types.js').ForgeWPThemeConfig} options.config
 * @param {string} options.appHtml
 * @param {string} [options.headerHtml]
 * @param {string} [options.footerHtml]
 * @param {import('./types.js').ForgeWPBuildAssets} options.assets
 */
export function generateTheme({
  themeRoot,
  outDir,
  config,
  appHtml,
  headerHtml = "",
  footerHtml = "",
  headHtml = "",
  singleHeadHtml = "",
  singleHtml = "",
  notFoundHtml = "",
  archiveHtml = "",
  assets,
}) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }

  mkdirSync(outDir, { recursive: true });

  const assetsOut = path.join(outDir, "assets");
  const distAssets = path.join(themeRoot, "dist", "assets");
  mkdirSync(assetsOut, { recursive: true });
  cpSync(distAssets, assetsOut, { recursive: true });

  // Drop unused JS from the theme ZIP
  import("node:fs").then(({ readdirSync, unlinkSync }) => {
    const files = readdirSync(assetsOut);
    for (const file of files) {
      if (file.endsWith(".js") || file.endsWith(".js.map")) {
        unlinkSync(path.join(assetsOut, file));
      }
    }
  });

  // Fix nav links and split markup
  const processedApp = processMarkup(appHtml);
  const processedHeader = processMarkup(headerHtml);
  const processedFooter = processMarkup(footerHtml);

  // Extract content (App markup minus Header/Footer)
  let contentHtml = processedApp;
  if (processedHeader) {
    contentHtml = contentHtml.replace(processedHeader, "");
  }
  if (processedFooter) {
    contentHtml = contentHtml.replace(processedFooter, "");
  }

  // Process single post template if exists
  let processedSingle = "";
  if (singleHtml) {
    processedSingle = processMarkup(singleHtml);
    if (processedHeader) {
      processedSingle = processedSingle.replace(processedHeader, "");
    }
    if (processedFooter) {
      processedSingle = processedSingle.replace(processedFooter, "");
    }
  }

  // Process 404 template if exists
  let processedNotFound = "";
  if (notFoundHtml) {
    processedNotFound = processMarkup(notFoundHtml);
    if (processedHeader) {
      processedNotFound = processedNotFound.replace(processedHeader, "");
    }
    if (processedFooter) {
      processedNotFound = processedNotFound.replace(processedFooter, "");
    }
  }

  const staticDir = path.join(outDir, "forgewp-static");
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(path.join(staticDir, "content.html"), contentHtml, "utf8");
  writeFileSync(path.join(staticDir, "header.html"), processedHeader, "utf8");
  writeFileSync(path.join(staticDir, "footer.html"), processedFooter, "utf8");
  if (headHtml) {
    writeFileSync(path.join(staticDir, "head.html"), headHtml, "utf8");
  }
  if (singleHeadHtml) {
    writeFileSync(path.join(staticDir, "single-head.html"), singleHeadHtml, "utf8");
  }
  if (processedSingle) {
    writeFileSync(path.join(staticDir, "single.html"), processedSingle, "utf8");
  }
  if (processedNotFound) {
    writeFileSync(path.join(staticDir, "404.html"), processedNotFound, "utf8");
  }

  // Archive page (category / tag / date archives)
  let processedArchive = "";
  if (archiveHtml) {
    processedArchive = processMarkup(archiveHtml);
    if (processedHeader) processedArchive = processedArchive.replace(processedHeader, "");
    if (processedFooter) processedArchive = processedArchive.replace(processedFooter, "");
    writeFileSync(path.join(staticDir, "archive.html"), processedArchive, "utf8");
  }

  // Dynamic Gutenberg blocks compilation (Phase 5)
  const compiledBlocks = compileBlocks(themeRoot, outDir);

  writeFileSync(path.join(outDir, "style.css"), buildStyleCss(config), "utf8");
  writeFileSync(
    path.join(outDir, "functions.php"),
    buildFunctionsPhp(config, assets, compiledBlocks),
    "utf8",
  );
  writeFileSync(path.join(outDir, "header.php"), buildHeaderPhp(config), "utf8");
  writeFileSync(path.join(outDir, "footer.php"), buildFooterPhp(config), "utf8");
  writeFileSync(path.join(outDir, "index.php"), buildIndexPhp(), "utf8");
  writeFileSync(path.join(outDir, "single.php"), buildSinglePhp(), "utf8");
  writeFileSync(path.join(outDir, "404.php"), build404Php(), "utf8");
  writeFileSync(path.join(outDir, "front-page.php"), buildIndexPhp(), "utf8");
  writeFileSync(path.join(outDir, "archive.php"), buildArchivePhp(), "utf8");
  writeFileSync(path.join(outDir, "page.php"), buildPagePhp(), "utf8");

  // Dynamic theme.json compiler (Phase 5)
  const themeJsonSrc = path.join(themeRoot, "wordpress", "theme.json");
  let themeJson = {
    "$schema": "https://schemas.wp.org/trunk/theme.json",
    "version": 3,
    "settings": {
      "appearanceTools": true,
    },
  };

  if (existsSync(themeJsonSrc)) {
    try {
      themeJson = JSON.parse(readFileSync(themeJsonSrc, "utf8"));
    } catch (e) {
      console.warn("Failed to parse theme.json template:", e.message);
    }
  }

  // Merge tokens from wp.config.ts
  if (config.settings) {
    if (!themeJson.settings) themeJson.settings = {};

    // Layout (contentSize, wideSize)
    if (config.settings.layout) {
      themeJson.settings.layout = {
        ...themeJson.settings.layout,
        ...config.settings.layout,
      };
    }

    // Colors (custom, palette)
    if (config.settings.color) {
      themeJson.settings.color = {
        ...themeJson.settings.color,
        ...config.settings.color,
      };
    }

    // Typography (fontSizes, fontFamilies)
    if (config.settings.typography) {
      themeJson.settings.typography = {
        ...themeJson.settings.typography,
        ...config.settings.typography,
      };
    }
  }

  writeFileSync(
    path.join(outDir, "theme.json"),
    JSON.stringify(themeJson, null, 2),
    "utf8"
  );

  const screenshot = path.join(themeRoot, "wordpress", "screenshot.png");
  if (existsSync(screenshot)) {
    copyFileSync(screenshot, path.join(outDir, "screenshot.png"));
  }
}

/**
 * Process markup: fix nav links etc.
 */
function processMarkup(html) {
  if (!html) return "";
  // Fix nav links — # → <?php echo esc_url( home_url( '/' ) ); ?>
  // We use a placeholder and replace it in the PHP file generation if needed,
  // but for now we'll do it via string replacement in the template files.
  let processed = html.replace(
    /href="#"/g,
    'href="<?php echo esc_url( home_url( \'/\' ) ); ?>"',
  );

  processed = processed.replace(
    /__FORGEWP_THE_TITLE__/g,
    '<?php the_title(); ?>'
  );

  processed = processed.replace(
    /__FORGEWP_THE_CONTENT__/g,
    '<?php the_content(); ?>'
  );

  processed = processed.replace(
    /__FORGEWP_THE_PERMALINK__/g,
    '<?php the_permalink(); ?>'
  );

  processed = processed.replace(
    /__FORGEWP_THE_EXCERPT__/g,
    '<?php the_excerpt(); ?>'
  );

  processed = processed.replace(
    /__FORGEWP_THE_DATE__/g,
    "<?php echo esc_html( get_the_date() ); ?>"
  );

  processed = processed.replace(
    /__FORGEWP_THE_AUTHOR__/g,
    "<?php echo esc_html( get_the_author() ); ?>"
  );

  processed = processed.replace(
    /__FORGEWP_THE_POST_THUMBNAIL_URL__/g,
    "<?php echo esc_url( get_the_post_thumbnail_url( null, 'large' ) ); ?>"
  );

  processed = processed.replace(
    /__FORGEWP_THE_CATEGORY_LIST__/g,
    "<?php the_category( ', ' ); ?>"
  );

  processed = processed.replace(
    /__FORGEWP_THE_ARCHIVE_TITLE__/g,
    "<?php the_archive_title(); ?>"
  );

  processed = processed.replace(
    /<forgewp-loop-start\s*\/?>/g,
    '<?php if (have_posts()) : while (have_posts()) : the_post(); ?>'
  );

  processed = processed.replace(
    /<\/forgewp-loop-start>/g,
    ''
  );

  processed = processed.replace(
    /<forgewp-loop-end\s*\/?>/g,
    '<?php endwhile; else : echo "<p>No posts found.</p>"; endif; ?>'
  );

  processed = processed.replace(
    /<\/forgewp-loop-end>/g,
    ''
  );

  // ── Custom Meta Fields (ACF / metadata support) ──
  processed = processed.replace(
    /__FORGEWP_CUSTOM_FIELD__([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_post_meta( get_the_ID(), '$1', true ) ); ?>"
  );

  // ── Dynamic Custom Menus ──
  processed = processed.replace(
    /<forgewp-menu\s+[^>]*location="([^"]+)"\s+[^>]*className="([^"]*)"\s+[^>]*linkClassName="([^"]*)"\s*\/?>/g,
    '<?php\n  $locations = get_nav_menu_locations();\n  $menu_id = isset($locations[\'$1\']) ? $locations[\'$1\'] : null;\n  $menu_items = $menu_id ? wp_get_nav_menu_items($menu_id) : array();\n  if (!empty($menu_items)) {\n      echo \'<nav class="$2">\';\n      foreach ($menu_items as $item) {\n          echo \'<a href="\' . esc_url($item->url) . \'" class="$3">\' . esc_html($item->title) . \'</a>\';\n      }\n      echo \'</nav>\';\n  } else {\n      echo \'<nav class="$2"><a href="\' . esc_url(home_url(\'/\')) . \'" class="$3">Home</a></nav>\';\n  }\n  ?>'
  );
  processed = processed.replace(/<\/forgewp-menu>/g, '');

  // ── Custom WP_Query Loop Blocks ──
  processed = processed.replace(
    /<forgewp-query-loop-start\s+[^>]*post[Tt]ype="([^"]+)"\s+[^>]*posts[Pp]er[Pp]age="([^"]+)"\s*(?:[^>]*category[Nn]ame="([^"]*)")?\s*\/?>/g,
    '<?php\n  $query_args = array(\n      \'post_type\' => \'$1\',\n      \'posts_per_page\' => $2,\n  );\n  if (\'$3\' !== \'\') {\n      $query_args[\'category_name\'] = \'$3\';\n  }\n  $custom_query = new WP_Query($query_args);\n  if ($custom_query->have_posts()) : while ($custom_query->have_posts()) : $custom_query->the_post();\n  ?>'
  );
  processed = processed.replace(/<\/forgewp-query-loop-start>/g, '');
  processed = processed.replace(
    /<forgewp-query-loop-end\s*\/?>/g,
    '<?php\n  endwhile;\n  wp_reset_postdata();\n  endif;\n  ?>'
  );
  processed = processed.replace(/<\/forgewp-query-loop-end>/g, '');

  return processed;
}


/**
 * @param {import('./types.js').ForgeWPThemeConfig} config
 */
function buildStyleCss(config) {
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
 * @param {import('./types.js').ForgeWPThemeConfig} config
 * @param {import('./types.js').ForgeWPBuildAssets} assets
 */
function buildFunctionsPhp(config, assets, blockSlugs = []) {
  const css = assets.cssFile.replace(/^assets\//, "");
  const version = config.version.replace(/'/g, "\\'");
  const googleFonts = config.settings?.typography?.googleFonts || [];
  
  let fontsEnqueue = "";
  let preconnectFilter = "";

  if (googleFonts.length > 0) {
    const fontsParam = googleFonts.map(f => encodeURIComponent(f)).join("&family=");
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

  let blocksRegistration = "";
  if (blockSlugs.length > 0) {
    const blocksArray = blockSlugs.map(s => `'${s}'`).join(", ");
    blocksRegistration = `
/**
 * Register dynamic Gutenberg blocks compiled by ForgeWP.
 */
function forgewp_register_dynamic_blocks(): void {
    $blocks = array(${blocksArray});
    foreach ($blocks as $block) {
        register_block_type(__DIR__ . '/blocks/' . $block);
    }
}
add_action('init', 'forgewp_register_dynamic_blocks');
`;
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
}
add_action('wp_enqueue_scripts', 'forgewp_enqueue_assets');

/**
 * Theme supports.
 */
function forgewp_theme_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');

    // Load compiled theme stylesheet inside Gutenberg Block Editor
    add_editor_style('assets/${css}');
}
add_action('after_setup_theme', 'forgewp_theme_setup');
${preconnectFilter}${blocksRegistration}`;
}

function buildHeaderPhp(config) {
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
  $single_head = get_template_directory() . '/forgewp-static/single-head.html';
  $head_file = get_template_directory() . '/forgewp-static/head.html';
  if (is_single() && file_exists($single_head)) {
      include $single_head;
  } elseif (file_exists($head_file)) {
      include $head_file;
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

function buildFooterPhp(config) {
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

function buildIndexPhp() {
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

function buildSinglePhp() {
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

function build404Php() {
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

function buildArchivePhp() {
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

function buildPagePhp() {
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

/**
 * Scans the \`src/blocks/\` folder, parses block settings and JSX content,
 * and compiles them into official, dynamic WordPress blocks.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @returns {string[]} Compiled block slugs
 */
function compileBlocks(themeRoot, outDir) {
  const blocksDir = path.join(themeRoot, "src", "blocks");
  const blockSlugs = [];

  if (!existsSync(blocksDir)) {
    return blockSlugs;
  }

  const entries = readdirSync(blocksDir);
  for (const entry of entries) {
    const entryPath = path.join(blocksDir, entry);
    let blockFile = "";
    let blockSlug = "";

    if (statSync(entryPath).isDirectory()) {
      const indexPath = path.join(entryPath, "index.tsx");
      if (existsSync(indexPath)) {
        blockFile = indexPath;
        blockSlug = entry.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, "-");
      }
    } else if (entry.endsWith(".tsx") || entry.endsWith(".jsx")) {
      blockFile = entryPath;
      blockSlug = entry.replace(/\.(tsx|jsx)$/, "").replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    if (blockFile) {
      try {
        const code = readFileSync(blockFile, "utf8");

        // Parse human-readable title and metadata from setting exports
        const settingsMatch = code.match(/export\s+const\s+settings\s*=\s*(\{[\s\S]*?\});/);
        let settings = {
          apiVersion: 3,
          name: `forgewp/${blockSlug}`,
          title: blockSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          category: "design",
          icon: "admin-generic",
          attributes: {},
          render: "file:./render.php"
        };

        if (settingsMatch) {
          try {
            // Evaluates settings safely without external libraries
            const evalFn = new Function(`return ${settingsMatch[1]};`);
            settings = { ...settings, ...evalFn() };
            // Ensure schema, apiVersion, name and render path are strictly aligned
            settings.name = `forgewp/${blockSlug}`;
            settings.apiVersion = 3;
            settings.render = "file:./render.php";
          } catch (e) {
            console.warn(`[Gutenberg Block Compiler] Error parsing settings for ${blockSlug}:`, e.message);
          }
        }

        // Parse JSX block content
        let jsx = "";
        const returnMatch = code.match(/return\s*\(\s*(<[\s\S]*?>)\s*\)/);
        if (returnMatch) {
          jsx = returnMatch[1];
        } else {
          const returnMatchSingle = code.match(/return\s+(<[\s\S]*?>);/);
          if (returnMatchSingle) {
            jsx = returnMatchSingle[1];
          }
        }

        if (!jsx) {
          console.warn(`[Gutenberg Block Compiler] Skipping block ${blockSlug}: No returning JSX element found.`);
          continue;
        }

        // Translate dynamic attributes inside returning JSX into dynamic PHP echoes
        let phpMarkup = jsx;

        // className="..." -> class="..."
        phpMarkup = phpMarkup.replace(/className=/g, "class=");

        // src={image} or src={attributes.image}
        phpMarkup = phpMarkup.replace(/(src|href|alt|title)=\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/gi, (match, attr, varName) => {
          const escFunc = attr === "href" || attr === "src" ? "esc_url" : "esc_attr";
          return `${attr}="<?php echo ${escFunc}( $attributes['${varName}'] ?? '' ); ?>"`;
        });

        // {title} or {props.title}
        phpMarkup = phpMarkup.replace(/\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/g, (match, varName) => {
          return `<?php echo esc_html( $attributes['${varName}'] ?? '' ); ?>`;
        });

        // Wrap the final PHP template markup in a clean block wrapper
        const renderPhpContent = `<?php
/**
 * Gutenberg dynamic block template — ${settings.title}
 * Autogenerated by ForgeWP Theme Compiler. Do not modify manually.
 */
?>
${phpMarkup}
`;

        const blockOutDir = path.join(outDir, "blocks", blockSlug);
        mkdirSync(blockOutDir, { recursive: true });

        // Write block.json and render.php
        writeFileSync(path.join(blockOutDir, "block.json"), JSON.stringify(settings, null, 2), "utf8");
        writeFileSync(path.join(blockOutDir, "render.php"), renderPhpContent, "utf8");

        blockSlugs.push(blockSlug);
      } catch (e) {
        console.error(`[Gutenberg Block Compiler] Failed to compile block ${blockSlug}:`, e.message);
      }
    }
  }

  return blockSlugs;
}

