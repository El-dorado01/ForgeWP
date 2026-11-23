import { ForgeWpRuntimeError } from './errors.js';
import {
  createFixtureSource,
  type FixtureSourceOptions,
} from './fixture-source.js';
import {
  createNativeSource,
  getNativeRestNonce,
  getNativeRestUrl,
  hasNativeHydration,
  type ForgeWpSource,
} from './native-source.js';
import {
  createRestSource,
  normalizeRestBaseUrl,
  type PrimableForgeWpSource,
  type RestSourceOptions,
} from './rest-source.js';
import type {
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
} from './registry.js';

export type ForgeWpRuntimeMode = 'native' | 'decoupled' | 'fixture';

export interface ForgeWpRuntimeOptions {
  /** Explicit runtime mode override (`native` | `decoupled` | `fixture`). */
  mode?: ForgeWpRuntimeMode;
  /** WordPress origin or REST base URL for decoupled mode. */
  wpUrl?: string;
  /** Optional custom fetch implementation (useful in tests/RSC). */
  fetch?: typeof globalThis.fetch;
  /** Optional extra headers for REST requests. */
  headers?: Record<string, string>;
  /** Optional Next.js / fetch cache configuration. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  /** Explicit local/test fixture data. */
  fixtures?: FixtureSourceOptions;
  /** Override production detection (primarily for unit tests). */
  isProduction?: boolean;
}

export interface ForgeWpRuntime {
  readonly mode: ForgeWpRuntimeMode;
  readonly source: ForgeWpSource;
  readonly isProduction: boolean;
  getRestBaseUrl(): string | null;
  getRestNonce(): string | null;
  peek<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): ForgeWpResourceMap[K] | undefined;
  get<K extends ForgeWpResourceName>(
    resource: K,
    params?: ForgeWpResourceParams,
  ): Promise<ForgeWpResourceMap[K] | undefined>;
  prime<K extends ForgeWpResourceName>(
    resource: K,
    data: ForgeWpResourceMap[K],
    params?: ForgeWpResourceParams,
  ): void;
}

function readRuntimeEnv(name: string): string | undefined {
  const proc = (globalThis as any).process;
  if (proc?.env && typeof proc.env[name] === 'string' && proc.env[name].trim() !== '') {
    return proc.env[name].trim();
  }
  const viteEnv =
    typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (viteEnv && typeof viteEnv[name] === 'string' && viteEnv[name].trim() !== '') {
    return viteEnv[name].trim();
  }
  return undefined;
}

/**
 * True when running in a production bundle/environment (not Vite dev server,
 * not `NODE_ENV=development` or `NODE_ENV=test`).
 */
export function isProductionRuntime(): boolean {
  const nodeEnv = readRuntimeEnv('NODE_ENV');
  if (nodeEnv === 'production') return true;
  if (nodeEnv === 'development' || nodeEnv === 'test') return false;
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.DEV === true
  ) {
    return false;
  }
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.PROD === true
  ) {
    return true;
  }
  return false;
}

declare const process: { env: Record<string, string | undefined> };

function readLiteralEnvWpUrl(): string | undefined {
  // Exact literal `process.env.NEXT_PUBLIC_*` member expressions (no optional
  // chaining) are required so Next.js webpack DefinePlugin & Turbopack inline
  // them statically into browser client bundles.
  try {
    const v = process.env.NEXT_PUBLIC_FORGEWP_WP_URL;
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  } catch {
    // Plain browser bundle without `process` global
  }
  try {
    const v = process.env.FORGEWP_WP_URL;
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  } catch {
    // ignore
  }
  try {
    const v = process.env.NEXT_PUBLIC_WP_API_URL;
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  } catch {
    // ignore
  }
  try {
    const v = process.env.FORGEWP_API_URL;
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Resolves a configured decoupled WordPress REST base URL from explicit options,
 * literal Next.js / Vite public env vars, or browser globals.
 */
export function resolveConfiguredRestBaseUrl(explicitWpUrl?: string): string | null {
  const raw =
    explicitWpUrl ||
    readLiteralEnvWpUrl() ||
    readRuntimeEnv('VITE_FORGEWP_WP_URL') ||
    (typeof window !== 'undefined'
      ? (window as any).__FORGEWP_WP_URL__ || (window as any).FORGEWP_API_URL
      : undefined);

  if (!raw || typeof raw !== 'string') return null;
  const normalized = normalizeRestBaseUrl(raw);
  return normalized || null;
}

function resolveExplicitMode(explicitMode?: ForgeWpRuntimeMode): ForgeWpRuntimeMode | null {
  if (explicitMode) return explicitMode;
  const envMode =
    readRuntimeEnv('FORGEWP_MODE') ||
    readRuntimeEnv('FORGEWP_DEPLOYMENT_MODE') ||
    readRuntimeEnv('NEXT_PUBLIC_FORGEWP_MODE');
  if (envMode === 'native' || envMode === 'decoupled' || envMode === 'fixture') {
    return envMode;
  }
  return null;
}

/**
 * Creates a lean `ForgeWpRuntime` bound to a single pluggable source:
 * - `native`: reads prefetched PHP hydration resources (`window.forgeWpHydration`).
 * - `decoupled`: fetches `/wp-json/forgewp/v1/*` via `restSource`.
 * - `fixture`: reads local dev/test mocks (`NODE_ENV !== 'production'` or explicit opt-in).
 *
 * In production, requesting a runtime with no resolvable native or REST source
 * fails loudly with `ForgeWpRuntimeError('FORGEWP_RUNTIME_UNCONFIGURED')`.
 */
export function createForgeWpRuntime(
  options: ForgeWpRuntimeOptions = {},
): ForgeWpRuntime {
  const isProd = options.isProduction ?? isProductionRuntime();
  const explicitMode = resolveExplicitMode(options.mode);
  const nativeAvailable = hasNativeHydration();
  const configuredRestUrl = resolveConfiguredRestBaseUrl(options.wpUrl);

  let mode: ForgeWpRuntimeMode;
  if (explicitMode) {
    mode = explicitMode;
  } else if (nativeAvailable) {
    mode = 'native';
  } else if (configuredRestUrl) {
    mode = 'decoupled';
  } else if (!isProd) {
    mode = 'fixture';
  } else {
    throw new ForgeWpRuntimeError(
      'FORGEWP_RUNTIME_UNCONFIGURED',
      'ForgeWP runtime has no resolvable data source in production. ' +
        'Ensure WordPress native hydration is active or configure FORGEWP_WP_URL / NEXT_PUBLIC_FORGEWP_WP_URL for decoupled mode.',
    );
  }

  let source: ForgeWpSource;
  let primableRest: PrimableForgeWpSource | null = null;
  const primedCache = new Map<string, unknown>();

  if (mode === 'native') {
    source = createNativeSource();
  } else if (mode === 'decoupled') {
    const restUrl = configuredRestUrl || getNativeRestUrl();
    if (!restUrl) {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RUNTIME_UNCONFIGURED',
        'ForgeWP decoupled runtime requires FORGEWP_WP_URL (or NEXT_PUBLIC_FORGEWP_WP_URL / wpUrl option).',
      );
    }
    const restOpts: RestSourceOptions = {
      baseUrl: restUrl,
      fetch: options.fetch,
      headers: options.headers,
      cache: options.cache,
      next: options.next,
    };
    primableRest = createRestSource(restOpts);
    source = primableRest;
  } else {
    if (isProd && options.mode !== 'fixture') {
      throw new ForgeWpRuntimeError(
        'FORGEWP_RUNTIME_UNCONFIGURED',
        'Fixture source cannot be used automatically in production.',
      );
    }
    source = createFixtureSource(options.fixtures);
  }

  return {
    mode,
    source,
    isProduction: isProd,
    getRestBaseUrl() {
      if (mode === 'native') {
        return getNativeRestUrl() || configuredRestUrl;
      }
      if (mode === 'decoupled') {
        return configuredRestUrl || getNativeRestUrl();
      }
      return configuredRestUrl;
    },
    getRestNonce() {
      return getNativeRestNonce();
    },
    peek<K extends ForgeWpResourceName>(
      resource: K,
      params?: ForgeWpResourceParams,
    ): ForgeWpResourceMap[K] | undefined {
      if (primedCache.has(resource)) {
        return primedCache.get(resource) as ForgeWpResourceMap[K];
      }
      return source.peek(resource, params);
    },
    async get<K extends ForgeWpResourceName>(
      resource: K,
      params?: ForgeWpResourceParams,
    ): Promise<ForgeWpResourceMap[K] | undefined> {
      if (primedCache.has(resource)) {
        return primedCache.get(resource) as ForgeWpResourceMap[K];
      }
      const value = await source.get(resource, params);
      if (value === undefined && mode === 'native' && getNativeRestUrl()) {
        const fallbackRest = createRestSource({
          baseUrl: getNativeRestUrl()!,
          fetch: options.fetch,
          headers: getNativeRestNonce()
            ? { 'X-WP-Nonce': getNativeRestNonce()!, ...(options.headers || {}) }
            : options.headers,
        });
        return fallbackRest.get(resource, params);
      }
      return value;
    },
    prime<K extends ForgeWpResourceName>(
      resource: K,
      data: ForgeWpResourceMap[K],
      params?: ForgeWpResourceParams,
    ): void {
      if (primableRest) {
        primableRest.prime(resource, data, params);
      }
      primedCache.set(resource, data);
    },
  };
}

let configuredRuntime: ForgeWpRuntime | null = null;

/**
 * Explicitly configure the shared client/server `ForgeWpRuntime` instance
 * (e.g., for decoupled SPAs, Next.js RSC providers, or tests).
 */
export function configureForgeWpRuntime(
  options: ForgeWpRuntimeOptions,
): ForgeWpRuntime {
  configuredRuntime = createForgeWpRuntime(options);
  return configuredRuntime;
}

/**
 * Reset the configured runtime singleton (intended for tests).
 */
export function resetForgeWpRuntime(): void {
  configuredRuntime = null;
}

/**
 * Returns the active `ForgeWpRuntime` (explicitly configured singleton if set,
 * otherwise resolved cleanly from the current environment).
 */
export function getForgeWpRuntime(): ForgeWpRuntime {
  if (configuredRuntime) return configuredRuntime;
  return createForgeWpRuntime();
}

export { ForgeWpRuntimeError } from './errors.js';
export type {
  ForgeWpRuntimeErrorCode,
  ForgeWpRuntimeErrorOptions,
} from './errors.js';
export {
  FORGEWP_RESOURCES,
  defineResource,
  getResourceDefinition,
  normalizeSiteSettings,
  normalizeFormResource,
  normalizeFormsCollection,
} from './registry.js';
export type {
  ForgeWpResourceAuth,
  ForgeWpResourceDefinition,
  ForgeWpResourceMap,
  ForgeWpResourceName,
  ForgeWpResourceParams,
  SiteSettingsResource,
  SiteSettingsSiteMeta,
  FormFieldContract,
  FormResource,
  FormsCollectionResource,
  I18nResource,
} from './registry.js';
export {
  createNativeSource,
  hasNativeHydration,
  getNativeRestUrl,
  getNativeRestNonce,
  getNativeThemeUri,
  getNativePostMeta,
  getNativePageLink,
  getNativeMenu,
  getNativeForm,
  getNativeTranslations,
} from './native-source.js';
export type { ForgeWpSource } from './native-source.js';
export {
  createRestSource,
  normalizeRestBaseUrl,
} from './rest-source.js';
export type {
  RestSourceOptions,
  PrimableForgeWpSource,
} from './rest-source.js';
export { createFixtureSource } from './fixture-source.js';
export type { FixtureSourceOptions } from './fixture-source.js';
