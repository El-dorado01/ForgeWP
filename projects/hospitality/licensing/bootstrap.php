<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
    define('ABSPATH', dirname(__DIR__) . '/');
}

$vendorAutoload = is_file(dirname(__DIR__) . '/src/server/plugin/vendor/autoload.php')
    ? dirname(__DIR__) . '/src/server/plugin/vendor/autoload.php'
    : __DIR__ . '/vendor/autoload.php';

if (is_file($vendorAutoload)) {
    require_once $vendorAutoload;
} else {
    if (!class_exists('tFPDF')) require_once __DIR__ . '/vendor/setasign/tfpdf/tfpdf.php';
    if (!class_exists('TTFontFile')) require_once __DIR__ . '/vendor/setasign/tfpdf/font/unifont/ttfonts.php';
    require_once __DIR__ . '/vendor/setasign/fpdi/src/autoload.php';
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'Hospitality2035\\Licensing\\';
    if (str_starts_with($class, $prefix)) {
        $name = substr($class, strlen($prefix));
        $file = dirname(__DIR__) . '/src/server/plugin/src/' . $name . '.php';
        if (preg_match('/^[A-Za-z]+$/', $name) && is_file($file)) {
            require_once $file;
        }
    }
});
