<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
$data = json_decode(file_get_contents(dirname(__DIR__) . '/config/invoice-preview.json'), true, 512, JSON_THROW_ON_ERROR);
if (($data['test'] ?? false) !== true) throw new RuntimeException('This preview must be a test invoice.');
$file = dirname(__DIR__) . '/output/invoice-preview.pdf';
if (!is_dir(dirname($file))) mkdir(dirname($file), 0700, true);
$hash = \Hospitality2035\Licensing\InvoicePdf::generate($data, 'TEST-H2035-RE-2026-000001', $file);
echo $file . "\nSHA256: " . $hash . "\n";
