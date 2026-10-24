import {
  exportTheme,
  validateExport,
  scanForHydrationIslandsWithProps,
  scanForEditableSchemas,
  analyzeHydrationIslands,
  generateVisualReport,
  defineConfig,
  type ForgeWPThemeConfig,
  type ForgeWPExportOptions,
  type ForgeWPExportResult,
  type ForgeWPPlugin,
  type ForgeWPPluginContext,
  type ForgeWPValidationResult,
  type ForgeWPHydrationIsland,
} from '@forgewp/compiler';
import { defineConfig as defineConfigSubpath } from '@forgewp/compiler/define-config';

// Compile only: do not execute an export as part of a declaration check.
export function publicApiContract(
  config: ForgeWPThemeConfig,
  context: ForgeWPPluginContext
) {
  const options: ForgeWPExportOptions = {
    themeRoot: '.',
    validate: true,
    strict: true,
    zip: false,
    skipBuild: true,
    onProgress(progress) {
      const stage: string = progress.stage;
      const message: string = progress.message;
      void stage;
      void message;
    },
  };
  const exported: Promise<ForgeWPExportResult> = exportTheme(options);
  const validation: Promise<ForgeWPValidationResult> = validateExport({
    themeRoot: '.',
    outDir: '.forgewp/out/test',
    assets: { cssFile: 'assets/app.css' },
    config,
    strict: true,
  });
  const islands: ForgeWPHydrationIsland[] =
    scanForHydrationIslandsWithProps('.');
  const fields = scanForEditableSchemas('.');
  const fieldType: string = fields['about']['heading'].type;
  const analysis = analyzeHydrationIslands('.', { menu: 'assets/menu.js' });
  const size: number = analysis.results[0].sizeKb;
  const report: string = generateVisualReport('.', analysis, islands, config);
  const plugin: ForgeWPPlugin = {
    name: 'typed-context',
    validateConfig(theme, root, { fs, path }) {
      const exists: boolean = fs.existsSync(path.join(root, 'wp.config.ts'));
      void theme;
      void exists;
    },
    transformFunctionsPhp(php, theme, root, { path }) {
      return php + `\n// ${theme.slug}: ${path.basename(root)}`;
    },
  };
  // Existing plugins that need fewer parameters remain assignable.
  const simple: ForgeWPPlugin = {
    name: 'simple',
    validateConfig() {},
    transformFunctionsPhp: (php) => php,
  };
  plugin.validateConfig?.(config, '.', context);
  defineConfigSubpath(defineConfig(config));
  // @ts-expect-error Export options reject misspelled/unknown flags.
  exportTheme({ themeRoot: '.', validation: true });
  // @ts-expect-error Validation needs the generated asset/config context.
  validateExport({ themeRoot: '.', outDir: '.' });
  // @ts-expect-error Report arguments follow the runtime order.
  generateVisualReport(analysis, '.', islands, config);
  // @ts-expect-error Progress data is not an untyped payload.
  options.onProgress?.({ stage: 123, message: 'test' });
  void exported;
  void validation;
  void fieldType;
  void size;
  void report;
  void simple;
}
