<?php
/** Additional booking data for Hospitality 2035 (Events Manager Free).
 * Stored in native booking_meta; no plugin files or database schema are changed.
 */

function hospitality_booking_field_labels() {
    return array('hospitality_company' => 'Unternehmen', 'hospitality_job_title' => 'Funktion');
}

function hospitality_booking_fields_render() {
    echo '<input type="hidden" name="hospitality_booking_fields" value="1">';
    foreach (hospitality_booking_field_labels() as $key => $label) {
        $value = isset($_POST[$key]) && is_string($_POST[$key]) ? sanitize_text_field(wp_unslash($_POST[$key])) : '';
        $required = $key === 'hospitality_company';
        printf(
            '<p><label for="%1$s">%2$s%3$s</label><input type="text" id="%1$s" name="%1$s" class="input" maxlength="200" value="%4$s"%5$s autocomplete="%6$s"></p>',
            esc_attr($key), esc_html($label), $required ? ' *' : ' (optional)', esc_attr($value),
            $required ? ' required aria-required="true"' : '', $required ? 'organization' : 'organization-title'
        );
    }
}
add_action('em_register_form', 'hospitality_booking_fields_render');
// Registered attendees bypass em_register_form but still need booking-specific fields.
add_action('em_booking_form_header', function () {
    if (is_user_logged_in()) {
        echo '<section class="em-booking-form-section-details"><div class="em-booking-form-details em-booking-section">';
        hospitality_booking_fields_render();
        echo '</div></section>';
    }
});

add_filter('em_booking_get_post', function ($valid, $booking) {
    // Status changes and edits to old bookings must not erase their saved data.
    if (!empty($booking->booking_id) || is_admin() && !wp_doing_ajax()) return $valid;
    foreach (hospitality_booking_field_labels() as $key => $label) {
        $raw = $_POST[$key] ?? '';
        $value = is_string($raw) ? sanitize_text_field(wp_unslash($raw)) : '';
        if (preg_match_all('/./us', $value) > 200 || ($key === 'hospitality_company' && $value === '')) {
            $booking->add_error($key === 'hospitality_company' ? 'Bitte geben Sie Ihr Unternehmen an (maximal 200 Zeichen).' : 'Bitte kürzen Sie die Angabe zur Funktion.');
            $valid = false;
        }
        $booking->booking_meta[$key] = $value;
    }
    return $valid;
}, 20, 2);

add_action('em_bookings_single_details_footer', function ($booking) {
    foreach (hospitality_booking_field_labels() as $key => $label) {
        printf('<p><strong>%s:</strong> %s</p>', esc_html($label), esc_html($booking->booking_meta[$key] ?? '—'));
    }
});

add_filter('em_bookings_table_cols_bookings_template', function ($columns) {
    return array_merge($columns, hospitality_booking_field_labels());
});

foreach (array_keys(hospitality_booking_field_labels()) as $hospitality_field_key) {
    add_filter('em_bookings_table_rows_col_' . $hospitality_field_key, function ($value, $item, $table, $format) use ($hospitality_field_key) {
        $objects = $table->get_item_objects($item);
        $booking = $objects['EM_Booking'] ?? null;
        $value = $booking ? (string) ($booking->booking_meta[$hospitality_field_key] ?? '') : '';
        if (in_array($format, array('csv', 'xls', 'xlsx'), true)) {
            // Prevent spreadsheet formulas from attendee-controlled text.
            return preg_match('/^[\s]*[=+@\-]/u', $value) ? "'" . $value : $value;
        }
        return esc_html($value);
    }, 20, 4);
}
unset($hospitality_field_key);
