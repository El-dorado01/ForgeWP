/**
 * Process markup: fix nav links, replace ForgeWP dynamic template tags with PHP equivalents, etc.
 *
 * @param {string} html Raw HTML markup
 * @param {string} textDomain Text domain for translations
 * @param {Set<string>|null} richTextKeys Field keys actually declared richText() in an
 *   editable schema — the authoritative source for whether a meta value should be run
 *   through wpautop(). Without this, richness was guessed from the key name (e.g. any
 *   key containing "subtitle"), which wrongly wpautop-wraps a plain text() field once
 *   it has real content, double-nesting <p> tags inside the JSX's own <p> wrapper and
 *   silently dropping its styling (the browser auto-closes the outer <p> at the nested
 *   one). The empty-value/default case bypassed wpautop entirely, so this only ever
 *   surfaced once an editor actually filled in the field.
 * @returns {string} Transpiled HTML containing PHP tags
 */
export function processMarkup(html, textDomain = 'theme', richTextKeys = null) {
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

      const metaMatch = nameAttr.match(/__(?:FORGEWP|forgewp)_META_([a-zA-Z0-9_-]+)(?:_POST_(front|[0-9]+))?_DEFAULT_(.*?)__/i);
      if (metaMatch) {
        const key = metaMatch[1];
        const postId = metaMatch[2];
        const defaultValEncoded = metaMatch[3];
        const decoded = decodeURIComponent(defaultValEncoded);
        const escapedDecoded = decoded.replace(/'/g, "\\'");
        const cleanDecoded = escapedDecoded.replace(
          /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/gi,
          (m, text) => {
            const cleanText = text
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/'/g, "\\'");
            return `' . __('${cleanText}', '${textDomain}') . '`;
          }
        );
        const phpPostId = (postId && postId.toLowerCase() === 'front') ? 'forgewp_resolve_front_page_id()' : (postId ? postId : 'null');
        return `<?php forgewp_render_theme_icon(forgewp_get_meta_value('${key}', '${cleanDecoded}', false, ${phpPostId}), '${className}', '${provider}'); ?>`;
      }

      if (nameAttr.startsWith('<?php') && nameAttr.endsWith('?>')) {
        const phpCode = nameAttr
          .replace(/^<\?php\s*(?:echo\s+)?/, '')
          .replace(/\s*\?>$/, '')
          .trim()
          .replace(/;$/, '');
        return `<?php forgewp_render_theme_icon(${phpCode}, '${className}', '${provider}'); ?>`;
      }

      return `<?php forgewp_render_theme_icon('${nameAttr}', '${className}', '${provider}'); ?>`;
    }
  );
  processed = processed.replace(/<\/forgewp-icon-placeholder>/g, '');

  // ── Custom Meta Fields (ACF / metadata support) ──
  processed = processed.replace(
    /__FORGEWP_CUSTOM_FIELD__([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_post_meta( get_the_ID(), '$1', true ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_META_([a-zA-Z0-9_-]+)(?:_POST_(front|[0-9]+))?_DEFAULT_(.*?)__/gi,
    (match, key, postId, defaultValEncoded) => {
      const decoded = decodeURIComponent(defaultValEncoded);
      const escapedDecoded = decoded.replace(/'/g, "\\'");
      const cleanDecoded = escapedDecoded.replace(
        /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/gi,
        (m, text) => {
          const cleanText = text
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/'/g, "\\'");
          return `' . __('${cleanText}', '${textDomain}') . '`;
        }
      );
      const isRichText = (richTextKeys instanceof Set ? richTextKeys.has(key) : false) ||
        decoded.includes('<p>') || decoded.includes('</p>') || decoded.includes('<br');
      const phpPostId = (postId && postId.toLowerCase() === 'front') ? 'forgewp_resolve_front_page_id()' : (postId ? postId : 'null');
      return `<?php echo forgewp_get_meta_value( '${key}', '${cleanDecoded}', ${isRichText ? 'true' : 'false'}, ${phpPostId} ); ?>`;
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

      const flagsPart  = showFlags ? "echo '<img src=\"' . esc_url($pll_l['flag']) . '\" alt=\"' . esc_attr($pll_l['name']) . '\" />';" : '';
      const codesPart  = showCodes ? "echo esc_html(strtoupper($pll_l['slug']));" : '';
      const namesPart  = showNames ? "echo ' ' . esc_html($pll_l['name']);" : '';

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
      const orderby = getAttr('orderby') || '';
      const order = getAttr('order') || '';
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
      
      if (orderby !== '') {
        phpArgs += `\n      'orderby' => '${orderby}',`;
      }
      if (order !== '') {
        phpArgs += `\n      'order' => '${order}',`;
      }
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
      const src = getAttr('src');
      const size = getAttr('size') || 'full';
      const className = getAttr('class-name') || getAttr('class');
      const alt = getAttr('alt');
      const width = getAttr('width');
      const height = getAttr('height');
      const priority = getAttr('priority') === 'true';
      const loading = getAttr('loading') || (priority ? 'eager' : 'lazy');
      const decoding = getAttr('decoding') || 'async';
      const sizes = getAttr('sizes');

      // Build PHP attribute array for wp_get_attachment_image
      const phpAttrs = [];
      if (className) phpAttrs.push(`'class' => '${className.replace(/'/g, "\\'")}'`);
      if (alt) phpAttrs.push(`'alt' => '${alt.replace(/'/g, "\\'")}'`);
      if (sizes) phpAttrs.push(`'sizes' => '${sizes.replace(/'/g, "\\'")}'`);
      if (priority) {
        phpAttrs.push(`'fetchpriority' => 'high'`);
        phpAttrs.push(`'loading' => 'eager'`);
      } else {
        if (loading) phpAttrs.push(`'loading' => '${loading}'`);
        if (decoding) phpAttrs.push(`'decoding' => '${decoding}'`);
      }
      const phpAttrStr = `array( ${phpAttrs.join(', ')} )`;

      // Build standard HTML attributes for <img> tags
      const htmlAttrs = [];
      if (className) htmlAttrs.push(`class="${className}"`);
      if (alt) htmlAttrs.push(`alt="${alt}"`);
      if (width) htmlAttrs.push(`width="${width}"`);
      if (height) htmlAttrs.push(`height="${height}"`);
      if (priority) {
        htmlAttrs.push(`fetchpriority="high"`);
        htmlAttrs.push(`loading="eager"`);
      } else {
        if (loading) htmlAttrs.push(`loading="${loading}"`);
        if (decoding) htmlAttrs.push(`decoding="${decoding}"`);
      }
      if (sizes) htmlAttrs.push(`sizes="${sizes}"`);
      const extraHtmlStr = htmlAttrs.length > 0 ? ' ' + htmlAttrs.join(' ') : '';
      const isNumericSrc = id || (/^\d+$/.test(src) ? src : null);
      const isFeaturedImg = field === 'featuredImage' || field === 'featured_image' || src === 'featuredImage' || src === 'featured_image';

      if (isNumericSrc) {
        return `<?php echo wp_get_attachment_image( ${isNumericSrc}, '${size}', false, ${phpAttrStr} ); ?>`;
      } else if (isFeaturedImg) {
        return `<?php echo wp_get_attachment_image( get_post_thumbnail_id( get_the_ID() ), '${size}', false, ${phpAttrStr} ); ?>`;
      } else if (field) {
        return `<?php
  $img_val = get_post_meta( get_the_ID(), '${field}', true );
  if ( is_numeric( $img_val ) ) {
      echo wp_get_attachment_image( $img_val, '${size}', false, ${phpAttrStr} );
  } elseif ( ! empty( $img_val ) ) {
      echo '<img src="' . esc_url( $img_val ) . '"' . esc_attr( '${extraHtmlStr}' ) . ' />';
  }
  ?>`;
      } else if (src) {
        if (/^https?:\/\//i.test(src) || /^\/\//.test(src)) {
          return `<img src="${src}"${extraHtmlStr} />`;
        }
        // Local theme asset path
        const cleanPath = src.replace(/^(\/|\.\/|@\/)+/, '');
        return `<img src="<?php echo esc_url( get_theme_file_uri( '${cleanPath}' ) ); ?>"${extraHtmlStr} />`;
      } else {
        return `<img src="<?php echo esc_url( get_theme_file_uri( 'assets/image-placeholder.png' ) ); ?>"${extraHtmlStr} />`;
      }
    },
  );
  processed = processed.replace(/<\/forgewp-image>/g, '');

  // ── Universal Media Assets (video, audio, source, img) ──
  const MEDIA_EXTS = /\.(png|jpe?g|webp|svg|gif|mp4|webm|ogg|mp3|wav|woff2?|ttf|eot)$/i;
  processed = processed.replace(
    /<(video|audio|source|img)\b([^>]*)\/?>/gi,
    (tagMatch, tagName, attrsStr) => {
      let updatedAttrs = attrsStr.replace(
        /\b(src|poster)=(?:"([^"]*)"|'([^']*)')/gi,
        (attrMatch, attrName, doubleVal, singleVal) => {
          const val = doubleVal !== undefined ? doubleVal : singleVal;
          if (
            !val ||
            /^https?:\/\//i.test(val) ||
            /^\/\//.test(val) ||
            /^data:/i.test(val) ||
            /^blob:/i.test(val) ||
            /<\?php/i.test(val) ||
            !MEDIA_EXTS.test(val.split('?')[0])
          ) {
            return attrMatch;
          }
          const cleanPath = val.replace(/^(\/|\.\/|@\/)+/, '');
          return `${attrName}="<?php echo esc_url( get_theme_file_uri( '${cleanPath}' ) ); ?>"`;
        }
      );
      return `<${tagName}${updatedAttrs}>`;
    }
  );

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



  // ── Authentication & Capability Gates ──
  processed = processed.replace(
    /<forgewp-auth-gate-start\s*\/?>/g,
    '<?php if ( is_user_logged_in() ) : ?>',
  );
  processed = processed.replace(/<\/forgewp-auth-gate-start>/g, '');

  processed = processed.replace(
    /<forgewp-auth-gate-fallback\s*\/?>/g,
    '<?php else : ?>',
  );
  processed = processed.replace(/<\/forgewp-auth-gate-fallback>/g, '');

  processed = processed.replace(
    /<forgewp-auth-gate-end\s*\/?>/g,
    '<?php endif; ?>',
  );
  processed = processed.replace(/<\/forgewp-auth-gate-end>/g, '');

  processed = processed.replace(
    /<forgewp-capability-gate-start\s+[^>]*allowed="([^"]+)"\s*\/?>/g,
    "<?php if ( current_user_can( '$1' ) ) : ?>",
  );
  processed = processed.replace(/<\/forgewp-capability-gate-start>/g, '');

  processed = processed.replace(
    /<forgewp-capability-gate-fallback\s*\/?>/g,
    '<?php else : ?>',
  );
  processed = processed.replace(/<\/forgewp-capability-gate-fallback>/g, '');

  processed = processed.replace(
    /<forgewp-capability-gate-end\s*\/?>/g,
    '<?php endif; ?>',
  );
  processed = processed.replace(/<\/forgewp-capability-gate-end>/g, '');


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
      $__fwp_id = forgewp_resolve_route_page_id('${name}');
      echo esc_url($__fwp_id ? get_permalink($__fwp_id) : '${decoded.replace(/'/g, "\\'")}');
      ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)__/g,
    (match, name) => {
      return `<?php
      $__fwp_id = forgewp_resolve_route_page_id('${name}');
      echo esc_url($__fwp_id ? get_permalink($__fwp_id) : '');
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
      const optionMatches = Array.from(fullBlock.matchAll(/__FORGEWP_OPTION_(social_[a-zA-Z0-9_-]+?)(?:_DEFAULT_(.*?))?__/g));
      const optionMap = new Map();
      for (const m of optionMatches) {
        const name = m[1];
        const defaultVal = m[2] ? decodeURIComponent(m[2]) : '';
        optionMap.set(name, defaultVal);
      }
      const cleanBlock = fullBlock.replace(/\s*data-forgewp-hide-empty-socials="[^"]*"/gi, '').replace(/\s*data-forgewp-hide-empty-socials/gi, '');
      let replacement = cleanBlock;
      if (optionMap.size > 0) {
        const conditions = Array.from(optionMap.entries()).map(([name, defaultVal]) => `! empty( get_option( '${name}', '${defaultVal.replace(/'/g, "\\'")}' ) )`).join(' || ');
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
    /<a\b([^>]*?href=["']__FORGEWP_OPTION_((?:(?!_DEFAULT_)[a-zA-Z0-9_-])+)__["'][^>]*?)>([\s\S]*?)<\/a>/gi,
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
        const cleanAttrs = attributes.replace(`__FORGEWP_OPTION_${name}_DEFAULT_${defaultVal}__`, `<?php echo esc_url( get_option( '${name}', '${decoded.replace(/'/g, "\\'")}' ) ); ?>`);
        return `<?php if ( ! empty( get_option( '${name}', '${decoded.replace(/'/g, "\\'")}' ) ) ) : ?><a${cleanAttrs}>${content}</a><?php endif; ?>`;
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
      // Resolve any nested __FORGEWP_I18N_text__ tokens inside the default value
      const cleanDecoded = decoded
        .replace(/'/g, "\\'") // escape single quotes first
        .replace(
          /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/gi,
          (m, text) => {
            const cleanText = text
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/'/g, "\\'");
            return `' . __('${cleanText}', '${textDomain}') . '`;
          }
        );
      return `<?php echo esc_html( get_option( '${name}', '${cleanDecoded}' ) ); ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_OPTION_((?:(?!_DEFAULT_)[a-zA-Z0-9_-])+)__/g,
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
    /__FORGEWP_THEME_MOD_((?:(?!_DEFAULT_)[a-zA-Z0-9_-])+)__/g,
    "<?php echo esc_html( get_theme_mod( '$1' ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THEME_URI__/g,
    "<?php echo esc_url( get_template_directory_uri() ); ?>",
  );

  // ── WooCommerce Product Loop Blocks ──
  processed = processed.replace(
    /<forgewp-product-loop-start\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const category = getAttr('category') || '';
      const limit = getAttr('limit') || '10';
      const orderBy = getAttr('orderBy') || getAttr('orderby') || 'date';
      const order = getAttr('order') || 'desc';
      const status = getAttr('status') || 'publish';

      let catQuery = '';
      if (category !== '') {
        catQuery = `\n      'category' => array('${category}'),`;
      }

      return `<?php
  $query_args = array(
      'limit' => ${limit},
      'orderby' => '${orderBy}',
      'order' => '${order}',
      'status' => '${status}',${catQuery}
  );
  $products = wc_get_products($query_args);
  foreach ($products as $product) {
      global $product;
      setup_postdata(get_the_ID());
  ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-product-loop-start>/g, '');
  processed = processed.replace(
    /<forgewp-product-loop-end\s*\/?>/g,
    '<?php\n  }\n  wp_reset_postdata();\n  ?>',
  );
  processed = processed.replace(/<\/forgewp-product-loop-end>/g, '');

  // ── WooCommerce Dynamic Hook Replacements ──
  processed = processed.replace(
    /__FORGEWP_PRODUCT_PRICE__/g,
    '<?php global $product; echo wp_kses_post( $product->get_price_html() ); ?>'
  );
  processed = processed.replace(
    /__FORGEWP_PRODUCT_SKU__/g,
    '<?php global $product; echo esc_html( $product->get_sku() ); ?>'
  );
  processed = processed.replace(
    /__FORGEWP_PRODUCT_RATING__/g,
    '<?php global $product; echo wp_kses_post( wc_get_rating_html( $product->get_average_rating() ) ); ?>'
  );

  // ── Translate Compile-Time encodeURIComponent Wrapper to rawurlencode in PHP ──
  processed = processed.replace(
    /__FORGEWP_URLENCODE_START__(.*?)__FORGEWP_URLENCODE_END__/gs,
    (match, content) => {
      const tokens = [];
      let lastIndex = 0;
      const phpRegex = /<\?php\s+(?:echo\s+)?(.*?);\s*\?>/g;
      let m;
      while ((m = phpRegex.exec(content)) !== null) {
        if (m.index > lastIndex) {
          const staticText = content.substring(lastIndex, m.index);
          tokens.push(JSON.stringify(staticText));
        }
        tokens.push(`(${m[1]})`);
        lastIndex = phpRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        const staticText = content.substring(lastIndex);
        tokens.push(JSON.stringify(staticText));
      }
      const phpExpr = tokens.join(' . ');
      return `<?php echo rawurlencode(${phpExpr}); ?>`;
    }
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
