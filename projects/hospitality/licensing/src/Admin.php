<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

use RuntimeException;
use Throwable;

final class Admin
{
    public static function boot(): void {
        add_action('admin_menu', static function () {
            add_submenu_page('edit.php?post_type=download', 'Hospitality Licensing', 'Hospitality Licensing', 'manage_options', 'h2035-licensing', [self::class, 'page']);
        });
        add_action('admin_post_h2035_save', [self::class, 'save']);
        add_action('admin_post_h2035_retry', [self::class, 'retry']);
        add_action('admin_post_h2035_pdf', [self::class, 'pdf']);
    }

    private static function authorize(string $action): void {
        if (!current_user_can('manage_options')) wp_die('Keine Berechtigung.', '', ['response' => 403]);
        check_admin_referer($action);
    }

    public static function save(): void {
        self::authorize('h2035_save');
        $old = Plugin::settings();
        try {
            $value = static function (string $key): string {
                return isset($_POST[$key]) && is_string($_POST[$key]) ? wp_unslash($_POST[$key]) : '';
            };
            $settings = $old;
            foreach (['enabled', 'allow_live', 'preview'] as $key) $settings[$key] = !empty($_POST[$key]);
            $settings['product_id'] = absint($value('product_id'));
            if ($settings['product_id'] && get_post_type($settings['product_id']) !== 'download') throw new RuntimeException('Bitte wählen Sie ein EDD-Produkt.');
            $settings['position'] = $value('position') === 'after' ? 'after' : 'before';
            foreach (['title', 'type', 'scope'] as $key) {
                $settings[$key] = sanitize_textarea_field($value($key));
                if ($settings[$key] === '' || mb_strlen($settings[$key]) > ($key === 'scope' ? 2000 : 200)) throw new RuntimeException('Bitte füllen Sie die Lizenztexte innerhalb der angezeigten Zeichenlimits aus.');
            }
            $settings = array_replace($settings, Notification::validateSettings([
                'notification_to' => $value('notification_to'),
                'notification_subject' => $value('notification_subject'),
                'notification_body' => $value('notification_body'),
            ]));
            foreach (['invoice_enabled', 'invoice_seller_confirmed'] as $key) $settings[$key] = !empty($_POST[$key]);
            foreach (['invoice_seller_name', 'invoice_seller_address', 'invoice_seller_tax', 'invoice_seller_footer', 'invoice_prefix'] as $key) $settings[$key] = sanitize_textarea_field($value($key));
            Invoice::validateSettings($settings);
            if ($settings['allow_live'] && $settings['invoice_enabled'] && !$settings['invoice_seller_confirmed']) throw new RuntimeException('Bitte bestätigen Sie die Angaben zum Rechnungsaussteller vor der Live-Freigabe.');
            if (!empty($_FILES['master']['name'])) {
                if ((int) $_FILES['master']['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($_FILES['master']['tmp_name'])) throw new RuntimeException('Der PDF-Upload ist fehlgeschlagen.');
                $settings['master'] = Storage::importMaster($_FILES['master']['tmp_name']);
            }
            if ($settings['enabled'] && (!$settings['master'] || !$settings['product_id'])) throw new RuntimeException('Produkt und PDF-Master sind erforderlich.');
            if ($settings['allow_live'] && $settings['preview']) throw new RuntimeException('Live-Verarbeitung ist mit einem vorläufigen PDF-Master gesperrt.');
            Storage::root();
            update_option('h2035_settings', $settings, false);
            wp_safe_redirect(admin_url('edit.php?post_type=download&page=h2035-licensing&saved=1'));
        } catch (Throwable $error) {
            wp_die(esc_html('Einstellungen wurden nicht gespeichert. ' . $error->getMessage()), 'Hospitality Licensing', ['back_link' => true]);
        }
        exit;
    }

    public static function retry(): void {
        $orderId = isset($_GET['order']) && is_scalar($_GET['order']) ? absint($_GET['order']) : 0;
        self::authorize('h2035_retry_' . $orderId);
        Plugin::complete($orderId);
        wp_safe_redirect(admin_url('edit.php?post_type=download&page=h2035-licensing'));
        exit;
    }

    public static function pdf(): void {
        $orderId = isset($_GET['order']) && is_scalar($_GET['order']) ? absint($_GET['order']) : 0;
        self::authorize('h2035_pdf_' . $orderId);
        $row = Store::get($orderId);
        if (!$row || $row->status !== 'ready' || !Plugin::verifiedFile($row)) wp_die('PDF nicht verfügbar.', '', ['response' => 404]);
        $file = Storage::file($row->file_name);
        nocache_headers();
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="Hospitality-2035-' . sanitize_file_name($row->number) . '.pdf"');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    }

    public static function page(): void {
        if (!current_user_can('manage_options')) return;
        $s = Plugin::settings();
        echo '<div class="wrap"><h1>Hospitality 2035 Licensing</h1><p>Einzellizenzen für deutsche Geschäftskunden. Bestehende Lizenzdaten bleiben bei einem Themewechsel oder einer Deaktivierung erhalten.</p>';
        if (isset($_GET['saved'])) echo '<div class="notice notice-success"><p>Einstellungen gespeichert.</p></div>';
        try { Storage::root(); }
        catch (Throwable $error) { echo '<div class="notice notice-error"><p>Privater Speicher ist nicht verfügbar: ' . esc_html($error->getMessage()) . '. Bei Bedarf H2035_PRIVATE_DIR außerhalb des öffentlichen Webverzeichnisses in wp-config.php setzen.</p></div>'; }
        echo '<form method="post" enctype="multipart/form-data" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="h2035_save">';
        wp_nonce_field('h2035_save');
        echo '<table class="form-table"><tbody>';
        foreach (['enabled' => 'Automatische Verarbeitung aktivieren', 'preview' => 'Vorläufiger Master / Vorschau (nur Testbestellungen)', 'allow_live' => 'Verarbeitung bezahlter Live-Bestellungen ausdrücklich freigeben'] as $key => $label) {
            echo '<tr><th>' . esc_html($label) . '</th><td><input type="checkbox" name="' . esc_attr($key) . '" value="1" ' . checked($s[$key], true, false) . '></td></tr>';
        }
        echo '<tr><th><label for="h2035-product">Einzellizenz-Produkt</label></th><td><select id="h2035-product" name="product_id"><option value="0">Bitte wählen</option>';
        foreach (get_posts(['post_type' => 'download', 'posts_per_page' => -1, 'post_status' => ['publish', 'draft']]) as $product) {
            echo '<option value="' . (int) $product->ID . '" ' . selected($s['product_id'], $product->ID, false) . '>' . esc_html($product->post_title . ' (#' . $product->ID . ')') . '</option>';
        }
        echo '</select></td></tr><tr><th>PDF-Master</th><td><input type="file" name="master" accept="application/pdf"><p class="description">Wird direkt in privaten Serverspeicher kopiert, nicht in die Mediathek. Aktueller Master: ' . ($s['master'] ? 'vorhanden' : 'fehlt') . '. Maximal 100 MB, zusätzlich gelten die Server-Uploadlimits.</p></td></tr>';
        foreach (['title' => 'Titel der Lizenzseite', 'type' => 'Lizenztyp', 'scope' => 'Lizenzumfang'] as $key => $label) {
            echo '<tr><th><label for="h2035-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td><textarea id="h2035-' . esc_attr($key) . '" name="' . esc_attr($key) . '" rows="' . ($key === 'scope' ? 4 : 2) . '" cols="70" maxlength="' . ($key === 'scope' ? 2000 : 200) . '" required>' . esc_textarea($s[$key]) . '</textarea></td></tr>';
        }
        echo '<tr><th>Platzierung</th><td><select name="position"><option value="before" ' . selected($s['position'], 'before', false) . '>Lizenzseite vor der Studie</option><option value="after" ' . selected($s['position'], 'after', false) . '>Lizenzseite nach der Studie</option></select></td></tr></tbody></table>';
        echo '<p>Lizenznehmer: Unternehmen aus der Rechnungsadresse. Format: H2035-000001, im Test TEST-H2035-000001. Bereits ausgestellte Lizenzen behalten ihren Wortlaut und PDF-Master. Vorschau-Dateien tragen einen pinken TEST-Hinweis.</p>';
        echo '<h2>Admin-Benachrichtigung bei fertiger Lizenz</h2><table class="form-table"><tbody>';
        echo '<tr><th><label for="h2035-notification-to">Empfänger</label></th><td><input id="h2035-notification-to" type="email" name="notification_to" class="regular-text" value="' . esc_attr($s['notification_to']) . '" required></td></tr>';
        echo '<tr><th><label for="h2035-notification-subject">Betreff</label></th><td><input id="h2035-notification-subject" type="text" name="notification_subject" class="large-text" maxlength="200" value="' . esc_attr($s['notification_subject']) . '" required></td></tr>';
        echo '<tr><th><label for="h2035-notification-body">Nachricht (Klartext)</label></th><td><textarea id="h2035-notification-body" name="notification_body" rows="8" cols="80" maxlength="10000" required>' . esc_textarea($s['notification_body']) . '</textarea><p class="description">Platzhalter: ' . esc_html(implode(', ', array_map(static fn($tag) => '{' . $tag . '}', Notification::TAGS))) . '. Test-E-Mails erhalten automatisch [TEST] im Betreff. Änderungen gelten für zukünftige oder noch nicht erfolgreich versendete Benachrichtigungen.</p></td></tr></tbody></table>';
        echo '<h2>PDF-Rechnungen</h2><p>Erstellt nach abgeschlossener Zahlung eine private PDF-Rechnung und sendet sie als Anhang an die Bestelladresse. Beträge, Währung und Steuer werden aus der gespeicherten EDD-Bestellung übernommen. Vorhandene Rechnungen werden nicht nachträglich verändert. Ausgabe als Standard-PDF, nicht als XRechnung/ZUGFeRD.</p><table class="form-table"><tbody>';
        foreach (['invoice_enabled' => 'PDF-Rechnung automatisch erstellen und versenden', 'invoice_seller_confirmed' => 'Rechnungsaussteller und Steuerangaben für den Live-Betrieb bestätigt'] as $key => $label) {
            echo '<tr><th>' . esc_html($label) . '</th><td><input type="checkbox" name="' . esc_attr($key) . '" value="1" ' . checked($s[$key], true, false) . '></td></tr>';
        }
        foreach (['invoice_seller_name' => ['Vollständiger Firmenname', 200, 2], 'invoice_seller_address' => ['Vollständige Firmenanschrift', 600, 4], 'invoice_seller_tax' => ['Steuernummer oder USt-IdNr.', 100, 2], 'invoice_seller_footer' => ['Zusätzliche Firmenangaben / Rechnungsfuß', 1000, 4], 'invoice_prefix' => ['Rechnungspräfix (z. B. H2035-RE)', 20, 1]] as $key => [$label, $limit, $rows]) {
            echo '<tr><th><label for="h2035-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td><textarea id="h2035-' . esc_attr($key) . '" name="' . esc_attr($key) . '" rows="' . $rows . '" cols="70" maxlength="' . $limit . '">' . esc_textarea($s[$key]) . '</textarea></td></tr>';
        }
        echo '</tbody></table><p>Eigene Nummernkreise für Test und Live sowie je Kalenderjahr. Testrechnungen tragen TEST und sind keine gültigen Rechnungen. Ausstellerdaten vor Live-Freigabe durch DICON bestätigen lassen. Für neue Rechnungen gelten die aktuellen Einstellungen; ausgestellte Dokumente behalten ihre gespeicherten Angaben.</p>';
        submit_button('Einstellungen speichern');
        echo '</form><h2>Letzte Lizenzen</h2><p>E-Mail-Platzhalter für EDD-Vorlagen: <code>{hospitality_license}</code>. Die PDF-Links in EDD-Belegen liefern automatisch die zugehörige personalisierte Datei.</p>';
        global $wpdb;
        $rows = $wpdb->get_results('SELECT * FROM ' . Store::table() . ' ORDER BY id DESC LIMIT 50');
        echo '<table class="widefat striped"><thead><tr><th>Bestellung</th><th>Lizenznummer</th><th>Status</th><th>Erstellt (UTC)</th><th>Aktionen</th></tr></thead><tbody>';
        foreach ($rows as $row) {
            $order = edd_get_order((int) $row->order_id);
            $url = wp_nonce_url(admin_url('admin-post.php?action=h2035_retry&order=' . $row->order_id), 'h2035_retry_' . $row->order_id);
            $pdf = wp_nonce_url(admin_url('admin-post.php?action=h2035_pdf&order=' . $row->order_id), 'h2035_pdf_' . $row->order_id);
            echo '<tr><td>' . (int) $row->order_id . '</td><td>' . esc_html($row->number) . '</td><td>' . esc_html($row->status . ' / ' . ($order ? $order->status : 'Bestellung fehlt')) . '</td><td>' . esc_html($row->created_at) . '</td><td><a href="' . esc_url($url) . '">Erneut verarbeiten</a>';
            if ($row->status === 'ready') echo ' | <a href="' . esc_url($pdf) . '">PDF prüfen</a>';
            if ($row->invoice_number) {
                echo ' | <a href="' . esc_url(Invoice::url((int) $row->order_id)) . '">Rechnung</a><br>' . esc_html($row->invoice_number . ($row->invoice_emailed ? ' – E-Mail übergeben' : ' – E-Mail ausstehend'));
            }
            if ($row->invoice_error) echo '<br><strong>Rechnungsverarbeitung fehlgeschlagen – bitte Einstellungen prüfen und erneut verarbeiten.</strong>';
            echo '</td></tr>';
        }
        echo '</tbody></table><p>Ein PDF-Fehler löscht weder Zahlung noch Lizenz. Die Verarbeitung kann hier erneut gestartet werden; dabei bleibt die Lizenznummer bestehen. E-Mail-Versandfehler werden beim erneuten Verarbeiten erneut versucht.</p></div>';
    }
}
