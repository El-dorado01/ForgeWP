/**
 * R2 native export (docs/phase-status-and-blog-urls.md §9 + Claude's §9a):
 * turns the markers and tokens that `<WpPostTerms>`, `<WpTermsLoop>`,
 * `<WpComments>` and `getPost()` / `getComments()` emit during native export
 * into PHP that reads live WordPress data through the same builders as REST
 * (forgewp_native_* in functions/content-resources.js), so native and
 * decoupled render the same thing.
 *
 * Runs before the generic token passes in processMarkup().
 */

const attr = (attrs, name) => {
  const m = String(attrs || '').match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? m[1] ?? m[2] ?? m[3] ?? '' : '';
};

const safeTaxonomy = (value) => (/^(?:\*|[a-zA-Z0-9_-]+)$/.test(value) ? value : '');
const posInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Numeric tokens inside island props JSON must stay numbers: {"postId":15}, not {"postId":"15"} (C1). */
const NUMERIC_TOKENS = {
  __FORGEWP_THE_ID__: '(int) get_the_ID()',
  __FORGEWP_COMMENTS_COUNT__: "(int) (function_exists('forgewp_native_comments_total') ? forgewp_native_comments_total() : get_comments_number())",
};

function replaceNumericTokensInProps(html) {
  let out = html;
  for (const [token, expr] of Object.entries(NUMERIC_TOKENS)) {
    out = out
      .split(`&quot;${token}&quot;`).join(`<?php echo ${expr}; ?>`)
      .split(`"${token}"`).join(`<?php echo ${expr}; ?>`);
  }
  return out;
}

function termTokens(body, v) {
  return body
    .replace(/__FORGEWP_TERM_NAME__/g, `<?php echo esc_html( ${v}['name'] ?? '' ); ?>`)
    .replace(/__FORGEWP_TERM_SLUG__/g, `<?php echo esc_attr( ${v}['slug'] ?? '' ); ?>`)
    .replace(/__FORGEWP_TERM_PATH__/g, `<?php echo esc_attr( ${v}['path'] ?? '' ); ?>`)
    .replace(/__FORGEWP_TERM_URL__/g, `<?php echo esc_url( ${v}['permalink'] ?? home_url( ${v}['path'] ?? '/' ) ); ?>`)
    .replace(/__FORGEWP_TERM_ID__/g, `<?php echo (int) ( ${v}['id'] ?? 0 ); ?>`)
    .replace(/__FORGEWP_TERM_COUNT__/g, `<?php echo (int) ( ${v}['count'] ?? 0 ); ?>`)
    .replace(/__FORGEWP_TERM_DESCRIPTION__/g, `<?php echo esc_html( ${v}['description'] ?? '' ); ?>`);
}

function commentTokens(body, v) {
  return body
    .replace(/__FORGEWP_COMMENT_ID__/g, `<?php echo (int) ${v}['id']; ?>`)
    .replace(/__FORGEWP_COMMENT_PARENT_ID__/g, `<?php echo (int) ${v}['parentId']; ?>`)
    .replace(/__FORGEWP_COMMENT_AUTHOR_NAME__/g, `<?php echo esc_html( ${v}['author']['name'] ); ?>`)
    .replace(/__FORGEWP_COMMENT_AUTHOR_AVATAR__/g, `<?php echo esc_url( ${v}['author']['avatarUrl'] ); ?>`)
    .replace(/__FORGEWP_COMMENT_AUTHOR_URL__/g, `<?php echo esc_url( ${v}['author']['url'] ); ?>`)
    .replace(/__FORGEWP_COMMENT_DATE__/g, `<?php echo esc_html( ${v}['date'] ); ?>`)
    .replace(/__FORGEWP_COMMENT_CONTENT__/g, `<?php echo wp_kses_post( ${v}['content'] ); ?>`);
}

const TAG = (name) => `<${name}\\b([^>]*)>(?:\\s*</${name}>)?`;
const START = (name) => new RegExp(TAG(name), 'i');

/** Split `body` at an optional empty marker. */
function splitEmpty(body, emptyTag) {
  const m = body.match(START(emptyTag));
  if (!m) return { item: body, empty: '' };
  return { item: body.slice(0, m.index), empty: body.slice(m.index + m[0].length) };
}

function processTermLoops(html, counter) {
  const re = new RegExp(`${TAG('forgewp-terms-loop-start')}([\\s\\S]*?)${TAG('forgewp-terms-loop-end')}`, 'i');
  let out = html;
  let m;
  while ((m = out.match(re))) {
    const n = counter.next++;
    const attrs = m[1];
    const taxonomy = safeTaxonomy(attr(attrs, 'taxonomy'));
    const fromTaxonomy = attr(attrs, 'source') === 'taxonomy';
    const hideEmpty = attr(attrs, 'hideempty') !== '0';
    const { item, empty } = splitEmpty(m[2], 'forgewp-terms-loop-empty');
    const list = `$__fwp_terms_${n}`;
    const v = `$__fwp_term_${n}`;
    const source = !taxonomy
      ? 'array()'
      : fromTaxonomy
        ? `(function_exists('forgewp_native_taxonomy_terms') ? forgewp_native_taxonomy_terms('${taxonomy}', ${hideEmpty ? 'true' : 'false'}) : array())`
        : `(function_exists('forgewp_native_post_terms') ? forgewp_native_post_terms('${taxonomy}') : array())`;
    const php =
      `<?php ${list} = ${source}; if ( ! empty( ${list} ) ) : foreach ( ${list} as ${v} ) : ?>` +
      termTokens(item, v) +
      `<?php endforeach; else : ?>${empty}<?php endif; ?>`;
    out = out.slice(0, m.index) + php + out.slice(m.index + m[0].length);
  }
  return out;
}

function processCommentLoops(html, counter) {
  const re = new RegExp(`${TAG('forgewp-comments-loop-start')}([\\s\\S]*?)${TAG('forgewp-comments-loop-end')}`, 'i');
  let out = html;
  let m;
  while ((m = out.match(re))) {
    const n = counter.next++;
    const page = posInt(attr(m[1], 'page'), 1);
    const perPage = Math.min(posInt(attr(m[1], 'perpage'), 50), 100);
    const { item, empty } = splitEmpty(m[2], 'forgewp-comments-loop-empty');
    const res = `$__fwp_comments_${n}`;
    const render = `$__fwp_render_comment_${n}`;
    const v = `$__fwp_comment_${n}`;
    const depth = `$__fwp_depth_${n}`;
    const children =
      `<?php if ( ! empty( ${v}['children'] ) && ${depth} + 1 < forgewp_native_comment_max_depth() ) { ` +
      `foreach ( ${v}['children'] as $__fwp_child_${n} ) { ${render}( $__fwp_child_${n}, ${depth} + 1 ); } } ?>`;
    const itemPhp = commentTokens(item, v).replace(new RegExp(TAG('forgewp-comment-children'), 'gi'), children);
    const php =
      `<?php ${res} = function_exists('forgewp_native_comments') ? forgewp_native_comments(${page}, ${perPage}) : array('items' => array(), 'open' => comments_open()); ` +
      `${render} = function ( ${v}, ${depth} = 0 ) use ( &${render} ) { ?>` +
      itemPhp +
      `<?php }; if ( ! empty( ${res}['items'] ) ) { foreach ( ${res}['items'] as $__fwp_top_${n} ) { ${render}( $__fwp_top_${n} ); } } else { ?>` +
      empty +
      `<?php } ?>`;
    out = out.slice(0, m.index) + php + out.slice(m.index + m[0].length);
  }
  return out
    .replace(new RegExp(TAG('forgewp-comments-closed-start'), 'gi'), '<?php if ( ! comments_open() ) : ?>')
    .replace(new RegExp(TAG('forgewp-comments-closed-end'), 'gi'), '<?php endif; ?>');
}

/**
 * @param {string} html
 * @returns {string}
 */
export function processR2NativeMarkers(html) {
  if (!html || !/__FORGEWP_(?:THE_ID|THE_PATH|COMMENTS_COUNT|TERM_|COMMENT_)|<forgewp-(?:terms|comments?)-/i.test(html)) {
    return html;
  }
  const counter = { next: 0 };
  let out = replaceNumericTokensInProps(html);
  out = processCommentLoops(out, counter);
  out = processTermLoops(out, counter);
  out = out
    .replace(/__FORGEWP_THE_ID__/g, '<?php echo (int) get_the_ID(); ?>')
    .replace(/__FORGEWP_COMMENTS_COUNT__/g, `<?php echo ${NUMERIC_TOKENS.__FORGEWP_COMMENTS_COUNT__}; ?>`)
    .replace(
      /__FORGEWP_THE_PATH__/g,
      "<?php echo esc_html( function_exists('forgewp_native_the_path') ? forgewp_native_the_path() : wp_make_link_relative( get_permalink() ) ); ?>",
    );
  return out;
}
