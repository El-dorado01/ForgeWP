<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

defined('ABSPATH') || exit;

/** tFPDF metrics caches contain absolute paths; write caches to private storage instead of vendor/. */
final class PortablePdf extends \setasign\Fpdi\Tfpdf\Fpdi
{
    public function AddFont($family, $style = '', $file = '', $uni = false)
    {
        if (!$uni) {
            parent::AddFont($family, $style, $file, $uni);
            return;
        }
        $styleNorm = strtoupper($style);
        if ($styleNorm === 'IB') $styleNorm = 'BI';
        $key = strtolower($family) . $styleNorm;
        if ($file === '') $file = str_replace(' ', '', strtolower($family)) . strtolower($styleNorm) . '.ttf';

        $origFontPath = $this->fontpath;
        $vendorUnifont = defined('FORGEWP_COMPANION_HOSPITALITY_DIR')
            ? FORGEWP_COMPANION_HOSPITALITY_DIR . 'vendor/setasign/tfpdf/font/unifont/'
            : $origFontPath . 'unifont/';
        $cacheDir = Storage::fontCacheDir();
        $cacheUnifont = $cacheDir . 'unifont/';

        if (!defined('_SYSTEM_TTFONTS')) {
            define('_SYSTEM_TTFONTS', $vendorUnifont);
        } elseif (!is_file(_SYSTEM_TTFONTS . $file) && is_file($vendorUnifont . $file) && !is_file($cacheUnifont . $file)) {
            @copy($vendorUnifont . $file, $cacheUnifont . $file);
        }

        $this->fontpath = $cacheDir;
        try {
            parent::AddFont($family, $style, $file, $uni);
        } finally {
            $this->fontpath = $origFontPath;
        }

        $path = is_file(_SYSTEM_TTFONTS . $file) ? _SYSTEM_TTFONTS . $file : $cacheUnifont . $file;
        $this->fonts[$key]['ttffile'] = $path;
        $this->FontFiles[$key]['ttffile'] = $path;
    }
}
