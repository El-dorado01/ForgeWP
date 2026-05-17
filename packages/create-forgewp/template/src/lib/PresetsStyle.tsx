import wpConfig from "../../wp.config";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

/**
 * PresetsStyle component — Internal system component.
 *
 * Dynamically injects WordPress-preset CSS Custom Properties and enqueues Google Fonts
 * during local Vite development, keeping your styles perfectly in sync with WordPress.
 * In production builds, this returns null and is completely skipped since WordPress
 * native styles are enqueued automatically.
 */
export function PresetsStyle() {
  if (!IS_DEV) return null;

  // Local development fallbacks for WordPress CSS presets
  const colors = wpConfig.settings?.color?.palette || [];
  const fontSizes = wpConfig.settings?.typography?.fontSizes || [];
  const fontFamilies = wpConfig.settings?.typography?.fontFamilies || [];
  const layout = wpConfig.settings?.layout || {};
  const googleFonts = wpConfig.settings?.typography?.googleFonts || [];

  // Parse and build Google Fonts href for dev injection
  const fontsHtml = googleFonts.length > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=${googleFonts.map(f => encodeURIComponent(f)).join("&family=")}&display=swap" rel="stylesheet">`
    : "";

  const css = `
:root {
  ${colors.map((c) => `--wp--preset--color--${c.slug}: ${c.color};`).join("\n  ")}
  ${fontSizes.map((f) => `--wp--preset--font-size--${f.slug}: ${f.size};`).join("\n  ")}
  ${fontFamilies.map((f) => `--wp--preset--font-family--${f.slug}: ${f.fontFamily};`).join("\n  ")}
  ${layout.contentSize ? `--wp--style--global--content-size: ${layout.contentSize};` : ""}
  ${layout.wideSize ? `--wp--style--global--wide-size: ${layout.wideSize};` : ""}
}
  `;

  return (
    <>
      {fontsHtml && <span dangerouslySetInnerHTML={{ __html: fontsHtml }} />}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
