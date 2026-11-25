<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

defined('ABSPATH') || exit;

use RuntimeException;
use setasign\Fpdi\Tfpdf\Fpdi;

final class Storage
{
    public static function root(): string {
        $path = defined('H2035_PRIVATE_DIR') ? H2035_PRIVATE_DIR : dirname(rtrim(ABSPATH, '/\\')) . '/hospitality-2035-private';
        if (!is_string($path) || !path_is_absolute($path)) throw new RuntimeException('private_path_invalid');
        if (!is_dir($path) && !wp_mkdir_p($path)) throw new RuntimeException('private_storage_unwritable');
        $resolved = realpath($path);
        $publicRoots = [realpath(ABSPATH), realpath(WP_CONTENT_DIR)];
        if (!empty($_SERVER['DOCUMENT_ROOT'])) $publicRoots[] = realpath($_SERVER['DOCUMENT_ROOT']);
        foreach ($publicRoots as $public) {
            if ($public && str_starts_with(strtolower(wp_normalize_path($resolved)) . '/', strtolower(wp_normalize_path($public)) . '/')) {
                throw new RuntimeException('private_storage_inside_public_root');
            }
        }
        if (!is_writable($resolved)) throw new RuntimeException('private_storage_unwritable');
        @chmod($resolved, 0700);
        return $resolved;
    }

    public static function file(string $name): string {
        if (!preg_match('/^(master|license|invoice)-[a-f0-9]{64}\.pdf$/', $name)) throw new RuntimeException('private_file_invalid');
        $path = self::root() . DIRECTORY_SEPARATOR . $name;
        if (is_link($path)) throw new RuntimeException('private_file_symlink');
        return $path;
    }

    public static function importMaster(string $source): string {
        if (!is_file($source) || !is_readable($source) || filesize($source) > 100 * 1024 * 1024) throw new RuntimeException('master_invalid');
        $handle = fopen($source, 'rb');
        $header = fread($handle, 1024);
        fclose($handle);
        if (!str_contains($header, '%PDF-')) throw new RuntimeException('master_not_pdf');
        $pdf = new Fpdi();
        if ($pdf->setSourceFile($source) < 1) throw new RuntimeException('master_empty');
        $pdf->importPage(1); // Detect unsupported compression/encryption before saving settings.
        $pdf->cleanUp(true);
        $name = 'master-' . hash_file('sha256', $source) . '.pdf';
        $target = self::file($name);
        if (!file_exists($target)) {
            $output = fopen($target, 'xb');
            if (!$output) throw new RuntimeException('master_copy_failed');
            $input = fopen($source, 'rb');
            try {
                if (stream_copy_to_stream($input, $output) !== filesize($source)) throw new RuntimeException('master_copy_failed');
            } finally { fclose($input); fclose($output); }
            @chmod($target, 0600);
        }
        if (hash_file('sha256', $target) !== hash_file('sha256', $source)) throw new RuntimeException('master_hash_mismatch');
        return $name;
    }

    public static function fontCacheDir(): string
    {
        $base = self::root() . '/font-cache';
        $unifont = $base . '/unifont';
        if (!is_dir($unifont) && !@mkdir($unifont, 0700, true)) {
            throw new RuntimeException('font_cache_mkdir_failed');
        }
        $resolved = realpath($base);
        if (!$resolved || !is_writable($unifont)) {
            throw new RuntimeException('font_cache_unwritable');
        }
        @chmod($resolved, 0700);
        @chmod($unifont, 0700);
        return rtrim($resolved, '/\\') . '/';
    }
}
