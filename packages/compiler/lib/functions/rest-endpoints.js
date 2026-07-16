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

    return array(
        'id'            => $user->ID,
        'username'      => $user->user_login,
        'email'         => $user->user_email,
        'displayName'   => $user->display_name,
        'roles'         => array_values( $user->roles ),
        'avatarUrl'     => get_avatar_url( $user->ID ),
        'capabilities'  => $capabilities,
        'emailVerified' => $email_verified,
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

function forgewp_get_frontend_origin() {
    $origin = 'http://localhost:3000';
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
    $credential = isset( $params['credential'] ) ? sanitize_text_field( $params['credential'] ) : '';
    $password = isset( $params['password'] ) ? $params['password'] : '';

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

    return rest_ensure_response( array(
        'success' => true,
        'user'    => forgewp_get_current_user_hydration_payload(),
    ) );
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
        return rest_ensure_response( array(
            'success' => true,
            'user'    => forgewp_get_current_user_hydration_payload(),
        ) );
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
    if ( $saved_id === false || intval( $saved_id ) !== $user_id ) {
        return new WP_Error( 'rest_invalid_token', 'Invalid or expired verification token.', array( 'status' => 400 ) );
    }

    delete_transient( 'forgewp_verify_email_' . $token );
    update_user_meta( $user_id, 'forgewp_email_verified', '1' );

    return rest_ensure_response( array( 'success' => true ) );
}

function forgewp_rest_resend_verification( $request ) {
    $params = $request->get_json_params();
    $email = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) ) {
        return new WP_Error( 'rest_missing_fields', 'Email is required.', array( 'status' => 400 ) );
    }

    $user = get_user_by( 'email', $email );
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
        return;
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

    wp_mail( $email, $subject, $body );
}

function forgewp_rest_lost_password( $request ) {
    $params = $request->get_json_params();
    $user_login = isset( $params['user_login'] ) ? sanitize_text_field( $params['user_login'] ) : '';

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
    </script>
    <?php
}
add_action('wp_head', 'forgewp_auth_head_hydration', 1);
`;
  }

  return `
${queryEndpointsPhp}
${authControllersPhp}
`;
}
