import { buildNetworkHelpersPhp } from './network-helpers.js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { registrationMetaFields } from '../registration-metadata.js';

function generatePhpArgs(queryObj) {
  const phpLines = [];
  phpLines.push(`$args = array(`);

  if (queryObj.postType && typeof queryObj.postType === 'string') {
    phpLines.push(`        'post_type' => '${queryObj.postType}',`);
  } else {
    phpLines.push(`        'post_type' => 'post',`);
  }

  if (queryObj.postsPerPage !== undefined) {
    const ppp = parseInt(queryObj.postsPerPage, 10);
    phpLines.push(`        'posts_per_page' => ${isNaN(ppp) ? 10 : ppp},`);
  } else {
    phpLines.push(`        'posts_per_page' => 10,`);
  }

  if (queryObj.orderby) {
    phpLines.push(`        'orderby' => '${queryObj.orderby}',`);
  }
  if (queryObj.order) {
    phpLines.push(`        'order' => '${queryObj.order}',`);
  }

  if (queryObj.categoryName) {
    if (String(queryObj.categoryName).startsWith('__DYNAMIC_')) {
      const varName = String(queryObj.categoryName)
        .replace(/^__DYNAMIC_/, '')
        .replace(/__$/, '');
      phpLines.push(
        `        'category_name' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`,
      );
    } else {
      phpLines.push(`        'category_name' => '${queryObj.categoryName}',`);
    }
  }

  phpLines.push(`        'paged' => $paged,`);

  if (
    queryObj.taxQuery &&
    Array.isArray(queryObj.taxQuery) &&
    queryObj.taxQuery.length > 0
  ) {
    phpLines.push(`        'tax_query' => array(`);
    for (const [index, taxQ] of queryObj.taxQuery.entries()) {
      phpLines.push(`            array(`);
      phpLines.push(`                'taxonomy' => '${taxQ.taxonomy}',`);
      phpLines.push(`                'field' => '${taxQ.field || 'slug'}',`);
      const termsVal = taxQ.terms;
      let staticTermsPhp;
      if (typeof termsVal === 'string' && termsVal.startsWith('__DYNAMIC_')) {
        const varName = termsVal.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
        staticTermsPhp = `$request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : ''`;
      } else if (Array.isArray(termsVal)) {
        const termsPhp = termsVal
          .map((t) =>
            typeof t === 'string' ? `'${t.replace(/'/g, "\\'")}'` : t,
          )
          .join(', ');
        staticTermsPhp = `array(${termsPhp})`;
      } else {
        staticTermsPhp =
          typeof termsVal === 'string'
            ? `'${termsVal.replace(/'/g, "\\'")}'`
            : String(termsVal);
      }
      phpLines.push(`                'terms' => (function() use ($request) {
                                        $raw_terms = $request->get_param('tax_${index}');
                                        if ($raw_terms === null) return ${staticTermsPhp};
                                        $decoded_terms = json_decode($raw_terms, true);
                                        if (is_array($decoded_terms)) {
                                                return array_map('sanitize_text_field', $decoded_terms);
                                        }
                                        return sanitize_text_field((string) $raw_terms);
                                })(),`);
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }

  if (
    queryObj.metaQuery &&
    Array.isArray(queryObj.metaQuery) &&
    queryObj.metaQuery.length > 0
  ) {
    phpLines.push(`        'meta_query' => array(`);
    if (queryObj.metaRelation) {
      phpLines.push(`            'relation' => '${queryObj.metaRelation}',`);
    }
    for (const [index, metaQ] of queryObj.metaQuery.entries()) {
      phpLines.push(`            array(`);
      phpLines.push(
        `                'key' => '${String(metaQ.key).replace(/'/g, "\\'")}',`,
      );
      if (metaQ.compare) {
        phpLines.push(`                'compare' => '${metaQ.compare}',`);
      }
      const metaType =
        metaQ.type || (typeof metaQ.value === 'number' ? 'NUMERIC' : '');
      if (metaType) {
        phpLines.push(`                'type' => '${metaType}',`);
      }
      if (metaQ.value !== undefined) {
        const val = metaQ.value;
        let staticValuePhp;
        if (typeof val === 'string' && val.startsWith('__DYNAMIC_')) {
          const varName = val.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
          staticValuePhp = `$request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : ''`;
        } else if (typeof val === 'string') {
          staticValuePhp = `'${val.replace(/'/g, "\\'")}'`;
        } else {
          staticValuePhp = String(val);
        }
        phpLines.push(`                'value' => (function() use ($request) {
                                        $raw_value = $request->get_param('meta_${index}');
                                        if ($raw_value === null) return ${staticValuePhp};
                                        $decoded_value = json_decode($raw_value, true);
                                        return json_last_error() === JSON_ERROR_NONE
                                                ? $decoded_value
                                                : sanitize_text_field((string) $raw_value);
                                })(),`);
      }
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }

  phpLines.push(`    );`);
  return phpLines.join('\n');
}

export function buildRestEndpointsPhp(
  config,
  queries,
  hasAuth,
  defaultPasswordResetEmailSubject,
  defaultPasswordResetEmailBody,
  defaultVerificationEmailSubject,
  defaultVerificationEmailBody,
  defaultLoginField,
  defaultEmailVerificationEnabled,
  defaultRegistrationEnabled,
  defaultBlockLoginUntilVerified,
  defaultAutoLoginAfterSignup,
  defaultDefaultRole,
  reservedUsernamesPhp,
) {
  let queryEndpointsPhp = '';
  if (queries && queries.length > 0) {
    queryEndpointsPhp += `\n\n/**\n * ── Compiled REST Query Endpoints (Milestone 2) ──\n */\n`;
    queryEndpointsPhp += `
if (!function_exists('forgewp_format_rest_post')) {
    function forgewp_format_rest_post($post) {
        $id = $post->ID;
        $title = get_the_title($post);
        $excerpt = get_the_excerpt($post);
        
        $content = apply_filters('the_content', $post->post_content);
        $date = get_the_date('', $post);
        $author = get_the_author_meta('display_name', $post->post_author);
        
        $featured_image = 'https://picsum.photos/seed/forgewp/1200/630';
        if (has_post_thumbnail($post)) {
            $thumbnail_url = get_the_post_thumbnail_url($post, 'full');
            if ($thumbnail_url) {
                $featured_image = $thumbnail_url;
            }
        }
        
        $permalink = get_permalink($post);
        
        $custom_fields = array();
        $meta = get_post_meta($id);
        if (is_array($meta)) {
            foreach ($meta as $key => $values) {
                $val = isset($values[0]) ? maybe_unserialize($values[0]) : '';
                $custom_fields[$key] = $val;
            }
        }
        
        if (function_exists('get_fields')) {
            $acf_fields = get_fields($id);
            if (is_array($acf_fields)) {
                $custom_fields = array_merge($custom_fields, $acf_fields);
            }
        }
        
        $terms_data = array();
        $taxonomies = get_object_taxonomies($post->post_type);
        if (is_array($taxonomies)) {
            foreach ($taxonomies as $taxonomy) {
                $terms = get_the_terms($post, $taxonomy);
                if (is_array($terms)) {
                    $terms_data[$taxonomy] = array();
                    foreach ($terms as $t) {
                        $terms_data[$taxonomy][] = array(
                            'id' => $t->term_id,
                            'slug' => $t->slug,
                            'name' => html_entity_decode($t->name, ENT_QUOTES, 'UTF-8'),
                        );
                    }
                }
            }
        }
        
        return array(
            'ID' => $id,
            'title' => $title,
            'excerpt' => $excerpt,
            'content' => $content,
            'date' => $date,
            'author' => $author,
            'featuredImage' => $featured_image,
            'permalink' => $permalink,
            'customFields' => $custom_fields,
            '_terms' => $terms_data,
            'post_type' => $post->post_type,
        );
    }
}
`;

    queryEndpointsPhp += `
add_action('rest_api_init', function() {`;
    for (const q of queries) {
      const cleanId = q.queryId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const querySlug = 'query-' + cleanId;
      const callbackName = 'forgewp_rest_query_' + cleanId.replace(/-/g, '_');
      queryEndpointsPhp += `
    register_rest_route('forgewp/v1', '/${querySlug}', array(
        'methods'             => 'GET',
        'callback'            => '${callbackName}',
        'permission_callback' => '__return_true',
    ));`;
    }
    queryEndpointsPhp += `
});
`;

    for (const q of queries) {
      const cleanId = q.queryId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const callbackName = 'forgewp_rest_query_' + cleanId.replace(/-/g, '_');
      const phpArgs = generatePhpArgs(q);

      queryEndpointsPhp += `
function ${callbackName}(WP_REST_Request $request) {
    $paged = $request->get_param('page') ? intval($request->get_param('page')) : 1;
    $s = $request->get_param('search');
    if (empty($s)) {
        $s = $request->get_param('s');
    }
    
    ${phpArgs}
    
    if (!empty($s)) {
        $args['s'] = sanitize_text_field($s);
    }
    
    $lang = $request->get_param('lang');
    if (!empty($lang)) {
        $args['lang'] = sanitize_text_field($lang);
    }
    
    $query = new WP_Query($args);
    $posts = array();
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $posts[] = forgewp_format_rest_post($query->post);
        }
        wp_reset_postdata();
    }
    
    return new WP_REST_Response(array(
        'posts'      => $posts,
        'total'      => intval($query->found_posts),
        'totalPages' => intval($query->max_num_pages),
    ), 200);
}
`;
    }
  }

  let authControllersPhp = '';
  if (hasAuth) {
    authControllersPhp = `
/**
 * ── ForgeWP REST Authentication Controllers ─────────────────────────────────
 */

function forgewp_get_current_user_hydration_payload() {
    if ( ! is_user_logged_in() ) {
        return null;
    }
    $user = wp_get_current_user();
    if ( ! $user || $user->ID === 0 ) {
        return null;
    }
    $capabilities = array();
    if ( is_array( $user->allcaps ) ) {
        foreach ( $user->allcaps as $cap => $value ) {
            if ( $value ) {
                $capabilities[] = $cap;
            }
        }
    }

    $verified_meta = get_user_meta( $user->ID, 'forgewp_email_verified', true );
    $email_verified = ( $verified_meta === '' ) || ( $verified_meta === '1' ) || ( $verified_meta === true );

    $first_name = $user->first_name ?: get_user_meta( $user->ID, 'first_name', true );
    $last_name  = $user->last_name ?: get_user_meta( $user->ID, 'last_name', true );

    $billing = array(
        'first_name' => get_user_meta( $user->ID, 'billing_first_name', true ) ?: $first_name,
        'last_name'  => get_user_meta( $user->ID, 'billing_last_name', true ) ?: $last_name,
        'company'    => get_user_meta( $user->ID, 'billing_company', true ),
        'address_1'  => get_user_meta( $user->ID, 'billing_address_1', true ),
        'address_2'  => get_user_meta( $user->ID, 'billing_address_2', true ),
        'city'       => get_user_meta( $user->ID, 'billing_city', true ),
        'state'      => get_user_meta( $user->ID, 'billing_state', true ),
        'postcode'   => get_user_meta( $user->ID, 'billing_postcode', true ),
        'country'    => get_user_meta( $user->ID, 'billing_country', true ) ?: 'US',
        'email'      => get_user_meta( $user->ID, 'billing_email', true ) ?: $user->user_email,
        'phone'      => get_user_meta( $user->ID, 'billing_phone', true ),
    );

    $shipping = array(
        'first_name' => get_user_meta( $user->ID, 'shipping_first_name', true ) ?: $first_name,
        'last_name'  => get_user_meta( $user->ID, 'shipping_last_name', true ) ?: $last_name,
        'company'    => get_user_meta( $user->ID, 'shipping_company', true ),
        'address_1'  => get_user_meta( $user->ID, 'shipping_address_1', true ),
        'address_2'  => get_user_meta( $user->ID, 'shipping_address_2', true ),
        'city'       => get_user_meta( $user->ID, 'shipping_city', true ),
        'state'      => get_user_meta( $user->ID, 'shipping_state', true ),
        'postcode'   => get_user_meta( $user->ID, 'shipping_postcode', true ),
        'country'    => get_user_meta( $user->ID, 'shipping_country', true ) ?: 'US',
        'phone'      => get_user_meta( $user->ID, 'shipping_phone', true ) ?: get_user_meta( $user->ID, 'billing_phone', true ),
    );

    // Collect custom registered user meta
    $all_meta = get_user_meta( $user->ID );
    $custom_meta = array();
    $internal_prefixes = array( '_', 'wp_', 'closedpostboxes', 'metaboxhidden', 'session_tokens', 'community-events' );
    if ( is_array( $all_meta ) ) {
        foreach ( $all_meta as $key => $values ) {
            $is_internal = false;
            foreach ( $internal_prefixes as $pfx ) {
                if ( str_starts_with( $key, $pfx ) ) {
                    $is_internal = true;
                    break;
                }
            }
            if ( ! $is_internal && ! empty( $values ) ) {
                $val = maybe_unserialize( $values[0] );
                $custom_meta[ $key ] = $val;
            }
        }
    }

    return array(
        'id'            => $user->ID,
        'username'      => $user->user_login,
        'email'         => $user->user_email,
        'displayName'   => $user->display_name,
        'firstName'     => $first_name,
        'lastName'      => $last_name,
        'roles'         => array_values( $user->roles ),
        'avatarUrl'     => get_avatar_url( $user->ID ),
        'capabilities'  => $capabilities,
        'emailVerified' => $email_verified,
        'billing'       => $billing,
        'shipping'      => $shipping,
        'metadata'      => $custom_meta,
        'meta'          => $custom_meta,
    );
}

/**
 * Register dynamic authentication settings in WP Admin Settings Submenu page.
 */
add_action( 'admin_menu', 'forgewp_auth_admin_menu' );
function forgewp_auth_admin_menu() {
    add_options_page(
        'ForgeWP Auth Settings',
        'ForgeWP Auth',
        'manage_options',
        'forgewp-auth-settings',
        'forgewp_auth_settings_page_render'
    );
}

function forgewp_auth_settings_page_render() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <form action="options.php" method="post">
            <?php
            settings_fields( 'forgewp_auth_settings_group' );
            do_settings_sections( 'forgewp-auth-settings' );
            submit_button( 'Save Settings' );
            ?>
        </form>
    </div>
    <?php
}

add_action( 'admin_init', 'forgewp_register_auth_settings' );
function forgewp_register_auth_settings() {
    register_setting( 'general', 'forgewp_auth_login_field', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultLoginField}',
    ) );

    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_login_field', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultLoginField}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_registration_enabled', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultRegistrationEnabled}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_email_verification_enabled', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultEmailVerificationEnabled}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_block_login_until_verified', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultBlockLoginUntilVerified}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_default_role', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultDefaultRole}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_auto_login_after_signup', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultAutoLoginAfterSignup}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_verification_email_subject', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultVerificationEmailSubject.replace(/'/g, "\\'")}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_verification_email_body', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_textarea_field',
        'default'           => '${defaultVerificationEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_password_reset_email_subject', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '${defaultPasswordResetEmailSubject.replace(/'/g, "\\'")}',
    ) );
    register_setting( 'forgewp_auth_settings_group', 'forgewp_auth_password_reset_email_body', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_textarea_field',
        'default'           => '${defaultPasswordResetEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}',
    ) );

    add_settings_section(
        'forgewp_auth_settings_section',
        'Authentication Configurations',
        null,
        'forgewp-auth-settings'
    );

    add_settings_field(
        'forgewp_auth_login_field',
        'Allowed Login Field',
        function() {
            $val = get_option('forgewp_auth_login_field', '${defaultLoginField}');
            ?>
            <select name="forgewp_auth_login_field">
                <option value="usernameAndEmail" <?php selected($val, 'usernameAndEmail'); ?>>Username or Email</option>
                <option value="emailOnly" <?php selected($val, 'emailOnly'); ?>>Email Only</option>
                <option value="usernameOnly" <?php selected($val, 'usernameOnly'); ?>>Username Only</option>
            </select>
            <p class="description">Select the credential field type allowed during login.</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_registration_enabled',
        'Enable Public Registration',
        function() {
            $val = get_option('forgewp_auth_registration_enabled', '${defaultRegistrationEnabled}');
            ?>
            <input type="checkbox" name="forgewp_auth_registration_enabled" value="1" <?php checked($val, '1'); ?> />
            <p class="description">Allow visitors to register accounts.</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_email_verification_enabled',
        'Require Email Verification',
        function() {
            $val = get_option('forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}');
            ?>
            <input type="checkbox" name="forgewp_auth_email_verification_enabled" value="1" <?php checked($val, '1'); ?> />
            <p class="description">Require verification via email before account activation.</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_block_login_until_verified',
        'Block Login Until Verified',
        function() {
            $val = get_option('forgewp_auth_block_login_until_verified', '${defaultBlockLoginUntilVerified}');
            ?>
            <input type="checkbox" name="forgewp_auth_block_login_until_verified" value="1" <?php checked($val, '1'); ?> />
            <p class="description">Block logins for unverified accounts.</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_default_role',
        'Default User Role',
        function() {
            $val = get_option('forgewp_auth_default_role', '${defaultDefaultRole}');
            $roles = wp_roles()->get_names();
            ?>
            <select name="forgewp_auth_default_role">
                <?php foreach ($roles as $role => $name): ?>
                    <option value="<?php echo esc_attr($role); ?>" <?php selected($val, $role); ?>><?php echo esc_html($name); ?></option>
                <?php endforeach; ?>
            </select>
            <p class="description">Default role assigned to new registrations.</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_auto_login_after_signup',
        'Auto Login After Signup',
        function() {
            $val = get_option('forgewp_auth_auto_login_after_signup', '${defaultAutoLoginAfterSignup}');
            ?>
            <input type="checkbox" name="forgewp_auth_auto_login_after_signup" value="1" <?php checked($val, '1'); ?> />
            <p class="description">Automatically log in user after successful registration (bypassed if verification is required).</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_verification_email_subject',
        'Verification Email Subject',
        function() {
            $val = get_option('forgewp_auth_verification_email_subject', '${defaultVerificationEmailSubject.replace(/'/g, "\\'")}');
            ?>
            <input type="text" name="forgewp_auth_verification_email_subject" value="<?php echo esc_attr($val); ?>" class="regular-text" />
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_verification_email_body',
        'Verification Email Body',
        function() {
            $val = get_option('forgewp_auth_verification_email_body', '${defaultVerificationEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}');
            ?>
            <textarea name="forgewp_auth_verification_email_body" rows="6" cols="50" class="large-text"><?php echo esc_textarea($val); ?></textarea>
            <p class="description">Tags allowed: {username}, {email}, {verification_url}</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_password_reset_email_subject',
        'Password Reset Email Subject',
        function() {
            $val = get_option('forgewp_auth_password_reset_email_subject', '${defaultPasswordResetEmailSubject.replace(/'/g, "\\'")}');
            ?>
            <input type="text" name="forgewp_auth_password_reset_email_subject" value="<?php echo esc_attr($val); ?>" class="regular-text" />
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );

    add_settings_field(
        'forgewp_auth_password_reset_email_body',
        'Password Reset Email Body',
        function() {
            $val = get_option('forgewp_auth_password_reset_email_body', '${defaultPasswordResetEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}');
            ?>
            <textarea name="forgewp_auth_password_reset_email_body" rows="6" cols="50" class="large-text"><?php echo esc_textarea($val); ?></textarea>
            <p class="description">Tags allowed: {username}, {reset_url}</p>
            <?php
        },
        'forgewp-auth-settings',
        'forgewp_auth_settings_section'
    );
}

/**
 * Register custom authentication REST routes.
 */
add_action( 'rest_api_init', 'forgewp_auth_register_rest_routes' );
function forgewp_auth_register_rest_routes() {
    register_rest_route( 'forgewp/v1', '/auth/login', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_login',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/signup', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_signup',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/register', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_signup',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/logout', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_logout',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/me', array(
        'methods'             => 'GET',
        'callback'            => 'forgewp_rest_me',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/config', array(
        'methods'             => 'GET',
        'callback'            => 'forgewp_rest_auth_config',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/verify-email', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_verify_email',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/resend-verification', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_resend_verification',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/lost-password', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_lost_password',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/reset-password', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_reset_password',
        'permission_callback' => 'forgewp_auth_write_permission',
    ) );
}

/** Compare origins without trusting request Host or forwarded headers. */
${buildNetworkHelpersPhp()}
function forgewp_auth_url_origin( $url ) {
    if ( ! is_string( $url ) || preg_match( '/[\\x00-\\x20\\x7f]/', $url ) ) {
        return '';
    }
    $parts = wp_parse_url( $url );
    if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
        return '';
    }
    $scheme = strtolower( $parts['scheme'] );
    if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
        return '';
    }
    $port = isset( $parts['port'] ) ? intval( $parts['port'] ) : ( $scheme === 'https' ? 443 : 80 );
    return $scheme . '://' . strtolower( $parts['host'] ) . ':' . $port;
}

/** Best-effort per-peer limits; use an edge/WAF for atomic distributed enforcement. */
function forgewp_auth_rate_limit( $request ) {
    $action = strtolower( basename( $request->get_route() ) );
    if ( $action === 'register' ) $action = 'signup';
    if ( in_array( $action, array( 'lost-password', 'resend-verification' ), true ) ) $action = 'mail';
    $rules = array(
        'login' => array( 'limit' => 20, 'window' => 60 ),
        'signup' => array( 'limit' => 5, 'window' => 600 ),
        'mail' => array( 'limit' => 5, 'window' => 600 ),
        'verify-email' => array( 'limit' => 20, 'window' => 600 ),
        'reset-password' => array( 'limit' => 10, 'window' => 600 ),
    );
    if ( ! isset( $rules[$action] ) ) return true;
    $rule = apply_filters( 'forgewp_auth_rate_limit', $rules[$action], $action, $request );
    if ( $rule === false ) return true; // Explicit site-owner opt-out for an external limiter.
    if ( ! is_array( $rule ) || ! isset( $rule['limit'], $rule['window'] ) || ! is_int( $rule['limit'] ) || ! is_int( $rule['window'] ) || $rule['limit'] < 1 || $rule['window'] < 1 ) {
        return new WP_Error( 'rest_auth_rate_limit_config', 'Authentication is temporarily unavailable.', array( 'status' => 503 ) );
    }
    $peer = forgewp_client_ip();
    $peer = filter_var( $peer, FILTER_VALIDATE_IP ) ? $peer : 'unknown';
    $key = 'forgewp_auth_rate_' . hash_hmac( 'sha256', $action . '|' . $peer, wp_salt( 'auth' ) );
    $now = time();
    $bucket = get_transient( $key );
    if ( ! is_array( $bucket ) || ! isset( $bucket['count'], $bucket['until'] ) || $bucket['until'] <= $now ) {
        $bucket = array( 'count' => 0, 'until' => $now + $rule['window'] );
    }
    if ( $bucket['count'] >= $rule['limit'] ) {
        return new WP_Error( 'rest_auth_rate_limited', 'Too many account requests. Please try again later.', array( 'status' => 429, 'retryAfter' => max( 1, $bucket['until'] - $now ) ) );
    }
    $bucket['count']++;
    set_transient( $key, $bucket, max( 1, $bucket['until'] - $now ) );
    return true;
}

/** Public account entry still requires JSON and a trusted browser origin. */
function forgewp_auth_write_permission( $request ) {
    $content_type = (string) $request->get_header( 'content-type' );
    if ( ! preg_match( '~^application/(?:[a-z0-9!#$&^_.+-]+\\+)?json(?:\\s*;|$)~i', trim( $content_type ) ) ) {
        return new WP_Error( 'rest_auth_json_required', 'Account requests require a JSON body.', array( 'status' => 415 ) );
    }
    $origin = (string) $request->get_header( 'origin' );
    $referer = (string) $request->get_header( 'referer' );
    $source = $origin !== '' ? $origin : $referer;
    if ( $source !== '' ) {
        $allowed = array( forgewp_auth_url_origin( home_url() ), forgewp_auth_url_origin( site_url() ) );
        foreach ( forgewp_frontend_origins() as $frontend_origin ) $allowed[] = $frontend_origin;
        $incoming = forgewp_auth_url_origin( $source );
        if ( $incoming === '' || ! in_array( $incoming, $allowed, true ) ) {
            return new WP_Error( 'rest_auth_origin_denied', 'This origin cannot make account requests.', array( 'status' => 403 ) );
        }
    } elseif ( in_array( strtolower( (string) $request->get_header( 'sec-fetch-site' ) ), array( 'cross-site', 'same-site' ), true ) ) {
        return new WP_Error( 'rest_auth_origin_denied', 'Account requests require a trusted origin.', array( 'status' => 403 ) );
    }
    if ( ! is_array( $request->get_json_params() ) ) {
        return new WP_Error( 'rest_invalid_fields', 'Account fields must be a JSON object.', array( 'status' => 400 ) );
    }
    if ( strtolower( basename( $request->get_route() ) ) === 'logout' ) {
        $nonce = (string) $request->get_header( 'x-wp-nonce' );
        if ( ! is_user_logged_in() || $nonce === '' || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new WP_Error( 'rest_auth_nonce_required', 'Sign in again before signing out.', array( 'status' => 403 ) );
        }
        return true;
    }
    return forgewp_auth_rate_limit( $request );
}

function forgewp_rest_auth_config() {
    $login_field = get_option( 'forgewp_auth_login_field', '${defaultLoginField}' );
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    return rest_ensure_response( array(
        'loginField'               => $login_field,
        'emailVerificationEnabled' => $verification_enabled,
    ) );
}

/** Base URL for links sent to visitors (verification, reset): the first configured frontend origin, else the site. */
function forgewp_get_frontend_origin() {
    $origins = forgewp_frontend_origins();
    $origin = ! empty( $origins ) ? $origins[0] : home_url();
    return rtrim( $origin, '/' );
}

/** Run inside wp_signon's authentication phase, before any cookie is issued. */
function forgewp_auth_verified_login( $user ) {
    if ( ! ( $user instanceof WP_User ) ) return $user;
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    $block_login = get_option( 'forgewp_auth_block_login_until_verified', '${defaultBlockLoginUntilVerified}' ) === '1';
    if ( $verification_enabled && $block_login ) {
        $verified_meta = get_user_meta( $user->ID, 'forgewp_email_verified', true );
        if ( $verified_meta !== '1' && $verified_meta !== true ) {
            return new WP_Error( 'rest_unverified_email', 'Please verify your email address before logging in.', array( 'status' => 403 ) );
        }
    }
    return $user;
}

function forgewp_rest_login( $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        return new WP_Error( 'rest_invalid_fields', 'Account fields must be a JSON object.', array( 'status' => 400 ) );
    }
    foreach ( array( 'credential', 'username', 'email', 'user', 'password', 'user_password' ) as $field ) {
        if ( array_key_exists( $field, $params ) && ! is_string( $params[$field] ) ) {
            return new WP_Error( 'rest_invalid_fields', 'Account fields must be text values.', array( 'status' => 400 ) );
        }
    }
    $login_field = get_option( 'forgewp_auth_login_field', '${defaultLoginField}' );

    $username = '';
    $email = '';
    $credential = '';
    if ( isset( $params['credential'] ) && ! empty( trim( $params['credential'] ) ) ) {
        $credential = sanitize_text_field( $params['credential'] );
    } elseif ( isset( $params['username'] ) && ! empty( trim( $params['username'] ) ) ) {
        $credential = sanitize_text_field( $params['username'] );
    } elseif ( isset( $params['email'] ) && ! empty( trim( $params['email'] ) ) ) {
        $credential = sanitize_text_field( $params['email'] );
    } elseif ( isset( $params['user'] ) && ! empty( trim( $params['user'] ) ) ) {
        $credential = sanitize_text_field( $params['user'] );
    }

    $password = isset( $params['password'] ) ? $params['password'] : ( isset( $params['user_password'] ) ? $params['user_password'] : '' );

    if ( empty( $credential ) || empty( $password ) ) {
        return new WP_Error( 'rest_missing_fields', 'Credential and password are required.', array( 'status' => 400 ) );
    }

    if ( $login_field === 'emailOnly' ) {
        $user = get_user_by( 'email', $credential );
        if ( ! $user ) {
            return new WP_Error( 'rest_invalid_credentials', 'Invalid email or password.', array( 'status' => 403 ) );
        }
        $username = $user->user_login;
    } elseif ( $login_field === 'usernameOnly' ) {
        $username = $credential;
    } else {
        // usernameAndEmail
        if ( is_email( $credential ) ) {
            $user = get_user_by( 'email', $credential );
            if ( $user ) {
                $username = $user->user_login;
            } else {
                return new WP_Error( 'rest_invalid_credentials', 'Invalid credentials.', array( 'status' => 403 ) );
            }
        } else {
            $username = $credential;
        }
    }

    $creds = array(
        'user_login'    => $username,
        'user_password' => $password,
        'remember'      => true,
    );

    add_filter( 'authenticate', 'forgewp_auth_verified_login', PHP_INT_MAX, 1 );
    try {
        $user = wp_signon( $creds, is_ssl() );
    } finally {
        remove_filter( 'authenticate', 'forgewp_auth_verified_login', PHP_INT_MAX );
    }

    if ( is_wp_error( $user ) ) {
        if ( $user->get_error_code() === 'rest_unverified_email' ) return $user;
        return new WP_Error( 'rest_login_failed', $user->get_error_message(), array( 'status' => 403 ) );
    }

    wp_set_current_user( $user->ID );

    $user_payload = forgewp_get_current_user_hydration_payload();
    $response = array(
        'success' => true,
        'user'    => $user_payload,
    );
    if ( is_array( $user_payload ) ) {
        $response = array_merge( $user_payload, $response );
    }

    return rest_ensure_response( $response );
}

function forgewp_rest_signup( $request ) {
    $registration_enabled = get_option( 'forgewp_auth_registration_enabled', '${defaultRegistrationEnabled}' ) === '1';
    if ( ! $registration_enabled ) {
        return new WP_Error( 'rest_registration_disabled', 'Registration is currently disabled.', array( 'status' => 403 ) );
    }

    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        return new WP_Error( 'rest_invalid_fields', 'Account fields must be a JSON object.', array( 'status' => 400 ) );
    }
    foreach ( array( 'email', 'username', 'password', 'displayName' ) as $field ) {
        if ( array_key_exists( $field, $params ) && ! is_string( $params[$field] ) ) {
            return new WP_Error( 'rest_invalid_fields', 'Account fields must be text values.', array( 'status' => 400 ) );
        }
    }
    $email = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
    $username = isset( $params['username'] ) ? sanitize_user( $params['username'] ) : '';
    $password = isset( $params['password'] ) ? $params['password'] : '';
    $displayName = isset( $params['displayName'] ) ? sanitize_text_field( $params['displayName'] ) : '';

    if ( empty( $email ) || empty( $password ) ) {
        return new WP_Error( 'rest_missing_fields', 'Email and password are required.', array( 'status' => 400 ) );
    }

    $login_field = get_option( 'forgewp_auth_login_field', '${defaultLoginField}' );
    if ( $login_field === 'emailOnly' ) {
        // Auto-generate username from email
        $username = sanitize_user( current( explode( '@', $email ) ) );
        $base_username = $username;
        $i = 1;
        while ( username_exists( $username ) ) {
            $username = $base_username . $i;
            $i++;
        }
    } else {
        if ( empty( $username ) ) {
            return new WP_Error( 'rest_missing_fields', 'Username is required.', array( 'status' => 400 ) );
        }
    }

    // Reserved usernames validation
    $reserved = array(${reservedUsernamesPhp});
    if ( in_array( strtolower( $username ), $reserved, true ) ) {
        return new WP_Error( 'rest_reserved_username', 'This username is reserved.', array( 'status' => 400 ) );
    }

    if ( username_exists( $username ) ) {
        return new WP_Error( 'rest_username_exists', 'Username already exists.', array( 'status' => 400 ) );
    }

    if ( email_exists( $email ) ) {
        return new WP_Error( 'rest_email_exists', 'Email already exists.', array( 'status' => 400 ) );
    }

    $default_role = get_option( 'forgewp_auth_default_role', '${defaultDefaultRole}' );

    $allowed_metadata = array(${registrationMetaFields(config.auth).map((key) => `'${key}'`).join(', ')});
    $metadata = isset( $params['metadata'] ) ? $params['metadata'] : array();
    if ( ! is_array( $metadata ) ) {
        return new WP_Error( 'rest_invalid_metadata', 'Registration metadata must be an object.', array( 'status' => 400 ) );
    }
    foreach ( $metadata as $meta_key => $meta_val ) {
        if ( ! in_array( $meta_key, $allowed_metadata, true ) || ! is_scalar( $meta_val ) ) {
            return new WP_Error( 'rest_invalid_metadata', 'Registration metadata contains an unsupported field or value.', array( 'status' => 400 ) );
        }
    }

    $user_id = wp_create_user( $username, $password, $email );

    if ( is_wp_error( $user_id ) ) {
        return new WP_Error( 'rest_signup_failed', $user_id->get_error_message(), array( 'status' => 500 ) );
    }

    $user = get_user_by( 'id', $user_id );
    $user->set_role( $default_role );

    if ( ! empty( $displayName ) ) {
        wp_update_user( array( 'ID' => $user_id, 'display_name' => $displayName ) );
    }

    if ( ! empty( $metadata ) ) {
        foreach ( $metadata as $meta_key => $meta_val ) {
            $clean_key = sanitize_key( $meta_key );
            $clean_val = is_scalar( $meta_val ) ? sanitize_text_field( $meta_val ) : $meta_val;
            update_user_meta( $user_id, $clean_key, $clean_val );
        }
    }

    // Check verification status
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    $verification_email_sent = null;
    if ( $verification_enabled ) {
        update_user_meta( $user_id, 'forgewp_email_verified', '0' );
        // Send email verification
        $verification_email_sent = forgewp_send_email_verification( $user );
    } else {
        update_user_meta( $user_id, 'forgewp_email_verified', '1' );
    }

    $auto_login = get_option( 'forgewp_auth_auto_login_after_signup', '${defaultAutoLoginAfterSignup}' ) === '1';

    if ( $auto_login && ! $verification_enabled ) {
        $creds = array(
            'user_login'    => $username,
            'user_password' => $password,
            'remember'      => true,
        );
        $signed_in = wp_signon( $creds, is_ssl() );
        if ( is_wp_error( $signed_in ) ) {
            return rest_ensure_response( array(
                'success' => true,
                'requiresVerification' => false,
                'message' => 'Registration successful. Please sign in.',
            ) );
        }
        wp_set_current_user( $user_id );
        $user_payload = forgewp_get_current_user_hydration_payload();
        $response = array(
            'success' => true,
            'user'    => $user_payload,
        );
        if ( is_array( $user_payload ) ) {
            $response = array_merge( $user_payload, $response );
        }
        return rest_ensure_response( $response );
    }

    return rest_ensure_response( array(
        'success' => true,
        'requiresVerification' => $verification_enabled,
        'verificationEmailSent' => $verification_email_sent,
        'message' => $verification_enabled
            ? ( $verification_email_sent ? 'Registration successful. Please verify your email.' : 'Your account was created, but the verification email could not be sent. Please request another verification email.' )
            : 'Registration successful. Please sign in.',
    ) );
}

function forgewp_rest_logout() {
    wp_logout();
    return rest_ensure_response( array( 'success' => true ) );
}

/**
 * Session user for /auth/me (docs/resource-contracts.md §9). WordPress REST
 * ignores the logged-in cookie without an X-WP-Nonce, which a Next.js server
 * checking a visitor's session cannot have. Accept the cookie without a
 * nonce only for server-to-server calls (no Origin header), the site itself,
 * or origins listed in FORGEWP_FRONTEND_ORIGIN, so a third-party site cannot
 * read a visitor's account through their cookies. Bearer tokens are never
 * sent ambiently by browsers and need no origin check.
 */
function forgewp_auth_resolve_session_user( $request ) {
    if ( get_current_user_id() ) {
        return get_current_user_id();
    }
    if ( forgewp_cookie_auth_request_allowed() && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
        $cookie_user_id = wp_validate_auth_cookie( $_COOKIE[ LOGGED_IN_COOKIE ], 'logged_in' );
        if ( $cookie_user_id ) {
            wp_set_current_user( $cookie_user_id );
            return (int) $cookie_user_id;
        }
    }
    if ( function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = $request instanceof WP_REST_Request ? (string) $request->get_header( 'authorization' ) : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $jwt_user_id = forgewp_validate_jwt_token( $matches[1] );
            if ( $jwt_user_id ) {
                wp_set_current_user( $jwt_user_id );
                return (int) $jwt_user_id;
            }
        }
    }
    return 0;
}

/** auth-me resource (contract §9): one shape for REST and native hydration. */
function forgewp_auth_me_resource() {
    $payload = forgewp_get_current_user_hydration_payload();
    return array( 'authenticated' => $payload !== null, 'user' => $payload );
}

function forgewp_rest_me( $request = null ) {
    forgewp_auth_resolve_session_user( $request );
    $response = rest_ensure_response( forgewp_auth_me_resource() );
    $response->header( 'Cache-Control', 'private, no-store, max-age=0' );
    $response->header( 'Vary', 'Cookie, Authorization' );
    return $response;
}

function forgewp_rest_verify_email( $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) || ( array_key_exists( 'token', $params ) && ! is_string( $params['token'] ) ) || ( isset( $params['userId'] ) && filter_var( $params['userId'], FILTER_VALIDATE_INT, array( 'options' => array( 'min_range' => 1 ) ) ) === false ) ) {
        return new WP_Error( 'rest_invalid_fields', 'A numeric user ID and text token are required.', array( 'status' => 400 ) );
    }
    $user_id = isset( $params['userId'] ) ? intval( $params['userId'] ) : 0;
    $token = isset( $params['token'] ) ? sanitize_text_field( $params['token'] ) : '';

    if ( $user_id <= 0 || empty( $token ) ) {
        return new WP_Error( 'rest_missing_fields', 'User ID and token are required.', array( 'status' => 400 ) );
    }

    $saved_id = get_transient( 'forgewp_verify_email_' . $token );
    if ( $saved_id === false || intval( $saved_id ) !== $user_id || ! get_user_by( 'id', $user_id ) ) {
        return new WP_Error( 'rest_invalid_token', 'Invalid or expired verification token.', array( 'status' => 400 ) );
    }
    delete_transient( 'forgewp_verify_email_' . $token );
    delete_transient( 'forgewp_verify_email_user_' . $user_id );
    update_user_meta( $user_id, 'forgewp_email_verified', '1' );

    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true, is_ssl() );
    $user_payload = forgewp_get_current_user_hydration_payload();
    $response = array(
        'success' => true,
        'user'    => $user_payload,
    );
    if ( is_array( $user_payload ) ) {
        $response = array_merge( $user_payload, $response );
    }
    return rest_ensure_response( $response );
}

function forgewp_rest_resend_verification( $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        return new WP_Error( 'rest_invalid_fields', 'Account fields must be a JSON object.', array( 'status' => 400 ) );
    }
    foreach ( array( 'email', 'username' ) as $field ) {
        if ( array_key_exists( $field, $params ) && ! is_string( $params[$field] ) ) {
            return new WP_Error( 'rest_invalid_fields', 'Account fields must be text values.', array( 'status' => 400 ) );
        }
    }
    $input = isset( $params['email'] ) ? sanitize_text_field( $params['email'] ) : '';
    if ( empty( $input ) && isset( $params['username'] ) ) {
        $input = sanitize_text_field( $params['username'] );
    }

    if ( empty( $input ) ) {
        return new WP_Error( 'rest_missing_fields', 'Email or username is required.', array( 'status' => 400 ) );
    }

    $user = null;
    if ( is_email( $input ) ) {
        $user = get_user_by( 'email', $input );
    }
    if ( ! $user ) {
        $user = get_user_by( 'login', $input );
    }
    if ( ! $user ) {
        return new WP_Error( 'rest_invalid_email', 'User not found.', array( 'status' => 404 ) );
    }

    $verified_meta = get_user_meta( $user->ID, 'forgewp_email_verified', true );
    if ( $verified_meta === '1' || $verified_meta === true ) {
        return new WP_Error( 'rest_already_verified', 'Email is already verified.', array( 'status' => 400 ) );
    }

    if ( ! forgewp_send_email_verification( $user ) ) {
        return new WP_Error( 'rest_verification_mail_failed', 'The verification email could not be sent. Please try again.', array( 'status' => 502 ) );
    }

    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_send_email_verification( $user ) {
    $email = $user->user_email;
    if ( empty( $email ) ) {
        return false;
    }

    $token = wp_generate_password( 32, false );

    $origin = forgewp_get_frontend_origin();
    $verification_url = $origin . '/verify-email?userId=' . $user->ID . '&token=' . $token;

    $subject = get_option( 'forgewp_auth_verification_email_subject', '${defaultVerificationEmailSubject.replace(/'/g, "\\'")}' );
    $body = get_option( 'forgewp_auth_verification_email_body', '${defaultVerificationEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}' );

    $body = str_replace(
        array( '{username}', '{email}', '{verification_url}' ),
        array( $user->user_login, $email, $verification_url ),
        $body
    );

    $from_name = get_bloginfo( 'name' );
    $admin_email = get_option( 'admin_email' );
    if ( empty( $admin_email ) || ! is_email( $admin_email ) ) {
        $admin_email = 'no-reply@' . ( isset( $_SERVER['HTTP_HOST'] ) ? preg_replace( '/:\d+$/', '', $_SERVER['HTTP_HOST'] ) : 'localhost' );
    }

    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . $from_name . ' <' . $admin_email . '>',
    );

    $sent = wp_mail( $email, $subject, $body, $headers );
    if ( ! $sent ) {
        error_log( '[ForgeWP Auth] wp_mail failed to send verification email to ' . $email );
        return false;
    }
    $prev_token = get_transient( 'forgewp_verify_email_user_' . $user->ID );
    if ( is_string( $prev_token ) && ! empty( $prev_token ) && $prev_token !== $token ) {
        delete_transient( 'forgewp_verify_email_' . $prev_token );
    }
    set_transient( 'forgewp_verify_email_' . $token, $user->ID, DAY_IN_SECONDS );
    set_transient( 'forgewp_verify_email_user_' . $user->ID, $token, DAY_IN_SECONDS );
    return $sent;
}

function forgewp_rest_lost_password( $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        return new WP_Error( 'rest_missing_fields', 'Account fields are required.', array( 'status' => 400 ) );
    }
    foreach ( array('user_login', 'email', 'username') as $field ) {
        if ( isset( $params[$field] ) && ! is_string( $params[$field] ) ) {
            return new WP_Error( 'rest_invalid_fields', 'Account fields must be text values.', array( 'status' => 400 ) );
        }
    }
    $user_login = isset( $params['user_login'] ) ? sanitize_text_field( $params['user_login'] ) : '';
    if ( empty( $user_login ) && isset( $params['email'] ) ) {
        $user_login = sanitize_text_field( $params['email'] );
    }
    if ( empty( $user_login ) && isset( $params['username'] ) ) {
        $user_login = sanitize_text_field( $params['username'] );
    }

    if ( empty( $user_login ) ) {
        return new WP_Error( 'rest_missing_fields', 'Email or username is required.', array( 'status' => 400 ) );
    }

    if ( ! function_exists( 'retrieve_password' ) ) {
        require_once ABSPATH . 'wp-login.php';
    }

    $errors = retrieve_password( $user_login );

    if ( is_wp_error( $errors ) ) {
        // Keep account/delivery details server-side; public responses must agree.
        do_action( 'forgewp_auth_recovery_error', $errors );
    }

    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_rest_reset_password( $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        return new WP_Error( 'rest_missing_fields', 'Account fields are required.', array( 'status' => 400 ) );
    }
    foreach ( array('login', 'username', 'user_login', 'key', 'password') as $field ) {
        if ( isset( $params[$field] ) && ! is_string( $params[$field] ) ) {
            return new WP_Error( 'rest_invalid_fields', 'Account fields must be text values.', array( 'status' => 400 ) );
        }
    }
    $user_login = isset( $params['login'] ) ? sanitize_text_field( $params['login'] ) : '';
    if ( empty( $user_login ) && isset( $params['username'] ) ) {
        $user_login = sanitize_text_field( $params['username'] );
    }
    if ( empty( $user_login ) && isset( $params['user_login'] ) ) {
        $user_login = sanitize_text_field( $params['user_login'] );
    }
    $key = isset( $params['key'] ) ? sanitize_text_field( $params['key'] ) : '';
    $password = isset( $params['password'] ) ? $params['password'] : '';

    if ( empty( $user_login ) || empty( $key ) || empty( $password ) ) {
        return new WP_Error( 'rest_missing_fields', 'Username, key, and password are required.', array( 'status' => 400 ) );
    }

    if ( ! function_exists( 'check_password_reset_key' ) ) {
        require_once ABSPATH . 'wp-login.php';
    }

    $user = check_password_reset_key( $key, $user_login );

    if ( is_wp_error( $user ) ) {
        return new WP_Error( 'rest_invalid_key', 'The password reset link is invalid or has expired.', array( 'status' => 400 ) );
    }

    reset_password( $user, $password );

    return rest_ensure_response( array( 'success' => true ) );
}

/**
 * Intercept retrieve password mail subject and body to support custom template and headless redirect.
 */
add_filter( 'retrieve_password_title', 'forgewp_retrieve_password_title', 10, 3 );
function forgewp_retrieve_password_title( $title, $user_login, $user_data ) {
    $custom_subject = get_option( 'forgewp_auth_password_reset_email_subject', '${defaultPasswordResetEmailSubject.replace(/'/g, "\\'")}' );
    if ( ! empty( $custom_subject ) ) {
        return $custom_subject;
    }
    return $title;
}

add_filter( 'retrieve_password_message', 'forgewp_retrieve_password_message', 10, 4 );
function forgewp_retrieve_password_message( $message, $key, $user_login, $user_data ) {
    $origin = forgewp_get_frontend_origin();
    $reset_url = $origin . '/reset-password?key=' . $key . '&login=' . rawurlencode( $user_login );

    $custom_body = get_option( 'forgewp_auth_password_reset_email_body', '${defaultPasswordResetEmailBody.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}' );
    if ( ! empty( $custom_body ) ) {
        $body = str_replace(
            array( '{username}', '{reset_url}' ),
            array( $user_login, $reset_url ),
            $custom_body
        );
        return $body;
    }

    $message = "Hello!\\n\\nYou asked us to reset your password for your account: " . $user_login . "\\n\\nIf this was a mistake, just ignore this email.\\n\\nTo reset your password, visit the following link:\\n\\n" . $reset_url . "\\n";
    return $message;
}

function forgewp_auth_head_hydration() {
    $payload = forgewp_get_current_user_hydration_payload();
    $login_field = get_option( 'forgewp_auth_login_field', '${defaultLoginField}' );
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    $rest_nonce = wp_create_nonce( 'wp_rest' );
    
    $session_data = array(
        'loggedIn' => ! empty( $payload ),
        'user' => $payload,
        'loginField' => $login_field,
        'emailVerificationEnabled' => $verification_enabled,
        'restNonce' => $rest_nonce,
    );
    ?>
    <script type="application/json" id="forgewp-session">
    <?php echo wp_json_encode($session_data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>
    </script>
    <script id="forgewp-auth-hydration">
        if (!window.forgeWpHydration) {
            window.forgeWpHydration = {};
        }
        window.forgeWpHydration.currentUser = <?php echo wp_json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>;
        window.forgeWpHydration.loginField = <?php echo wp_json_encode($login_field); ?>;
        window.forgeWpHydration.emailVerificationEnabled = <?php echo wp_json_encode($verification_enabled); ?>;
        window.forgeWpHydration.restNonce = <?php echo wp_json_encode($rest_nonce); ?>;
    </script>
    <?php
}
add_action('wp_head', 'forgewp_auth_head_hydration', 1);

/**
 * Register Product Review REST routes.
 */
add_action( 'rest_api_init', 'forgewp_product_reviews_register_rest_routes' );
function forgewp_product_reviews_register_rest_routes() {
    register_rest_route( 'forgewp/v1', '/products/(?P<id>\\d+)/reviews', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_product_reviews',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_submit_product_review',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => 'forgewp_rest_delete_product_review',
            'permission_callback' => '__return_true',
        ),
    ) );
}

function forgewp_rest_get_product_reviews( $request ) {
    $product_id = intval( $request->get_param( 'id' ) );
    if ( ! $product_id ) {
        return new WP_Error( 'invalid_product', 'Invalid product ID', array( 'status' => 400 ) );
    }

    $sort = sanitize_text_field( $request->get_param( 'sort' ) ?: 'newest' );
    $page = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
    $per_page = max( 1, min( 50, intval( $request->get_param( 'per_page' ) ?: 5 ) ) );

    $current_user_id = get_current_user_id();
    if ( ! $current_user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) && forgewp_cookie_auth_request_allowed() ) {
        $cookie_user_id = wp_validate_auth_cookie( $_COOKIE[ LOGGED_IN_COOKIE ], 'logged_in' );
        if ( $cookie_user_id ) {
            wp_set_current_user( $cookie_user_id );
            $current_user_id = $cookie_user_id;
        }
    }

    $comments = get_comments( array(
        'post_id' => $product_id,
        'type'    => 'review',
        'status'  => 'approve',
        'order'   => 'DESC',
        'orderby' => 'comment_date_gmt',
    ) );

    $all_formatted = array();
    $user_review = null;
    $total_rating = 0;
    $rating_breakdown = array( '1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0 );

    foreach ( $comments as $c ) {
        $rating = get_comment_meta( $c->comment_ID, 'rating', true );
        $rating = ! empty( $rating ) ? max( 1, min( 5, intval( $rating ) ) ) : 5;
        $verified = get_comment_meta( $c->comment_ID, 'verified', true );
        $total_rating += $rating;
        $rating_breakdown[ strval( $rating ) ]++;

        $is_owner = ( $current_user_id > 0 && intval( $c->user_id ) === $current_user_id );

        $rev_data = array(
            'id'       => intval( $c->comment_ID ),
            'author'   => $c->comment_author ? $c->comment_author : 'Customer',
            'content'  => wp_strip_all_tags( $c->comment_content ),
            'rating'   => $rating,
            'date'     => mysql2date( 'Y-m-d', $c->comment_date ),
            'verified' => ! empty( $verified ) || ( $c->user_id > 0 ),
            'isOwner'  => $is_owner,
        );

        if ( $is_owner && ! $user_review ) {
            $user_review = $rev_data;
        } else {
            $all_formatted[] = $rev_data;
        }
    }

    // Apply sorting to other customer reviews
    if ( $sort === 'oldest' ) {
        usort( $all_formatted, function( $a, $b ) {
            return strcmp( $a['date'], $b['date'] );
        } );
    } elseif ( $sort === 'highest' ) {
        usort( $all_formatted, function( $a, $b ) {
            if ( $a['rating'] === $b['rating'] ) {
                return strcmp( $b['date'], $a['date'] );
            }
            return $b['rating'] - $a['rating'];
        } );
    } elseif ( $sort === 'lowest' ) {
        usort( $all_formatted, function( $a, $b ) {
            if ( $a['rating'] === $b['rating'] ) {
                return strcmp( $b['date'], $a['date'] );
            }
            return $a['rating'] - $b['rating'];
        } );
    } else {
        // 'newest' default
        usort( $all_formatted, function( $a, $b ) {
            return strcmp( $b['date'], $a['date'] );
        } );
    }

    $total_other = count( $all_formatted );
    $total_pages = max( 1, intval( ceil( $total_other / $per_page ) ) );
    $offset = ( $page - 1 ) * $per_page;
    $paginated_reviews = array_slice( $all_formatted, $offset, $per_page );

    $grand_total = count( $comments );
    $avg_rating = $grand_total > 0 ? round( $total_rating / $grand_total, 2 ) : 0;

    return rest_ensure_response( array(
        'reviews'         => $paginated_reviews,
        'userReview'      => $user_review,
        'ratingBreakdown' => $rating_breakdown,
        'ratingCount'     => $grand_total,
        'averageRating'   => number_format( $avg_rating, 2, '.', '' ),
        'currentPage'     => $page,
        'totalPages'      => $total_pages,
        'totalReviews'    => $total_other,
    ) );
}

function forgewp_rest_submit_product_review( $request ) {
    $product_id = intval( $request->get_param( 'id' ) );
    if ( ! $product_id || ! get_post( $product_id ) ) {
        return new WP_Error( 'invalid_product', 'Product not found', array( 'status' => 404 ) );
    }

    $current_user = wp_get_current_user();
    $user_id = $current_user ? $current_user->ID : 0;
    if ( ! $user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) && forgewp_cookie_auth_request_allowed() ) {
        $cookie_user_id = wp_validate_auth_cookie( $_COOKIE[ LOGGED_IN_COOKIE ], 'logged_in' );
        if ( $cookie_user_id ) {
            wp_set_current_user( $cookie_user_id );
            $current_user = wp_get_current_user();
            $user_id = $cookie_user_id;
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'You must be logged in to leave a review.', array( 'status' => 401 ) );
    }
    $author = $current_user->display_name ?: $current_user->user_login;
    $email = $current_user->user_email;

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $content = ! empty( $params['content'] ) ? sanitize_textarea_field( $params['content'] ) : ( ! empty( $params['comment'] ) ? sanitize_textarea_field( $params['comment'] ) : '' );
    $rating = ! empty( $params['rating'] ) ? max( 1, min( 5, intval( $params['rating'] ) ) ) : 5;

    if ( empty( $content ) ) {
        return new WP_Error( 'missing_content', 'Review content is required', array( 'status' => 400 ) );
    }

    // Check if user already reviewed this product (edit mode)
    $existing_reviews = get_comments( array(
        'post_id' => $product_id,
        'user_id' => $user_id,
        'type'    => 'review',
    ) );

    $is_update = ! empty( $existing_reviews );
    if ( $is_update ) {
        $existing_comment = $existing_reviews[0];
        $comment_id = intval( $existing_comment->comment_ID );
        wp_update_comment( array(
            'comment_ID'      => $comment_id,
            'comment_content' => $content,
            'comment_date'    => current_time( 'mysql' ),
        ) );
    } else {
        $comment_data = array(
            'comment_post_ID'      => $product_id,
            'comment_author'       => $author,
            'comment_author_email' => $email,
            'comment_content'      => $content,
            'comment_type'         => 'review',
            'comment_parent'       => 0,
            'user_id'              => $user_id,
            'comment_approved'     => 1,
            'comment_date'         => current_time( 'mysql' ),
        );

        $comment_id = wp_insert_comment( $comment_data );
        if ( ! $comment_id || is_wp_error( $comment_id ) ) {
            return new WP_Error( 'insert_failed', 'Failed to save review', array( 'status' => 500 ) );
        }
    }

    update_comment_meta( $comment_id, 'rating', $rating );
    if ( function_exists( 'wc_customer_bought_product' ) && wc_customer_bought_product( $email, $user_id, $product_id ) ) {
        update_comment_meta( $comment_id, 'verified', 1 );
    }

    // Recalculate WooCommerce product ratings
    if ( function_exists( 'wc_update_product_rating_counts' ) ) {
        wc_update_product_rating_counts( $product_id );
    }
    if ( function_exists( 'wc_update_product_average_rating' ) ) {
        wc_update_product_average_rating( $product_id );
    }

    $all_reviews = get_comments( array(
        'post_id' => $product_id,
        'type'    => 'review',
        'status'  => 'approve',
    ) );
    $total_rating = 0;
    $rating_counts = array();
    foreach ( $all_reviews as $r ) {
        $r_rating = intval( get_comment_meta( $r->comment_ID, 'rating', true ) ?: 5 );
        $total_rating += $r_rating;
        $rating_counts[$r_rating] = isset( $rating_counts[$r_rating] ) ? $rating_counts[$r_rating] + 1 : 1;
    }
    $rev_count = count( $all_reviews );
    $avg_rating = $rev_count > 0 ? round( $total_rating / $rev_count, 2 ) : 0;
    update_post_meta( $product_id, '_wc_review_count', $rev_count );
    update_post_meta( $product_id, '_wc_rating_count', $rating_counts );
    update_post_meta( $product_id, '_wc_average_rating', $avg_rating );

    $new_review = array(
        'id'       => $comment_id,
        'author'   => $author,
        'content'  => $content,
        'rating'   => $rating,
        'date'     => current_time( 'Y-m-d' ),
        'verified' => true,
        'isOwner'  => true,
    );

    return rest_ensure_response( array(
        'success'       => true,
        'isUpdate'      => $is_update,
        'review'        => $new_review,
        'ratingCount'   => $rev_count,
        'averageRating' => number_format( $avg_rating, 2, '.', '' ),
    ) );
}

function forgewp_rest_delete_product_review( $request ) {
    $product_id = intval( $request->get_param( 'id' ) );
    if ( ! $product_id || ! get_post( $product_id ) ) {
        return new WP_Error( 'invalid_product', 'Product not found', array( 'status' => 404 ) );
    }

    $current_user = wp_get_current_user();
    $user_id = $current_user ? $current_user->ID : 0;
    if ( ! $user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) && forgewp_cookie_auth_request_allowed() ) {
        $cookie_user_id = wp_validate_auth_cookie( $_COOKIE[ LOGGED_IN_COOKIE ], 'logged_in' );
        if ( $cookie_user_id ) {
            wp_set_current_user( $cookie_user_id );
            $current_user = wp_get_current_user();
            $user_id = $cookie_user_id;
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'You must be logged in to delete a review.', array( 'status' => 401 ) );
    }

    $existing_reviews = get_comments( array(
        'post_id' => $product_id,
        'user_id' => $user_id,
        'type'    => 'review',
    ) );

    if ( empty( $existing_reviews ) ) {
        return new WP_Error( 'review_not_found', 'No review found for this user.', array( 'status' => 404 ) );
    }

    foreach ( $existing_reviews as $r ) {
        wp_delete_comment( $r->comment_ID, true );
    }

    // Recalculate WooCommerce product ratings
    if ( function_exists( 'wc_update_product_rating_counts' ) ) {
        wc_update_product_rating_counts( $product_id );
    }
    if ( function_exists( 'wc_update_product_average_rating' ) ) {
        wc_update_product_average_rating( $product_id );
    }

    $all_reviews = get_comments( array(
        'post_id' => $product_id,
        'type'    => 'review',
        'status'  => 'approve',
    ) );
    $total_rating = 0;
    $rating_counts = array();
    foreach ( $all_reviews as $r ) {
        $r_rating = intval( get_comment_meta( $r->comment_ID, 'rating', true ) ?: 5 );
        $total_rating += $r_rating;
        $rating_counts[$r_rating] = isset( $rating_counts[$r_rating] ) ? $rating_counts[$r_rating] + 1 : 1;
    }
    $rev_count = count( $all_reviews );
    $avg_rating = $rev_count > 0 ? round( $total_rating / $rev_count, 2 ) : 0;
    update_post_meta( $product_id, '_wc_review_count', $rev_count );
    update_post_meta( $product_id, '_wc_rating_count', $rating_counts );
    update_post_meta( $product_id, '_wc_average_rating', $avg_rating );

    return rest_ensure_response( array(
        'success'       => true,
        'deleted'       => true,
        'ratingCount'   => $rev_count,
        'averageRating' => number_format( $avg_rating, 2, '.', '' ),
    ) );
}

/**
 * ── ForgeWP Universal WooCommerce Cart REST Endpoints ──
 */
add_action( 'rest_api_init', 'forgewp_cart_register_rest_routes' );
/**
 * Commerce routes (contract §15) are registered in commerce-resources.js.
 * Only the gateway list lives here, next to the gateway-safe checkout core
 * (forgewp_rest_process_checkout(), used by POST /checkout).
 */
function forgewp_cart_register_rest_routes() {
    register_rest_route( 'forgewp/v1', '/checkout/gateways', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_checkout_gateways',
            'permission_callback' => '__return_true',
        ),
    ) );
}

add_filter( 'woocommerce_get_cart_item_from_session', function( $session_data, $values ) {
    if ( ! empty( $values['image'] ) ) {
        $session_data['image'] = $values['image'];
    }
    if ( ! empty( $values['variantLabel'] ) ) {
        $session_data['variantLabel'] = $values['variantLabel'];
    }
    return $session_data;
}, 20, 2 );


function forgewp_ensure_wc_cart() {
    if ( ! function_exists( 'WC' ) ) {
        return false;
    }
    if ( ! get_current_user_id() && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) && forgewp_cookie_auth_request_allowed() ) {
        $cookie_user_id = wp_validate_auth_cookie( $_COOKIE[ LOGGED_IN_COOKIE ], 'logged_in' );
        if ( $cookie_user_id ) {
            wp_set_current_user( $cookie_user_id );
        }
    }
    if ( ! get_current_user_id() && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $jwt_user_id = forgewp_validate_jwt_token( $matches[1] );
            if ( $jwt_user_id ) {
                wp_set_current_user( $jwt_user_id );
            }
        }
    }
    if ( defined( 'WC_ABSPATH' ) ) {
        include_once WC_ABSPATH . 'includes/wc-cart-functions.php';
        include_once WC_ABSPATH . 'includes/wc-notice-functions.php';
    }
    $user_id = get_current_user_id();
    if ( null === WC()->session ) {
        $session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
        WC()->session = new $session_class();
        WC()->session->init();
    }
    if ( null === WC()->customer ) {
        WC()->customer = new WC_Customer( $user_id, true );
    }
    if ( null === WC()->cart ) {
        WC()->cart = new WC_Cart();
    }
    if ( method_exists( WC()->cart, 'get_cart_from_session' ) && empty( WC()->cart->get_cart() ) ) {
        WC()->cart->get_cart_from_session();
    }

    // Unpack persistent cart from user metadata only if cart is strictly empty and user is logged in
    if ( $user_id && empty( WC()->cart->get_cart() ) ) {
        $blog_id = function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 1;
        $saved_cart = get_user_meta( $user_id, '_woocommerce_persistent_cart_' . $blog_id, true );
        if ( empty( $saved_cart ) || ! is_array( $saved_cart ) ) {
            $saved_cart = get_user_meta( $user_id, '_woocommerce_persistent_cart_1', true );
        }
        if ( empty( $saved_cart ) || ! is_array( $saved_cart ) ) {
            $saved_cart = get_user_meta( $user_id, '_woocommerce_persistent_cart', true );
        }
        if ( ! empty( $saved_cart['cart'] ) && is_array( $saved_cart['cart'] ) ) {
            $cart_contents = array();
            foreach ( $saved_cart['cart'] as $item_key => $item ) {
                if ( ! empty( $item['product_id'] ) ) {
                    $prod_id = intval( $item['product_id'] );
                    $variation_id = ! empty( $item['variation_id'] ) ? intval( $item['variation_id'] ) : 0;
                    $product = wc_get_product( $variation_id ? $variation_id : $prod_id );
                    if ( $product && $product->exists() ) {
                        $item['data'] = $product;
                        $cart_contents[ $item_key ] = $item;
                    }
                }
            }
            if ( ! empty( $cart_contents ) ) {
                WC()->cart->set_cart_contents( $cart_contents );
                forgewp_save_wc_cart();
            }
        }
    }

    return true;
}

function forgewp_save_wc_cart() {
    if ( function_exists( 'WC' ) && WC()->cart && WC()->session ) {
        WC()->cart->calculate_totals();
        if ( method_exists( WC()->cart, 'set_session' ) ) {
            WC()->cart->set_session();
        }
        if ( method_exists( WC()->cart, 'maybe_set_cart_cookies' ) ) {
            WC()->cart->maybe_set_cart_cookies();
        }
        if ( method_exists( WC()->session, 'set_customer_session_cookie' ) ) {
            WC()->session->set_customer_session_cookie( true );
        }
        if ( method_exists( WC()->session, 'save_data' ) ) {
            WC()->session->save_data();
        }
        $user_id = get_current_user_id();
        if ( $user_id ) {
            if ( method_exists( WC()->cart, 'persistent_cart_update' ) ) {
                WC()->cart->persistent_cart_update();
            }
            $cart_data = array(
                'cart' => WC()->cart->get_cart_for_session(),
            );
            $blog_id = function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 1;
            update_user_meta( $user_id, '_woocommerce_persistent_cart_' . $blog_id, $cart_data );
            update_user_meta( $user_id, '_woocommerce_persistent_cart_1', $cart_data );
            update_user_meta( $user_id, '_woocommerce_persistent_cart', $cart_data );
        }
    }
}











function forgewp_rest_get_checkout_gateways( $request ) {
    // Only gateways WooCommerce actually offers for this cart. Never invent
    // entries: a fake "Stripe" option would place orders nobody can pay.
    $gateways_list = array();
    if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
        forgewp_ensure_wc_cart();
        $available = WC()->payment_gateways()->get_available_payment_gateways();
        if ( ! empty( $available ) ) {
            foreach ( $available as $id => $gateway ) {
                $gateways_list[] = array(
                    'id'          => $id,
                    'title'       => $gateway->get_title() ?: $gateway->get_method_title(),
                    'description' => $gateway->get_description(),
                    'icon'        => $gateway->get_icon(),
                    'supports'    => isset( $gateway->supports ) && is_array( $gateway->supports ) ? array_values( $gateway->supports ) : array( 'products' ),
                    'flow'        => forgewp_checkout_gateway_flow( $id, $gateway ),
                );
            }
        }
    }
    return rest_ensure_response( array(
        'gateways' => $gateways_list,
    ) );
}

/**
 * How a gateway takes payment (contract §15.4):
 * - offline:  no payment step on the site (cash on delivery, bank transfer, cheque);
 * - client:   the gateway draws its own payment fields (card forms) and needs its SDK on the page;
 * - redirect: the shopper is sent to the gateway's own payment page.
 * Filter 'forgewp_checkout_gateway_flow' corrects the class for a specific gateway.
 */
function forgewp_checkout_gateway_flow( $id, $gateway ) {
    if ( in_array( $id, array( 'cod', 'bacs', 'cheque' ), true ) ) {
        $flow = 'offline';
    } elseif ( is_object( $gateway ) && method_exists( $gateway, 'has_fields' ) && $gateway->has_fields() ) {
        $flow = 'client';
    } else {
        $flow = 'redirect';
    }
    $flow = (string) apply_filters( 'forgewp_checkout_gateway_flow', $flow, $id, $gateway );
    return in_array( $flow, array( 'offline', 'client', 'redirect' ), true ) ? $flow : 'redirect';
}

/** Checkout address fields accepted from the client, mapped to WooCommerce's posted-data keys. */
function forgewp_checkout_address_fields( $type ) {
    $fields = array( 'first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country' );
    if ( 'billing' === $type ) {
        $fields[] = 'email';
        $fields[] = 'phone';
    } else {
        $fields[] = 'phone';
    }
    return $fields;
}

function forgewp_checkout_posted_data( $params, $payment_method ) {
    $billing  = ! empty( $params['billing_address'] ) && is_array( $params['billing_address'] ) ? $params['billing_address'] : ( ! empty( $params['billing'] ) && is_array( $params['billing'] ) ? $params['billing'] : array() );
    $shipping = ! empty( $params['shipping_address'] ) && is_array( $params['shipping_address'] ) ? $params['shipping_address'] : ( ! empty( $params['shipping'] ) && is_array( $params['shipping'] ) ? $params['shipping'] : $billing );

    $data = array(
        'payment_method'            => $payment_method,
        'order_comments'            => ! empty( $params['customer_note'] ) ? sanitize_textarea_field( $params['customer_note'] ) : '',
        'ship_to_different_address' => true,
        'shipping_method'           => WC()->session ? (array) WC()->session->get( 'chosen_shipping_methods', array() ) : array(),
        'terms'                     => 1,
    );
    foreach ( array( 'billing' => $billing, 'shipping' => $shipping ) as $type => $address ) {
        foreach ( forgewp_checkout_address_fields( $type ) as $field ) {
            $value = isset( $address[ $field ] ) && is_scalar( $address[ $field ] ) ? (string) $address[ $field ] : '';
            $data[ $type . '_' . $field ] = 'email' === $field ? sanitize_email( $value ) : sanitize_text_field( $value );
        }
    }
    return $data;
}

function forgewp_rest_process_checkout( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    if ( empty( WC()->cart->get_cart() ) ) {
        return new WP_Error( 'cart_empty', 'Cannot checkout with an empty cart', array( 'status' => 400 ) );
    }

    // The payment method must be one WooCommerce offers for this cart. There is
    // no default: silently falling back to "cod" (or trusting any id) let a
    // shopper place an order marked as processing without paying.
    $payment_method = ! empty( $params['payment_method'] ) ? sanitize_key( $params['payment_method'] ) : '';
    $needs_payment  = WC()->cart->needs_payment();
    $available      = WC()->payment_gateways()->get_available_payment_gateways();
    if ( $needs_payment && ( '' === $payment_method || empty( $available[ $payment_method ] ) ) ) {
        return new WP_Error( 'invalid_payment_method', 'Choose an available payment method.', array( 'status' => 400 ) );
    }

    $data = forgewp_checkout_posted_data( $params, $needs_payment ? $payment_method : '' );
    if ( '' === $data['billing_email'] || ! is_email( $data['billing_email'] ) ) {
        return new WP_Error( 'invalid_billing_email', 'A valid billing email address is required.', array( 'status' => 400 ) );
    }

    // Taxes and shipping depend on the customer's address.
    $customer = WC()->customer;
    if ( $customer ) {
        foreach ( forgewp_checkout_address_fields( 'billing' ) as $field ) {
            $setter = 'set_billing_' . $field;
            if ( method_exists( $customer, $setter ) ) {
                $customer->{$setter}( $data[ 'billing_' . $field ] );
            }
        }
        foreach ( forgewp_checkout_address_fields( 'shipping' ) as $field ) {
            $setter = 'set_shipping_' . $field;
            if ( method_exists( $customer, $setter ) ) {
                $customer->{$setter}( $data[ 'shipping_' . $field ] );
            }
        }
        $customer->save();
    }
    WC()->cart->calculate_shipping();
    WC()->cart->calculate_totals();

    $stock = WC()->cart->check_cart_item_stock();
    if ( is_wp_error( $stock ) ) {
        return new WP_Error( 'out_of_stock', html_entity_decode( wp_strip_all_tags( $stock->get_error_message() ), ENT_QUOTES, 'UTF-8' ), array( 'status' => 409 ) );
    }

    // WooCommerce builds the order from the cart: line items, chosen shipping
    // lines, fees, coupons and taxes, and fires its checkout hooks.
    $order_id = WC()->checkout()->create_order( $data );
    if ( is_wp_error( $order_id ) || ! $order_id ) {
        return new WP_Error( 'order_creation_failed', 'Failed to create order. Please try again.', array( 'status' => 500 ) );
    }
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return new WP_Error( 'order_creation_failed', 'Failed to create order. Please try again.', array( 'status' => 500 ) );
    }
    $order->add_order_note( 'Order placed via ForgeWP checkout.' );
    // Like WooCommerce's checkout: a signed-in customer's addresses are saved for next time.
    if ( get_current_user_id() && class_exists( 'WC_Customer' ) ) {
        $account = new WC_Customer( get_current_user_id() );
        foreach ( array( 'billing', 'shipping' ) as $type ) {
            foreach ( forgewp_checkout_address_fields( $type ) as $field ) {
                $setter = 'set_' . $type . '_' . $field;
                if ( method_exists( $account, $setter ) && isset( $data[ $type . '_' . $field ] ) ) {
                    $account->{$setter}( $data[ $type . '_' . $field ] );
                }
            }
        }
        $account->save();
    }
    do_action( 'woocommerce_checkout_order_processed', $order_id, $data, $order );

    // The gateway decides the order status (COD: processing, BACS: on-hold,
    // card/redirect gateways: pending until paid). Never set it here.
    $redirect      = '';
    $needs_redirect = false;
    if ( $needs_payment ) {
        $result = $available[ $payment_method ]->process_payment( $order_id );
        if ( ! is_array( $result ) || ! isset( $result['result'] ) || 'success' !== $result['result'] ) {
            $notices = function_exists( 'wc_get_notices' ) ? wc_get_notices( 'error' ) : array();
            if ( function_exists( 'wc_clear_notices' ) ) {
                wc_clear_notices();
            }
            $message = ! empty( $notices[0]['notice'] ) ? html_entity_decode( wp_strip_all_tags( $notices[0]['notice'] ), ENT_QUOTES, 'UTF-8' ) : 'Payment failed. Please try another payment method.';
            return new WP_Error( 'payment_failed', $message, array( 'status' => 402, 'orderId' => $order_id ) );
        }
        $redirect = ! empty( $result['redirect'] ) ? (string) $result['redirect'] : $order->get_checkout_order_received_url();
        $order    = wc_get_order( $order_id );
        // Off-site gateways leave the order pending and send the shopper away;
        // keep the cart until they come back paid (WooCommerce empties it then).
        $needs_redirect = $order->has_status( array( 'pending', 'failed' ) );
    } else {
        $order->payment_complete();
        $redirect = $order->get_checkout_order_received_url();
    }

    if ( ! $needs_redirect ) {
        WC()->cart->empty_cart();
    }
    forgewp_save_wc_cart();

    return rest_ensure_response( array(
        'success'       => true,
        'orderId'       => $order->get_id(),
        'orderKey'      => $order->get_order_key(),
        'orderNumber'   => $order->get_order_number(),
        'status'        => $order->get_status(),
        'total'         => $order->get_total(),
        'currency'      => $order->get_currency(),
        'paymentMethod' => $order->get_payment_method(),
        'needsRedirect' => $needs_redirect,
        'redirectUrl'   => $redirect,
    ) );
}
`;
  }

  return `
${queryEndpointsPhp}
${authControllersPhp}
`;
}
