/**
 * Posts URLs follow the app (docs/phase-status-and-blog-urls.md §4, Option 1).
 *
 * A Next.js project with src/app/<base>/page.tsx (post list) and
 * src/app/<base>/[slug]/page.tsx (single post) serves /<base> and
 * /<base>/<slug> when decoupled. Natively, WordPress only lists posts at a
 * page URL when that page is the Posts page, and builds single-post URLs from
 * its permalink structure. On first activation this provisions both so the
 * URLs match in every mode:
 *  - the page at <base> becomes the Posts page (page_for_posts);
 *  - the permalink structure becomes /<base>/%postname%/, but ONLY on a fresh
 *    site (default structure, no real posts yet). Existing sites keep their
 *    URLs and get a wp-admin notice explaining the mismatch instead.
 * Theme code: it runs on theme activation, like page provisioning.
 */
function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** @param {{ archivePath?: string|null, singleBase?: string|null } | null} postsRouting */
export function buildPostsRoutingPhp(postsRouting, textDomain = 'forgewp') {
  const archive = postsRouting?.archivePath ? String(postsRouting.archivePath).replace(/^\/+|\/+$/g, '') : '';
  const single = postsRouting?.singleBase ? String(postsRouting.singleBase).replace(/^\/+|\/+$/g, '') : '';
  if (!archive && !single) return '';
  const structure = single ? `/${single}/%postname%/` : '';
  return `
/**
 * ── Posts URLs follow the app routes (${archive ? '/' + archive : 'no list route'}${single ? ', /' + single + '/<slug>' : ''}) ──
 */
if (!function_exists('forgewp_posts_routing_expected')) {
    function forgewp_posts_routing_expected() {
        return array('archive' => ${phpString(archive)}, 'structure' => ${phpString(structure)});
    }

    /** Before anything is seeded: is this a fresh site whose permalinks may be set? */
    function forgewp_posts_routing_snapshot() {
        if (get_option('forgewp_posts_routing_done') === 'yes') {
            return;
        }
        $structure = (string) get_option('permalink_structure');
        $counts = wp_count_posts('post');
        $published = isset($counts->publish) ? (int) $counts->publish : 0;
        $sample = get_page_by_path('hello-world', OBJECT, 'post');
        if ($sample && $sample->post_status === 'publish') {
            $published--;
        }
        $fresh = in_array($structure, array('', '/%postname%/'), true) && $published <= 0;
        update_option('forgewp_posts_routing_fresh', $fresh ? 'yes' : 'no', false);
    }
    add_action('after_switch_theme', 'forgewp_posts_routing_snapshot', 1);

    function forgewp_posts_routing_provision() {
        if (get_option('forgewp_posts_routing_done') === 'yes') {
            return;
        }
        $expected = forgewp_posts_routing_expected();
        if ($expected['archive'] !== '' && get_option('show_on_front') === 'page' && (int) get_option('page_for_posts') <= 0) {
            $page = get_page_by_path($expected['archive'], OBJECT, 'page');
            if (!$page) {
                $page_id = wp_insert_post(array(
                    'post_title'  => ucwords(str_replace(array('-', '_'), ' ', basename($expected['archive']))),
                    'post_name'   => basename($expected['archive']),
                    'post_status' => 'publish',
                    'post_type'   => 'page',
                ), true);
                $page_id = is_wp_error($page_id) ? 0 : (int) $page_id;
            } else {
                $page_id = (int) $page->ID;
                delete_post_meta($page_id, '_wp_page_template');
            }
            if ($page_id > 0) {
                update_post_meta($page_id, 'forgewp_route_id', 'posts-archive');
                update_option('page_for_posts', $page_id);
            }
        }
        if ($expected['structure'] !== '' && get_option('forgewp_posts_routing_fresh') === 'yes') {
            global $wp_rewrite;
            if ($wp_rewrite instanceof WP_Rewrite) {
                $wp_rewrite->set_permalink_structure($expected['structure']);
                // Taxonomy permastructs (category, tag) captured the old front when
                // they registered earlier in this request, so any rebuild in this
                // request writes stale rules (/blog/category/... 404s). Rebuild on
                // the next request instead, once everything registers with the new front.
                update_option('forgewp_rewrite_refresh_pending', 'yes', true);
                $GLOBALS['forgewp_posts_routing_changed_now'] = true;
            }
        }
        update_option('forgewp_posts_routing_done', 'yes');
    }
    add_action('after_switch_theme', 'forgewp_posts_routing_provision', 11);

    function forgewp_posts_routing_refresh_rules() {
        if (!empty($GLOBALS['forgewp_posts_routing_changed_now']) || get_option('forgewp_rewrite_refresh_pending') !== 'yes') {
            return;
        }
        delete_option('forgewp_rewrite_refresh_pending');
        flush_rewrite_rules(false);
    }
    add_action('init', 'forgewp_posts_routing_refresh_rules', 999);

    /** Existing sites keep their URLs; explain the mismatch instead of changing them. */
    add_action('admin_notices', function () {
        if (!current_user_can('manage_options')) {
            return;
        }
        $expected = forgewp_posts_routing_expected();
        $problems = array();
        if ($expected['archive'] !== '') {
            $posts_page = (int) get_option('page_for_posts');
            $path = $posts_page ? trim((string) wp_parse_url(get_permalink($posts_page), PHP_URL_PATH), '/') : '';
            $home_path = trim((string) wp_parse_url(home_url('/'), PHP_URL_PATH), '/');
            if ($home_path !== '' && strpos($path, $home_path . '/') === 0) {
                $path = substr($path, strlen($home_path) + 1);
            }
            if ($path !== $expected['archive']) {
                /* translators: %s: page path such as /blog/ */
                $problems[] = sprintf(__('set a page at %s as the Posts page (Settings → Reading)', ${phpString(textDomain)}), '/' . $expected['archive'] . '/');
            }
        }
        if ($expected['structure'] !== '' && (string) get_option('permalink_structure') !== $expected['structure']) {
            /* translators: %s: permalink structure such as /blog/%postname%/ */
            $problems[] = sprintf(__('use the custom permalink structure %s (Settings → Permalinks)', ${phpString(textDomain)}), $expected['structure']);
        }
        if (empty($problems)) {
            return;
        }
        echo '<div class="notice notice-info"><p>' . esc_html(sprintf(
            /* translators: %s: list of settings changes */
            __('This theme\\'s blog URLs differ from its decoupled app. To keep the same URLs in every mode, %s. Changing permalinks on a live site changes post URLs, so add redirects for old links.', ${phpString(textDomain)}),
            implode(__(' and ', ${phpString(textDomain)}), $problems)
        )) . '</p></div>';
    });
}
`;
}
