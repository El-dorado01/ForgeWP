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
 * In production builds, this returns only the registry-aesthetic design tokens (like --radius)
 * to keep shadcn components and theme variables responsive to your config.
 */
export function PresetsStyle() {
  const themeStyle = wpConfig.style || "forgewp";

  // Production build: only inject custom registry-aesthetic design properties
  if (!IS_DEV) {
    const prodCss = `
:root {
  --radius: ${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: ${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: ${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: ${themeStyle === "forgewp" ? "4px" : "0px"};
}
    `;
    return <style dangerouslySetInnerHTML={{ __html: prodCss }} />;
  }

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

  const devCss = `
:root {
  ${colors.map((c) => `--wp--preset--color--${c.slug}: ${c.color};`).join("\n  ")}
  ${fontSizes.map((f) => `--wp--preset--font-size--${f.slug}: ${f.size};`).join("\n  ")}
  ${fontFamilies.map((f) => `--wp--preset--font-family--${f.slug}: ${f.fontFamily};`).join("\n  ")}
  ${layout.contentSize ? `--wp--style--global--content-size: ${layout.contentSize};` : ""}
  ${layout.wideSize ? `--wp--style--global--wide-size: ${layout.wideSize};` : ""}

  /* Registry Aesthetic Mode Custom Properties */
  --radius: ${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: ${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: ${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: ${themeStyle === "forgewp" ? "4px" : "0px"};
}
  `;

  return (
    <>
      {fontsHtml && <span dangerouslySetInnerHTML={{ __html: fontsHtml }} />}
      <style dangerouslySetInnerHTML={{ __html: devCss }} />
    </>
  );
}
