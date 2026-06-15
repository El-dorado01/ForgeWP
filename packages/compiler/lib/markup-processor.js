/**
 * Process markup: fix nav links, replace ForgeWP dynamic template tags with PHP equivalents, etc.
 *
 * @param {string} html Raw HTML markup
 * @param {string} textDomain Text domain for translations
 * @returns {string} Transpiled HTML containing PHP tags
 */
export function processMarkup(html, textDomain = 'theme') {
  if (!html) return '';
  // Fix nav links — # → <?php echo esc_url( home_url( '/' ) ); ?>
  // We use a placeholder and replace it in the PHP file generation if needed,
  // but for now we'll do it via string replacement in the template files.
  let processed = html.replace(
    /href="#"/g,
    'href="<?php echo esc_url( home_url( \'/\' ) ); ?>"',
  );

  // Map React root link (href="/") to dynamic localized WordPress home URL
  processed = processed.replace(
    /href=(["'])\/\1/g,
    'href="<?php echo esc_url( function_exists( \'pll_home_url\' ) ? pll_home_url( function_exists( \'pll_current_language\' ) ? pll_current_language() : \'\' ) : home_url( \'/\' ) ); ?>"',
  );

  processed = processed.replace(
    /__FORGEWP_THE_TITLE__/g,
    '<?php echo html_entity_decode( get_the_title(), ENT_QUOTES | ENT_HTML5, \'UTF-8\' ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_CONTENT__/g,
    '<?php the_content(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_PERMALINK__/g,
    '<?php the_permalink(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_EXCERPT__/g,
    '<?php the_excerpt(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_DATE__/g,
    '<?php echo esc_html( get_the_date() ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_MODIFIED_DATE__/g,
    '<?php echo esc_html( get_the_modified_date() ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_AUTHOR__/g,
    '<?php echo esc_html( get_the_author() ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_POST_THUMBNAIL_URL__/g,
    "<?php echo esc_url( get_the_post_thumbnail_url( null, 'large' ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THE_CATEGORY_LIST__/g,
    "<?php the_category( ', ' ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_TAXONOMY_LIST_([a-zA-Z0-9_-]+)__/g,
    "<?php echo html_entity_decode( wp_strip_all_tags( get_the_term_list( get_the_ID(), '$1', '', ', ' ) ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THE_ARCHIVE_TITLE__/g,
    '<?php the_archive_title(); ?>',
  );

  processed = processed.replace(
    /<forgewp-loop-start\s*\/?>/g,
    '<?php if (have_posts()) : while (have_posts()) : the_post(); ?>',
  );

  processed = processed.replace(/<\/forgewp-loop-start>/g, '');

  processed = processed.replace(
    /<forgewp-loop-end\s*\/?>/g,
    '<?php endwhile; else : echo "<p>No posts found.</p>"; endif; ?>',
  );

  processed = processed.replace(/<\/forgewp-loop-end>/g, '');

  // ── Custom Meta Fields (ACF / metadata support) ──
  processed = processed.replace(
    /__FORGEWP_CUSTOM_FIELD__([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_post_meta( get_the_ID(), '$1', true ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_META_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, key, defaultValEncoded) => {
      const decoded = decodeURIComponent(defaultValEncoded);
      const escapedDecoded = decoded.replace(/'/g, "\\'");
      const cleanDecoded = escapedDecoded.replace(
        /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/g,
        (m, text) => {
          const cleanText = text
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/'/g, "\\'");
          return `' . __('${cleanText}', '${textDomain}') . '`;
        }
      );
      const isRichText = decoded.includes('<p>') || decoded.includes('</p>') || decoded.includes('<br') || key.includes('subtitle') || key.includes('content') || key.includes('bio');
      return `<?php echo forgewp_get_meta_value( '${key}', '${cleanDecoded}', ${isRichText ? 'true' : 'false'} ); ?>`;
    }
  );

  // ── Dynamic Custom Menus ──
  processed = processed.replace(
    /<forgewp-menu\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const location = getAttr('location') || 'primary';
      const className = getAttr('class') || getAttr('className') || '';
      const linkClassName =
        getAttr('linkClassName') || getAttr('linkclassname') || '';

      return `<?php
  $lang = function_exists('pll_current_language') ? pll_current_language() : (defined('ICL_LANGUAGE_CODE') ? ICL_LANGUAGE_CODE : '');
  $menu_id = function_exists('forgewp_get_menu_id_for_lang') ? forgewp_get_menu_id_for_lang('${location}', $lang) : null;
  $menu_items = $menu_id ? wp_get_nav_menu_items($menu_id) : array();
  if (!empty($menu_items)) {
      echo '<nav class="${className}">';
      foreach ($menu_items as $item) {
          echo '<a href="' . esc_url($item->url) . '" class="${linkClassName}">' . esc_html($item->title) . '</a>';
      }
      echo '</nav>';
  } else {
      echo '<nav class="${className}"><a href="' . esc_url(home_url('/')) . '" class="${linkClassName}">Home</a></nav>';
  }
  ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-menu>/g, '');

  // ── WpLanguageSwitcher → pll_the_languages() ──
  processed = processed.replace(
    /<forgewp-language-switcher\s+([^>]*)\/?\>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const className    = getAttr('class') || getAttr('className') || '';
      const linkClass    = getAttr('linkClassName') || getAttr('linkclassname') || '';
      const showFlags    = getAttr('showFlags') === '1';
      const showNames    = getAttr('showNames') === '1';
      const showCodes    = getAttr('showCodes') !== '0'; // default true

      const flagsPart  = showFlags ? "echo '<img src=\"' . esc_url($l['flag']) . '\" alt=\"' . esc_attr($l['name']) . '\" />';" : '';
      const codesPart  = showCodes ? "echo esc_html(strtoupper($l['slug']));" : '';
      const namesPart  = showNames ? "echo ' ' . esc_html($l['name']);" : '';

      return `<?php
if (function_exists('pll_the_languages')) {
    $pll_langs = pll_the_languages(array('raw' => 1));
    if (is_array($pll_langs)) {
        echo '<nav class="${className}">';
        foreach ($pll_langs as $pll_l) {
            $pll_is_current = !empty($pll_l['current_lang']);
            $pll_link_class = trim('${linkClass}' . ($pll_is_current ? ' active' : ''));
            echo '<a href="' . esc_url($pll_l['url']) . '" class="' . esc_attr($pll_link_class) . '" hreflang="' . esc_attr($pll_l['slug']) . '" lang="' . esc_attr($pll_l['slug']) . '">';
            ${flagsPart}
            ${codesPart}
            ${namesPart}
            echo '</a>';
        }
        echo '</nav>';
    }
} else {
    // Fallback: plain home link when no multilingual plugin is active
    echo '<nav class="${className}"><a href="' . esc_url(home_url('/')) . '" class="${linkClass}">${showCodes ? 'DE' : ''}</a></nav>';
} ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-language-switcher>/g, '');

  // ── useWpI18n strings → esc_html__() ──
  // Matches __FORGEWP_I18N_<text>__ and emits <?php echo __('text', 'textdomain'); ?>
  // The regex allows spaces and most characters inside the token; double-underscore terminates.
  processed = processed.replace(
    /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/g,
    (match, text) => {
      // Decode any HTML entities React may have encoded
      const clean = text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/'/g, "\\'");
      return `<?php echo __('${clean}', '${textDomain}'); ?>`;
    },
  );

  // ── WordPress Shortcodes Support ──
  processed = processed.replace(
    /<forgewp-shortcode\s+[^>]*code="([^"]+)"\s*\/?>/g,
    (match, code) => {
      const decodedCode = code
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&');
      const escapedCode = decodedCode.replace(/'/g, "\\'");
      return `<?php echo do_shortcode('${escapedCode}'); ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-shortcode>/g, '');

  // ── WordPress Bounded Block Areas Support ──
  processed = processed.replace(
    /<forgewp-block-area\s+[^>]*name="([^"]+)"\s*\/?>/g,
    '<?php the_content(); ?>',
  );
  processed = processed.replace(/<\/forgewp-block-area>/g, '');

  // ── Custom WP_Query Loop Blocks ──
  processed = processed.replace(
    /<forgewp-query-loop-start\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const postType = getAttr('postType') || getAttr('posttype') || 'post';
      const postsPerPage =
        getAttr('postsPerPage') || getAttr('postsperpage') || '10';
      const categoryName =
        getAttr('categoryName') || getAttr('categoryname') || '';
      const metaKey = getAttr('metaKey') || getAttr('metakey') || '';
      const metaValue = getAttr('metaValue') || getAttr('metavalue') || '';
      const metaCompare = getAttr('metaCompare') || getAttr('metacompare') || '=';
      const taxTaxonomy = getAttr('taxTaxonomy') || getAttr('taxtaxonomy') || '';
      const taxTerms = getAttr('taxTerms') || getAttr('taxterms') || '';
      const postIn = getAttr('postIn') || getAttr('postin') || '';

      if (postIn !== '') {
        return `<?php
  $related_val = get_post_meta( get_the_ID(), '${postIn}', true );
  $ids_arr = array_filter( array_map( 'intval', explode( ',', $related_val ) ) );
  $query_args = array(
      'post_type' => '${postType}',
      'posts_per_page' => ${postsPerPage},
      'post__in' => !empty($ids_arr) ? $ids_arr : array(-1),
      'orderby' => 'post__in',
  );
  if (function_exists('pll_current_language')) {
      $query_args['lang'] = pll_current_language();
  }
  $custom_query = new WP_Query($query_args);
  if ($custom_query->have_posts()) : while ($custom_query->have_posts()) : $custom_query->the_post();
  ?>`;
      }

      let phpArgs = `      'post_type' => '${postType}',\n      'posts_per_page' => ${postsPerPage},`;
      
      if (categoryName !== '') {
        phpArgs += `\n      'category_name' => '${categoryName}',`;
      }
      
      if (metaKey !== '') {
        let valExpr = `'${metaValue}'`;
        if (metaValue === 'CURRENT_POST_ID') {
          valExpr = 'get_the_ID()';
        } else if (metaValue === ',CURRENT_POST_ID,') {
          valExpr = "',' . get_the_ID() . ','";
        }
        
        phpArgs += `\n      'meta_query' => array(
          array(
              'key' => '${metaKey}',
              'value' => ${valExpr},
              'compare' => '${metaCompare}'
          )
      ),`;
      }
      
      if (taxTaxonomy !== '') {
        phpArgs += `\n      'tax_query' => array(
          array(
              'taxonomy' => '${taxTaxonomy}',
              'field' => 'slug',
              'terms' => '${taxTerms}'
          )
      ),`;
      }

      return `<?php
  $query_args = array(
${phpArgs}
  );
  if (function_exists('pll_current_language')) {
      $query_args['lang'] = pll_current_language();
  }
  $custom_query = new WP_Query($query_args);
  if ($custom_query->have_posts()) : while ($custom_query->have_posts()) : $custom_query->the_post();
  ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-query-loop-start>/g, '');
  processed = processed.replace(
    /<forgewp-query-loop-end\s*\/?>/g,
    '<?php\n  endwhile;\n  wp_reset_postdata();\n  endif;\n  ?>',
  );
  processed = processed.replace(/<\/forgewp-query-loop-end>/g, '');

  // ── Custom WpImage Primitives ──
  processed = processed.replace(
    /<forgewp-image\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `data-${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const id = getAttr('id');
      const field = getAttr('field');
      const size = getAttr('size') || 'full';
      const className = getAttr('class-name');
      const alt = getAttr('alt');

      if (id) {
        return `<?php echo wp_get_attachment_image( ${id}, '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) ); ?>`;
      } else if (field === 'featuredImage') {
        return `<?php echo wp_get_attachment_image( get_post_thumbnail_id( get_the_ID() ), '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) ); ?>`;
      } else if (field) {
        return `<?php
  $img_val = get_post_meta( get_the_ID(), '${field}', true );
  if ( is_numeric( $img_val ) ) {
      echo wp_get_attachment_image( $img_val, '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) );
  } elseif ( ! empty( $img_val ) ) {
      echo '<img src="' . esc_url( $img_val ) . '" class="' . esc_attr( '${className}' ) . '" alt="' . esc_attr( '${alt}' ) . '" />';
  }
  ?>`;
      } else {
        return `<img class="${className}" alt="${alt}" src="<?php echo esc_url( get_theme_file_uri( 'assets/image-placeholder.png' ) ); ?>" />`;
      }
    },
  );
  processed = processed.replace(/<\/forgewp-image>/g, '');

  // ── Declarative WpRepeater Loops ──
  processed = processed.replace(
    /<forgewp-repeater-start\s+name="([^"]+)"\s+subfields="([^"]+)"\s*\/?>/g,
    (match, name, subfields) => {
      const subfieldsArrayStr = subfields
        .split(',')
        .map((f) => `'${f.trim()}'`)
        .join(', ');
      
      return `<?php
  $repeater_key = '${name}';
  $sub_fields = array(${subfieldsArrayStr});
  $repeater_rows = forgewp_get_repeater_field($repeater_key, $sub_fields);
  if (empty($repeater_rows)) {
      $repeater_rows = array(array());
  }
  foreach ($repeater_rows as $row) {
  ?>`;
    }
  );
  processed = processed.replace(/<\/forgewp-repeater-start>/g, '');

  processed = processed.replace(/<forgewp-repeater-end\s*\/?>/g, '');
  processed = processed.replace(/<\/forgewp-repeater-end>/g, '<?php } ?>');

  // ── Dynamic WpIcon Custom SVGs ──
  processed = processed.replace(
    /<forgewp-icon-placeholder\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const nameAttr = getAttr('name');
      const provider = getAttr('provider') || 'lucide';
      const className = getAttr('class') || getAttr('className') || '';

      const fieldMatch = nameAttr.match(/__FORGEWP_REPEATER_FIELD_([a-zA-Z0-9_-]+)__/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        return `<?php forgewp_render_theme_icon($row['${fieldName}'], '${className}', '${provider}'); ?>`;
      }

      return `<?php forgewp_render_theme_icon('${nameAttr}', '${className}', '${provider}'); ?>`;
    }
  );
  processed = processed.replace(/<\/forgewp-icon-placeholder>/g, '');

  processed = processed.replace(
    /__FORGEWP_REPEATER_FIELD_([a-zA-Z0-9_-]+)__/g,
    (match, fieldName) => `<?php echo esc_html($row['${fieldName}']); ?>`
  );

  // ── Page Links Support ──
  processed = processed.replace(
    /__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, name, defaultVal) => {
      const decoded = decodeURIComponent(defaultVal);
      return `<?php 
      $current_lang = function_exists('pll_current_language') ? pll_current_language() : '';
      $get_pages_args = array('meta_key' => '_wp_page_template', 'meta_value' => 'page-${name}.php', 'number' => 1);
      if (!empty($current_lang)) {
          $get_pages_args['lang'] = $current_lang;
      }
      $matched_pages = get_pages($get_pages_args);
      echo esc_url(!empty($matched_pages) ? get_permalink($matched_pages[0]->ID) : '${decoded.replace(/'/g, "\\'")}'); 
      ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)__/g,
    (match, name) => {
      return `<?php 
      $current_lang = function_exists('pll_current_language') ? pll_current_language() : '';
      $get_pages_args = array('meta_key' => '_wp_page_template', 'meta_value' => 'page-${name}.php', 'number' => 1);
      if (!empty($current_lang)) {
          $get_pages_args['lang'] = $current_lang;
      }
      $matched_pages = get_pages($get_pages_args);
      echo esc_url(!empty($matched_pages) ? get_permalink($matched_pages[0]->ID) : ''); 
      ?>`;
    },
  );

  // ── Auto-hide social media container if no social links exist ──
  let searchIndex = 0;
  while (true) {
    const matchStart = processed.indexOf('data-forgewp-hide-empty-socials', searchIndex);
    if (matchStart === -1) {
      break;
    }
    const divStart = processed.lastIndexOf('<div', matchStart);
    if (divStart === -1) {
      searchIndex = matchStart + 31;
      continue;
    }
    const openTagEnd = processed.indexOf('>', matchStart);
    if (openTagEnd === -1) {
      searchIndex = matchStart + 31;
      continue;
    }
    const contentStartIndex = openTagEnd + 1;
    const matchEnd = findMatchingClosingDiv(processed, contentStartIndex);
    if (matchEnd !== -1) {
      const fullBlock = processed.substring(divStart, matchEnd);
      const optionMatches = Array.from(fullBlock.matchAll(/__FORGEWP_OPTION_(social_[a-zA-Z0-9_-]+)__/g));
      const optionNames = Array.from(new Set(optionMatches.map(m => m[1])));
      const cleanBlock = fullBlock.replace(/\s*data-forgewp-hide-empty-socials="[^"]*"/gi, '').replace(/\s*data-forgewp-hide-empty-socials/gi, '');
      let replacement = cleanBlock;
      if (optionNames.length > 0) {
        const conditions = optionNames.map(name => `! empty( get_option( '${name}' ) )`).join(' || ');
        replacement = `<?php if ( ${conditions} ) : ?>${cleanBlock}<?php endif; ?>`;
      }
      processed = processed.substring(0, divStart) + replacement + processed.substring(matchEnd);
      searchIndex = divStart + replacement.length;
    } else {
      searchIndex = matchStart + 31;
    }
  }

  // ── Auto-hide empty social links / options ──
  // If an <a> tag has href="__FORGEWP_OPTION_social_xxx__" and the option is empty, wrap it in a PHP conditional block.
  processed = processed.replace(
    /<a\b([^>]*?href=["']__FORGEWP_OPTION_([a-zA-Z0-9_-]+)__["'][^>]*?)>([\s\S]*?)<\/a>/gi,
    (match, attributes, name, content) => {
      if (name.startsWith('social_')) {
        const cleanAttrs = attributes.replace(`__FORGEWP_OPTION_${name}__`, `<?php echo esc_url( get_option( '${name}' ) ); ?>`);
        return `<?php if ( ! empty( get_option( '${name}' ) ) ) : ?><a${cleanAttrs}>${content}</a><?php endif; ?>`;
      }
      return match;
    }
  );

  processed = processed.replace(
    /<a\b([^>]*?href=["']__FORGEWP_OPTION_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__["'][^>]*?)>([\s\S]*?)<\/a>/gi,
    (match, attributes, name, defaultVal, content) => {
      if (name.startsWith('social_')) {
        const decoded = decodeURIComponent(defaultVal);
        const cleanAttrs = attributes.replace(`__FORGEWP_OPTION_${name}_DEFAULT_${defaultVal}__`, `<?php echo esc_url( get_option( '${name}', '${decoded}' ) ); ?>`);
        return `<?php if ( ! empty( get_option( '${name}' ) ) ) : ?><a${cleanAttrs}>${content}</a><?php endif; ?>`;
      }
      return match;
    }
  );

  // ── Options & Customizer Theme Mods Support ──
  processed = processed.replace(
    /__FORGEWP_OPTION_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, name, defaultVal) => {
      const decoded = decodeURIComponent(defaultVal);
      if (name === 'blogname') {
        return `<?php echo esc_html( get_bloginfo( 'name' ) ); ?>`;
      }
      if (name === 'blogdescription') {
        return `<?php echo esc_html( get_bloginfo( 'description' ) ); ?>`;
      }
      return `<?php echo esc_html( get_option( '${name}', '${decoded}' ) ); ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_OPTION_([a-zA-Z0-9_-]+)__/g,
    (match, name) => {
      if (name === 'blogname') {
        return `<?php echo esc_html( get_bloginfo( 'name' ) ); ?>`;
      }
      if (name === 'blogdescription') {
        return `<?php echo esc_html( get_bloginfo( 'description' ) ); ?>`;
      }
      return `<?php echo esc_html( get_option( '${name}' ) ); ?>`;
    },
  );

  processed = processed.replace(
    /__FORGEWP_THEME_MOD_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, name, defaultVal) => {
      const decoded = decodeURIComponent(defaultVal);
      return `<?php echo esc_html( get_theme_mod( '${name}', '${decoded}' ) ); ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_THEME_MOD_([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_theme_mod( '$1' ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THEME_URI__/g,
    "<?php echo esc_url( get_template_directory_uri() ); ?>",
  );

  return processed;
}

function findMatchingClosingDiv(html, startIndex) {
  let openCount = 1;
  let index = startIndex;
  while (openCount > 0 && index < html.length) {
    const nextOpen = html.indexOf('<div', index);
    const nextClose = html.indexOf('</div>', index);
    if (nextClose === -1) {
      break;
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      openCount++;
      index = nextOpen + 4;
    } else {
      openCount--;
      index = nextClose + 6;
    }
  }
  return openCount === 0 ? index : -1;
}
