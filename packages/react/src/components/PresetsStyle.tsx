export interface PresetsStyleProps {
  style?: "forgewp" | "shadcn" | string;
  palette?: Array<{ slug: string; color: string; name?: string }>;
  fontSizes?: Array<{ slug: string; size: string; name?: string }>;
  fontFamilies?: Array<{ slug: string; fontFamily: string; name?: string }>;
  googleFonts?: string[];
  contentSize?: string;
  wideSize?: string;
}

/**
 * PresetsStyle component.
 *
 * Dynamically injects WordPress-preset CSS Custom Properties and enqueues Google Fonts
 * during local development, keeping your styles perfectly in sync with WordPress presets.
 */
export function PresetsStyle(props: PresetsStyleProps = {}) {
  const IS_DEV =
    typeof import.meta !== "undefined" &&
    // @ts-ignore
    import.meta.env?.DEV === true;

  const themeStyle = props.style || "forgewp";

  // Production build: inject registry-aesthetic design properties
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
  const colors = props.palette || [];
  const fontSizes = props.fontSizes || [];
  const fontFamilies = props.fontFamilies || [];
  const googleFonts = props.googleFonts || [];

  const fontsHtml = googleFonts.length > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=${googleFonts.map((f: string) => encodeURIComponent(f)).join("&family=")}&display=swap" rel="stylesheet">`
    : "";

  const devCss = `
:root {
  ${colors.map((c) => "--wp--preset--color--" + c.slug + ": " + c.color + ";").join("\n  ")}
  ${fontSizes.map((f) => "--wp--preset--font-size--" + f.slug + ": " + f.size + ";").join("\n  ")}
  ${fontFamilies.map((f) => "--wp--preset--font-family--" + f.slug + ": " + f.fontFamily + ";").join("\n  ")}
  ${props.contentSize ? "--wp--style--global--content-size: " + props.contentSize + ";" : ""}
  ${props.wideSize ? "--wp--style--global--wide-size: " + props.wideSize + ";" : ""}

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

export default PresetsStyle;
