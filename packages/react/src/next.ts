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

export interface ForgeWPNextRedirectRule {
  from: string;
  to: string;
  status?: 301 | 302 | 307 | 308;
  ifNotFound?: boolean;
}

export interface ForgeWPNextRedirectEntry {
  source: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
}

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
  /**
   * Declarative redirects from `wp.config.ts` (`redirects`). Mapped to Next.js
   * `redirects()` in decoupled mode so both origins serve the same redirect table.
   * Skipped during native static export (handled by Companion Plugin / theme PHP).
   */
  redirects?: ForgeWPNextRedirectRule[];
  /**
   * Optional list of known App Router route paths (e.g. `['/about', '/studie']`)
   * used to skip `ifNotFound: true` redirects that would shadow an existing route.
   * When omitted in Node.js, `withForgeWP()` checks `src/app/` and `app/` automatically.
   */
  appRoutes?: string[];
}

export interface ForgeWPNextLikeConfig {
  output?: string;
  transpilePackages?: string[];
  redirects?: () => Promise<any[]> | any[];
  webpack?: (config: any, context: any) => any;
  [key: string]: any;
}

const VALID_REDIRECT_STATUSES = new Set([301, 302, 307, 308]);

function normalizeRedirectPath(raw: string): string {
  const clean = String(raw).split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Convert ForgeWP declarative redirects (`wp.config.ts` `redirects`) into
 * Next.js `redirects()` entries.
 *
 * `ifNotFound: true` has no direct Next.js filesystem fallback equivalent:
 * when `appRoutes` contains the normalized `from` path, the rule is skipped so
 * it does not shadow an existing App Router page (flagged by `forgewp doctor`).
 */
export function toNextRedirects(
  rules: ForgeWPNextRedirectRule[] | undefined,
  options: { appRoutes?: Iterable<string> } = {},
): { redirects: ForgeWPNextRedirectEntry[]; skippedIfNotFound: ForgeWPNextRedirectRule[] } {
  if (!rules || rules.length === 0) {
    return { redirects: [], skippedIfNotFound: [] };
  }
  if (!Array.isArray(rules)) {
    throw new Error(
      '[ForgeWP] redirects must be an array of { from, to, status?, ifNotFound? }.',
    );
  }

  const normalizedAppRoutes = new Set<string>();
  if (options.appRoutes) {
    for (const r of options.appRoutes) {
      normalizedAppRoutes.add(normalizeRedirectPath(r));
    }
  }

  const seen = new Set<string>();
  const redirects: ForgeWPNextRedirectEntry[] = [];
  const skippedIfNotFound: ForgeWPNextRedirectRule[] = [];

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const where = `redirects[${i}]`;
    if (!r || typeof r !== 'object') {
      throw new Error(`[ForgeWP] ${where} must be an object.`);
    }
    if (typeof r.from !== 'string' || !r.from.startsWith('/') || r.from.startsWith('//')) {
      throw new Error(
        `[ForgeWP] ${where}.from must be a site path starting with "/" (got ${JSON.stringify(r.from)}).`,
      );
    }
    if (/[?#]/.test(r.from)) {
      throw new Error(`[ForgeWP] ${where}.from must not contain a query or fragment.`);
    }
    const isExternal = /^https?:\/\//i.test(r.to);
    if (
      typeof r.to !== 'string' ||
      (!isExternal && !(r.to.startsWith('/') && !r.to.startsWith('//')))
    ) {
      throw new Error(
        `[ForgeWP] ${where}.to must be a site path starting with "/" or an http(s) URL.`,
      );
    }
    const status = (r.status ?? 301) as 301 | 302 | 307 | 308;
    if (!VALID_REDIRECT_STATUSES.has(status)) {
      throw new Error(`[ForgeWP] ${where}.status must be 301, 302, 307 or 308.`);
    }
    const from = normalizeRedirectPath(r.from);
    if (seen.has(from)) {
      throw new Error(`[ForgeWP] ${where}.from "${r.from}" is listed twice.`);
    }
    seen.add(from);
    if (!isExternal && normalizeRedirectPath(r.to) === from) {
      throw new Error(`[ForgeWP] ${where} redirects "${r.from}" to itself.`);
    }

    if (r.ifNotFound === true && normalizedAppRoutes.has(from)) {
      skippedIfNotFound.push({ ...r, from, status, ifNotFound: true });
      continue;
    }

    redirects.push({
      source: from,
      destination: r.to,
      statusCode: status,
    });
  }

  return { redirects, skippedIfNotFound };
}

async function detectAppRouterPageMatch(
  routePath: string,
  projectRoot: string,
): Promise<boolean> {
  try {
    const fsSpec = 'node:fs';
    const pathSpec = 'node:path';
    const fsMod: any = await import(/* @vite-ignore */ fsSpec);
    const pathMod: any = await import(/* @vite-ignore */ pathSpec);
    const existsSync = fsMod.existsSync ?? fsMod.default?.existsSync;
    const join = pathMod.join ?? pathMod.default?.join;
    if (typeof existsSync !== 'function' || typeof join !== 'function') {
      return false;
    }
    const normalized = normalizeRedirectPath(routePath);
    const segments = normalized === '/' ? [] : normalized.slice(1).split('/');
    const appRoots = [
      join(projectRoot, 'src', 'app'),
      join(projectRoot, 'app'),
    ];
    const exts = ['tsx', 'jsx', 'ts', 'js', 'mjs'];
    for (const appRoot of appRoots) {
      if (!existsSync(appRoot)) continue;
      const targetDir = join(appRoot, ...segments);
      for (const ext of exts) {
        if (existsSync(join(targetDir, `page.${ext}`))) {
          return true;
        }
      }
    }
  } catch {
    // Non-Node runtime: skip filesystem probe
  }
  return false;
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

  const existingEnv =
    nextConfig.env && typeof nextConfig.env === 'object' ? nextConfig.env : {};
  const serverWpUrl = (globalThis as any).process?.env?.FORGEWP_WP_URL;
  const explicitPublicWpUrl =
    existingEnv.NEXT_PUBLIC_FORGEWP_WP_URL ??
    (globalThis as any).process?.env?.NEXT_PUBLIC_FORGEWP_WP_URL;
  const shouldExposeWpUrlToClient =
    !nativeExport &&
    typeof serverWpUrl === 'string' &&
    serverWpUrl.trim() !== '' &&
    !(typeof explicitPublicWpUrl === 'string' && explicitPublicWpUrl.trim() !== '');

  const configuredRedirects = Array.isArray(options.redirects)
    ? options.redirects
    : [];
  const userRedirects =
    typeof nextConfig.redirects === 'function' ? nextConfig.redirects : null;
  const shouldWireRedirects = isDecoupled && configuredRedirects.length > 0;
  // Validate rules eagerly at config load time so invalid redirects fail fast
  if (configuredRedirects.length > 0) {
    toNextRedirects(configuredRedirects, { appRoutes: options.appRoutes });
  }

  const wrapped: ForgeWPNextLikeConfig = {
    ...nextConfig,
    ...(isDecoupled || nextConfig.output !== undefined
      ? {}
      : { output: 'export' }),
    ...(shouldSetUnoptimizedImages
      ? { images: { ...(nextConfig.images || {}), unoptimized: true } }
      : {}),
    ...(shouldExposeWpUrlToClient
      ? {
          env: {
            ...existingEnv,
            NEXT_PUBLIC_FORGEWP_WP_URL: serverWpUrl.trim(),
          },
        }
      : {}),
    ...(shouldWireRedirects
      ? {
          async redirects() {
            const matchedRoutes = new Set<string>(options.appRoutes || []);
            const projectRoot =
              (globalThis as any).process?.cwd?.() || '.';
            for (const rule of configuredRedirects) {
              if (rule && rule.ifNotFound === true && typeof rule.from === 'string') {
                const norm = normalizeRedirectPath(rule.from);
                if (!matchedRoutes.has(norm) && (await detectAppRouterPageMatch(norm, projectRoot))) {
                  matchedRoutes.add(norm);
                }
              }
            }
            const { redirects: forgeWpEntries } = toNextRedirects(
              configuredRedirects,
              { appRoutes: matchedRoutes },
            );
            const existing = userRedirects ? await userRedirects() : [];
            return [
              ...forgeWpEntries,
              ...(Array.isArray(existing) ? existing : []),
            ];
          },
        }
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
