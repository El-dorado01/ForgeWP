import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
      const varName = String(queryObj.categoryName).replace(/^__DYNAMIC_/, '').replace(/__$/, '');
      phpLines.push(`        'category_name' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
    } else {
      phpLines.push(`        'category_name' => '${queryObj.categoryName}',`);
    }
  }
  
  phpLines.push(`        'paged' => $paged,`);
  
  if (queryObj.taxQuery && Array.isArray(queryObj.taxQuery) && queryObj.taxQuery.length > 0) {
    phpLines.push(`        'tax_query' => array(`);
    for (const taxQ of queryObj.taxQuery) {
      phpLines.push(`            array(`);
      phpLines.push(`                'taxonomy' => '${taxQ.taxonomy}',`);
      phpLines.push(`                'field' => '${taxQ.field || 'slug'}',`);
      
      const termsVal = taxQ.terms;
      if (typeof termsVal === 'string' && termsVal.startsWith('__DYNAMIC_')) {
        const varName = termsVal.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
        phpLines.push(`                'terms' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
      } else if (Array.isArray(termsVal)) {
        const termsPhp = termsVal.map(t => typeof t === 'string' ? `'${t}'` : t).join(', ');
        phpLines.push(`                'terms' => array(${termsPhp}),`);
      } else if (typeof termsVal === 'string') {
        phpLines.push(`                'terms' => '${termsVal}',`);
      } else {
        phpLines.push(`                'terms' => ${termsVal},`);
      }
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }
  
  if (queryObj.metaQuery && Array.isArray(queryObj.metaQuery) && queryObj.metaQuery.length > 0) {
    phpLines.push(`        'meta_query' => array(`);
    if (queryObj.metaRelation) {
      phpLines.push(`            'relation' => '${queryObj.metaRelation}',`);
    }
    for (const metaQ of queryObj.metaQuery) {
      phpLines.push(`            array(`);
      phpLines.push(`                'key' => '${metaQ.key}',`);
      if (metaQ.compare) {
        phpLines.push(`                'compare' => '${metaQ.compare}',`);
      }
      if (metaQ.value !== undefined) {
        const val = metaQ.value;
        if (typeof val === 'string' && val.startsWith('__DYNAMIC_')) {
          const varName = val.replace(/^__DYNAMIC_/, '').replace(/__$/, '');
          phpLines.push(`                'value' => $request->get_param('${varName}') ? sanitize_text_field($request->get_param('${varName}')) : '',`);
        } else if (typeof val === 'string') {
          phpLines.push(`                'value' => '${val}',`);
        } else {
          phpLines.push(`                'value' => ${val},`);
        }
      }
      phpLines.push(`            ),`);
    }
    phpLines.push(`        ),`);
  }
  
  phpLines.push(`    );`);
  return phpLines.join('\n');
}

export function buildRestEndpointsPhp(config, queries, hasAuth, defaultPasswordResetEmailSubject, defaultPasswordResetEmailBody, defaultVerificationEmailSubject, defaultVerificationEmailBody, defaultLoginField, defaultEmailVerificationEnabled, defaultRegistrationEnabled, defaultBlockLoginUntilVerified, defaultAutoLoginAfterSignup, defaultDefaultRole, reservedUsernamesPhp) {
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
      const cleanId = q.queryId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
      const cleanId = q.queryId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/signup', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_signup',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/register', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_signup',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/logout', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_logout',
        'permission_callback' => '__return_true',
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
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/resend-verification', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_resend_verification',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/lost-password', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_lost_password',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'forgewp/v1', '/auth/reset-password', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_rest_reset_password',
        'permission_callback' => '__return_true',
    ) );
}

function forgewp_rest_auth_config() {
    $login_field = get_option( 'forgewp_auth_login_field', '${defaultLoginField}' );
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    return rest_ensure_response( array(
        'loginField'               => $login_field,
        'emailVerificationEnabled' => $verification_enabled,
    ) );
}

function forgewp_get_frontend_origin() {
    $origin = home_url();
    if ( defined( 'FORGEWP_FRONTEND_ORIGIN' ) ) {
        $origin = FORGEWP_FRONTEND_ORIGIN;
    }
    return rtrim( $origin, '/' );
}

function forgewp_rest_login( $request ) {
    $params = $request->get_json_params();
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

    $user = wp_signon( $creds, is_ssl() );

    if ( is_wp_error( $user ) ) {
        return new WP_Error( 'rest_login_failed', $user->get_error_message(), array( 'status' => 403 ) );
    }

    // Check email verification if enabled
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    $block_login = get_option( 'forgewp_auth_block_login_until_verified', '${defaultBlockLoginUntilVerified}' ) === '1';

    if ( $verification_enabled && $block_login ) {
        $verified_meta = get_user_meta( $user->ID, 'forgewp_email_verified', true );
        $email_verified = ( $verified_meta === '1' ) || ( $verified_meta === true );
        if ( ! $email_verified ) {
            wp_logout();
            return new WP_Error( 'rest_unverified_email', 'Please verify your email address before logging in.', array( 'status' => 403 ) );
        }
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

    $user_id = wp_create_user( $username, $password, $email );

    if ( is_wp_error( $user_id ) ) {
        return new WP_Error( 'rest_signup_failed', $user_id->get_error_message(), array( 'status' => 500 ) );
    }

    $user = get_user_by( 'id', $user_id );
    $user->set_role( $default_role );

    if ( ! empty( $displayName ) ) {
        wp_update_user( array( 'ID' => $user_id, 'display_name' => $displayName ) );
    }

    if ( ! empty( $params['metadata'] ) && is_array( $params['metadata'] ) ) {
        foreach ( $params['metadata'] as $meta_key => $meta_val ) {
            $clean_key = sanitize_key( $meta_key );
            $clean_val = is_scalar( $meta_val ) ? sanitize_text_field( $meta_val ) : $meta_val;
            update_user_meta( $user_id, $clean_key, $clean_val );
        }
    }

    // Check verification status
    $verification_enabled = get_option( 'forgewp_auth_email_verification_enabled', '${defaultEmailVerificationEnabled}' ) === '1';
    if ( $verification_enabled ) {
        update_user_meta( $user_id, 'forgewp_email_verified', '0' );
        // Send email verification
        forgewp_send_email_verification( $user );
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
        wp_signon( $creds, is_ssl() );
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
        'message' => $verification_enabled ? 'Registration successful. Please verify your email.' : 'Registration successful.',
    ) );
}

function forgewp_rest_logout() {
    wp_logout();
    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_rest_me() {
    $payload = forgewp_get_current_user_hydration_payload();
    return rest_ensure_response( array( 'user' => $payload ) );
}

function forgewp_rest_verify_email( $request ) {
    $params = $request->get_json_params();
    $user_id = isset( $params['userId'] ) ? intval( $params['userId'] ) : 0;
    $token = isset( $params['token'] ) ? sanitize_text_field( $params['token'] ) : '';

    if ( $user_id === 0 || empty( $token ) ) {
        return new WP_Error( 'rest_missing_fields', 'User ID and token are required.', array( 'status' => 400 ) );
    }

    $saved_id = get_transient( 'forgewp_verify_email_' . $token );
    $verified_meta = get_user_meta( $user_id, 'forgewp_email_verified', true );

    if ( $saved_id !== false && intval( $saved_id ) === $user_id ) {
        delete_transient( 'forgewp_verify_email_' . $token );
        update_user_meta( $user_id, 'forgewp_email_verified', '1' );
    } elseif ( $verified_meta !== '1' && $verified_meta !== true ) {
        return new WP_Error( 'rest_invalid_token', 'Invalid or expired verification token.', array( 'status' => 400 ) );
    }

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

    forgewp_send_email_verification( $user );

    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_send_email_verification( $user ) {
    $email = $user->user_email;
    if ( empty( $email ) ) {
        return false;
    }

    $token = wp_generate_password( 32, false );
    set_transient( 'forgewp_verify_email_' . $token, $user->ID, DAY_IN_SECONDS );

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
    }
    return $sent;
}

function forgewp_rest_lost_password( $request ) {
    $params = $request->get_json_params();
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
        return new WP_Error( 'rest_recovery_failed', $errors->get_error_message(), array( 'status' => 400 ) );
    }

    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_rest_reset_password( $request ) {
    $params = $request->get_json_params();
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
    
    $session_data = array(
        'loggedIn' => ! empty( $payload ),
        'user' => $payload,
        'loginField' => $login_field,
        'emailVerificationEnabled' => $verification_enabled,
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
        window.forgeWpHydration.restNonce = <?php echo wp_json_encode(wp_create_nonce('wp_rest')); ?>;
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
    if ( ! $current_user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
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
    if ( ! $user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
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
    if ( ! $user_id && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
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
function forgewp_cart_register_rest_routes() {
    register_rest_route( 'forgewp/v1', '/cart', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_cart',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/add', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_add_to_cart',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/update', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_update_cart_item',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/remove', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_remove_cart_item',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/clear', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_clear_cart',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/apply-coupon', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_apply_coupon',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/sync', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_sync_cart',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/cart/shipping-rates', array(
        array(
            'methods'             => array( 'GET', 'POST' ),
            'callback'            => 'forgewp_rest_get_shipping_rates',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/checkout/gateways', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_checkout_gateways',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/checkout/process', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_process_checkout',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/customer/orders', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_customer_orders',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/customer/orders/(?P<id>[\d]+)', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_customer_order_detail',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/customer/downloads', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_customer_downloads',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/wishlist', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_get_wishlist',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/wishlist/toggle', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_toggle_wishlist',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/wishlist/sync', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_sync_wishlist',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/products', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'forgewp_rest_query_products',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/customer/profile', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_update_customer_profile',
            'permission_callback' => '__return_true',
        ),
    ) );

    register_rest_route( 'forgewp/v1', '/customer/address', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'forgewp_rest_update_customer_address',
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

function forgewp_resolve_wc_product_id( $params ) {
    $product_id = intval( ! empty( $params['productId'] ) ? $params['productId'] : ( ! empty( $params['id'] ) ? $params['id'] : 0 ) );
    
    // Check if product_id is valid WooCommerce product
    if ( $product_id && function_exists( 'wc_get_product' ) ) {
        $p = wc_get_product( $product_id );
        if ( $p && is_object( $p ) ) {
            return $product_id;
        }
    }

    // Lookup by slug
    $slug = ! empty( $params['slug'] ) ? sanitize_title( $params['slug'] ) : '';
    if ( ! empty( $slug ) ) {
        $posts = get_posts( array(
            'name'           => $slug,
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'fields'         => 'ids',
        ) );
        if ( ! empty( $posts ) ) {
            return intval( $posts[0] );
        }
    }

    // Lookup by name/title
    $title = ! empty( $params['name'] ) ? sanitize_text_field( $params['name'] ) : ( ! empty( $params['title'] ) ? sanitize_text_field( $params['title'] ) : '' );
    if ( ! empty( $title ) ) {
        $posts = get_posts( array(
            'title'          => $title,
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'fields'         => 'ids',
        ) );
        if ( ! empty( $posts ) ) {
            return intval( $posts[0] );
        }
    }

    // Fallback: If still not found and a product exists in WooCommerce, find first available
    if ( ! $product_id && function_exists( 'wc_get_products' ) ) {
        $prods = wc_get_products( array( 'limit' => 1, 'return' => 'ids' ) );
        if ( ! empty( $prods ) ) {
            return intval( $prods[0] );
        }
    }

    return $product_id;
}

function forgewp_ensure_wc_cart() {
    if ( ! function_exists( 'WC' ) ) {
        return false;
    }
    if ( ! get_current_user_id() && ! empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
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

function forgewp_format_cart_response() {
    if ( ! forgewp_ensure_wc_cart() ) {
        return array(
            'items'     => array(),
            'itemCount' => 0,
            'subtotal'  => 0,
            'totals'    => array(
                'subtotal' => '0.00',
                'discount' => '0.00',
                'shipping' => '0.00',
                'tax'      => '0.00',
                'total'    => '0.00',
            ),
            'coupons'   => array(),
            'currency'  => '$',
        );
    }

    WC()->cart->calculate_totals();

    $items = array();
    $cart_contents = WC()->cart->get_cart();

    foreach ( $cart_contents as $cart_item_key => $cart_item ) {
        $product = $cart_item['data'];
        if ( ! $product || ! is_object( $product ) ) {
            continue;
        }

        $product_id = $product->get_id();
        $parent_id  = $product->get_parent_id();
        $main_id    = $parent_id ? $parent_id : $product_id;
        $main_post  = get_post( $main_id );
        $slug       = $main_post ? $main_post->post_name : '';

        $image_url = '';
        if ( ! empty( $cart_item['image'] ) && is_string( $cart_item['image'] ) && filter_var( $cart_item['image'], FILTER_VALIDATE_URL ) ) {
            $image_url = $cart_item['image'];
        }
        if ( ! $image_url ) {
            $image_id = $product->get_image_id();
            if ( ! $image_id && $parent_id ) {
                $parent_prod = wc_get_product( $parent_id );
                if ( $parent_prod ) {
                    $image_id = $parent_prod->get_image_id();
                }
            }
            if ( $image_id ) {
                $image_url = wp_get_attachment_image_url( $image_id, 'medium' ) ?: wp_get_attachment_url( $image_id );
            }
        }
        if ( ! $image_url ) {
            $meta_keys = array( '_forgewp_image', 'featured_image', '_featured_image', 'image', '_thumbnail_url', '_external_image_url' );
            foreach ( $meta_keys as $m_key ) {
                $m_val = get_post_meta( $main_id, $m_key, true );
                if ( $m_val && is_string( $m_val ) && filter_var( $m_val, FILTER_VALIDATE_URL ) ) {
                    $image_url = $m_val;
                    break;
                }
            }
        }
        if ( ! $image_url ) {
            $meta_images = get_post_meta( $main_id, '_forgewp_images', true );
            if ( empty( $meta_images ) ) {
                $meta_images = get_post_meta( $main_id, 'images', true );
            }
            if ( is_array( $meta_images ) && ! empty( $meta_images[0] ) ) {
                $image_url = is_string( $meta_images[0] ) ? $meta_images[0] : ( ! empty( $meta_images[0]['src'] ) ? $meta_images[0]['src'] : '' );
            }
        }
        if ( ! $image_url ) {
            $image_url = wc_placeholder_img_src( 'medium' );
        }

        $price = floatval( $product->get_price() );
        $regular_price = floatval( $product->get_regular_price() );
        $line_subtotal = floatval( $cart_item['line_subtotal'] );
        $quantity = intval( $cart_item['quantity'] );

        $variation_attrs = array();
        if ( ! empty( $cart_item['variation'] ) && is_array( $cart_item['variation'] ) ) {
            foreach ( $cart_item['variation'] as $attr_name => $attr_val ) {
                $clean_name = str_replace( 'attribute_', '', $attr_name );
                $variation_attrs[$clean_name] = $attr_val;
            }
        }

        $variant_label = ! empty( $variation_attrs ) ? implode( ', ', array_values( $variation_attrs ) ) : ( ! empty( $cart_item['variantLabel'] ) ? $cart_item['variantLabel'] : '' );

        $items[] = array(
            'id'             => $cart_item_key,
            'key'            => $cart_item_key,
            'productId'      => $main_id,
            'variationId'    => $parent_id ? $product_id : 0,
            'slug'           => $slug,
            'name'           => $product->get_name(),
            'price'          => $price,
            'compareAtPrice' => ( $regular_price > $price ) ? $regular_price : null,
            'image'          => $image_url,
            'quantity'       => $quantity,
            'variantLabel'   => $variant_label,
            'variation'      => $variation_attrs,
            'lineSubtotal'   => $line_subtotal,
        );
    }

    $subtotal_val = floatval( WC()->cart->get_subtotal() );
    $total_val    = floatval( WC()->cart->get_total( 'edit' ) );
    $discount_val = floatval( WC()->cart->get_discount_total() );
    $shipping_val = floatval( WC()->cart->get_shipping_total() );
    $tax_val      = floatval( WC()->cart->get_total_tax() );

    return array(
        'items'     => $items,
        'itemCount' => intval( WC()->cart->get_cart_contents_count() ),
        'subtotal'  => $subtotal_val,
        'totals'    => array(
            'subtotal' => number_format( $subtotal_val, 2, '.', '' ),
            'discount' => number_format( $discount_val, 2, '.', '' ),
            'shipping' => number_format( $shipping_val, 2, '.', '' ),
            'tax'      => number_format( $tax_val, 2, '.', '' ),
            'total'    => number_format( $total_val, 2, '.', '' ),
        ),
        'coupons'   => array_values( WC()->cart->get_applied_coupons() ),
        'currency'  => get_woocommerce_currency_symbol(),
    );
}

function forgewp_rest_get_cart( $request ) {
    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_add_to_cart( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $product_id   = forgewp_resolve_wc_product_id( $params );
    $quantity     = max( 1, intval( ! empty( $params['quantity'] ) ? $params['quantity'] : 1 ) );
    $variation_id = intval( ! empty( $params['variationId'] ) ? $params['variationId'] : 0 );
    $variation    = ! empty( $params['variation'] ) && is_array( $params['variation'] ) ? $params['variation'] : array();
    $custom_data  = array();
    if ( ! empty( $params['variantLabel'] ) ) {
        $custom_data['variantLabel'] = sanitize_text_field( $params['variantLabel'] );
    }
    if ( ! empty( $params['image'] ) ) {
        $custom_data['image'] = esc_url_raw( $params['image'] );
    }

    if ( ! $product_id ) {
        return new WP_Error( 'missing_product_id', 'Product ID is required', array( 'status' => 400 ) );
    }

    $cart_item_key = WC()->cart->add_to_cart( $product_id, $quantity, $variation_id, $variation, $custom_data );

    if ( ! $cart_item_key ) {
        $notices = wc_get_notices( 'error' );
        $err_msg = ! empty( $notices ) ? wp_strip_all_tags( $notices[0]['notice'] ) : 'Failed to add item to cart';
        wc_clear_notices();
        return new WP_Error( 'add_to_cart_failed', $err_msg, array( 'status' => 400 ) );
    }

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_sync_cart( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $items = ! empty( $params['items'] ) && is_array( $params['items'] ) ? $params['items'] : array();
    
    // Empty existing cart first so sync is idempotent and doesn't compound quantities
    WC()->cart->empty_cart( false );

    foreach ( $items as $item ) {
        $prod_id   = forgewp_resolve_wc_product_id( $item );
        $qty       = max( 1, intval( ! empty( $item['quantity'] ) ? $item['quantity'] : 1 ) );
        $var_id    = intval( ! empty( $item['variationId'] ) ? $item['variationId'] : 0 );
        $variation = ! empty( $item['variation'] ) && is_array( $item['variation'] ) ? $item['variation'] : array();
        $custom    = array();
        if ( ! empty( $item['variantLabel'] ) ) {
            $custom['variantLabel'] = sanitize_text_field( $item['variantLabel'] );
        }
        if ( ! empty( $item['image'] ) ) {
            $custom['image'] = esc_url_raw( $item['image'] );
        }
        if ( $prod_id ) {
            WC()->cart->add_to_cart( $prod_id, $qty, $var_id, $variation, $custom );
        }
    }

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_update_cart_item( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $key      = ! empty( $params['key'] ) ? sanitize_text_field( $params['key'] ) : ( ! empty( $params['lineId'] ) ? sanitize_text_field( $params['lineId'] ) : ( ! empty( $params['id'] ) ? sanitize_text_field( $params['id'] ) : '' ) );
    $quantity = intval( isset( $params['quantity'] ) ? $params['quantity'] : 1 );

    if ( ! $key ) {
        return new WP_Error( 'missing_key', 'Cart item key is required', array( 'status' => 400 ) );
    }

    if ( $quantity <= 0 ) {
        WC()->cart->remove_cart_item( $key );
    } else {
        WC()->cart->set_quantity( $key, $quantity );
    }

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_remove_cart_item( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $key = ! empty( $params['key'] ) ? sanitize_text_field( $params['key'] ) : ( ! empty( $params['lineId'] ) ? sanitize_text_field( $params['lineId'] ) : ( ! empty( $params['id'] ) ? sanitize_text_field( $params['id'] ) : '' ) );

    if ( ! $key ) {
        return new WP_Error( 'missing_key', 'Cart item key is required', array( 'status' => 400 ) );
    }

    WC()->cart->remove_cart_item( $key );

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_clear_cart( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    WC()->cart->empty_cart();

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_apply_coupon( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $code = ! empty( $params['code'] ) ? sanitize_text_field( $params['code'] ) : '';
    if ( ! $code ) {
        return new WP_Error( 'missing_code', 'Coupon code is required', array( 'status' => 400 ) );
    }

    $applied = WC()->cart->apply_coupon( $code );
    if ( ! $applied ) {
        $notices = wc_get_notices( 'error' );
        $err_msg = ! empty( $notices ) ? wp_strip_all_tags( $notices[0]['notice'] ) : 'Invalid coupon code';
        wc_clear_notices();
        return new WP_Error( 'coupon_error', $err_msg, array( 'status' => 400 ) );
    }

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_remove_coupon( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $code = ! empty( $params['code'] ) ? sanitize_text_field( $params['code'] ) : '';
    if ( $code ) {
        WC()->cart->remove_coupon( $code );
    }

    forgewp_save_wc_cart();

    return rest_ensure_response( forgewp_format_cart_response() );
}

function forgewp_rest_get_shipping_rates( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $country  = ! empty( $params['country'] ) ? sanitize_text_field( $params['country'] ) : ( WC()->customer ? WC()->customer->get_shipping_country() : 'US' );
    $state    = ! empty( $params['state'] ) ? sanitize_text_field( $params['state'] ) : ( WC()->customer ? WC()->customer->get_shipping_state() : '' );
    $city     = ! empty( $params['city'] ) ? sanitize_text_field( $params['city'] ) : ( WC()->customer ? WC()->customer->get_shipping_city() : '' );
    $postcode = ! empty( $params['postcode'] ) ? sanitize_text_field( $params['postcode'] ) : ( WC()->customer ? WC()->customer->get_shipping_postcode() : '' );

    if ( WC()->customer ) {
        WC()->customer->set_shipping_country( $country );
        WC()->customer->set_shipping_state( $state );
        WC()->customer->set_shipping_city( $city );
        WC()->customer->set_shipping_postcode( $postcode );
        WC()->customer->save();
    }

    WC()->shipping()->reset_shipping();
    WC()->cart->calculate_shipping();
    WC()->cart->calculate_totals();

    $packages = WC()->shipping()->get_packages();
    $rates_list = array();
    $chosen_method = WC()->session ? WC()->session->get( 'chosen_shipping_methods' ) : array();
    $chosen_id = ! empty( $chosen_method[0] ) ? $chosen_method[0] : '';

    if ( ! empty( $packages ) && is_array( $packages ) ) {
        foreach ( $packages as $i => $package ) {
            if ( ! empty( $package['rates'] ) ) {
                foreach ( $package['rates'] as $rate_id => $rate ) {
                    $rates_list[] = array(
                        'id'          => $rate->get_id(),
                        'method_id'   => $rate->get_method_id(),
                        'instance_id' => $rate->get_instance_id(),
                        'label'       => $rate->get_label(),
                        'title'       => $rate->get_label(),
                        'cost'        => floatval( $rate->get_cost() ),
                        'price'       => number_format( floatval( $rate->get_cost() ), 2, '.', '' ),
                        'selected'    => ( $chosen_id === $rate->get_id() ),
                    );
                }
            }
        }
    }

    if ( empty( $rates_list ) ) {
        $rates_list = array(
            array(
                'id'        => 'flat_rate',
                'method_id' => 'flat_rate',
                'label'     => 'Standard Flat Rate',
                'title'     => 'Standard Flat Rate',
                'cost'      => 10.00,
                'price'     => '10.00',
                'selected'  => true,
            ),
            array(
                'id'        => 'free_shipping',
                'method_id' => 'free_shipping',
                'label'     => 'Free Shipping (Over $100)',
                'title'     => 'Free Shipping',
                'cost'      => 0.00,
                'price'     => '0.00',
                'selected'  => false,
            ),
            array(
                'id'        => 'local_pickup',
                'method_id' => 'local_pickup',
                'label'     => 'Local Pickup',
                'title'     => 'Local Pickup',
                'cost'      => 0.00,
                'price'     => '0.00',
                'selected'  => false,
            ),
        );
    }

    return rest_ensure_response( array(
        'rates'        => $rates_list,
        'chosenMethod' => $chosen_id ?: $rates_list[0]['id'],
        'totals'       => forgewp_format_cart_response(),
    ) );
}

function forgewp_rest_get_checkout_gateways( $request ) {
    $gateways_list = array();

    if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
        $available = WC()->payment_gateways()->get_available_payment_gateways();
        if ( ! empty( $available ) ) {
            foreach ( $available as $id => $gateway ) {
                $gateways_list[] = array(
                    'id'          => $id,
                    'title'       => $gateway->get_title() ?: $gateway->get_method_title(),
                    'description' => $gateway->get_description(),
                    'icon'        => $gateway->get_icon(),
                    'supports'    => method_exists( $gateway, 'supports' ) ? array( 'products' ) : array(),
                );
            }
        }
    }

    if ( empty( $gateways_list ) ) {
        $gateways_list = array(
            array(
                'id'          => 'stripe',
                'title'       => 'Credit Card (Stripe)',
                'description' => 'Pay securely with your credit card.',
                'icon'        => '',
                'supports'    => array( 'products' ),
            ),
            array(
                'id'          => 'paypal',
                'title'       => 'PayPal',
                'description' => 'Pay securely using your PayPal balance or bank card.',
                'icon'        => '',
                'supports'    => array( 'products' ),
            ),
            array(
                'id'          => 'cod',
                'title'       => 'Cash on Delivery',
                'description' => 'Pay in cash upon delivery of your order.',
                'icon'        => '',
                'supports'    => array( 'products' ),
            ),
            array(
                'id'          => 'bacs',
                'title'       => 'Direct Bank Transfer',
                'description' => 'Make your payment directly into our bank account.',
                'icon'        => '',
                'supports'    => array( 'products' ),
            ),
        );
    }

    return rest_ensure_response( array(
        'gateways' => $gateways_list,
    ) );
}

function forgewp_rest_process_checkout( $request ) {
    if ( ! forgewp_ensure_wc_cart() ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $params = $request->get_json_params();
    if ( empty( $params ) ) {
        $params = $request->get_params();
    }

    $cart_contents = WC()->cart->get_cart();
    if ( empty( $cart_contents ) ) {
        return new WP_Error( 'cart_empty', 'Cannot checkout with an empty cart', array( 'status' => 400 ) );
    }

    $user_id = get_current_user_id();
    $billing  = ! empty( $params['billing_address'] ) && is_array( $params['billing_address'] ) ? $params['billing_address'] : ( ! empty( $params['billing'] ) && is_array( $params['billing'] ) ? $params['billing'] : array() );
    $shipping = ! empty( $params['shipping_address'] ) && is_array( $params['shipping_address'] ) ? $params['shipping_address'] : ( ! empty( $params['shipping'] ) && is_array( $params['shipping'] ) ? $params['shipping'] : $billing );
    $payment_method = ! empty( $params['payment_method'] ) ? sanitize_text_field( $params['payment_method'] ) : 'cod';
    $customer_note  = ! empty( $params['customer_note'] ) ? sanitize_textarea_field( $params['customer_note'] ) : '';

    $order = wc_create_order( array(
        'customer_id'   => $user_id,
        'customer_note' => $customer_note,
    ) );

    if ( is_wp_error( $order ) || ! $order ) {
        return new WP_Error( 'order_creation_failed', 'Failed to create order. Please try again.', array( 'status' => 500 ) );
    }

    foreach ( $cart_contents as $cart_item_key => $values ) {
        $item_id = $order->add_product(
            $values['data'],
            $values['quantity'],
            array(
                'variation' => ! empty( $values['variation'] ) ? $values['variation'] : array(),
                'subtotal'  => $values['line_subtotal'],
                'total'     => $values['line_total'],
            )
        );
    }

    $order->set_address( $billing, 'billing' );
    $order->set_address( $shipping, 'shipping' );
    $order->set_payment_method( $payment_method );

    // Apply applied coupons to order
    $applied_coupons = WC()->cart->get_applied_coupons();
    if ( ! empty( $applied_coupons ) ) {
        foreach ( $applied_coupons as $coupon_code ) {
            $order->apply_coupon( $coupon_code );
        }
    }

    $order->calculate_totals();
    $order->update_status( 'processing', 'Order placed via ForgeWP Headless API' );

    // Clear cart after successful order creation
    WC()->cart->empty_cart();
    forgewp_save_wc_cart();

    return rest_ensure_response( array(
        'success'     => true,
        'orderId'     => $order->get_id(),
        'orderKey'    => $order->get_order_key(),
        'orderNumber' => $order->get_order_number(),
        'status'      => $order->get_status(),
        'total'       => $order->get_total(),
        'currency'    => $order->get_currency(),
        'redirectUrl' => $order->get_checkout_order_received_url(),
    ) );
}

function forgewp_rest_get_customer_orders( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return rest_ensure_response( array(
            'orders' => array(),
            'total'  => 0,
        ) );
    }

    if ( ! function_exists( 'wc_get_orders' ) ) {
        return rest_ensure_response( array( 'orders' => array(), 'total' => 0 ) );
    }

    $customer_orders = wc_get_orders( array(
        'customer_id' => $user_id,
        'limit'       => 50,
        'orderby'     => 'date',
        'order'       => 'DESC',
    ) );

    $formatted_orders = array();
    foreach ( $customer_orders as $order ) {
        $items = array();
        foreach ( $order->get_items() as $item_id => $item ) {
            $product = $item->get_product();
            $image_url = '';
            if ( $product ) {
                $img_id = $product->get_image_id();
                if ( $img_id ) {
                    $image_url = wp_get_attachment_image_url( $img_id, 'medium' ) ?: wp_get_attachment_url( $img_id );
                }
                if ( ! $image_url ) {
                    $image_url = get_post_meta( $product->get_id(), '_forgewp_image', true );
                }
            }
            if ( ! $image_url ) {
                $image_url = wc_placeholder_img_src( 'medium' );
            }

            $items[] = array(
                'id'        => $item_id,
                'productId' => $item->get_product_id(),
                'title'     => $item->get_name(),
                'name'      => $item->get_name(),
                'qty'       => $item->get_quantity(),
                'quantity'  => $item->get_quantity(),
                'total'     => wc_price( $item->get_total(), array( 'currency' => $order->get_currency() ) ),
                'price'     => floatval( $item->get_total() ),
                'image'     => $image_url,
            );
        }

        $formatted_orders[] = array(
            'id'          => $order->get_id(),
            'orderNumber' => $order->get_order_number(),
            'date'        => $order->get_date_created() ? $order->get_date_created()->date_i18n( get_option( 'date_format' ) ) : '',
            'status'      => $order->get_status(),
            'total'       => wc_price( $order->get_total(), array( 'currency' => $order->get_currency() ) ),
            'totalAmount' => floatval( $order->get_total() ),
            'currency'    => $order->get_currency(),
            'itemsCount'  => $order->get_item_count(),
            'items'       => $items,
            'viewUrl'     => $order->get_view_order_url(),
        );
    }

    return rest_ensure_response( array(
        'orders' => $formatted_orders,
        'total'  => count( $formatted_orders ),
    ) );
}

function forgewp_rest_get_customer_order_detail( $request ) {
    $user_id = get_current_user_id();
    $order_id = intval( $request['id'] );

    if ( ! function_exists( 'wc_get_order' ) ) {
        return new WP_Error( 'wc_unavailable', 'WooCommerce is not available', array( 'status' => 503 ) );
    }

    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return new WP_Error( 'order_not_found', 'Order not found', array( 'status' => 404 ) );
    }

    if ( $order->get_customer_id() && intval( $order->get_customer_id() ) !== intval( $user_id ) && ! current_user_can( 'manage_woocommerce' ) ) {
        return new WP_Error( 'forbidden', 'You do not have permission to view this order', array( 'status' => 403 ) );
    }

    $items = array();
    foreach ( $order->get_items() as $item_id => $item ) {
        $product = $item->get_product();
        $image_url = '';
        if ( $product ) {
            $img_id = $product->get_image_id();
            if ( $img_id ) {
                $image_url = wp_get_attachment_image_url( $img_id, 'medium' ) ?: wp_get_attachment_url( $img_id );
            }
            if ( ! $image_url ) {
                $image_url = get_post_meta( $product->get_id(), '_forgewp_image', true );
            }
        }
        if ( ! $image_url ) {
            $image_url = wc_placeholder_img_src( 'medium' );
        }

        $items[] = array(
            'id'        => $item_id,
            'productId' => $item->get_product_id(),
            'name'      => $item->get_name(),
            'quantity'  => $item->get_quantity(),
            'subtotal'  => floatval( $item->get_subtotal() ),
            'total'     => floatval( $item->get_total() ),
            'image'     => $image_url,
        );
    }

    return rest_ensure_response( array(
        'id'          => $order->get_id(),
        'orderNumber' => $order->get_order_number(),
        'date'        => $order->get_date_created() ? $order->get_date_created()->date_i18n( get_option( 'date_format' ) ) : '',
        'status'      => $order->get_status(),
        'total'       => floatval( $order->get_total() ),
        'subtotal'    => floatval( $order->get_subtotal() ),
        'tax'         => floatval( $order->get_total_tax() ),
        'shipping'    => floatval( $order->get_shipping_total() ),
        'discount'    => floatval( $order->get_discount_total() ),
        'currency'    => $order->get_currency(),
        'items'       => $items,
        'billing'     => $order->get_address( 'billing' ),
        'shipping'    => $order->get_address( 'shipping' ),
    ) );
}

function forgewp_rest_get_customer_downloads( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id || ! function_exists( 'wc_get_customer_available_downloads' ) ) {
        return rest_ensure_response( array( 'downloads' => array() ) );
    }

    $raw_downloads = wc_get_customer_available_downloads( $user_id );
    $downloads = array();

    foreach ( $raw_downloads as $dl ) {
        $downloads[] = array(
            'id'                 => ! empty( $dl['download_id'] ) ? $dl['download_id'] : ( ! empty( $dl['id'] ) ? $dl['id'] : '' ),
            'name'               => ! empty( $dl['download_name'] ) ? $dl['download_name'] : ( ! empty( $dl['product_name'] ) ? $dl['product_name'] : 'Download' ),
            'productName'        => ! empty( $dl['product_name'] ) ? $dl['product_name'] : '',
            'url'                => ! empty( $dl['download_url'] ) ? $dl['download_url'] : '',
            'downloadsRemaining' => isset( $dl['downloads_remaining'] ) ? $dl['downloads_remaining'] : 'Unlimited',
            'accessExpires'      => ! empty( $dl['access_expires'] ) ? $dl['access_expires'] : 'Never',
        );
    }

    return rest_ensure_response( array(
        'downloads' => $downloads,
    ) );
}

function forgewp_rest_get_wishlist( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return rest_ensure_response( array( 'wishlist' => array() ) );
    }

    $saved = get_user_meta( $user_id, '_forgewp_wishlist', true );
    $wishlist = ( is_array( $saved ) ) ? array_values( array_map( 'intval', $saved ) ) : array();

    return rest_ensure_response( array(
        'wishlist' => $wishlist,
    ) );
}

function forgewp_rest_toggle_wishlist( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'User must be logged in to sync wishlist', array( 'status' => 401 ) );
    }

    $params = $request->get_json_params() ?: $request->get_params();
    $product_id = intval( ! empty( $params['id'] ) ? $params['id'] : ( ! empty( $params['productId'] ) ? $params['productId'] : 0 ) );

    if ( ! $product_id ) {
        return new WP_Error( 'missing_id', 'Product ID is required', array( 'status' => 400 ) );
    }

    $saved = get_user_meta( $user_id, '_forgewp_wishlist', true );
    $wishlist = is_array( $saved ) ? array_map( 'intval', $saved ) : array();

    if ( in_array( $product_id, $wishlist, true ) ) {
        $wishlist = array_values( array_diff( $wishlist, array( $product_id ) ) );
        $is_wishlisted = false;
    } else {
        $wishlist[] = $product_id;
        $is_wishlisted = true;
    }

    update_user_meta( $user_id, '_forgewp_wishlist', $wishlist );

    return rest_ensure_response( array(
        'success'      => true,
        'isWishlisted' => $is_wishlisted,
        'wishlist'     => $wishlist,
    ) );
}

function forgewp_rest_sync_wishlist( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'User must be logged in to sync wishlist', array( 'status' => 401 ) );
    }

    $params = $request->get_json_params() ?: $request->get_params();
    $items = ! empty( $params['items'] ) && is_array( $params['items'] ) ? array_map( 'intval', $params['items'] ) : array();

    $saved = get_user_meta( $user_id, '_forgewp_wishlist', true );
    $existing = is_array( $saved ) ? array_map( 'intval', $saved ) : array();

    $merged = array_values( array_unique( array_merge( $existing, $items ) ) );
    update_user_meta( $user_id, '_forgewp_wishlist', $merged );

    return rest_ensure_response( array(
        'success'  => true,
        'wishlist' => $merged,
    ) );
}

function forgewp_rest_query_products( $request ) {
    $params = $request->get_params();

    $page     = max( 1, intval( ! empty( $params['page'] ) ? $params['page'] : 1 ) );
    $per_page = min( 100, max( 1, intval( ! empty( $params['per_page'] ) ? $params['per_page'] : 12 ) ) );
    $search   = ! empty( $params['s'] ) ? sanitize_text_field( $params['s'] ) : ( ! empty( $params['search'] ) ? sanitize_text_field( $params['search'] ) : '' );
    $category = ! empty( $params['category'] ) ? sanitize_text_field( $params['category'] ) : ( ! empty( $params['product_cat'] ) ? sanitize_text_field( $params['product_cat'] ) : '' );
    $tag      = ! empty( $params['tag'] ) ? sanitize_text_field( $params['tag'] ) : ( ! empty( $params['product_tag'] ) ? sanitize_text_field( $params['product_tag'] ) : '' );
    $sort_by  = ! empty( $params['orderby'] ) ? sanitize_text_field( $params['orderby'] ) : 'date';

    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'paged'          => $page,
        'posts_per_page' => $per_page,
    );

    if ( ! empty( $search ) ) {
        $args['s'] = $search;
    }

    $tax_queries = array();
    if ( ! empty( $category ) ) {
        $tax_queries[] = array(
            'taxonomy' => 'product_cat',
            'field'    => is_numeric( $category ) ? 'term_id' : 'slug',
            'terms'    => is_numeric( $category ) ? intval( $category ) : $category,
        );
    }
    if ( ! empty( $tag ) ) {
        $tax_queries[] = array(
            'taxonomy' => 'product_tag',
            'field'    => is_numeric( $tag ) ? 'term_id' : 'slug',
            'terms'    => is_numeric( $tag ) ? intval( $tag ) : $tag,
        );
    }
    if ( ! empty( $tax_queries ) ) {
        $tax_queries['relation'] = 'AND';
        $args['tax_query'] = $tax_queries;
    }

    $meta_queries = array();
    if ( isset( $params['min_price'] ) && is_numeric( $params['min_price'] ) ) {
        $meta_queries[] = array(
            'key'     => '_price',
            'value'   => floatval( $params['min_price'] ),
            'compare' => '>=',
            'type'    => 'NUMERIC',
        );
    }
    if ( isset( $params['max_price'] ) && is_numeric( $params['max_price'] ) ) {
        $meta_queries[] = array(
            'key'     => '_price',
            'value'   => floatval( $params['max_price'] ),
            'compare' => '<=',
            'type'    => 'NUMERIC',
        );
    }
    if ( ! empty( $meta_queries ) ) {
        $meta_queries['relation'] = 'AND';
        $args['meta_query'] = $meta_queries;
    }

    switch ( $sort_by ) {
        case 'price':
            $args['orderby']  = 'meta_value_num';
            $args['meta_key'] = '_price';
            $args['order']    = 'ASC';
            break;
        case 'price-desc':
            $args['orderby']  = 'meta_value_num';
            $args['meta_key'] = '_price';
            $args['order']    = 'DESC';
            break;
        case 'popularity':
            $args['orderby']  = 'meta_value_num';
            $args['meta_key'] = 'total_sales';
            $args['order']    = 'DESC';
            break;
        case 'rating':
            $args['orderby']  = 'meta_value_num';
            $args['meta_key'] = '_wc_average_rating';
            $args['order']    = 'DESC';
            break;
        case 'title':
            $args['orderby'] = 'title';
            $args['order']   = 'ASC';
            break;
        default:
            $args['orderby'] = 'date';
            $args['order']   = 'DESC';
            break;
    }

    $query = new WP_Query( $args );
    $products = array();

    if ( $query->have_posts() ) {
        while ( $query->have_posts() ) {
            $query->the_post();
            $prod_id = get_the_ID();
            $product = function_exists( 'wc_get_product' ) ? wc_get_product( $prod_id ) : null;

            $image_url = '';
            $images_list = array();
            if ( $product ) {
                $img_id = $product->get_image_id();
                if ( $img_id ) {
                    $image_url = wp_get_attachment_image_url( $img_id, 'full' ) ?: wp_get_attachment_url( $img_id );
                }
                $gallery_ids = $product->get_gallery_image_ids();
                if ( ! empty( $gallery_ids ) && is_array( $gallery_ids ) ) {
                    foreach ( $gallery_ids as $g_id ) {
                        $g_url = wp_get_attachment_image_url( $g_id, 'full' ) ?: wp_get_attachment_url( $g_id );
                        if ( $g_url && ! in_array( $g_url, $images_list, true ) ) {
                            $images_list[] = $g_url;
                        }
                    }
                }
            }
            if ( ! $image_url ) {
                $thumb_id = get_post_thumbnail_id( $prod_id );
                if ( $thumb_id ) {
                    $image_url = wp_get_attachment_image_url( $thumb_id, 'full' ) ?: wp_get_attachment_url( $thumb_id );
                }
            }
            if ( ! $image_url ) {
                $image_url = get_post_meta( $prod_id, '_forgewp_image', true );
            }
            if ( ! $image_url ) {
                $meta_images = get_post_meta( $prod_id, '_forgewp_images', true );
                if ( is_array( $meta_images ) && ! empty( $meta_images[0] ) ) {
                    $image_url = is_string( $meta_images[0] ) ? $meta_images[0] : ( ! empty( $meta_images[0]['src'] ) ? $meta_images[0]['src'] : ( ! empty( $meta_images[0]['url'] ) ? $meta_images[0]['url'] : '' ) );
                }
            }

            if ( $image_url && ! in_array( $image_url, $images_list, true ) ) {
                array_unshift( $images_list, $image_url );
            }

            $meta_images = get_post_meta( $prod_id, '_forgewp_images', true );
            if ( is_array( $meta_images ) ) {
                foreach ( $meta_images as $m_img ) {
                    $m_url = is_string( $m_img ) ? $m_img : ( ! empty( $m_img['src'] ) ? $m_img['src'] : ( ! empty( $m_img['url'] ) ? $m_img['url'] : '' ) );
                    if ( ! empty( $m_url ) && ! in_array( $m_url, $images_list, true ) ) {
                        $images_list[] = $m_url;
                    }
                }
            }

            $cat_terms = get_the_terms( $prod_id, 'product_cat' );
            $cat_name = ( ! empty( $cat_terms ) && ! is_wp_error( $cat_terms ) ) ? $cat_terms[0]->name : 'Furniture';

            $price = $product ? floatval( $product->get_price() ) : floatval( get_post_meta( $prod_id, '_price', true ) );
            $reg_price = $product ? floatval( $product->get_regular_price() ) : floatval( get_post_meta( $prod_id, '_regular_price', true ) );

            $products[] = array(
                'id'            => $prod_id,
                'name'          => get_the_title(),
                'title'         => get_the_title(),
                'slug'          => get_post_field( 'post_name', $prod_id ),
                'category'      => $cat_name,
                'price'         => $price,
                'regular_price' => $reg_price,
                'on_sale'       => $product ? $product->is_on_sale() : ( $reg_price > $price ),
                'featuredImage' => $image_url,
                'image'         => $image_url,
                'images'        => $images_list,
                'stock_status'  => $product ? $product->get_stock_status() : 'instock',
                'average_rating'=> $product ? $product->get_average_rating() : '5.0',
                'rating_count'  => $product ? $product->get_rating_count() : 0,
            );
        }
        wp_reset_postdata();
    }

    return rest_ensure_response( array(
        'products'   => $products,
        'total'      => intval( $query->found_posts ),
        'totalPages' => intval( $query->max_num_pages ),
        'page'       => $page,
    ) );
}

function forgewp_rest_update_customer_profile( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'User must be logged in to update profile', array( 'status' => 401 ) );
    }

    $params = $request->get_json_params() ?: $request->get_params();

    $user_data = array( 'ID' => $user_id );

    if ( ! empty( $params['firstName'] ) ) {
        $first_name = sanitize_text_field( $params['firstName'] );
        $user_data['first_name'] = $first_name;
        update_user_meta( $user_id, 'billing_first_name', $first_name );
        update_user_meta( $user_id, 'shipping_first_name', $first_name );
    }
    if ( ! empty( $params['lastName'] ) ) {
        $last_name = sanitize_text_field( $params['lastName'] );
        $user_data['last_name'] = $last_name;
        update_user_meta( $user_id, 'billing_last_name', $last_name );
        update_user_meta( $user_id, 'shipping_last_name', $last_name );
    }
    if ( ! empty( $params['email'] ) && is_email( $params['email'] ) ) {
        $user_data['user_email'] = sanitize_email( $params['email'] );
        update_user_meta( $user_id, 'billing_email', $user_data['user_email'] );
    }
    if ( isset( $params['phone'] ) ) {
        $phone = sanitize_text_field( $params['phone'] );
        update_user_meta( $user_id, 'billing_phone', $phone );
    }

    if ( ! empty( $params['newPassword'] ) ) {
        $current_password = ! empty( $params['currentPassword'] ) ? $params['currentPassword'] : '';
        $user_obj = get_user_by( 'id', $user_id );
        if ( ! $user_obj || ! wp_check_password( $current_password, $user_obj->user_pass, $user_id ) ) {
            return new WP_Error( 'invalid_password', 'Current password is incorrect.', array( 'status' => 400 ) );
        }
        $user_data['user_pass'] = $params['newPassword'];
    }

    $updated = wp_update_user( $user_data );
    if ( is_wp_error( $updated ) ) {
        return new WP_Error( 'update_failed', $updated->get_error_message(), array( 'status' => 400 ) );
    }

    $payload = forgewp_get_current_user_hydration_payload();

    return rest_ensure_response( array(
        'success' => true,
        'message' => 'Profile updated successfully.',
        'user'    => $payload,
    ) );
}

function forgewp_rest_update_customer_address( $request ) {
    $user_id = get_current_user_id();
    if ( ! $user_id && function_exists( 'forgewp_validate_jwt_token' ) ) {
        $auth_header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if ( $auth_header && preg_match( '/Bearer\s+(\S+)/i', $auth_header, $matches ) ) {
            $user_id = forgewp_validate_jwt_token( $matches[1] );
        }
    }

    if ( ! $user_id ) {
        return new WP_Error( 'unauthorized', 'User must be logged in to update address', array( 'status' => 401 ) );
    }

    $params = $request->get_json_params() ?: $request->get_params();

    $name = ! empty( $params['name'] ) ? sanitize_text_field( $params['name'] ) : '';
    $street = ! empty( $params['street'] ) ? sanitize_text_field( $params['street'] ) : '';
    $city = ! empty( $params['city'] ) ? sanitize_text_field( $params['city'] ) : '';
    $postal_code = ! empty( $params['postalCode'] ) ? sanitize_text_field( $params['postalCode'] ) : '';
    $country = ! empty( $params['country'] ) ? sanitize_text_field( $params['country'] ) : 'US';
    $phone = ! empty( $params['phone'] ) ? sanitize_text_field( $params['phone'] ) : '';

    $name_parts = explode( ' ', $name, 2 );
    $first_name = $name_parts[0] ?? '';
    $last_name = $name_parts[1] ?? '';

    // Update shipping fields
    update_user_meta( $user_id, 'shipping_first_name', $first_name );
    update_user_meta( $user_id, 'shipping_last_name', $last_name );
    update_user_meta( $user_id, 'shipping_address_1', $street );
    update_user_meta( $user_id, 'shipping_city', $city );
    update_user_meta( $user_id, 'shipping_postcode', $postal_code );
    update_user_meta( $user_id, 'shipping_country', $country );
    update_user_meta( $user_id, 'shipping_phone', $phone );

    // Also update billing fields for convenience
    update_user_meta( $user_id, 'billing_first_name', $first_name );
    update_user_meta( $user_id, 'billing_last_name', $last_name );
    update_user_meta( $user_id, 'billing_address_1', $street );
    update_user_meta( $user_id, 'billing_city', $city );
    update_user_meta( $user_id, 'billing_postcode', $postal_code );
    update_user_meta( $user_id, 'billing_country', $country );
    if ( ! empty( $phone ) ) {
        update_user_meta( $user_id, 'billing_phone', $phone );
    }

    $payload = forgewp_get_current_user_hydration_payload();

    return rest_ensure_response( array(
        'success' => true,
        'message' => 'Address saved successfully.',
        'user'    => $payload,
    ) );
}

`;
  }

  return `
${queryEndpointsPhp}
${authControllersPhp}
`;
}

