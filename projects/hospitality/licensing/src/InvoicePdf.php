<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

use RuntimeException;

final class InvoicePdf
{
    public static function money(int $cents, string $currency): string {
        return number_format($cents / 100, 2, ',', '.') . ' ' . $currency;
    }

    public static function generate(array $data, string $number, string $destination): string {
        $pdf = new PortablePdf();
        $pdf->SetMargins(20, 18, 20);
        $pdf->SetAutoPageBreak(true, 18);
        $pdf->AddFont('DejaVu', '', 'DejaVuSansCondensed.ttf', true);
        $pdf->AddFont('DejaVu', 'B', 'DejaVuSansCondensed-Bold.ttf', true);
        $pdf->SetTitle(($data['test'] ? 'TEST – ' : '') . 'Rechnung ' . $number);
        $pdf->SetAuthor($data['seller_name']);
        $pdf->AddPage();
        if ($data['test']) {
            $pdf->SetFillColor(225, 29, 72);
            $pdf->SetTextColor(255, 255, 255);
            $pdf->SetFont('DejaVu', 'B', 10);
            $pdf->MultiCell(0, 8, 'TEST / RECHNUNGSMUSTER – keine gültige Rechnung', 0, 'L', true);
            $pdf->Ln(6);
        }
        $pdf->SetTextColor(15, 23, 42);
        $pdf->SetFont('DejaVu', 'B', 23);
        $pdf->Cell(0, 12, 'Rechnung', 0, 1);
        $pdf->Ln(5);
        $top = $pdf->GetY();
        $pdf->SetFont('DejaVu', 'B', 10);
        $pdf->MultiCell(82, 5.5, $data['seller_name']);
        $pdf->SetFont('DejaVu', '', 9);
        $pdf->MultiCell(82, 5, $data['seller_address'] . "\nSteuernummer / USt-IdNr.:\n" . $data['seller_tax']);
        $issuerBottom = $pdf->GetY();
        $pdf->SetXY(112, $top);
        $pdf->SetFont('DejaVu', 'B', 9);
        $pdf->MultiCell(78, 5, $number);
        $pdf->SetX(112);
        $pdf->SetFont('DejaVu', '', 9);
        $pdf->MultiCell(78, 5, 'Rechnungsdatum: ' . $data['issued_date'] . "\nLeistungsdatum: " . $data['service_date'] . "\nBestellung: " . $data['order_number'] . "\nLizenz: " . $data['license_number']);
        $pdf->SetY(max($issuerBottom, $pdf->GetY()) + 9);
        $pdf->SetFont('DejaVu', 'B', 10);
        $pdf->Cell(0, 6, 'Rechnungsempfänger', 0, 1);
        $pdf->SetFont('DejaVu', '', 10);
        $pdf->MultiCell(0, 5.5, $data['company'] . ($data['buyer_name'] !== '' ? "\n" . $data['buyer_name'] : '') . "\n" . $data['buyer_address']);
        $pdf->Ln(8);
        $pdf->SetFillColor(241, 245, 249);
        $pdf->SetFont('DejaVu', 'B', 10);
        $pdf->Cell(118, 9, 'Leistung', 0, 0, 'L', true);
        $pdf->Cell(52, 9, 'Nettobetrag', 0, 1, 'R', true);
        $pdf->Ln(3);
        $start = $pdf->GetY();
        $pdf->SetFont('DejaVu', '', 10);
        $pdf->MultiCell(118, 6, '1 × ' . $data['product_name'] . "\n" . $data['license_type'] . ' (digitale Studie)');
        $bottom = $pdf->GetY();
        $pdf->SetXY(138, $start);
        $pdf->Cell(52, 6, self::money($data['subtotal'], $data['currency']), 0, 1, 'R');
        $pdf->SetY(max($bottom, $pdf->GetY()) + 7);
        $rows = ['Zwischensumme' => $data['subtotal']];
        if ($data['discount'] > 0) $rows['Rabatt'] = -$data['discount'];
        $rows['Nettosumme'] = $data['net'];
        $rows['Umsatzsteuer (' . number_format($data['tax_rate'], 2, ',', '.') . ' %)'] = $data['tax'];
        $rows['Gesamtbetrag'] = $data['total'];
        foreach ($rows as $label => $amount) {
            $pdf->SetFont('DejaVu', $label === 'Gesamtbetrag' ? 'B' : '', 10);
            $pdf->Cell(112, 7, $label, 0, 0, 'R');
            $pdf->Cell(58, 7, self::money($amount, $data['currency']), 0, 1, 'R');
        }
        $pdf->Ln(6);
        $pdf->SetFont('DejaVu', '', 9);
        $pdf->MultiCell(0, 5, 'Vollständig bezahlt über Stripe. Zahlungsdatum: ' . $data['payment_date']);
        if ($data['seller_footer'] !== '') {
            $pdf->Ln(7);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->SetFont('DejaVu', '', 8);
            $pdf->MultiCell(0, 4.5, $data['seller_footer']);
        }
        $bytes = $pdf->Output('S');
        $handle = @fopen($destination, 'xb');
        if (!$handle) throw new RuntimeException('invoice_file_create_failed');
        try {
            while ($bytes !== '') {
                $written = fwrite($handle, $bytes);
                if (!$written) throw new RuntimeException('invoice_file_write_failed');
                $bytes = substr($bytes, $written);
            }
            fflush($handle);
        } catch (\Throwable $error) {
            fclose($handle);
            unlink($destination);
            throw $error;
        }
        fclose($handle);
        @chmod($destination, 0600);
        return hash_file('sha256', $destination);
    }
}
