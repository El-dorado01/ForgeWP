<?php
// Local integration check: php -d mysqli.default_port=PORT tests/event-booking-fields.php WP_ROOT
// Writes are rolled back and booking emails are disabled.
define('WP_USE_THEMES', false);
require rtrim($argv[1], '/\\') . '/wp-load.php';
if (wp_parse_url(home_url(), PHP_URL_HOST) !== 'hospitality-2035.local') {
    throw new RuntimeException('Run only on the Hospitality local test site.');
}
if (!function_exists('hospitality_booking_field_labels')) require dirname(__DIR__) . '/src/server/event-booking-fields.php';
if (!function_exists('hospitality_booking_email_field')) require dirname(__DIR__) . '/src/server/event-booking-email-fields.php';
function check_booking_field($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: $message\n";
}
global $wpdb;
$admin = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
wp_set_current_user($admin[0]);
$events = EM_Events::get(array('scope' => 'future', 'limit' => 20));
$event = null;
foreach ($events as $candidate) {
    if ($candidate->event_rsvp && $candidate->get_bookings()->get_available_spaces() > 0) { $event = $candidate; break; }
}
check_booking_field((bool) $event, 'Local bookable event available');
$ticket = $event->get_tickets()->get_first();
$_POST = array('event_id' => $event->event_id, 'em_tickets' => array($ticket->ticket_id => array('spaces' => 1)), 'hospitality_company' => 'Testunternehmen Müller & Partner', 'hospitality_job_title' => 'Leitung <script>bad</script>');
$_REQUEST = $_POST;
$wpdb->query('START TRANSACTION');
try {
    $booking = new EM_Booking();
    $booking->person_id = $admin[0];
    check_booking_field($booking->get_post(), 'Valid fields accepted by Events Manager get_post');
    check_booking_field($booking->booking_meta['hospitality_company'] === $_POST['hospitality_company'], 'German company text retained');
    check_booking_field(strpos($booking->booking_meta['hospitality_job_title'], '<') === false, 'Markup sanitized');
    check_booking_field($booking->save(false), 'Booking and native metadata saved without sending email');
    $saved = new EM_Booking($booking->booking_id);
    check_booking_field($saved->booking_meta['hospitality_company'] === $_POST['hospitality_company'], 'Company reloaded from database');
    check_booking_field($saved->booking_meta['hospitality_job_title'] === 'Leitung', 'Job title reloaded from database');
    $template = 'Unternehmen: #_HOSPITALITYCOMPANY | Funktion: #_HOSPITALITYJOBTITLE';
    check_booking_field($saved->output($template, 'raw') === 'Unternehmen: Testunternehmen Müller & Partner | Funktion: Leitung', 'Native booking output expands saved email fields');
    check_booking_field(strpos($saved->output($template, 'html'), 'Müller &amp; Partner') !== false, 'HTML placeholder output escaped');
    $job_title = $saved->booking_meta['hospitality_job_title'];
    $saved->booking_meta['hospitality_job_title'] = '';
    check_booking_field($saved->output('#_HOSPITALITYJOBTITLE', 'email') === 'Nicht angegeben', 'Empty optional field has readable email fallback');
    $saved->booking_meta['hospitality_job_title'] = $job_title;
    check_booking_field(hospitality_booking_email_field('unchanged', $saved, '#_BOOKINGNAME', 'email') === 'unchanged', 'Other placeholders unaffected');
    $table = new EM_Bookings_Table();
    $columns = apply_filters('em_bookings_table_cols_bookings_template', array());
    check_booking_field(isset($columns['hospitality_company'], $columns['hospitality_job_title']), 'Both columns registered for list/export selection');
    $table->cols = array_keys(hospitality_booking_field_labels());
    $row = $table->get_row_csv($saved);
    check_booking_field($row[0]['hospitality_company'] === $_POST['hospitality_company'] && $row[0]['hospitality_job_title'] === 'Leitung', 'Native Events Manager CSV row contains both saved fields');
    ob_start(); do_action('em_bookings_single_details_footer', $saved); $details = ob_get_clean();
    check_booking_field(strpos($details, 'Testunternehmen Müller &amp; Partner') !== false, 'Saved company displayed on booking detail page');
    $html = apply_filters('em_bookings_table_rows_col_hospitality_company', '', $saved, $table, 'html');
    check_booking_field(strpos($html, '&amp;') !== false, 'Admin table output escaped');
    $saved->booking_meta['hospitality_company'] = '=1+1';
    check_booking_field(apply_filters('em_bookings_table_rows_col_hospitality_company', '', $saved, $table, 'csv') === "'=1+1", 'CSV formula injection blocked');
    $_POST['hospitality_company'] = '';
    $_POST['hospitality_job_title'] = '';
    $_REQUEST = $_POST;
    $missing = new EM_Booking();
    $missing->person_id = $admin[0];
    check_booking_field(!$missing->get_post(), 'Missing company rejected server-side');
    $_POST['hospitality_company'] = 'Valid company';
    $_REQUEST = $_POST;
    $optional = new EM_Booking();
    $optional->person_id = $admin[0];
    check_booking_field($optional->get_post(), 'Empty optional job title accepted');
    $_POST['hospitality_company'] = str_repeat('ä', 201);
    $_REQUEST = $_POST;
    check_booking_field(!apply_filters('em_booking_get_post', true, new EM_Booking()), 'Overlong Unicode input rejected');
    $before = $saved->booking_meta;
    apply_filters('em_booking_get_post', true, $saved);
    foreach (array_keys(hospitality_booking_field_labels()) as $key) {
        check_booking_field($saved->booking_meta[$key] === $before[$key], 'Existing ' . $key . ' survives subsequent edits');
    }
    ob_start(); hospitality_booking_fields_render(); $form = ob_get_clean();
    check_booking_field(substr_count($form, 'name="hospitality_company"') === 1 && substr_count($form, 'name="hospitality_job_title"') === 1, 'Both inputs rendered');
    wp_set_current_user(0);
    ob_start(); do_action('em_register_form'); $guest = ob_get_clean();
    check_booking_field(substr_count($guest, 'name="hospitality_company"') === 1, 'Guest registration hook renders company once');
    wp_set_current_user($admin[0]);
    ob_start(); do_action('em_booking_form_header', $event, $optional); $logged_in = ob_get_clean();
    check_booking_field(substr_count($logged_in, 'name="hospitality_company"') === 1 && strpos($logged_in, '<section') !== false, 'Logged-in hook renders fields inside a section hidden on success');
} finally {
    $wpdb->query('ROLLBACK');
    if (isset($booking->booking_id)) check_booking_field(!$wpdb->get_var($wpdb->prepare('SELECT booking_id FROM ' . EM_BOOKINGS_TABLE . ' WHERE booking_id=%d', $booking->booking_id)), 'Test booking rolled back');
}
