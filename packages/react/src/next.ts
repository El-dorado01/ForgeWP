/**
 * @forgewp/react/next
 *
 * Next.js configuration wrapper for the ForgeWP Next.js App Router adapter.
 * Encapsulates:
 * - Boundary-selected static export (`output: 'export'` by default for native
 *   WordPress theme extraction, or standard Next server output when
 *   `FORGEWP_DEPLOYMENT_MODE=decoupled`).
 * - `transpilePackages: ['@forgewp/react']` so Next compiles ForgeWP's source package.
 * - Webpack `resolve.extensionAlias` mapping `.js` -> `['.ts', '.tsx', '.js']`
 *   so non-Vite webpack builds resolve TypeScript source imports cleanly.
 */

export type ForgeWPNextDeploymentMode = 'native' | 'decoupled';

export interface ForgeWPNextAutoHydrateOptions {
  /** Default ForgeWP hydration trigger for auto-wrapped islands (default: `'visible'`). */
  defaultTrigger?: 'visible' | 'load' | 'idle' | 'interaction';
}

export interface ForgeWPNextOptions {
  /**
   * Override deployment mode. Defaults to `process.env.FORGEWP_DEPLOYMENT_MODE`
   * (`'decoupled'` vs `'native'`).
   */
  deploymentMode?: ForgeWPNextDeploymentMode;
  /**
   * Additional workspace or ForgeWP packages to include in `transpilePackages`.
   */
  transpilePackages?: string[];
  /**
   * When enabled, automatically detects interactive `'use client'` components
   * rendered inside App Router pages (`src/app/` or `app/`) during
   * `FORGEWP_NATIVE_EXPORT=1` and wraps them in `<Hydrate>` (excluding `src/blocks/`,
   * `defineBlock`, `@forgewp-no-hydrate`, and components already wrapped in `<Hydrate>`).
   */
  autoHydrate?: boolean | ForgeWPNextAutoHydrateOptions;
}

export interface ForgeWPNextLikeConfig {
  output?: string;
  transpilePackages?: string[];
  webpack?: (config: any, context: any) => any;
  [key: string]: any;
}

function readEnvDeploymentMode(): ForgeWPNextDeploymentMode {
  const raw =
    (globalThis as any).process?.env?.FORGEWP_DEPLOYMENT_MODE ?? 'native';
  return raw === 'decoupled' ? 'decoupled' : 'native';
}

function isNativeExportEnv(): boolean {
  return (globalThis as any).process?.env?.FORGEWP_NATIVE_EXPORT === '1';
}

function resolveLocalLoaderPath(filename: string): string {
  const selfUrl = String(import.meta.url || '');
  const withoutProtocol = selfUrl.replace(/^file:\/\//i, '');
  const decoded = decodeURIComponent(withoutProtocol);
  // Strip leading slash on Windows drive paths (e.g. /C:/foo -> C:/foo)
  const normalized = /^\/[A-Za-z]:\//.test(decoded) ? decoded.slice(1) : decoded;
  const lastSlash = normalized.lastIndexOf('/');
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash) : '.';
  return `${dir}/${filename}`;
}

/**
 * Wrap a Next.js configuration object with ForgeWP's required build and module
 * resolution settings for both native WordPress theme export and decoupled
 * Next.js deployment.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import type { NextConfig } from 'next';
 * import { withForgeWP } from '@forgewp/react/next';
 *
 * const nextConfig: NextConfig = withForgeWP({
 *   // your custom Next.js config options
 * });
 *
 * export default nextConfig;
 * ```
 */
export function withForgeWP<
  T extends ForgeWPNextLikeConfig = ForgeWPNextLikeConfig,
>(nextConfig: T = {} as T, options: ForgeWPNextOptions = {}): T {
  const nativeExport = isNativeExportEnv();

  if (nativeExport) {
    if (options.deploymentMode === 'decoupled') {
      throw new Error(
        `FORGEWP_NEXT_MODE_CONFLICT: withForgeWP() received deploymentMode: 'decoupled' during FORGEWP_NATIVE_EXPORT=1. Native WordPress theme export requires static export mode.`,
      );
    }
    if (nextConfig.output !== undefined && nextConfig.output !== 'export') {
      throw new Error(
        `FORGEWP_NEXT_OUTPUT_CONFLICT: withForgeWP() received output: '${nextConfig.output}' during FORGEWP_NATIVE_EXPORT=1. Native WordPress theme export requires output: 'export'.`,
      );
    }
  }

  const mode = nativeExport
    ? 'native'
    : (options.deploymentMode ?? readEnvDeploymentMode());
  const isDecoupled = mode === 'decoupled';

  const existingTranspile = Array.isArray(nextConfig.transpilePackages)
    ? nextConfig.transpilePackages
    : [];
  const extraTranspile = Array.isArray(options.transpilePackages)
    ? options.transpilePackages
    : [];
  const transpilePackages = Array.from(
    new Set(['@forgewp/react', ...existingTranspile, ...extraTranspile]),
  );

  const userWebpack =
    typeof nextConfig.webpack === 'function' ? nextConfig.webpack : null;

  const autoHydrateEnabled = Boolean(options.autoHydrate);
  const autoHydrateTrigger =
    typeof options.autoHydrate === 'object' && options.autoHydrate?.defaultTrigger
      ? options.autoHydrate.defaultTrigger
      : 'visible';

  const shouldSetUnoptimizedImages =
    !isDecoupled &&
    nativeExport &&
    nextConfig.images?.unoptimized === undefined &&
    !nextConfig.images?.loader;

  const existingTurbopack =
    nextConfig.turbopack && typeof nextConfig.turbopack === 'object'
      ? nextConfig.turbopack
      : {};
  const existingTurboRules =
    existingTurbopack.rules && typeof existingTurbopack.rules === 'object'
      ? existingTurbopack.rules
      : {};

  const tsExtLoader = {
    loader: resolveLocalLoaderPath('next-ts-ext-loader.cjs'),
  };

  const nativeExportLoaders: Array<{
    loader: string;
    options?: Record<string, any>;
  }> = [];
  if (!isDecoupled && nativeExport) {
    nativeExportLoaders.push({
      loader: resolveLocalLoaderPath('next-link-identity-loader.cjs'),
    });
    if (autoHydrateEnabled) {
      nativeExportLoaders.push({
        loader: resolveLocalLoaderPath('next-auto-hydrate-loader.cjs'),
        options: {
          projectRoot: (globalThis as any).process?.cwd?.() || '.',
          defaultTrigger: autoHydrateTrigger,
        },
      });
    }
  }

  const mergeTurboRule = (
    glob: string,
    extraLoaders: Array<{ loader: string; options?: Record<string, any> }>,
    defaultCondition?: Record<string, any>,
  ) => {
    const prev = existingTurboRules[glob];
    const prevLoaders = Array.isArray(prev?.loaders) ? prev.loaders : [];
    const condition = prev?.condition ?? defaultCondition;
    return {
      ...(prev && typeof prev === 'object' ? prev : {}),
      ...(condition ? { condition } : {}),
      loaders: [...prevLoaders, ...extraLoaders],
    };
  };

  const turbopackRules: Record<string, any> = {
    ...existingTurboRules,
    '*.ts': mergeTurboRule('*.ts', [tsExtLoader]),
    '*.tsx': mergeTurboRule('*.tsx', [tsExtLoader, ...nativeExportLoaders]),
    ...(nativeExportLoaders.length > 0
      ? {
          '*.jsx': mergeTurboRule('*.jsx', nativeExportLoaders, {
            not: 'foreign',
          }),
        }
      : {}),
  };

  const turbopackConfig: Record<string, any> = {
    ...existingTurbopack,
    rules: turbopackRules,
  };

  const wrapped: ForgeWPNextLikeConfig = {
    ...nextConfig,
    ...(isDecoupled || nextConfig.output !== undefined
      ? {}
      : { output: 'export' }),
    ...(shouldSetUnoptimizedImages
      ? { images: { ...(nextConfig.images || {}), unoptimized: true } }
      : {}),
    transpilePackages,
    turbopack: turbopackConfig,
    webpack(config: any, context: any) {
      config.resolve = config.resolve || {};
      const existingAlias = config.resolve.extensionAlias || {};
      config.resolve.extensionAlias = {
        ...existingAlias,
        '.js': Array.from(
          new Set(['.ts', '.tsx', ...(existingAlias['.js'] || []), '.js']),
        ),
        '.jsx': Array.from(
          new Set(['.tsx', ...(existingAlias['.jsx'] || []), '.jsx']),
        ),
      };

      if (!isDecoupled && nativeExport) {
        config.module = config.module || {};
        config.module.rules = Array.isArray(config.module.rules)
          ? config.module.rules
          : [];
        config.module.rules.push({
          test: /\.(tsx|jsx)$/,
          exclude: /node_modules/,
          enforce: 'pre',
          use: [{ loader: resolveLocalLoaderPath('next-link-identity-loader.cjs') }],
        });

        if (autoHydrateEnabled) {
          config.module.rules.push({
            test: /\.(tsx|jsx)$/,
            exclude: /node_modules/,
            enforce: 'pre',
            use: [
              {
                loader: resolveLocalLoaderPath('next-auto-hydrate-loader.cjs'),
                options: {
                  projectRoot:
                    context?.dir || (globalThis as any).process?.cwd?.() || '.',
                  defaultTrigger: autoHydrateTrigger,
                },
              },
            ],
          });
        }
      }

      return userWebpack ? userWebpack(config, context) : config;
    },
  };

  return wrapped as T;
}

export default withForgeWP;
