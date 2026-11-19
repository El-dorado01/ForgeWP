<?php
/** Email/template placeholders for the custom, per-booking attendee fields. */
function hospitality_booking_email_field($replacement, $booking, $placeholder, $target) {
    $fields = array(
        '#_HOSPITALITYCOMPANY' => 'hospitality_company',
        '#_HOSPITALITYJOBTITLE' => 'hospitality_job_title',
    );
    if (!isset($fields[$placeholder])) return $replacement;

    $value = $booking->booking_meta[$fields[$placeholder]] ?? '';
    $value = is_string($value) ? sanitize_text_field($value) : '';
    if ($value === '') $value = 'Nicht angegeben';

    // Booking emails use the email target even when HTML email is enabled.
    $html = $target === 'html' || ($target === 'email' && $booking->get_event()->get_option('dbem_smtp_html'));
    return $html ? esc_html($value) : $value;
}
add_filter('em_booking_output_placeholder', 'hospitality_booking_email_field', 20, 4);
