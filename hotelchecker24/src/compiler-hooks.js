/**
 * Project-specific compiler hooks for Hotelchecker24.
 * This separates project-specific HTML replacements from the generic ForgeWP framework compiler.
 */

function processTemplateMarkup(slug, html, config) {
  return html;
}

function processFunctionsPhp(php, config) {
  const mailpoetCode = `
/**
 * Custom REST API Endpoint for MailPoet subscriber integration.
 * Enables subscribing users to MailPoet list via POST /wp-json/mailpoet/v1/subscribers
 */
function forgewp_mailpoet_rest_subscribe_init() {
    register_rest_route('mailpoet/v1', '/subscribers', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_mailpoet_rest_subscribe_callback',
        'permission_callback' => '__return_true', // Open endpoint
    ));
}
add_action('rest_api_init', 'forgewp_mailpoet_rest_subscribe_init');

function forgewp_mailpoet_rest_subscribe_callback($request) {
    $params = $request->get_json_params();
    if (empty($params)) {
        $params = $request->get_body_params();
    }
    
    $email = isset($params['email']) ? sanitize_email($params['email']) : '';
    if (empty($email)) {
        return new WP_Error('invalid_email', 'Please provide a valid email address.', array('status' => 400));
    }

    if (!class_exists('\\MailPoet\\API\\API')) {
        // MailPoet is not active, return success in mock mode or error
        return new WP_REST_Response(array('status' => 'mock_success', 'message' => 'MailPoet is not active, simulated success.'), 200);
    }

    try {
        $mailpoet_api = \\MailPoet\\API\\API::MP('v1');
        
        // Find default or first subscription list ID
        $lists = $mailpoet_api->getLists();
        $list_ids = array();
        if (!empty($lists)) {
            $list_ids[] = $lists[0]['id'];
        } else {
            $list_ids[] = 1; // Fallback to list ID 1
        }
        
        $subscriber_data = array('email' => $email);
        
        // Add subscriber (checks duplicate automatically)
        $mailpoet_api->addSubscriber($subscriber_data, $list_ids);
        return new WP_REST_Response(array('status' => 'subscribed', 'email' => $email), 200);
    } catch (\\Exception $e) {
        return new WP_Error('mailpoet_error', $e->getMessage(), array('status' => 400));
    }
}

/**
 * Enqueue Favicon dynamically in WordPress head.
 */
function forgewp_add_favicon() {
    echo '<link rel="icon" type="image/svg+xml" href="' . get_template_directory_uri() . '/Logo/hotelchecker24-logo_farbe.svg">';
}
add_action('wp_head', 'forgewp_add_favicon');
`;
  return php + mailpoetCode;
}

export { processTemplateMarkup, processFunctionsPhp };
