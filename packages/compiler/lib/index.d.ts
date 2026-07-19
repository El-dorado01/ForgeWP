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

export type ForgeWPFormFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';

export interface ForgeWPFormField {
  type: ForgeWPFormFieldType;
  label?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
  placeholder?: string;
}

export type ForgeWPFormFieldSeed = Array<ForgeWPFormField & { name: string }>;

export interface ForgeWPFormClientFieldsConfig {
  enabled: boolean;
  /**
   * Initial client-owned field set. A flat array is used for every configured
   * locale (fine for a single-language theme, or as a same-content starting
   * point before translating). For a theme with `i18n.locales.length > 1`,
   * provide a per-locale map instead so each language seeds independently —
   * client-owned labels/options are runtime content, not compiled strings,
   * so they can't go through the usual __()/translations.json pipeline.
   */
  seed: ForgeWPFormFieldSeed | Record<string, ForgeWPFormFieldSeed>;
}

export interface ForgeWPFormConfig {
  /**
   * 'native' (default): ForgeWP generates the REST endpoint, mail delivery,
   * optional submission storage, and the wp-admin field editor. Requires
   * `mailTo` and `fields`.
   *
   * 'shortcode': escape hatch for clients who want to self-manage a form
   * entirely inside a WordPress plugin (CF7, WPForms, Gravity…). ForgeWP
   * generates none of the above — the developer renders the plugin's
   * markup directly with <WpShortcode code={...} />. Requires `shortcode`.
   * `mailTo`, `fields`, `clientFields`, and `storeSubmissions` are ignored.
   */
  mode?: 'native' | 'shortcode';
  /** Default/example shortcode string for 'shortcode' mode, e.g. '[contact-form-7 id="58" title="Contact Form"]'. */
  shortcode?: string;
  /** 'admin' → get_option('admin_email'); or a literal email;
   *  or 'option:some_key' → get_option('some_key'). Required in 'native' mode. */
  mailTo?: string;
  /** Email subject line. Supports {field} interpolation from submitted values. */
  subject?: string;
  /** Dev-owned fields — the fixed part of the server-side allowlist. Required in 'native' mode. */
  fields?: Record<string, ForgeWPFormField>;
  clientFields?: ForgeWPFormClientFieldsConfig;
  /** Store each submission in the forgewp_submission CPT (client inbox). Default true. */
  storeSubmissions?: boolean;
}

export interface WpOptionField {
  _type: 'text' | 'url' | 'email' | 'textarea' | 'toggle' | 'number' | 'postPicker';
  label?: string;
  default?: string;
  postType?: string;
}

export type WpOptionsSchema = Record<string, WpOptionField>;

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
      blockLoginUntilVerified?: boolean;
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
  options?: WpOptionsSchema;
  themeMods?: Record<string, any>;
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
  forms?: Record<string, ForgeWPFormConfig>;
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
  onMakeShell?(
    themeRoot: string,
    options: {
      pascalCase: string;
      nameSlug: string;
      readableTitle: string;
      childrenSlugs: string[];
      shell: { className?: string; gridClassName?: string };
      innerBlocks: {
        allowedBlocks?: string[];
        template?: Array<[string, Record<string, any>?]>;
        templateLock?: boolean | 'all' | 'insert';
        orientation?: 'horizontal' | 'vertical';
      };
      category: string;
      icon: string;
      description: string;
      pc: any;
    },
  ): Promise<void> | void;
  onMakeLoop?(
    themeRoot: string,
    options: {
      pascalCase: string;
      postType: string;
      customFields: string[];
      automaticallySeeded: boolean;
      pc: any;
    },
  ): Promise<void> | void;
  onMakePage?(
    themeRoot: string,
    options: {
      pascalCase: string;
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

export function forgewpPageConfigPlugin(): any;

