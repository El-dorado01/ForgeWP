<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

use RuntimeException;
use Throwable;

final class Invoice
{
    public static function validateSettings(array $settings): void {
        if (!$settings['invoice_enabled']) return;
        foreach (['invoice_seller_name' => 200, 'invoice_seller_address' => 600, 'invoice_seller_tax' => 100] as $field => $limit) {
            if (!is_string($settings[$field]) || trim($settings[$field]) === '' || mb_strlen($settings[$field]) > $limit) throw new RuntimeException('Bitte vervollständigen Sie die Angaben zum Rechnungsaussteller.');
        }
        if (!preg_match('/^[A-Z0-9][A-Z0-9-]{0,19}$/', $settings['invoice_prefix'])) throw new RuntimeException('Rechnungspräfix: 1–20 Großbuchstaben, Zahlen oder Bindestriche.');
        if (mb_strlen($settings['invoice_seller_footer']) > 1000) throw new RuntimeException('Der Rechnungsfuß darf maximal 1000 Zeichen enthalten.');
    }

    private static function cents($value): int { return (int) round((float) $value * 100); }

    public static function snapshot(object $order, object $license, array $settings): array {
        self::validateSettings($settings);
        if ($order->mode === 'live' && !$settings['invoice_seller_confirmed']) throw new RuntimeException('invoice_seller_not_confirmed');
        $terms = json_decode($license->snapshot, true, 512, JSON_THROW_ON_ERROR);
        $address = $order->get_address();
        Plugin::validateBilling((string) $terms['holder'], (string) $address->address, (string) $address->city, (string) $address->postal_code, (string) $address->country);
        $subtotal = self::cents($order->subtotal);
        $discount = self::cents($order->discount);
        $tax = self::cents($order->tax);
        $total = self::cents($order->total);
        $net = $total - $tax;
        if ($subtotal < 0 || $discount < 0 || $tax < 0 || $net < 0 || $total <= 0 || abs(($subtotal - $discount) - $net) > 1) throw new RuntimeException('invoice_totals_unsupported');
        $currency = strtoupper((string) $order->currency);
        if (!preg_match('/^[A-Z]{3}$/', $currency)) throw new RuntimeException('invoice_currency_invalid');
        $items = $order->get_items();
        $item = reset($items);
        $paymentTime = $order->date_completed && $order->date_completed !== '0000-00-00 00:00:00' ? strtotime($order->date_completed . ' UTC') : strtotime($license->created_at . ' UTC');
        $serviceTime = filemtime(Storage::file($license->file_name));
        $rate = (float) $order->get_tax_rate();
        if ($rate == 0 && $tax > 0 && $net > 0) $rate = round(100 * $tax / $net, 2);
        return [
            'test' => $order->mode === 'test', 'year' => wp_date('Y'), 'issued_date' => wp_date('d.m.Y'),
            'service_date' => wp_date('d.m.Y', $serviceTime), 'payment_date' => wp_date('d.m.Y', $paymentTime),
            'order_number' => (string) $order->get_number(), 'order_id' => (int) $order->id,
            'license_number' => $license->number, 'license_type' => $terms['type'],
            'company' => $terms['holder'], 'buyer_name' => trim((string) $address->name),
            'buyer_address' => trim((string) $address->address . "\n" . (string) $address->address2 . "\n" . $address->postal_code . ' ' . $address->city . "\nDeutschland"),
            'buyer_email' => sanitize_email((string) $order->email), 'product_name' => sanitize_text_field((string) $item->product_name),
            'subtotal' => $subtotal, 'discount' => $discount, 'net' => $net, 'tax' => $tax, 'total' => $total,
            'tax_rate' => $rate, 'currency' => $currency,
            'seller_name' => $settings['invoice_seller_name'], 'seller_address' => $settings['invoice_seller_address'],
            'seller_tax' => $settings['invoice_seller_tax'], 'seller_footer' => $settings['invoice_seller_footer'],
        ];
    }

    public static function verifiedFile(object $row): bool {
        if (!$row->invoice_file || !$row->invoice_hash) return false;
        $path = Storage::file($row->invoice_file);
        return is_file($path) && hash_equals($row->invoice_hash, hash_file('sha256', $path));
    }

    public static function prepare(int $orderId): object {
        return Store::lock($orderId, static function () use ($orderId) {
            $row = Store::get($orderId);
            $order = edd_get_order($orderId);
            if (!$row || !$order || $row->status !== 'ready' || $order->type !== 'sale') throw new RuntimeException('invoice_order_ineligible');
            if (!$row->invoice_number) {
                $settings = Plugin::settings();
                if (!$settings['invoice_enabled'] || $order->status !== 'complete') throw new RuntimeException('invoice_not_enabled_or_paid');
                if (!Plugin::verifiedFile($row)) throw new RuntimeException('invoice_study_not_ready');
                $snapshot = self::snapshot($order, $row, $settings);
                $number = Store::nextInvoiceNumber($settings['invoice_prefix'], $order->mode, $snapshot['year']);
                Store::update($orderId, ['invoice_number' => $number, 'invoice_snapshot' => wp_json_encode($snapshot)]);
                $row = Store::get($orderId);
            }
            edd_update_order_meta($orderId, '_h2035_invoice_number', $row->invoice_number);
            if (self::verifiedFile($row)) return $row;
            $snapshot = json_decode($row->invoice_snapshot, true, 512, JSON_THROW_ON_ERROR);
            $name = 'invoice-' . bin2hex(random_bytes(32)) . '.pdf';
            $hash = InvoicePdf::generate($snapshot, $row->invoice_number, Storage::file($name));
            Store::update($orderId, ['invoice_file' => $name, 'invoice_hash' => $hash, 'invoice_error' => '']);
            edd_update_order_meta($orderId, '_h2035_invoice_number', $row->invoice_number);
            return Store::get($orderId);
        });
    }

    public static function process($orderId): void {
        $orderId = (int) $orderId;
        $existing = Store::get($orderId);
        if (!$existing || (!Plugin::settings()['invoice_enabled'] && !$existing->invoice_number)) return;
        try {
            self::prepare($orderId);
            Store::lock($orderId, static function () use ($orderId) {
                $row = Store::get($orderId);
                if ($row->invoice_emailed) return;
                $order = edd_get_order($orderId);
                if (!$order || $order->status !== 'complete') return;
                $snapshot = json_decode($row->invoice_snapshot, true, 512, JSON_THROW_ON_ERROR);
                $subject = ($snapshot['test'] ? '[TEST] ' : '') . 'Hospitality 2035 – Rechnung ' . $row->invoice_number;
                $body = "Guten Tag,\n\nanbei erhalten Sie die Rechnung zu Ihrer Bestellung " . $snapshot['order_number'] . ".\nRechnungsnummer: " . $row->invoice_number . "\nLizenznummer: " . $snapshot['license_number'] . "\n\nVielen Dank.\n" . $snapshot['seller_name'];
                if (!self::verifiedFile($row)) throw new RuntimeException('invoice_pdf_missing');
                if (!wp_mail($snapshot['buyer_email'], $subject, $body, ['Content-Type: text/plain; charset=UTF-8'], ['Rechnung-' . $row->invoice_number . '.pdf' => Storage::file($row->invoice_file)])) throw new RuntimeException('invoice_mail_failed');
                Store::update($orderId, ['invoice_emailed' => 1, 'invoice_error' => '']);
            });
        } catch (Throwable $error) {
            Store::update($orderId, ['invoice_error' => 'invoice_processing_failed']);
            $attempts = (int) edd_get_order_meta($orderId, '_h2035_invoice_retries', true);
            if ($attempts < 3 && !wp_next_scheduled('h2035_invoice_retry', [$orderId])) {
                edd_update_order_meta($orderId, '_h2035_invoice_retries', $attempts + 1);
                wp_schedule_single_event(time() + 180, 'h2035_invoice_retry', [$orderId]);
            }
        }
    }

    public static function canAccess(object $order): bool {
        return current_user_can('manage_options') || edd_can_view_receipt($order);
    }

    public static function url(int $orderId): string {
        return add_query_arg('h2035_invoice', $orderId, home_url('/'));
    }

    public static function download(): void {
        if (!isset($_GET['h2035_invoice'])) return;
        $id = is_scalar($_GET['h2035_invoice']) ? absint($_GET['h2035_invoice']) : 0;
        $order = edd_get_order($id);
        if (!$order || !self::canAccess($order)) wp_die('Keine Berechtigung für diese Rechnung.', 'Hospitality 2035', ['response' => 403]);
        try { $row = self::prepare($id); }
        catch (Throwable $error) { wp_die('Rechnung noch nicht verfügbar. Bitte kontaktieren Sie DICON.', 'Hospitality 2035', ['response' => 404]); }
        $file = Storage::file($row->invoice_file);
        while (ob_get_level()) ob_end_clean();
        nocache_headers();
        header('Content-Type: application/pdf');
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="Rechnung-' . sanitize_file_name($row->invoice_number) . '.pdf"');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    }
}
