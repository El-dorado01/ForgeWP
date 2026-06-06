import { defineConfig } from "@forgewp/compiler/define-config";

export default defineConfig({
  name: "Hotelchecker24",
  slug: "hotelchecker24",
  version: "1.0.0",
  description: "Premium Hotel Directory & Listicle Theme",
  textDomain: "hotelchecker24",
  frameworkAdapter: "react",
  style: "shadcn",
  i18n: {
    locales: ["en", "de"],
    defaultLocale: "en",
    provider: "local",
  },

  postTypes: {
    listicle: {
      translatable: true,
      labels: {
        singular: "Hotel Comparison",
        plural: "Hotel Comparisons",
      }
    },
    hotel: {
      translatable: true,
    }
  },

  settings: {
    layout: {
      contentSize: "720px",
      wideSize: "1200px",
    },
    color: {
      custom: true,
      palette: [
        { name: "Brand Primary (Steel Blue)", slug: "brand", color: "#6d9bae" },
        { name: "Brand Accent (Lemon Green)", slug: "accent", color: "#929f5d" },
        { name: "Background Light", slug: "background", color: "#fafafa" },
        { name: "Text Slate", slug: "text", color: "#1e293b" },
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
        { name: "Ubuntu", slug: "sans", fontFamily: "Ubuntu, system-ui, sans-serif" },
        { name: "Ubuntu Heading", slug: "heading", fontFamily: "Ubuntu, system-ui, sans-serif" },
        { name: "Serif (Lora)", slug: "serif", fontFamily: "Lora, Georgia, serif" },
        { name: "Mono (Serif)", slug: "mono", fontFamily: "Lora, Georgia, serif" },
      ],
      googleFonts: [
        "Ubuntu:wght@300;400;500;700",
        "Lora:ital,wght@0,400;0,500;1,400",
      ],
    },
  },
});
