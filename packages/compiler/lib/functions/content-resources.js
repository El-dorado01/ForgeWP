/**
 * Phase C content resources: `posts` / `post`, `terms`, `comments`
 * (docs/resource-contracts.md §10–§12 with the §12a amendments).
 *
 * One PHP builder per resource feeds both the REST routes and the native
 * forgeWpHydration.resources payload (post, posts, term). Emitted into the
 * Companion backend. Only published content, public post types and public
 * taxonomies are exposed; commenter email/IP never are.
 */
import { buildNetworkHelpersPhp } from './network-helpers.js';

export function buildContentResourcesPhp(textDomain = 'forgewp') {
  const td = String(textDomain).replace(/'/g, "\\'");
  return `
${buildNetworkHelpersPhp()}
/**
 * ── Phase C content resources: posts, terms, comments (docs/resource-contracts.md §10–§12) ──
 */
if (!function_exists('forgewp_content_public_post_type')) {
    function forgewp_content_public_post_type($type) {
        $object = is_string($type) ? get_post_type_object($type) : null;
        return $object && !empty($object->public) && $type !== 'attachment';
    }

    function forgewp_content_public_taxonomy($taxonomy) {
        $object = is_string($taxonomy) ? get_taxonomy($taxonomy) : null;
        return $object && !empty($object->public);
    }

    function forgewp_content_lang($requested) {
        return function_exists('forgewp_resource_lang') ? forgewp_resource_lang($requested) : strtolower(substr((string) get_locale(), 0, 2));
    }

    function forgewp_content_path($url) {
        return function_exists('forgewp_resource_path') ? forgewp_resource_path($url) : (string) wp_parse_url($url, PHP_URL_PATH);
    }

    function forgewp_content_plain($text) {
        return html_entity_decode(wp_strip_all_tags((string) $text), ENT_QUOTES, 'UTF-8');
    }

    // ── terms (§11) ───────────────────────────────────────────────────────
    function forgewp_term_item($term) {
        $link = get_term_link($term);
        $link = is_wp_error($link) ? '' : (string) $link;
        return array(
            'id'          => (int) $term->term_id,
            'slug'        => (string) $term->slug,
            'name'        => forgewp_content_plain($term->name),
            'description' => (string) $term->description,
            'count'       => (int) $term->count,
            'parent'      => (int) $term->parent,
            'path'        => $link !== '' ? forgewp_content_path($link) : '',
            'permalink'   => $link,
        );
    }

    function forgewp_terms_resource($taxonomy, $lang, $args = array()) {
        $query = array(
            'taxonomy'   => $taxonomy,
            'hide_empty' => !isset($args['hideEmpty']) || $args['hideEmpty'],
        );
        if (isset($args['parent']) && $args['parent'] !== null && $args['parent'] !== '') {
            $query['parent'] = (int) $args['parent'];
        }
        if (function_exists('pll_current_language')) {
            $query['lang'] = $lang;
        }
        $terms = get_terms($query);
        $items = array();
        if (is_array($terms)) {
            foreach ($terms as $term) {
                $items[] = forgewp_term_item($term);
            }
        }
        return array('taxonomy' => $taxonomy, 'lang' => $lang, 'items' => $items);
    }

    function forgewp_term_resource($term, $lang) {
        return array_merge(forgewp_term_item($term), array('taxonomy' => (string) $term->taxonomy, 'lang' => $lang));
    }

    // ── posts (§10) ───────────────────────────────────────────────────────
    function forgewp_post_resource_item($post, $full, $lang) {
        $post = get_post($post);
        $protected = !empty($post->post_password);
        $previous = isset($GLOBALS['post']) ? $GLOBALS['post'] : null;
        $GLOBALS['post'] = $post;
        setup_postdata($post);
        $excerpt = $protected ? '' : (string) apply_filters('the_excerpt', get_the_excerpt($post));
        $content = '';
        if ($full && !$protected) {
            $content = (string) apply_filters('the_content', $post->post_content);
            $content = str_replace(']]>', ']]&gt;', $content);
        }
        $GLOBALS['post'] = $previous;
        if ($previous) {
            setup_postdata($previous);
        }

        $permalink = (string) get_permalink($post);
        $thumb_id = (int) get_post_thumbnail_id($post);
        $featured = null;
        if ($thumb_id) {
            $src = wp_get_attachment_image_src($thumb_id, 'full');
            if ($src) {
                $featured = array(
                    'url'    => (string) $src[0],
                    'alt'    => (string) get_post_meta($thumb_id, '_wp_attachment_image_alt', true),
                    'width'  => (int) $src[1],
                    'height' => (int) $src[2],
                    'srcset' => (string) wp_get_attachment_image_srcset($thumb_id, 'full'),
                );
            }
        }
        $terms = array();
        foreach (get_object_taxonomies($post->post_type, 'objects') as $taxonomy => $object) {
            if (empty($object->public)) {
                continue;
            }
            $assigned = get_the_terms($post, $taxonomy);
            if (is_array($assigned)) {
                $terms[$taxonomy] = array_map(function ($term) {
                    $item = forgewp_term_item($term);
                    return array('id' => $item['id'], 'slug' => $item['slug'], 'name' => $item['name'], 'path' => $item['path']);
                }, $assigned);
            }
        }
        $item = array(
            'id'            => (int) $post->ID,
            'type'          => (string) $post->post_type,
            'slug'          => (string) $post->post_name,
            'lang'          => $lang,
            'title'         => forgewp_content_plain(get_the_title($post)),
            'excerpt'       => $excerpt,
            'date'          => (string) get_post_time('c', true, $post),
            'modified'      => (string) get_post_modified_time('c', true, $post),
            'permalink'     => $permalink,
            'path'          => forgewp_content_path($permalink),
            'author'        => array('id' => (int) $post->post_author, 'name' => (string) get_the_author_meta('display_name', $post->post_author)),
            'featuredImage' => $featured,
            'terms'         => (object) $terms,
            'protected'     => $protected,
        );
        if ($full) {
            $item['content'] = $content;
            $fields = array();
            if (!$protected) {
                foreach (get_registered_meta_keys('post', $post->post_type) as $key => $args) {
                    if (!empty($args['show_in_rest']) && strpos((string) $key, '_') !== 0) {
                        $fields[$key] = get_post_meta($post->ID, $key, !empty($args['single']));
                    }
                }
            }
            $item['fields'] = (object) $fields;
            $item['blocks'] = (!$protected && function_exists('forgewp_serialize_rest_blocks'))
                ? forgewp_serialize_rest_blocks(parse_blocks($post->post_content))
                : array();
        }
        return $item;
    }

    function forgewp_posts_from_query($query, $type, $lang) {
        $items = array();
        foreach ($query->posts as $post) {
            $items[] = forgewp_post_resource_item($post, false, $lang);
        }
        $per_page = (int) $query->get('posts_per_page');
        return array(
            'type'       => $type,
            'lang'       => $lang,
            'page'       => max(1, (int) $query->get('paged')),
            'perPage'    => $per_page > 0 ? $per_page : count($items),
            'total'      => (int) $query->found_posts,
            'totalPages' => (int) $query->max_num_pages,
            'items'      => $items,
        );
    }

    function forgewp_posts_resource($type, $lang, $args = array()) {
        $per_page = isset($args['perPage']) ? max(1, min(100, (int) $args['perPage'])) : 10;
        $query_args = array(
            'post_type'           => $type,
            'post_status'         => 'publish',
            'posts_per_page'      => $per_page,
            'paged'               => isset($args['page']) ? max(1, (int) $args['page']) : 1,
            'ignore_sticky_posts' => true,
            'orderby'             => isset($args['orderby']) && in_array($args['orderby'], array('date', 'title', 'menu_order'), true) ? $args['orderby'] : 'date',
            'order'               => isset($args['order']) && strtolower($args['order']) === 'asc' ? 'ASC' : 'DESC',
        );
        if (!empty($args['search'])) {
            $query_args['s'] = (string) $args['search'];
        }
        if (!empty($args['taxonomy']) && !empty($args['term'])) {
            $query_args['tax_query'] = array(array('taxonomy' => $args['taxonomy'], 'field' => 'slug', 'terms' => sanitize_title($args['term'])));
        }
        if (function_exists('pll_current_language')) {
            $query_args['lang'] = $lang;
        }
        return forgewp_posts_from_query(new WP_Query($query_args), $type, $lang);
    }

    function forgewp_find_published_post($type, $slug) {
        $found = get_posts(array('post_type' => $type, 'name' => sanitize_title($slug), 'post_status' => 'publish', 'posts_per_page' => 1, 'lang' => ''));
        return empty($found) ? null : $found[0];
    }

    // ── comments (§12) ────────────────────────────────────────────────────
    function forgewp_comment_item($comment) {
        return array(
            'id'       => (int) $comment->comment_ID,
            'parentId' => (int) $comment->comment_parent,
            'author'   => array(
                'name'      => forgewp_content_plain(get_comment_author($comment)),
                'avatarUrl' => (string) get_avatar_url($comment),
                'url'       => (string) $comment->comment_author_url,
            ),
            'date'     => (string) get_comment_date('c', $comment),
            'content'  => (string) apply_filters('comment_text', get_comment_text($comment), $comment, array()),
            'children' => array(),
        );
    }

    function forgewp_comments_resource($post, $page, $per_page) {
        $comments = get_comments(array('post_id' => (int) $post->ID, 'status' => 'approve', 'orderby' => 'comment_date_gmt', 'order' => 'ASC'));
        $by_id = array();
        foreach ($comments as $comment) {
            $by_id[(int) $comment->comment_ID] = forgewp_comment_item($comment);
        }
        $threaded = get_option('thread_comments');
        $top = array();
        foreach ($by_id as $id => &$node) {
            $parent = $node['parentId'];
            if ($threaded && $parent > 0 && isset($by_id[$parent])) {
                $by_id[$parent]['children'][] = &$node;
            } else {
                $top[] = &$node;
            }
        }
        unset($node);
        $per_page = max(1, min(100, (int) $per_page));
        $page = max(1, (int) $page);
        return array(
            'post'    => (int) $post->ID,
            'open'    => comments_open($post),
            'page'    => $page,
            'perPage' => $per_page,
            'total'   => count($top),
            'items'   => array_slice($top, ($page - 1) * $per_page, $per_page),
        );
    }

    // ── R2: native templates read the same builders as REST (status §9, §9a) ──

    /** Comments resource for the current post, memoized per request (count + loop share one query). */
    function forgewp_native_comments($page = 1, $per_page = 50) {
        static $memo = array();
        $post = get_post();
        if (!$post) {
            return array('post' => 0, 'open' => false, 'page' => 1, 'perPage' => (int) $per_page, 'total' => 0, 'items' => array());
        }
        $key = $post->ID . ':' . (int) $page . ':' . (int) $per_page;
        if (!isset($memo[$key])) {
            $memo[$key] = forgewp_comments_resource($post, $page, $per_page);
        }
        return $memo[$key];
    }

    /** Same number as the REST total (top-level threads), not get_comments_number(). */
    function forgewp_native_comments_total() {
        $resource = forgewp_native_comments(1, 50);
        return (int) $resource['total'];
    }

    /** Recursion guard for <forgewp-comment-children />. */
    function forgewp_native_comment_max_depth() {
        $depth = (int) get_option('thread_comments_depth', 5);
        return get_option('thread_comments') ? max(1, $depth) : 1;
    }

    /** The current post's terms as in REST post.terms; '*' flattens all public taxonomies in REST order. */
    function forgewp_native_post_terms($taxonomy) {
        $post = get_post();
        if (!$post) {
            return array();
        }
        $item = forgewp_post_resource_item($post, false, forgewp_content_lang(null));
        $terms = (array) $item['terms'];
        if ($taxonomy === '*') {
            $flat = array();
            foreach ($terms as $list) {
                foreach ((array) $list as $term) {
                    $flat[] = $term;
                }
            }
            return $flat;
        }
        return isset($terms[$taxonomy]) ? (array) $terms[$taxonomy] : array();
    }

    /** A taxonomy's terms as in GET /terms/<taxonomy>. */
    function forgewp_native_taxonomy_terms($taxonomy, $hide_empty = true) {
        if (!forgewp_content_public_taxonomy($taxonomy)) {
            return array();
        }
        $resource = forgewp_terms_resource($taxonomy, forgewp_content_lang(null), array('hideEmpty' => (bool) $hide_empty));
        return $resource['items'];
    }

    /** A single term lookup as in GET /terms/<taxonomy>/<slug>, memoized per request. */
    function forgewp_native_term($taxonomy, $slug) {
        static $memo = array();
        if (!forgewp_content_public_taxonomy($taxonomy)) {
            return null;
        }
        $key = $taxonomy . ':' . $slug . ':' . (string) forgewp_content_lang(null);
        if (!array_key_exists($key, $memo)) {
            $term = get_term_by('slug', $slug, $taxonomy);
            $memo[$key] = ($term && !is_wp_error($term)) ? forgewp_term_item($term) : null;
        }
        return $memo[$key];
    }

    /** Relative path of the current post in a loop, as the REST path field. */
    function forgewp_native_the_path() {
        $link = (string) get_permalink();
        return $link !== '' ? forgewp_content_path($link) : '';
    }

    function forgewp_comments_create(WP_REST_Request $request) {
        $origin = (string) $request->get_header('origin');
        if ($origin !== '' && !forgewp_origin_allowed($origin)) {
            return new WP_Error('FORGEWP_ORIGIN_DENIED', __('This site does not accept comments from that origin.', '${td}'), array('status' => 403));
        }
        $params = $request->get_params();
        $post = isset($params['post']) ? get_post((int) $params['post']) : null;
        if (!$post || $post->post_status !== 'publish' || !forgewp_content_public_post_type($post->post_type) || !empty($post->post_password)) {
            return new WP_Error('FORGEWP_POST_NOT_FOUND', __('That post does not exist.', '${td}'), array('status' => 404));
        }
        if (!comments_open($post)) {
            return new WP_Error('FORGEWP_COMMENTS_CLOSED', __('Comments are closed for this post.', '${td}'), array('status' => 403));
        }
        if (is_user_logged_in()) {
            $nonce = (string) $request->get_header('x_wp_nonce');
            if ($nonce === '' || !wp_verify_nonce($nonce, 'wp_rest')) {
                return new WP_Error('FORGEWP_NONCE_REQUIRED', __('Security check failed. Please refresh and try again.', '${td}'), array('status' => 403));
            }
        }
        // Honeypot + time trap, same fields as forms (§12a): answer like a held comment.
        // Same rule as forms: _forgewp_interacted is informational only (trivial to forge).
        $elapsed = isset($params['_forgewp_elapsed']) ? (int) $params['_forgewp_elapsed'] : 0;
        $min_ms = (int) apply_filters('forgewp_comments_min_submit_ms', 3000);
        if (!empty($params['_forgewp_hp']) || ($min_ms > 0 && $elapsed < $min_ms)) {
            update_option('forgewp_comments_trapped', (int) get_option('forgewp_comments_trapped', 0) + 1, false);
            return new WP_REST_Response(array('ok' => true, 'status' => 'hold', 'comment' => null), 201);
        }
        $key = 'forgewp_comment_rl_' . md5(forgewp_client_ip());
        $count = (int) get_transient($key);
        if ($count >= 5) {
            return new WP_Error('FORGEWP_RATE_LIMITED', __('Too many comments. Please try again later.', '${td}'), array('status' => 429));
        }
        set_transient($key, $count + 1, 10 * MINUTE_IN_SECONDS);

        $comment = wp_handle_comment_submission(array(
            'comment_post_ID' => (int) $post->ID,
            'comment_parent'  => isset($params['parent']) ? (int) $params['parent'] : 0,
            'comment'         => isset($params['content']) ? (string) $params['content'] : '',
            'author'          => isset($params['authorName']) ? (string) $params['authorName'] : '',
            'email'           => isset($params['authorEmail']) ? (string) $params['authorEmail'] : '',
            'url'             => isset($params['authorUrl']) ? (string) $params['authorUrl'] : '',
        ));
        if (is_wp_error($comment)) {
            $code = $comment->get_error_code();
            $map = array(
                'comment_duplicate'     => array('FORGEWP_COMMENT_DUPLICATE', 409),
                'comment_flood'         => array('FORGEWP_RATE_LIMITED', 429),
                'comment_closed'        => array('FORGEWP_COMMENTS_CLOSED', 403),
                'not_logged_in'         => array('FORGEWP_LOGIN_REQUIRED', 403),
            );
            // WordPress messages carry markup ("<strong>Error:</strong> ..."); clients get plain text.
            $message = trim(preg_replace('/^Error:\s*/i', '', html_entity_decode(wp_strip_all_tags($comment->get_error_message()), ENT_QUOTES, 'UTF-8')));
            if (isset($map[$code])) {
                return new WP_Error($map[$code][0], $message, array('status' => $map[$code][1]));
            }
            $field = in_array($code, array('require_name_email', 'require_valid_email'), true) ? 'authorEmail' : 'content';
            return new WP_Error('FORGEWP_VALIDATION_FAILED', $message, array('status' => 400, 'errors' => array($field => $message)));
        }
        $approved = (string) $comment->comment_approved === '1';
        return new WP_REST_Response(array(
            'ok'      => true,
            'status'  => $approved ? 'approved' : 'hold',
            'comment' => $approved ? forgewp_comment_item($comment) : null,
        ), 201);
    }

    // ── REST routes ───────────────────────────────────────────────────────
    function forgewp_content_response($data, $tags) {
        if (is_wp_error($data)) {
            return $data;
        }
        $response = rest_ensure_response($data);
        $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        $response->header('X-ForgeWP-Cache-Tags', $tags);
        return $response;
    }

    add_action('rest_api_init', function () {
        register_rest_route('forgewp/v1', '/posts', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $type = (string) ($request->get_param('type') ?: 'post');
                if (!forgewp_content_public_post_type($type)) {
                    return new WP_Error('FORGEWP_POST_TYPE_NOT_PUBLIC', 'Unknown or non-public post type.', array('status' => 400));
                }
                $taxonomy = (string) $request->get_param('taxonomy');
                if ($taxonomy !== '' && !forgewp_content_public_taxonomy($taxonomy)) {
                    return new WP_Error('FORGEWP_TAXONOMY_NOT_PUBLIC', 'Unknown or non-public taxonomy.', array('status' => 400));
                }
                $lang = forgewp_content_lang($request->get_param('lang'));
                if (is_wp_error($lang)) {
                    return $lang;
                }
                return forgewp_content_response(forgewp_posts_resource($type, $lang, $request->get_params()), 'posts,type:' . $type);
            },
        ));
        register_rest_route('forgewp/v1', '/posts/(?P<type>[a-z0-9_-]+)/(?P<slug>[^/]+)', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $type = (string) $request['type'];
                if (!forgewp_content_public_post_type($type)) {
                    return new WP_Error('FORGEWP_POST_TYPE_NOT_PUBLIC', 'Unknown or non-public post type.', array('status' => 400));
                }
                $lang = forgewp_content_lang($request->get_param('lang'));
                if (is_wp_error($lang)) {
                    return $lang;
                }
                $post = forgewp_find_published_post($type, (string) $request['slug']);
                if (!$post) {
                    return new WP_Error('FORGEWP_POST_NOT_FOUND', 'No published post with that slug.', array('status' => 404));
                }
                return forgewp_content_response(forgewp_post_resource_item($post, true, $lang), 'posts,type:' . $type . ',post:' . $post->ID);
            },
        ));
        register_rest_route('forgewp/v1', '/terms/(?P<taxonomy>[a-z0-9_-]+)', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $taxonomy = (string) $request['taxonomy'];
                if (!forgewp_content_public_taxonomy($taxonomy)) {
                    return new WP_Error('FORGEWP_TAXONOMY_NOT_PUBLIC', 'Unknown or non-public taxonomy.', array('status' => 400));
                }
                $lang = forgewp_content_lang($request->get_param('lang'));
                if (is_wp_error($lang)) {
                    return $lang;
                }
                $hide = $request->get_param('hideEmpty');
                return forgewp_content_response(forgewp_terms_resource($taxonomy, $lang, array(
                    'hideEmpty' => $hide === null ? true : !in_array(strtolower((string) $hide), array('0', 'false', 'no'), true),
                    'parent'    => $request->get_param('parent'),
                )), 'terms,taxonomy:' . $taxonomy);
            },
        ));
        register_rest_route('forgewp/v1', '/terms/(?P<taxonomy>[a-z0-9_-]+)/(?P<slug>[^/]+)', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                $taxonomy = (string) $request['taxonomy'];
                if (!forgewp_content_public_taxonomy($taxonomy)) {
                    return new WP_Error('FORGEWP_TAXONOMY_NOT_PUBLIC', 'Unknown or non-public taxonomy.', array('status' => 400));
                }
                $lang = forgewp_content_lang($request->get_param('lang'));
                if (is_wp_error($lang)) {
                    return $lang;
                }
                $term = get_term_by('slug', sanitize_title((string) $request['slug']), $taxonomy);
                if (!$term) {
                    return new WP_Error('FORGEWP_TERM_NOT_FOUND', 'No term with that slug.', array('status' => 404));
                }
                return forgewp_content_response(forgewp_term_resource($term, $lang), 'terms,taxonomy:' . $taxonomy);
            },
        ));
        register_rest_route('forgewp/v1', '/comments', array(
            array(
                'methods'             => 'GET',
                'permission_callback' => '__return_true',
                'callback'            => function (WP_REST_Request $request) {
                    $post = get_post((int) $request->get_param('post'));
                    if (!$post || $post->post_status !== 'publish' || !forgewp_content_public_post_type($post->post_type) || !empty($post->post_password)) {
                        return new WP_Error('FORGEWP_POST_NOT_FOUND', 'That post does not exist.', array('status' => 404));
                    }
                    return forgewp_content_response(
                        forgewp_comments_resource($post, (int) ($request->get_param('page') ?: 1), (int) ($request->get_param('perPage') ?: 50)),
                        'comments,comments:post:' . $post->ID
                    );
                },
            ),
            array(
                'methods'             => 'POST',
                'permission_callback' => '__return_true',
                'callback'            => 'forgewp_comments_create',
            ),
        ));
    }, 20);
}
`;
}
