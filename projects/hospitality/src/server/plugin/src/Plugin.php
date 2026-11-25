<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

defined('ABSPATH') || exit;

use RuntimeException;
use Throwable;

final class Plugin
{
    public static function settings(): array {
        return array_replace([
            'enabled' => false, 'allow_live' => false, 'preview' => true,
            'product_id' => 0, 'master' => '', 'position' => 'before', 'margin_mm' => 22,
            'title' => 'Hospitality 2035 – Lizenznachweis',
            'type' => 'Einzellizenz – vorläufiger Mustertext',
            'scope' => 'Vorläufiges Muster. Der verbindliche Lizenzumfang wird von DICON bereitgestellt.',
            'notification_to' => 'contact@dicon-beratung.de',
            'notification_subject' => 'Hospitality 2035 – Lizenz erstellt',
            'notification_body' => "Eine personalisierte Studie wurde bereitgestellt.\nBestellung: {order_number}\nLizenz: {license_number}\n",
            'invoice_enabled' => false, 'invoice_seller_confirmed' => false,
            'invoice_seller_name' => '', 'invoice_seller_address' => '', 'invoice_seller_tax' => '',
            'invoice_seller_footer' => '', 'invoice_prefix' => 'H2035-RE',
        ], (array) get_option('h2035_settings', []));
    }

    public static function boot(): void {
        add_action('admin_init', static function () {
            if (current_user_can('manage_options') && (int) get_option('h2035_schema') !== 2) Store::install();
        });
        Admin::boot();
        add_action('wp_enqueue_scripts', static function () {
            $file = FORGEWP_COMPANION_HOSPITALITY_DIR . 'assets/receipt.css';
            wp_enqueue_style(
                'h2035-licensing-receipt',
                FORGEWP_COMPANION_HOSPITALITY_URL . 'assets/receipt.css',
                [],
                is_file($file) ? (string) filemtime($file) : '0.2.1'
            );
        });
        add_filter('edd_get_option_checkout_address_fields', [self::class, 'billingFields']);
        add_filter('edd_require_billing_address', static function ($required) {
            return self::businessCheckout() ? true : $required;
        }, 100);
        add_filter('edd_purchase_form_required_fields', [self::class, 'requiredBillingFields'], 100);
        add_action('edd_purchase_form_top', [self::class, 'checkoutNotice']);
        add_action('edd_checkout_error_checks', [self::class, 'validateCheckout'], 100, 2);
        // Stripe's express flows remove third-party checkout checks. Restore our
        // server-side policy after those overrides, before EDD validates payment.
        add_action('edd_pre_process_purchase', static function () {
            add_action('edd_checkout_error_checks', [self::class, 'validateCheckout'], 100, 2);
        }, PHP_INT_MAX);
        add_action('edds_buy_now_checkout_error_checks', [self::class, 'validateCheckout'], 100, 2);
        add_action('edd_built_order', [self::class, 'enroll'], 20);
        add_action('edd_complete_purchase', [self::class, 'complete'], 20);
        add_action('edd_after_order_actions', [self::class, 'complete'], 20);
        add_action('h2035_retry', [self::class, 'complete']);
        add_action('h2035_invoice_retry', [Invoice::class, 'process']);
        add_action('template_redirect', [Invoice::class, 'download'], 0);
        add_action('edd_add_email_tags', static function () {
            edd_add_email_tag('hospitality_license', 'Hospitality 2035 Lizenznummer', static function ($orderId) {
                $row = Store::get((int) $orderId);
                return $row ? esc_html($row->number) : '';
            });
        });
        add_action('edd_order_receipt_after_table', [self::class, 'receiptDetails']);
        // EDD has already validated the signed URL, expiry, order and download limit.
        add_action('edd_process_verified_download', [self::class, 'deliver'], 5, 4);
    }

    public static function receiptDetails($order): void {
        $row = Store::get((int) $order->id);
        if (!$row) return;
        $snapshot = json_decode($row->snapshot, true);
        $company = is_array($snapshot) && isset($snapshot['holder']) && is_string($snapshot['holder'])
            ? $snapshot['holder'] : (string) edd_get_order_meta($order->id, 'company_name', true);
        echo '<section class="h2035-receipt-license" aria-label="Lizenzdetails"><h3 class="h2035-receipt-license__title">Lizenzdetails</h3><dl class="h2035-receipt-license__details">';
        if ($company !== '') echo '<div class="h2035-receipt-license__row"><dt>Unternehmen</dt><dd>' . esc_html($company) . '</dd></div>';
        echo '<div class="h2035-receipt-license__row"><dt>Lizenznummer</dt><dd class="h2035-receipt-license__number">' . esc_html($row->number) . '</dd></div>';
        if ($row->invoice_number && Invoice::verifiedFile($row)) {
            echo '<div class="h2035-receipt-license__row"><dt>Rechnung</dt><dd><a class="h2035-invoice-link" href="' . esc_url(Invoice::url((int) $order->id)) . '">PDF herunterladen</a><br><span>' . esc_html($row->invoice_number) . '</span></dd></div>';
        }
        echo '</dl></section>';
    }

    public static function cartContainsProduct(): bool {
        $product = (int) self::settings()['product_id'];
        foreach ((array) edd_get_cart_contents() as $item) {
            if ($product && (int) ($item['id'] ?? 0) === $product) return true;
        }
        return false;
    }

    private static function businessCheckout(): bool {
        return (!is_admin() || wp_doing_ajax()) && self::settings()['enabled'] && self::cartContainsProduct();
    }

    public static function billingFields($fields): mixed {
        if (!self::businessCheckout()) return $fields;
        $fields = is_array($fields) ? $fields : [];
        foreach (['company', 'country', 'address', 'city', 'zip'] as $field) $fields[$field] = 1;
        return $fields;
    }

    public static function requiredBillingFields($fields): array {
        if (!self::businessCheckout()) return $fields;
        foreach (['company' => 'billing_company_missing', 'card_address' => 'billing_street_missing', 'card_city' => 'billing_city_missing', 'card_zip' => 'billing_zip_invalid', 'billing_country' => 'germany_only'] as $field => $code) {
            $fields[$field] = ['error_id' => 'h2035_' . $field, 'error_message' => self::message($code)];
        }
        return $fields;
    }

    public static function checkoutNotice(): void {
        if (!self::settings()['enabled'] || !self::cartContainsProduct()) return;
        echo '<div class="edd-alert edd-alert-info"><p>Der automatische Kauf einer Einzellizenz ist für Geschäftskunden mit deutscher Rechnungsadresse vorgesehen. Unternehmen und vollständige Rechnungsadresse sind erforderlich.</p><p>Für Bestellungen aus anderen Ländern: <a href="mailto:contact@dicon-beratung.de">contact@dicon-beratung.de</a>.</p></div>';
    }

    public static function validateCheckout($validData = [], $data = []): void {
        $settings = self::settings();
        if (!$settings['enabled'] || !self::cartContainsProduct()) return;
        try {
            self::ready($settings, edd_is_test_mode() ? 'test' : 'live');
            $cart = edd_get_cart_contents();
            if (count($cart) !== 1 || (int) reset($cart)['quantity'] !== 1) throw new RuntimeException('single_license_only');
            $post = [];
            foreach (['company', 'card_address', 'card_city', 'card_zip', 'billing_country'] as $field) {
                $raw = $_POST[$field] ?? '';
                $post[$field] = is_string($raw) ? sanitize_text_field(wp_unslash($raw)) : '';
            }
            self::validateBilling($post['company'], $post['card_address'], $post['card_city'], $post['card_zip'], $post['billing_country']);
        } catch (Throwable $error) {
            edd_set_error('h2035_checkout', self::message($error->getMessage()));
        }
    }

    public static function validateBilling(string $company, string $street, string $city, string $zip, string $country): void {
        if ($country !== 'DE') throw new RuntimeException('germany_only');
        if (trim($company) === '') throw new RuntimeException('billing_company_missing');
        if (mb_strlen($company) > 200) throw new RuntimeException('billing_company_long');
        if (trim($street) === '') throw new RuntimeException('billing_street_missing');
        if (trim($city) === '') throw new RuntimeException('billing_city_missing');
        if (!preg_match('/^[0-9]{5}$/', trim($zip))) throw new RuntimeException('billing_zip_invalid');
    }

    private static function ready(array $settings, string $mode): void {
        if (!$settings['enabled'] || !$settings['product_id'] || !$settings['master']) throw new RuntimeException('setup_incomplete');
        if ($mode !== 'test' && $mode !== 'live') throw new RuntimeException('mode_invalid');
        if ($mode === 'live' && (!$settings['allow_live'] || $settings['preview'])) throw new RuntimeException('live_disabled');
        if ($mode === 'live' && $settings['invoice_enabled']) {
            Invoice::validateSettings($settings);
            if (!$settings['invoice_seller_confirmed']) throw new RuntimeException('invoice_seller_not_confirmed');
        }
        if (!is_file(Storage::file($settings['master']))) throw new RuntimeException('master_missing');
    }

    public static function enroll($orderId): void {
        $order = edd_get_order((int) $orderId);
        $settings = self::settings();
        if (!$order || !$settings['enabled']) return;
        $items = $order->get_items();
        if (!array_filter($items, static fn($item) => (int) $item->product_id === (int) $settings['product_id'])) return;
        if (edd_get_order_meta($order->id, '_h2035_enrollment', true)) return;
        try {
            self::ready($settings, $order->mode);
            self::validateOrder($order, (int) $settings['product_id']);
            // Snapshot the terms, master and buyer at checkout; future settings edits cannot change them.
            $address = $order->get_address();
            $holder = (string) edd_get_order_meta($order->id, 'company_name', true);
            $snapshot = array_intersect_key($settings, array_flip(['master', 'preview', 'position', 'margin_mm', 'title', 'type', 'scope', 'product_id']));
            $snapshot['holder'] = sanitize_text_field($holder);
            $snapshot['order_reference'] = (string) $order->get_number();
            if (!edd_update_order_meta($order->id, '_h2035_enrollment', $snapshot)) throw new RuntimeException('enrollment_write_failed');
        } catch (Throwable $error) {
            edd_update_order_meta($order->id, '_h2035_error', $error->getMessage());
        }
    }

    private static function validateOrder(object $order, int $product): void {
        if ($order->type !== 'sale' || $order->gateway !== 'stripe' || (float) $order->total <= 0) throw new RuntimeException('order_ineligible');
        $items = $order->get_items();
        if (count($items) !== 1) throw new RuntimeException('single_license_only');
        $item = reset($items);
        if ((int) $item->product_id !== $product || (int) $item->quantity !== 1) throw new RuntimeException('single_license_only');
        $address = $order->get_address();
        self::validateBilling((string) edd_get_order_meta($order->id, 'company_name', true), (string) $address->address, (string) $address->city, (string) $address->postal_code, (string) $address->country);
    }

    /** Paid-state validation is repeated here so bypassed checkout fields cannot issue a license. */
    public static function prepare(int $orderId): object {
        return Store::lock($orderId, static function () use ($orderId) {
            $order = edd_get_order($orderId);
            if (!$order || $order->status !== 'complete') throw new RuntimeException('payment_not_complete');
            $row = Store::get($orderId);
            $snapshot = $row ? json_decode($row->snapshot, true, 512, JSON_THROW_ON_ERROR) : edd_get_order_meta($orderId, '_h2035_enrollment', true);
            if (!is_array($snapshot) || empty($snapshot['master'])) throw new RuntimeException('order_not_enrolled');
            self::validateOrder($order, (int) $snapshot['product_id']);
            if ($order->mode === 'live' && (!self::settings()['allow_live'] || $snapshot['preview'])) throw new RuntimeException('live_disabled');
            if (!$row || $row->number === '') $row = Store::allocate($order, (int) $snapshot['product_id'], $snapshot);
            // Repair only the mirror metadata; the durable license row is authoritative.
            edd_update_order_meta($orderId, '_h2035_license_number', $row->number);
            if ($row->status === 'ready' && self::verifiedFile($row)) return $row;
            try {
                $name = 'license-' . bin2hex(random_bytes(32)) . '.pdf';
                $result = (new PersonalizedPdf())->generate(Storage::file($snapshot['master']), Storage::file($name), [
                    'holder' => $snapshot['holder'], 'number' => $row->number,
                    'order_reference' => $snapshot['order_reference'],
                ], $snapshot, (bool) $snapshot['preview']);
                Store::update($orderId, ['status' => 'ready', 'file_name' => $name, 'file_hash' => $result['sha256'], 'error_code' => '']);
            } catch (Throwable $error) {
                Store::update($orderId, ['status' => 'error', 'error_code' => 'pdf_generation_failed']);
                throw new RuntimeException('pdf_generation_failed', 0, $error);
            }
            return Store::get($orderId);
        });
    }

    public static function verifiedFile(object $row): bool {
        if (!$row->file_name || !$row->file_hash) return false;
        $file = Storage::file($row->file_name);
        return is_file($file) && hash_equals($row->file_hash, hash_file('sha256', $file));
    }

    public static function complete($orderId): void {
        $orderId = (int) $orderId;
        if (!edd_get_order_meta($orderId, '_h2035_enrollment', true) && !Store::get($orderId)) return;
        try {
            self::prepare($orderId);
            Store::lock($orderId, static function () use ($orderId) {
                $row = Store::get($orderId);
                if ($row->notified) return;
                $order = edd_get_order($orderId);
                $message = Notification::render($row, $order, self::settings());
                if (wp_mail($message['to'], $message['subject'], $message['body'], ['Content-Type: text/plain; charset=UTF-8'])) {
                    Store::update($orderId, ['notified' => 1]);
                }
            });
            edd_delete_order_meta($orderId, '_h2035_error');
            Invoice::process($orderId);
        } catch (Throwable $error) {
            // Preserve paid order and license. Never fall back to delivering the master.
            edd_update_order_meta($orderId, '_h2035_error', self::message($error->getMessage()));
            $attempts = (int) edd_get_order_meta($orderId, '_h2035_retries', true);
            if ($attempts < 3 && !wp_next_scheduled('h2035_retry', [$orderId])) {
                edd_update_order_meta($orderId, '_h2035_retries', $attempts + 1);
                wp_schedule_single_event(time() + 120 * ($attempts + 1), 'h2035_retry', [$orderId]);
            }
        }
    }

    /** Called only after EDD has authorized its signed file link. */
    public static function deliveryFile(int $orderId, int $product): ?string {
        $row = Store::get($orderId);
        $enrolled = edd_get_order_meta($orderId, '_h2035_enrollment', true);
        $managedProduct = $row ? (int) $row->product_id : (int) ($enrolled['product_id'] ?? 0);
        if (!$managedProduct && $product !== (int) self::settings()['product_id']) return null;
        if ($managedProduct && $product !== $managedProduct) throw new RuntimeException('wrong_product');
        $row = self::prepare($orderId);
        if (!self::verifiedFile($row)) throw new RuntimeException('pdf_not_ready');
        return Storage::file($row->file_name);
    }

    public static function deliver($product, $email, $payment, $args): void {
        try { $file = self::deliveryFile((int) $payment, (int) $product); }
        catch (Throwable $error) {
            wp_die(esc_html(self::message($error->getMessage())), 'Hospitality 2035', ['response' => 403]);
        }
        if (!$file) return;
        $row = Store::get((int) $payment);
        $logId = edd_record_download_in_log((int) $product, (int) ($args['file_key'] ?? 0), ['email' => $email], edd_get_ip(), (int) $payment, $args['price_id'] ?? false);
        if (edd_file_download_log_exceeds_limit($logId)) {
            edd_delete_file_download_log($logId);
            edd_die_file_download_limit_reached();
        }
        while (ob_get_level()) ob_end_clean();
        nocache_headers();
        header('Content-Type: application/pdf');
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="Hospitality-2035-' . sanitize_file_name($row->number) . '.pdf"');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    }

    public static function message(string $code): string {
        return match ($code) {
            'germany_only' => 'Für Rechnungsadressen außerhalb Deutschlands kontaktieren Sie bitte contact@dicon-beratung.de.',
            'billing_incomplete' => 'Bitte geben Sie Unternehmen, Straße, Ort und eine fünfstellige deutsche Postleitzahl vollständig an.',
            'billing_company_missing' => 'Bitte geben Sie Ihren Unternehmensnamen an.',
            'billing_company_long' => 'Bitte kürzen Sie den Unternehmensnamen auf maximal 200 Zeichen.',
            'billing_street_missing' => 'Bitte geben Sie Ihre Straße und Hausnummer an.',
            'billing_city_missing' => 'Bitte geben Sie den Ort Ihrer Rechnungsadresse an.',
            'billing_zip_invalid' => 'Bitte geben Sie eine fünfstellige deutsche Postleitzahl an.',
            'single_license_only' => 'Bitte bestellen Sie genau eine Einzellizenz. Für weitere Lizenzen kontaktieren Sie DICON.',
            'payment_not_complete' => 'Der Download ist erst nach abgeschlossener Zahlung verfügbar.',
            'live_disabled' => 'Der automatische Lizenzverkauf ist derzeit nur im Testmodus verfügbar.',
            default => 'Die personalisierte Studie ist noch nicht verfügbar. Bitte kontaktieren Sie contact@dicon-beratung.de mit Ihrer Bestellnummer.',
        };
    }
}
