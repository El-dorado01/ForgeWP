<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

use RuntimeException;

final class Store
{
    public static function table(): string {
        global $wpdb;
        return $wpdb->prefix . 'hospitality_licenses';
    }

    public static function install(): void {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::table();
        dbDelta("CREATE TABLE $table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            order_id bigint(20) unsigned NOT NULL,
            product_id bigint(20) unsigned NOT NULL,
            mode varchar(10) NOT NULL,
            number varchar(80) NOT NULL DEFAULT '',
            status varchar(20) NOT NULL DEFAULT 'pending',
            snapshot longtext NOT NULL,
            file_name varchar(100) NOT NULL DEFAULT '',
            file_hash varchar(64) NOT NULL DEFAULT '',
            error_code varchar(80) NOT NULL DEFAULT '',
            notified tinyint(1) NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            invoice_number varchar(80) NOT NULL DEFAULT '',
            invoice_snapshot longtext NULL,
            invoice_file varchar(100) NOT NULL DEFAULT '',
            invoice_hash varchar(64) NOT NULL DEFAULT '',
            invoice_emailed tinyint(1) NOT NULL DEFAULT 0,
            invoice_error varchar(80) NOT NULL DEFAULT '',
            PRIMARY KEY  (id),
            UNIQUE KEY order_id (order_id)
        ) {$wpdb->get_charset_collate()};");
        $sequences = $wpdb->prefix . 'hospitality_invoice_sequences';
        dbDelta("CREATE TABLE $sequences (
            series varchar(64) NOT NULL,
            last_number bigint(20) unsigned NOT NULL,
            PRIMARY KEY  (series)
        ) {$wpdb->get_charset_collate()};");
        update_option('h2035_schema', 2, false);
    }

    public static function nextInvoiceNumber(string $prefix, string $mode, string $year): string {
        global $wpdb;
        $series = ($mode === 'test' ? 'TEST-' : '') . $prefix . '-' . $year;
        $table = $wpdb->prefix . 'hospitality_invoice_sequences';
        $result = $wpdb->query($wpdb->prepare("INSERT INTO $table (series, last_number) VALUES (%s, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)", $series));
        if (!$result) throw new RuntimeException('invoice_sequence_failed');
        $number = (int) $wpdb->get_var('SELECT LAST_INSERT_ID()');
        if ($number < 1) throw new RuntimeException('invoice_sequence_failed');
        return $series . '-' . str_pad((string) $number, 6, '0', STR_PAD_LEFT);
    }

    public static function get(int $order): ?object {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::table() . ' WHERE order_id = %d', $order));
    }

    public static function lock(int $order, callable $work): mixed {
        global $wpdb;
        // MySQL advisory locks are connection-owned: no stale lock when PHP crashes.
        $key = 'h2035_' . md5(self::table() . ':' . $order);
        if ((int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 5)', $key)) !== 1) {
            throw new RuntimeException('processing_busy');
        }
        try { return $work(); }
        finally { $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $key)); }
    }

    public static function update(int $order, array $values): void {
        global $wpdb;
        if ($wpdb->update(self::table(), $values, ['order_id' => $order]) === false) {
            throw new RuntimeException('license_write_failed');
        }
    }

    public static function allocate(object $order, int $product, array $snapshot): object {
        global $wpdb;
        $existing = self::get((int) $order->id);
        if ($existing) {
            if ($existing->number === '') {
                $number = ($existing->mode === 'test' ? 'TEST-' : '') . 'H2035-' . str_pad((string) $existing->id, 6, '0', STR_PAD_LEFT);
                self::update((int) $order->id, ['number' => $number]);
                return self::get((int) $order->id);
            }
            return $existing;
        }
        if (!$wpdb->insert(self::table(), [
            'order_id' => (int) $order->id, 'product_id' => $product,
            'mode' => $order->mode, 'snapshot' => wp_json_encode($snapshot),
            'created_at' => current_time('mysql', true),
        ])) throw new RuntimeException('license_insert_failed');
        $id = (int) $wpdb->insert_id;
        $number = ($order->mode === 'test' ? 'TEST-' : '') . 'H2035-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
        self::update((int) $order->id, ['number' => $number]);
        return self::get((int) $order->id);
    }
}
