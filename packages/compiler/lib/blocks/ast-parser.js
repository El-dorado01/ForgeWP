/**
 * Shared @babel/parser entry point for the block compiler's AST migration.
 * One parse config, reused by every consumer that needs a real AST instead
 * of scanning/re-scanning text — see forgewp_documentation_system_blueprint.md
 * Phase 2 for the migration this backs.
 */
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

export const traverse = _traverse.default || _traverse;

const PARSE_OPTIONS = {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowSuperOutsideMethod: true,
  errorRecovery: false,
};

/**
 * Parse a TSX/TS source snippet into a real AST.
 *
 * Many callers in this pipeline pass whole-file source, but plenty still pass
 * text fragments produced by older text-scanning extraction (a JSX subtree,
 * a function body's statements up to `return`, etc.) — some of those are not
 * standalone-parseable. Callers that can tolerate a parse failure should
 * catch; `tryParseSource` below is the non-throwing convenience for that.
 */
export function parseSource(code) {
  return parse(code, PARSE_OPTIONS);
}

/** Same as parseSource, but returns null instead of throwing on malformed input. */
export function tryParseSource(code) {
  try {
    return parseSource(code);
  } catch {
    return null;
  }
}

/**
 * Phase 4 dead-fallback audit: env-gated counters on every legacy-fallback
 * branch. Run any compile with FORGEWP_TRACE_FALLBACKS=1 and the per-site
 * hit counts print to stderr on exit — a site that stays at zero across a
 * full real-theme export is a candidate for deletion; a site with hits is
 * load-bearing. Zero overhead when the env var is unset.
 */
const fallbackCounts = new Map();

export function markLegacyFallback(site) {
  if (!process.env.FORGEWP_TRACE_FALLBACKS) return;
  fallbackCounts.set(site, (fallbackCounts.get(site) || 0) + 1);
}

if (process.env.FORGEWP_TRACE_FALLBACKS) {
  process.on('exit', () => {
    console.error('[fallback-trace] --- legacy fallback hits ---');
    if (fallbackCounts.size === 0) {
      console.error('[fallback-trace] (none — every code path stayed on the AST engine)');
    }
    for (const [site, n] of [...fallbackCounts].sort()) {
      console.error(`[fallback-trace] ${site}: ${n}`);
    }
  });
}
