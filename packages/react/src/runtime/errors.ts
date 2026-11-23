export type ForgeWpRuntimeErrorCode =
  | 'FORGEWP_RUNTIME_UNCONFIGURED'
  | 'FORGEWP_LOCALE_UNCONFIGURED'
  | 'FORGEWP_RESOURCE_FETCH_FAILED'
  | 'FORGEWP_UNKNOWN_RESOURCE';

export interface ForgeWpRuntimeErrorOptions {
  resource?: string;
  status?: number;
  cause?: unknown;
}

/**
 * Typed runtime configuration or transport error thrown by ForgeWpRuntime.
 * In production, missing sources fail loudly with this error rather than
 * silently returning mock data or hardcoded fallbacks.
 */
export class ForgeWpRuntimeError extends Error {
  readonly code: ForgeWpRuntimeErrorCode;
  readonly resource?: string;
  readonly status?: number;

  constructor(
    code: ForgeWpRuntimeErrorCode,
    message: string,
    options: ForgeWpRuntimeErrorOptions = {},
  ) {
    super(message);
    this.name = 'ForgeWpRuntimeError';
    this.code = code;
    this.resource = options.resource;
    this.status = options.status;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}
