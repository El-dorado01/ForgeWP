<?php
declare(strict_types=1);

namespace Hospitality2035\Licensing;

defined('ABSPATH') || exit;

use InvalidArgumentException;
use RuntimeException;
use setasign\Fpdi\Tfpdf\Fpdi;

/** PDF rendering only. Payment authorization and license allocation belong to the EDD integration. */
final class PersonalizedPdf
{
    public function generate(string $master, string $destination, array $license, array $layout, bool $preview): array
    {
        if (!is_file($master) || !is_readable($master)) {
            throw new InvalidArgumentException('The master PDF is not readable.');
        }
        foreach (['holder', 'number'] as $key) {
            $license[$key] = $this->text($license[$key] ?? '', 200);
        }
        $license['order_reference'] = $this->text($license['order_reference'] ?? '', 200);
        $title = $this->text($layout['title'] ?? '', 200);
        $type = $this->text($layout['type'] ?? '', 200);
        $scope = $this->text($layout['scope'] ?? '', 2000);
        $position = $layout['position'] ?? 'before';
        if (!in_array($position, ['before', 'after'], true)) {
            throw new InvalidArgumentException('License page position must be before or after.');
        }
        $margin = $layout['margin_mm'] ?? 22;
        if (!is_numeric($margin) || $margin < 15 || $margin > 35) {
            throw new InvalidArgumentException('License page margin must be between 15 and 35 mm.');
        }
        $directory = realpath(dirname($destination));
        if (!$directory || !is_writable($directory)) {
            throw new InvalidArgumentException('Output directory must exist and be writable.');
        }
        if (file_exists($destination)) {
            throw new InvalidArgumentException('Refusing to overwrite an existing PDF.');
        }
        if (realpath($master) === $directory . DIRECTORY_SEPARATOR . basename($destination)) {
            throw new InvalidArgumentException('Master and output must be different files.');
        }

        $pdf = new PortablePdf();
        $pdf->SetAutoPageBreak(true, 20);
        $pdf->SetMargins((float) $margin, 22, (float) $margin);
        $pdf->AddFont('DejaVu', '', 'DejaVuSansCondensed.ttf', true);
        $pdf->AddFont('DejaVu', 'B', 'DejaVuSansCondensed-Bold.ttf', true);
        $pdf->SetTitle($preview ? 'Hospitality 2035 – TEST / VORSCHAU' : $title);
        $pdf->SetAuthor('DICON');
        $pages = $pdf->setSourceFile($master);
        $drawLicense = function () use ($pdf, $title, $license, $type, $scope, $preview, $margin): void {
            $pdf->AddPage('P', 'A4');
            $pdf->SetTextColor(15, 23, 42);
            if ($preview) {
                $pdf->SetFillColor(225, 29, 72); // Theme accent pink: #E11D48.
                $pdf->SetTextColor(255, 255, 255);
                $pdf->SetFont('DejaVu', 'B', 11);
                $pdf->MultiCell(0, 8, 'TEST / VORSCHAU – keine gültige Lizenz', 0, 'L', true);
                $pdf->SetTextColor(15, 23, 42);
                $pdf->Ln(10);
            }
            $pdf->SetFont('DejaVu', 'B', 20);
            $pdf->MultiCell(0, 10, $title);
            $pdf->Ln(10);
            foreach (['Lizenznehmer' => $license['holder'], 'Lizenznummer' => $license['number'], 'Lizenztyp' => $type, 'Lizenzumfang' => $scope, 'Bestellreferenz' => $license['order_reference']] as $label => $value) {
                $pdf->SetFont('DejaVu', 'B', 10);
                $pdf->MultiCell(0, 6, $label);
                $pdf->SetFont('DejaVu', '', 11);
                $pdf->MultiCell(0, 7, $value);
                $pdf->Ln(6);
            }
            if ($preview) {
                $pdf->SetFont('DejaVu', '', 9);
                $pdf->SetTextColor(100, 116, 139);
                $pdf->MultiCell(0, 6, 'Temporäre Kurzfassung als PDF-Master. Wortlaut und Platzierung sind vorläufig. Dieses Dokument belegt weder einen Kauf noch eine Zahlung.');
            }
        };
        if ($position === 'before') $drawLicense();
        for ($page = 1; $page <= $pages; $page++) {
            $template = $pdf->importPage($page);
            $size = $pdf->getTemplateSize($template);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($template);
        }
        if ($position === 'after') $drawLicense();

        // Exclusive creation prevents accidental replacement of a previously issued document.
        $handle = @fopen($destination, 'xb');
        if (!$handle) throw new RuntimeException('Cannot create the destination PDF.');
        try {
            $bytes = $pdf->Output('S');
            $remaining = $bytes;
            while ($remaining !== '') {
                $written = fwrite($handle, $remaining);
                if (!$written) throw new RuntimeException('Incomplete PDF write.');
                $remaining = substr($remaining, $written);
            }
            fflush($handle);
        } catch (\Throwable $error) {
            fclose($handle);
            unlink($destination);
            throw $error;
        }
        fclose($handle);
        @chmod($destination, 0600);
        return ['source_pages' => $pages, 'output_pages' => $pdf->PageNo(), 'sha256' => hash_file('sha256', $destination)];
    }

    private function text(mixed $value, int $maximum): string
    {
        if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
            throw new InvalidArgumentException('License fields must contain UTF-8 text.');
        }
        $value = trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '');
        if ($value === '' || mb_strlen($value, 'UTF-8') > $maximum) {
            throw new InvalidArgumentException('License field is empty or exceeds its allowed length.');
        }
        return $value;
    }
}
