<?php
// Isolated hook tests with WordPress formatting stand-ins; no database or emails.
function add_filter($hook, $callback, $priority, $args) {
    if ($hook !== 'em_booking_output_placeholder' || $args !== 4) throw new RuntimeException('Unexpected hook registration');
}
function sanitize_text_field($value) { return trim(strip_tags($value)); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
require dirname(__DIR__) . '/src/server/event-booking-email-fields.php';
$event = new class {
    public $html = false;
    function get_option($name) { return $this->html; }
};
$booking = new class($event) {
    public $booking_meta = array('hospitality_company' => 'Müller & Partner', 'hospitality_job_title' => 'Leitung');
    private $event;
    function __construct($event) { $this->event = $event; }
    function get_event() { return $this->event; }
};
function check_email_field($actual, $expected, $label) {
    if ($actual !== $expected) throw new RuntimeException($label);
    echo "PASS: $label\n";
}
check_email_field(hospitality_booking_email_field('', $booking, '#_HOSPITALITYCOMPANY', 'email'), 'Müller & Partner', 'Plain email preserves German characters and ampersand');
check_email_field(hospitality_booking_email_field('', $booking, '#_HOSPITALITYJOBTITLE', 'email'), 'Leitung', 'Job title mapping');
$event->html = true;
check_email_field(hospitality_booking_email_field('', $booking, '#_HOSPITALITYCOMPANY', 'email'), 'Müller &amp; Partner', 'HTML emails escape content');
check_email_field(hospitality_booking_email_field('unchanged', $booking, '#_BOOKINGNAME', 'email'), 'unchanged', 'Core placeholders unaffected');
$booking->booking_meta = array();
check_email_field(hospitality_booking_email_field('', $booking, '#_HOSPITALITYJOBTITLE', 'email'), 'Nicht angegeben', 'Missing legacy/optional data fallback');
$booking->booking_meta['hospitality_company'] = array('invalid');
check_email_field(hospitality_booking_email_field('', $booking, '#_HOSPITALITYCOMPANY', 'html'), 'Nicht angegeben', 'Malformed stored values handled');
