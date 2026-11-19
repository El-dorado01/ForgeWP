<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

try {
    $configFile = realpath($argv[1] ?? dirname(__DIR__) . '/config/preview.json');
    if (!$configFile) throw new RuntimeException('Configuration file not found.');
    $config = json_decode(file_get_contents($configFile), true, 512, JSON_THROW_ON_ERROR);
    // This entry point intentionally only makes previews, never production licenses.
    if (($config['preview'] ?? null) !== true) throw new RuntimeException('Preview mode must be enabled.');
    $base = dirname($configFile);
    $master = realpath($base . '/' . $config['master']);
    if (!$master) throw new RuntimeException('Master PDF not found.');
    $destination = $base . '/' . $config['output'];
    $outputDirectory = dirname($destination);
    if (!is_dir($outputDirectory) && !mkdir($outputDirectory, 0700, true)) throw new RuntimeException('Cannot create output directory.');
    $result = (new Hospitality2035\Licensing\PersonalizedPdf())->generate($master, $destination, $config['license'], $config['license_page'], true);
    echo json_encode(['file' => realpath($destination)] + $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'PDF preview failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
