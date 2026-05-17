export interface ColorPreset {
  name: string;
  slug: string;
  color: string;
}

export interface FontSizePreset {
  name: string;
  slug: string;
  size: string;
}

export interface FontFamilyPreset {
  name: string;
  slug: string;
  fontFamily: string;
}

export interface ForgeWPThemeConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  textDomain: string;
  style?: "forgewp" | "shadcn";
  settings?: {
    layout?: {
      contentSize?: string;
      wideSize?: string;
    };
    color?: {
      palette?: ColorPreset[];
      custom?: boolean;
    };
    typography?: {
      fontSizes?: FontSizePreset[];
      fontFamilies?: FontFamilyPreset[];
      googleFonts?: string[];
    };
  };
}

export interface ForgeWPBuildAssets {
  cssFile: string;
}

export function exportTheme(options: {
  themeRoot: string;
  skipBuild?: boolean;
  zip?: boolean;
  packageManager?: string;
}): Promise<{
  config: ForgeWPThemeConfig;
  outDir: string;
  zipPath: string | null;
  assets: ForgeWPBuildAssets;
}>;

export function loadConfig(themeRoot: string): Promise<ForgeWPThemeConfig>;

export function validateCriticalFiles(themeRoot: string): void;
