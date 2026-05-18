import type { ForgeWPThemeConfig } from "./src/.forgewp/forgewp-config";

const config: ForgeWPThemeConfig = {
  name: "ForgeWP Starter",
  slug: "forgewp-starter",
  version: "0.2.0",
  description: "A premium block-theme built with React, Tailwind CSS, and ForgeWP.",
  textDomain: "forgewp-starter",
  style: "forgewp", // "forgewp" (sharp neo-brutalist) or "shadcn" (smooth modern curves)

  settings: {
    layout: {
      contentSize: "720px",
      wideSize: "1200px",
    },
    color: {
      custom: true,
      palette: [
        { name: "Brand Primary", slug: "brand", color: "#2563eb" },
        { name: "Brand Secondary", slug: "secondary", color: "#4f46e5" },
        { name: "Accent Amber", slug: "accent", color: "#f59e0b" },
        { name: "Background Light", slug: "background", color: "#fafafa" },
        { name: "Text Slate", slug: "text", color: "#0f172a" },
      ],
    },
    typography: {
      fontSizes: [
        { name: "Small", slug: "sm", size: "0.875rem" },
        { name: "Base", slug: "base", size: "1rem" },
        { name: "Large", slug: "lg", size: "1.125rem" },
        { name: "Extra Large", slug: "xl", size: "1.25rem" },
      ],
      fontFamilies: [
        { name: "Sans Serif (Outfit)", slug: "sans", fontFamily: "Outfit, system-ui, sans-serif" },
        { name: "Serif (Lora)", slug: "serif", fontFamily: "Lora, Georgia, serif" },
      ],
      googleFonts: [
        "Outfit:wght@300;400;500;600;700",
        "Lora:ital,wght@0,400;0,500;1,400",
      ],
    },
  },
};

export default config;
