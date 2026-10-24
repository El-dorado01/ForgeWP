import { createHash } from 'node:crypto';

export function validateCptRewrite(value, key) {
  if (value === undefined || value === false) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`postTypes.${key}.rewrite must be false or an object`);
  }
  if (value.slug !== undefined && (typeof value.slug !== 'string' || !value.slug.trim() || /[?#\\\r\n]/.test(value.slug) || value.slug.includes('://'))) {
    throw new Error(`postTypes.${key}.rewrite.slug must be a nonempty path without a query, fragment, or URL origin`);
  }
  if (value.withFront !== undefined && typeof value.withFront !== 'boolean') {
    throw new Error(`postTypes.${key}.rewrite.withFront must be a boolean`);
  }
}

export function effectiveCptRouting(config, postTypes) {
  return [...new Set(postTypes)].sort().map((postType) => {
    const entry = config.postTypes?.[postType] || {};
    validateCptRewrite(entry.rewrite, postType);
    return {
      postType,
      public: entry.public !== false,
      hasArchive: entry.hasArchive !== false,
      rewrite: entry.rewrite === false ? false : {
        slug: entry.rewrite?.slug || postType,
        withFront: entry.rewrite?.withFront !== false,
      },
    };
  });
}

export function collectCptRouteDiagnostics(config, postTypes, pages = []) {
  const normalize = (value) => String(value).replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  const pagePaths = new Set(pages.map((page) => normalize(page.slug)).filter(Boolean));
  const diagnostics = [];
  for (const rule of effectiveCptRouting(config, postTypes)) {
    const configured = config.postTypes?.[rule.postType];
    if (configured?.rewrite !== undefined || configured?.hasArchive !== undefined) {
      diagnostics.push({ level: 'info', postType: rule.postType, message:
        `CPT "${rule.postType}": ${rule.rewrite === false ? 'pretty rewrites disabled' : `base /${normalize(rule.rewrite.slug)}; archive ${rule.hasArchive ? 'enabled' : 'disabled'}${rule.rewrite.withFront ? ' (site permalink front may prepend this base)' : ''}`}. If this changes installed URLs, review redirects; export does not create redirects or delete saved Pages.` });
    }
    // WordPress can add archive rewrite rules even for a non-public type.
    if (!rule.hasArchive || rule.rewrite === false) continue;
    const archive = normalize(rule.rewrite.slug);
    if (pagePaths.has(archive)) diagnostics.push({ level: 'warning', postType: rule.postType, message:
      `Potential route collision: CPT "${rule.postType}" archive /${archive} also names a configured Page route. Give them separate paths, or set postTypes.${rule.postType}.hasArchive: false if the Page should own that path. Check the site's permalink front and any plugin-owned registration on WordPress; the exporter cannot inspect them.` });
  }
  return diagnostics;
}

export function buildCptRewriteRefreshPhp(config, postTypes) {
  const signature = createHash('sha256').update(JSON.stringify(effectiveCptRouting(config, postTypes))).digest('hex');
  const domain = String(config.textDomain || 'theme').replace(/[^a-zA-Z0-9_]/g, '_');
  const option = `forgewp_${domain}_cpt_rewrite_signature`;
  const fn = `forgewp_flush_${domain}_cpt_rewrite_rules`;
  // Always keep the comparison hook: removing the final CPT/rewrite setting must
  // invalidate the previous signature too. An unchanged signature is a no-op.
  return `
function ${fn}() {
    $signature = '${signature}';
    if (get_option('${option}') === $signature) {
        return;
    }
    flush_rewrite_rules(false);
    update_option('${option}', $signature, false);
}
add_action('init', '${fn}', 99);
`;
}
