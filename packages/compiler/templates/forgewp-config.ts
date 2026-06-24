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
  headerPath?: string;
  footerPath?: string;
  seo?: {
    sitemaps?: ForgeWpSeoSitemapsConfig;
    plugins?: {
      yoast?: boolean;
      rankMath?: boolean;
    };
  };
  frameworkAdapter?: 'react' | 'html' | 'stub';
  style?: 'forgewp' | 'shadcn';
  headless?: {
    apiUrl?: string;
    jwtAuth?: boolean;
  };
  auth?: {
    loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
    defaultRole?: string;
    reservedUsernames?: string[];
    features?: {
      registration?: boolean;
      emailVerification?: boolean;
      autoLoginAfterSignup?: boolean;
    };
    emails?: {
      verification?: {
        subject?: string;
        body?: string;
      };
      passwordReset?: {
        subject?: string;
        body?: string;
      };
    };
  };
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
