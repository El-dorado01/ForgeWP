/**
 * R5 `editables` resource (docs/resource-contracts.md §14, approved with
 * Claude's answers). Backend code (Companion Plugin + theme fallback).
 *
 * The schema manifest comes from the compiler (`scanForEditableSchemas()`:
 * template/page slug → fields), embedded as base64 JSON. Only declared,
 * non-private fields are ever read; values are normalized per field type
 * (images become objects everywhere, rich text goes through wpautop +
 * wp_kses_post, empty values fall back to the schema default).
 *
 * Note: PHP lives in a JS template literal. No backslashes, no `${`.
 */

/** Keep only what the resource needs from each field (type, default, private, sub-fields). */
export function compactEditableSchemas(schemas = {}) {
  const compactField = (field) => {
    if (!field || typeof field !== 'object') return null;
    const out = { type: String(field.type || 'text') };
    if (field.default !== undefined) out.default = field.default;
    if (field.private === true) out.private = true;
    if (field.type === 'repeater' && field.fields && typeof field.fields === 'object') {
      out.fields = {};
      for (const [key, sub] of Object.entries(field.fields)) {
        const compact = compactField(sub);
        if (compact) out.fields[key] = compact;
      }
    }
    return out;
  };
  const out = {};
  for (const [slug, fields] of Object.entries(schemas || {})) {
    if (!fields || typeof fields !== 'object') continue;
    out[slug] = {};
    for (const [key, field] of Object.entries(fields)) {
      if (!/^[A-Za-z0-9_-]+$/.test(key)) continue;
      const compact = compactField(field);
      if (compact) out[slug][key] = compact;
    }
  }
  return out;
}

export function buildEditablesResourcePhp(schemas = {}) {
  const manifest = Buffer.from(JSON.stringify(compactEditableSchemas(schemas)), 'utf8').toString('base64');
  return `
/**
 * ── Editables resource (R5, resource-contracts.md §14) ──
 */
if (!function_exists('forgewp_editables_resource')) {
    function forgewp_editable_schemas() {
        static $schemas = null;
        if ($schemas === null) {
            $schemas = json_decode(base64_decode('${manifest}'), true);
            if (!is_array($schemas)) {
                $schemas = array();
            }
        }
        return $schemas;
    }

    /** A post's schema: its route id, the front page, its page template, or its post type. */
    function forgewp_editables_schema_for_post($post) {
        $schemas = forgewp_editable_schemas();
        $candidates = array();
        $route = (string) get_post_meta($post->ID, 'forgewp_route_id', true);
        if ($route !== '') {
            $candidates[] = $route;
        }
        if ((int) get_option('page_on_front') === (int) $post->ID) {
            $candidates[] = 'front-page';
        }
        $template = (string) get_page_template_slug($post);
        if ($template !== '') {
            $candidates[] = preg_replace('/^page-|[.]php$/', '', basename($template));
        }
        $candidates[] = $post->post_type;
        foreach ($candidates as $candidate) {
            if (isset($schemas[$candidate])) {
                return $candidate;
            }
        }
        return '';
    }

    function forgewp_editables_raw($post_id, $key) {
        $value = null;
        if (function_exists('get_field')) {
            $value = get_field($key, $post_id, false);
        }
        if ($value === null || $value === false) {
            $value = get_post_meta($post_id, $key, true);
        }
        return $value;
    }

    function forgewp_editables_empty($value) {
        return $value === null || $value === false || $value === '' || (is_array($value) && empty($value));
    }

    function forgewp_editables_image($value) {
        if (is_array($value)) {
            $id = (int) ($value['ID'] ?? $value['id'] ?? 0);
            if ($id > 0 && get_post_type($id) === 'attachment') {
                return forgewp_editables_image($id);
            }
            $url = (string) ($value['url'] ?? $value['src'] ?? '');
            if ($url === '') {
                return null;
            }
            $image = array('id' => 0, 'url' => $url, 'alt' => (string) ($value['alt'] ?? ''));
            if (!empty($value['width'])) {
                $image['width'] = (int) $value['width'];
            }
            if (!empty($value['height'])) {
                $image['height'] = (int) $value['height'];
            }
            return $image;
        }
        if (is_numeric($value) && (int) $value > 0 && get_post_type((int) $value) === 'attachment') {
            $id = (int) $value;
            $src = wp_get_attachment_image_src($id, 'full');
            if (!$src) {
                return null;
            }
            $image = array('id' => $id, 'url' => (string) $src[0], 'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true), 'width' => (int) $src[1], 'height' => (int) $src[2]);
            $srcset = wp_get_attachment_image_srcset($id, 'full');
            if ($srcset) {
                $image['srcset'] = (string) $srcset;
            }
            return $image;
        }
        if (is_string($value) && trim($value) !== '') {
            // Theme asset paths (e.g. /assets/hero.jpg) are resolved by the active ForgeWP
            // theme through this filter; with the Companion Plugin alone they stay as given.
            $url = (string) apply_filters('forgewp_editables_image_source', $value);
            return $url !== '' ? array('id' => 0, 'url' => (string) $url, 'alt' => '') : null;
        }
        return null;
    }

    /** One field value, normalized by type, with the schema default for empty values. */
    function forgewp_editables_value($field, $raw) {
        $type = (string) ($field['type'] ?? 'text');
        $default = $field['default'] ?? null;
        $empty = forgewp_editables_empty($raw);
        switch ($type) {
            case 'richText':
                return $empty ? (string) ($default ?? '') : wp_kses_post(wpautop((string) $raw));
            case 'number':
                if (!$empty && is_numeric($raw)) {
                    return $raw + 0;
                }
                return is_numeric($default) ? $default + 0 : 0;
            case 'boolean':
                if (in_array($raw, array('1', 1, true, 'true'), true)) {
                    return true;
                }
                if (in_array($raw, array('0', 0, false, 'false'), true) && $raw !== false) {
                    return false;
                }
                return (bool) ($default ?? false);
            case 'image':
                $image = $empty ? null : forgewp_editables_image($raw);
                return $image !== null ? $image : forgewp_editables_image($default);
            case 'repeater':
                $rows = forgewp_editables_repeater_rows($raw);
                if (empty($rows)) {
                    $rows = is_array($default) ? $default : array();
                }
                $out = array();
                foreach ($rows as $row) {
                    $row = is_array($row) ? $row : array();
                    $normalized = array();
                    foreach ((array) ($field['fields'] ?? array()) as $sub_key => $sub_field) {
                        if (!empty($sub_field['private'])) {
                            continue;
                        }
                        $normalized[$sub_key] = forgewp_editables_value($sub_field, $row[$sub_key] ?? null);
                    }
                    $out[] = (object) $normalized;
                }
                return $out;
            default:
                if ($empty) {
                    return is_scalar($default) ? (string) $default : '';
                }
                return is_scalar($raw) ? (string) $raw : '';
        }
    }

    /** Raw repeater rows (ACF value, ACF flat meta, json fallback, raw JSON), without flattening images. */
    function forgewp_editables_repeater_rows($raw, $post_id = 0, $key = '', $sub_keys = array()) {
        if (is_array($raw) && !empty($raw)) {
            return array_values($raw);
        }
        if (is_string($raw) && $raw !== '' && ($raw[0] === '[' || $raw[0] === '{')) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_values($decoded);
            }
        }
        return array();
    }

    function forgewp_editables_field_raw($post_id, $key, $field) {
        if (($field['type'] ?? '') !== 'repeater') {
            return forgewp_editables_raw($post_id, $key);
        }
        if (function_exists('get_field')) {
            $value = get_field($key, $post_id);
            if (is_array($value) && !empty($value)) {
                return $value;
            }
        }
        $count = get_post_meta($post_id, $key, true);
        if (is_numeric($count) && (int) $count > 0) {
            $rows = array();
            for ($i = 0; $i < (int) $count; $i++) {
                $row = array();
                foreach (array_keys((array) ($field['fields'] ?? array())) as $sub_key) {
                    $sub = get_post_meta($post_id, $key . '_' . $i . '_' . $sub_key, true);
                    if (is_string($sub) && $sub !== '' && ($sub[0] === '[' || $sub[0] === '{')) {
                        $decoded = json_decode($sub, true);
                        $sub = is_array($decoded) ? $decoded : $sub;
                    }
                    $row[$sub_key] = $sub;
                }
                $rows[] = $row;
            }
            return $rows;
        }
        $fallback = get_post_meta($post_id, $key . '_json_fallback', true);
        if (is_string($fallback) && $fallback !== '') {
            return $fallback;
        }
        return $count;
    }

    function forgewp_editables_resource($post, $schema = null, $keys = null, $lang = '') {
        if (!($post instanceof WP_Post)) {
            return null;
        }
        $schemas = forgewp_editable_schemas();
        $schema = $schema === null ? forgewp_editables_schema_for_post($post) : (string) $schema;
        $protected = post_password_required($post);
        $fields = array();
        if (!$protected && $schema !== '' && isset($schemas[$schema])) {
            foreach ($schemas[$schema] as $key => $field) {
                if (!empty($field['private']) || (is_array($keys) && !in_array($key, $keys, true))) {
                    continue;
                }
                $fields[$key] = forgewp_editables_value($field, forgewp_editables_field_raw($post->ID, $key, $field));
            }
        }
        $route = (string) get_post_meta($post->ID, 'forgewp_route_id', true);
        $permalink = (string) get_permalink($post);
        return array(
            'postId'    => (int) $post->ID,
            'postType'  => (string) $post->post_type,
            'routeId'   => $route !== '' ? $route : null,
            'path'      => function_exists('forgewp_resource_path') ? forgewp_resource_path($permalink) : wp_make_link_relative($permalink),
            'lang'      => (string) $lang,
            'schema'    => $schema !== '' ? $schema : null,
            'protected' => (bool) $protected,
            'fields'    => (object) $fields,
        );
    }

    function forgewp_editables_find_post($request) {
        $post = null;
        $id = (int) $request->get_param('post');
        $route = sanitize_key((string) $request->get_param('routeId'));
        $path = (string) $request->get_param('path');
        if ($id > 0) {
            $post = get_post($id);
        } elseif ($route !== '') {
            $found = function_exists('forgewp_resolve_route_page_id') ? (int) forgewp_resolve_route_page_id($route) : 0;
            if (!$found) {
                $matches = get_posts(array('post_type' => 'any', 'post_status' => 'publish', 'meta_key' => 'forgewp_route_id', 'meta_value' => $route, 'posts_per_page' => 1, 'fields' => 'ids'));
                $found = $matches ? (int) $matches[0] : 0;
            }
            $post = $found ? get_post($found) : null;
        } elseif ($path !== '' && function_exists('forgewp_resolve_path_object')) {
            $target = forgewp_resolve_path_object($path);
            $post = ($target && $target['object'] instanceof WP_Post) ? $target['object'] : null;
        }
        return ($post instanceof WP_Post && $post->post_status === 'publish' && is_post_type_viewable($post->post_type)) ? $post : null;
    }

    function forgewp_editables_rest($request) {
        if ($request->get_param('post') === null && $request->get_param('routeId') === null && $request->get_param('path') === null) {
            return new WP_Error('FORGEWP_EDITABLES_TARGET_REQUIRED', 'Pass path, routeId or post.', array('status' => 400));
        }
        $lang = function_exists('forgewp_resource_lang') ? forgewp_resource_lang($request->get_param('lang')) : '';
        if (is_wp_error($lang)) {
            return $lang;
        }
        $post = forgewp_editables_find_post($request);
        if (!$post) {
            return new WP_Error('FORGEWP_POST_NOT_FOUND', 'No published page for this target.', array('status' => 404));
        }
        $schema = null;
        $requested_schema = $request->get_param('schema');
        if ($requested_schema !== null && $requested_schema !== '') {
            $schema = sanitize_key((string) $requested_schema);
            if (!isset(forgewp_editable_schemas()[$schema])) {
                return new WP_Error('FORGEWP_EDITABLE_SCHEMA_NOT_FOUND', 'Unknown editable schema.', array('status' => 404));
            }
        }
        $keys = $request->get_param('keys');
        $keys = is_string($keys) && $keys !== '' ? array_map('trim', explode(',', $keys)) : null;
        $response = new WP_REST_Response(forgewp_editables_resource($post, $schema, $keys, $lang), 200);
        $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return $response;
    }

    add_action('rest_api_init', function () {
        register_rest_route('forgewp/v1', '/editables', array(array('methods' => 'GET', 'callback' => 'forgewp_editables_rest', 'permission_callback' => '__return_true')));
    });

    /** Native hydration on singular views (same shape as REST). */
    function forgewp_editables_native_resource() {
        $object = get_queried_object();
        if (!is_singular() || !($object instanceof WP_Post) || $object->post_status !== 'publish') {
            return null;
        }
        $lang = function_exists('forgewp_resource_lang') ? forgewp_resource_lang(null) : '';
        return forgewp_editables_resource($object, null, null, is_wp_error($lang) ? '' : $lang);
    }
}
`;
}
