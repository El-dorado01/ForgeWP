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

export interface CustomPostTypeConfig {
  translatable?: boolean;
  labels?: {
    singular?: string;
    plural?: string;
  };
}

export interface ForgeWPI18nConfig {
  locales: string[];
  defaultLocale: string;
  provider?: 'local' | 'deepl' | 'libretranslate' | 'google' | string;
  cache?: string;
  providerConfig?: {
    apiKey?: string;
    endpoint?: string;
  };
}

export interface ForgeWpSeoSitemapsConfig {
  postTypes: string[];
  taxonomies: string[];
}

export interface ForgeWPPlugin {
  name: string;
  validateConfig?: (config: ForgeWPThemeConfig, themeRoot: string) => void;
  transformFunctionsPhp?: (php: string, config: ForgeWPThemeConfig, themeRoot: string) => string;
}

export interface ForgeWPThemeConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  textDomain: string;
  configVersion?: number;
  favicon?: string;
  seo?: {
    sitemaps?: ForgeWpSeoSitemapsConfig;
    plugins?: {
      yoast?: boolean;
      rankMath?: boolean;
    };
  };
  frameworkAdapter?: 'react' | 'html' | 'stub';
  style?: 'forgewp' | 'shadcn';
  postTypes?: Record<string, CustomPostTypeConfig>;
  i18n?: ForgeWPI18nConfig;
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
  plugins?: ForgeWPPlugin[];
}



export interface ForgeWPBuildAssets {
  cssFile: string;
  jsFile?: string;
}

export interface ForgeWPStaticMarkup {
  appHtml: string;
  headerHtml?: string;
  footerHtml?: string;
  headHtml?: string;
  singleHtml?: string;
  singleHeadHtml?: string;
  notFoundHtml?: string;
  archiveHtml?: string;
}

export interface ForgeWPFrameworkAdapter {
  renderStaticMarkup(
    themeRoot: string,
  ): Promise<ForgeWPStaticMarkup> | ForgeWPStaticMarkup;
  scanForHydrationIslands(themeRoot: string): string[];
  findComponentPath(themeRoot: string, kebabName: string): string | null;
  getHydrationRollupInputs(themeRoot: string): Record<string, string>;
  onFresh?(themeRoot: string): Promise<void> | void;
  onMakeBlock?(
    themeRoot: string,
    options: {
      pascalCase: string;
      readableTitle: string;
      attributesList: string[];
      pc: any;
    },
  ): Promise<void> | void;
  onMakeComponent?(
    themeRoot: string,
    options: {
      pascalCase: string;
      postType: string;
      customFields: string[];
      automaticallySeeded: boolean;
      pc: any;
    },
  ): Promise<void> | void;
  onSyncRoutes?(
    themeRoot: string,
    options: {
      routesToScaffold: Array<{ path: string; title: string }>;
      isForce: boolean;
      pc: any;
    },
  ): Promise<void> | void;
  getCriticalFiles?(themeRoot: string): string[];
}

export type ForgeWPFrameworkAdapterModule = ForgeWPFrameworkAdapter & {
  default?: ForgeWPFrameworkAdapter;
};

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

export function defineConfig(config: ForgeWPThemeConfig): ForgeWPThemeConfig;

export function validateCriticalFiles(themeRoot: string): void;

export function scanForHydrationIslands(themeRoot: string): string[];

export function findComponentPath(
  themeRoot: string,
  kebabName: string,
): string | null;

export function getHydrationRollupInputs(
  themeRoot: string,
): Record<string, string>;

export function resolveFrameworkAdapter(adapterName?: string): string;

export function loadFrameworkAdapter(
  adapterName?: string,
): Promise<ForgeWPFrameworkAdapterModule>;
