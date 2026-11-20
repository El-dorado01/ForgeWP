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
  const mode = options.deploymentMode ?? readEnvDeploymentMode();
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

  const wrapped: ForgeWPNextLikeConfig = {
    ...nextConfig,
    ...(isDecoupled || nextConfig.output !== undefined
      ? {}
      : { output: 'export' }),
    transpilePackages,
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
      return userWebpack ? userWebpack(config, context) : config;
    },
  };

  return wrapped as T;
}

export default withForgeWP;
