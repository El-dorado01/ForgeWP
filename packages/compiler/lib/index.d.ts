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
  icon?: string;
  labels?: {
    singular?: string;
    plural?: string;
  };
  /** Replaces the default features; [] disables all features (emitted as PHP false). */
  supports?: string[];
  public?: boolean;
  hasArchive?: boolean;
  showInRest?: boolean;
  rewrite?: false | { slug?: string; withFront?: boolean };
}

export interface CustomTaxonomyConfig {
  translatable?: boolean;
  hierarchical?: boolean;
  labels?: {
    singular?: string;
    plural?: string;
  };
  public?: boolean;
  showUi?: boolean;
  showInRest?: boolean;
}

export interface ForgeWPI18nConfig {
  locales: string[];
  defaultLocale: string;
  provider?: 'local' | 'deepl' | 'libretranslate' | 'google' | string;
  /** Optional project-relative JSON response cache for i18n:translate. */
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

export interface ForgeWPPluginContext {
  fs: typeof import('node:fs');
  path: typeof import('node:path');
}

export interface ForgeWPPlugin {
  name: string;
  validateConfig?: (config: ForgeWPThemeConfig, themeRoot: string, context: ForgeWPPluginContext) => void;
  transformFunctionsPhp?: (
    php: string,
    config: ForgeWPThemeConfig,
    themeRoot: string,
    context: ForgeWPPluginContext,
  ) => string;
}

export type ForgeWPFormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox';

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

export interface ForgeWPFormConfirmationConfig {
  enabled: boolean;
  emailField: string;
  subject?: string;
  body?: string;
  /** Named plain-text template in cms/mail/<name>.json. */
  template?: string;
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
  /** Optional private-inbox title template. Supports developer-owned {field} values. */
  submissionTitle?: string;
  /** Plain-text notification email body. Supports {field}; blank uses the default field list. */
  notificationBody?: string;
  /** Named notification default in cms/mail/<name>.json. */
  notificationTemplate?: string;
  /** Visitor-facing success message returned by the native submission endpoint. */
  successMessage?: string;
  /** Dev-owned fields — the fixed part of the server-side allowlist. Required in 'native' mode. */
  fields?: Record<string, ForgeWPFormField>;
  clientFields?: ForgeWPFormClientFieldsConfig;
  /** Store each submission in the forgewp_submission CPT (client inbox). Default true. */
  storeSubmissions?: boolean;
  /** Optional plain-text submitter confirmation. Disabled unless enabled. */
  confirmation?: ForgeWPFormConfirmationConfig;
  /** Permanently delete stored submissions after this many days. No cleanup by default. */
  retentionDays?: number;
}

export interface WpOptionField {
  _type:
    | 'text'
    | 'url'
    | 'email'
    | 'textarea'
    | 'toggle'
    | 'number'
    | 'postPicker';
  label?: string;
  default?: string;
  postType?: string;
}

export type WpOptionsSchema = Record<string, WpOptionField>;

export type ForgeWPSeedStrategy = boolean | 'once' | 'upsert' | 'force';

export interface ForgeWPSeedConfig {
  /**
   * Sync local products from `cms/products.ts` (or `products.json`) into WooCommerce.
   * Default: false
   */
  products?: ForgeWPSeedStrategy;
  /**
   * Sync mock posts, pages, and CPTs from `cms/mock-data.ts` (or `mock-data.json`).
   * A map opts in each post type independently; omitted/false types are disabled,
   * even when invoked with --force. true is equivalent to 'once'.
   * Default: false
   */
  mockData?: ForgeWPSeedStrategy | Record<string, ForgeWPSeedStrategy>;
  /**
   * Automatically sideload remote CDN image URLs into the WordPress Media Library.
   * Default: true
   */
  sideloadImages?: boolean;
  /**
   * Safety guard: Only execute when WP_DEBUG is true, unless explicitly forced.
   * Default: true
   */
  developmentOnly?: boolean;
}

export interface ForgeWPThemeConfig {
  /** Generated style.css requirements. Raise minima for project dependencies; record testedUpTo after WordPress acceptance. */
  compatibility?: {
    requiresWordPress?: string;
    requiresPhp?: string;
    testedUpTo?: string;
  };
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
  /** Declare menu location keys. Labels come from settings.menus; use cms/menus.ts for starter entries. */
  menus?: Record<string, string>;
  presets?: {
    /** Whether to add wp-block-styles theme support. Default: true. */
    wordpressCoreStyles?: boolean;
  };
  headless?: {
    apiUrl?: string;
    jwtAuth?: boolean;
  };
  auth?: {
    loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
    defaultRole?: string;
    /** Profile metadata accepted from public signup. Empty by default; reserved keys cannot be allowed. */
    registrationMetaFields?: string[];
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
  taxonomies?: Record<string, CustomTaxonomyConfig>;
  options?: WpOptionsSchema;
  themeMods?: Record<string, any>;
  seed?: ForgeWPSeedConfig;
  i18n?: ForgeWPI18nConfig;
  settings?: {
    /** Explicit location descriptions, taking precedence over inferred menu labels. */
    menus?: Record<string, { description?: string }>;
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
  /**
   * Capability required to manage form fields and view stored submissions.
   * Defaults to `manage_options`. Granting a lower capability also grants
   * access to submitted form data.
   */
  formsAdminCapability?: string;
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

export interface ForgeWPExportProgress {
  stage: string;
  message: string;
}

export interface ForgeWPExportOptions {
  themeRoot: string;
  skipBuild?: boolean;
  zip?: boolean;
  packageManager?: string;
  validate?: boolean;
  strict?: boolean;
  onProgress?: (progress: ForgeWPExportProgress) => void;
}

export interface ForgeWPExportResult {
  config: ForgeWPThemeConfig;
  outDir: string;
  zipPath: string | null;
  assets: ForgeWPBuildAssets;
}

export function exportTheme(options: ForgeWPExportOptions): Promise<ForgeWPExportResult>;

export interface ForgeWPValidationOptions {
  themeRoot: string;
  outDir: string;
  assets: ForgeWPBuildAssets;
  config: ForgeWPThemeConfig;
  strict?: boolean;
}

export interface ForgeWPValidationResult {
  missing: string[];
  warnings: string[];
}

export function validateExport(options: ForgeWPValidationOptions): Promise<ForgeWPValidationResult>;

export interface ForgeWPHydrationIsland {
  name: string;
  file: string;
  trigger: string;
  preload: string;
  media: string | null;
  connection: string | null;
  clientOnly: boolean;
  smartDiscovered?: boolean;
  rootClassName?: string | null;
  rootClassNameUnresolved?: boolean;
}

export function scanForHydrationIslandsWithProps(themeRoot: string): ForgeWPHydrationIsland[];

/** Parsed editable field records; extra provider-specific metadata is retained. */
export interface ForgeWPEditableField {
  type: string;
  label?: string;
  default?: unknown;
  [key: string]: unknown;
}

export function scanForEditableSchemas(themeRoot: string): Record<string, Record<string, ForgeWPEditableField>>;

export interface ForgeWPIslandDiagnostic {
  name: string;
  sizeKb: number;
  isHeavy: boolean;
  chunkPath: string;
}

export interface ForgeWPHydrationAnalysis {
  heavyCount: number;
  results: ForgeWPIslandDiagnostic[];
  violations?: Array<{
    type: string;
    file: string;
    message: string;
    severity: 'warning' | 'error';
    lineContent?: string;
  }>;
}

export function analyzeHydrationIslands(themeRoot: string, mapping: Record<string, string>): ForgeWPHydrationAnalysis;

export function generateVisualReport(
  themeRoot: string,
  analysis: ForgeWPHydrationAnalysis,
  islandsWithProps: ForgeWPHydrationIsland[],
  config: ForgeWPThemeConfig,
): string;

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
export function forgewpVirtualPlugin(options?: { projectRoot?: string }): any;
