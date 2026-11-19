<?php
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

use Hospitality2035\Licensing\PersonalizedPdf;
use setasign\Fpdi\Tfpdf\Fpdi;

function verify(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: $message\n";
}
function rejects(callable $call, string $message): void {
    try { $call(); } catch (InvalidArgumentException $error) { verify(true, $message); return; }
    throw new RuntimeException('Expected rejection: ' . $message);
}

$config = json_decode(file_get_contents(dirname(__DIR__) . '/config/preview.json'), true, 512, JSON_THROW_ON_ERROR);
$master = realpath(dirname(__DIR__) . '/config/' . $config['master']);
$originalHash = hash_file('sha256', $master);
$directory = sys_get_temp_dir() . '/hospitality-pdf-test-' . bin2hex(random_bytes(8));
mkdir($directory, 0700);
$generator = new PersonalizedPdf();
try {
    $first = $generator->generate($master, $directory . '/first.pdf', $config['license'], $config['license_page'], true);
    verify($first['source_pages'] > 0 && $first['output_pages'] === $first['source_pages'] + 1, 'All study pages plus one license page');
    $reader = new Fpdi();
    verify($reader->setSourceFile($directory . '/first.pdf') === $first['output_pages'], 'Generated PDF can be parsed independently');
    $secondLicense = $config['license'];
    $secondLicense['holder'] = 'Zürich & Söhne – Großunternehmen';
    $secondLicense['number'] = 'TEST-H2035-000002';
    $layout = $config['license_page'];
    $layout['position'] = 'after';
    $second = $generator->generate($master, $directory . '/second.pdf', $secondLicense, $layout, true);
    verify($first['sha256'] !== $second['sha256'], 'Different license details produce different PDFs');
    verify($reader->setSourceFile($directory . '/second.pdf') === $first['output_pages'], 'Trailing license-page layout also imports all pages');
    rejects(fn() => $generator->generate($master, $directory . '/first.pdf', $config['license'], $layout, true), 'Existing issued file cannot be overwritten');
    $invalid = $config['license'];
    $invalid['holder'] = '';
    rejects(fn() => $generator->generate($master, $directory . '/invalid.pdf', $invalid, $layout, true), 'Empty license holder rejected');
    $invalid['holder'] = str_repeat('ä', 201);
    rejects(fn() => $generator->generate($master, $directory . '/invalid.pdf', $invalid, $layout, true), 'Overlong Unicode holder rejected');
    verify(!file_exists($directory . '/invalid.pdf'), 'Invalid data creates no deliverable');
    verify(hash_file('sha256', $master) === $originalHash, 'Public preview source remains unchanged');
} finally {
    if (isset($reader)) $reader->cleanUp(true);
    foreach (glob($directory . '/*.pdf') as $file) unlink($file);
    rmdir($directory);
}
