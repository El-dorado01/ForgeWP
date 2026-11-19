# Third-party dependencies

- FPDI 2.6.9, Setasign GmbH & Co. KG. MIT. Source and license:
  https://github.com/Setasign/FPDI/tree/d97ade6368aa0b51b6316d5dc16a567e2bf60167
  (`vendor/setasign/fpdi/LICENSE.txt`).
- tFPDF 1.34, Ian Back, Tycho Veltmeijer, Olivier Plathey. LGPL-2.1 as
  declared in its Composer metadata. Unmodified source:
  https://github.com/Setasign/tFPDF/tree/69b06444b929e0d54ffbb5efcadfe97ecbad831b
  (`vendor/setasign/tfpdf/README.txt`, `tfpdf.php`).
- DejaVu fonts, Bitstream Vera/DejaVu license. See
  `vendor/setasign/tfpdf/font/unifont/DejaVu_LICENSE.txt`.

Dependency versions and source commits are locked in `composer.lock`. These
libraries are separate from the Hospitality plugin code; their notices and
applicable license terms remain in effect. No paid library or external PDF
generation service is used.
