<?php
declare(strict_types=1);

// Composer is preferred. Explicit loading also supports verified official-file installs.
if (is_file(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    if (!class_exists('tFPDF')) require_once __DIR__ . '/vendor/setasign/tfpdf/tfpdf.php';
    if (!class_exists('TTFontFile')) require_once __DIR__ . '/vendor/setasign/tfpdf/font/unifont/ttfonts.php';
    require_once __DIR__ . '/vendor/setasign/fpdi/src/autoload.php';
}
spl_autoload_register(static function (string $class): void {
    $prefix = 'Hospitality2035\\Licensing\\';
    if (str_starts_with($class, $prefix)) {
        $name = substr($class, strlen($prefix));
        if (preg_match('/^[A-Za-z]+$/', $name) && is_file(__DIR__ . '/src/' . $name . '.php')) {
            require_once __DIR__ . '/src/' . $name . '.php';
        }
    }
});
