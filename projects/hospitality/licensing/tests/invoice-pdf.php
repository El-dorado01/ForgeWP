<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use Hospitality2035\Licensing\InvoicePdf;
use setasign\Fpdi\Tfpdf\Fpdi;
$data = json_decode(file_get_contents(dirname(__DIR__) . '/config/invoice-preview.json'), true, 512, JSON_THROW_ON_ERROR);
$directory = sys_get_temp_dir() . '/h2035-invoice-' . bin2hex(random_bytes(6));
mkdir($directory, 0700);
try {
    if (InvoicePdf::money(29631, 'EUR') !== '296,31 EUR') throw new RuntimeException('Money formatting changed');
    echo "PASS: Invoice money formatting retains exact cents\n";
    InvoicePdf::generate($data, 'TEST-H2035-RE-2026-000001', $directory . '/first.pdf');
    $reader = new Fpdi();
    if ($reader->setSourceFile($directory . '/first.pdf') !== 1) throw new RuntimeException('Typical invoice must fit one page');
    echo "PASS: Standard invoice is a parseable single-page PDF\n";
    $reader->cleanUp(true);
    try { InvoicePdf::generate($data, 'TEST-H2035-RE-2026-000002', $directory . '/first.pdf'); throw new LogicException('Overwrite allowed'); }
    catch (RuntimeException $error) { echo "PASS: Existing invoice PDF cannot be overwritten\n"; }
} finally {
    foreach (glob($directory . '/*.pdf') as $file) unlink($file);
    rmdir($directory);
}
