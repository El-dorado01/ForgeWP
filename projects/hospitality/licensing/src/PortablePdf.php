<?php
declare(strict_types=1);
namespace Hospitality2035\Licensing;

/** tFPDF metrics caches contain absolute paths; always bind fonts to this installation. */
final class PortablePdf extends \setasign\Fpdi\Tfpdf\Fpdi
{
    public function AddFont($family, $style = '', $file = '', $uni = false)
    {
        parent::AddFont($family, $style, $file, $uni);
        if (!$uni) return;
        $style = strtoupper($style);
        if ($style === 'IB') $style = 'BI';
        $key = strtolower($family) . $style;
        if ($file === '') $file = str_replace(' ', '', strtolower($family)) . strtolower($style) . '.ttf';
        $path = defined('_SYSTEM_TTFONTS') && is_file(_SYSTEM_TTFONTS . $file)
            ? _SYSTEM_TTFONTS . $file : $this->fontpath . 'unifont/' . $file;
        $this->fonts[$key]['ttffile'] = $path;
        $this->FontFiles[$key]['ttffile'] = $path;
    }
}
