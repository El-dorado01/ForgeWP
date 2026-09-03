import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  // TypeScript is available in devDependencies
}

/**
 * Classify the source origin of an asset reference.
 *
 * @param {string|number|object} src
 * @param {number|string} [id]
 * @param {string} [field]
 * @returns {'wp-attachment' | 'local-static' | 'external-url'}
 */
export function classifyAssetSource(src, id, field) {
  if (id !== undefined && id !== null && String(id).trim().length > 0) {
    return 'wp-attachment';
  }
  if (field !== undefined && field !== null && String(field).trim().length > 0) {
    return 'wp-attachment';
  }
  if (typeof src === 'number') {
    return 'wp-attachment';
  }
  if (src && typeof src === 'object') {
    if ('id' in src || 'sizes' in src) return 'wp-attachment';
    if ('src' in src) return classifyAssetSource(src.src);
  }
  if (typeof src === 'string') {
    const trimmed = src.trim();
    if (/^\d+$/.test(trimmed) || trimmed === 'featuredImage' || trimmed === 'featured_image') {
      return 'wp-attachment';
    }
    if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
      return 'external-url';
    }
    return 'local-static';
  }
  return 'local-static';
}

/**
 * Represents a single asset node in the ForgeWP Asset Graph.
 */
export class AssetNode {
  constructor(data) {
    this.id = data.id;
    this.type = data.type || 'image'; // 'image' | 'font' | 'svg' | 'css' | 'js' | 'external'
    this.classification = data.classification || 'local-static'; // 'wp-attachment' | 'local-static' | 'external-url'
    this.source = data.source || '';
    this.resolvedPath = data.resolvedPath || null;
    this.output = data.output || null;
    this.width = data.width != null ? Number(data.width) || null : null;
    this.height = data.height != null ? Number(data.height) || null : null;
    this.priority = Boolean(data.priority);
    this.loading = data.loading || (this.priority ? 'eager' : 'lazy');
    this.decoding = data.decoding || 'async';
    this.sizes = data.sizes || null;
    this.placeholder = data.placeholder || 'empty';
    this.blurDataURL = data.blurDataURL || null;
    this.optimize = data.optimize || 'auto';
    this.field = data.field || null;
    this.attachmentId = data.attachmentId != null ? Number(data.attachmentId) || null : null;
    this.variants = Array.isArray(data.variants) ? [...data.variants] : (data.variants || null);
    this.srcset = data.srcset || null;
    this.usageLocations = Array.isArray(data.usageLocations) ? [...data.usageLocations] : [];
  }

  addUsage(location) {
    if (!location) return;
    const exists = this.usageLocations.some(
      (u) => u.file === location.file && u.line === location.line,
    );
    if (!exists) {
      this.usageLocations.push(location);
    }
  }
}

/**
 * AssetGraph manages and queries the dependency graph of all assets in a ForgeWP theme.
 */
export class AssetGraph {
  constructor(themeRoot = '') {
    this.themeRoot = themeRoot;
    this.nodes = new Map(); // asset ID -> AssetNode
  }

  /**
   * Add or merge an asset node into the graph.
   * @param {Object} data
   * @returns {AssetNode}
   */
  addAsset(data) {
    const id = data.id || data.source || `asset-${this.nodes.size + 1}`;
    let node = this.nodes.get(id);

    if (!node) {
      node = new AssetNode({ ...data, id });
      this.nodes.set(id, node);
    } else {
      // Merge properties
      if (data.priority) node.priority = true;
      if (data.loading === 'eager') node.loading = 'eager';
      if (data.width && !node.width) node.width = Number(data.width) || null;
      if (data.height && !node.height) node.height = Number(data.height) || null;
      if (data.sizes && !node.sizes) node.sizes = data.sizes;
      if (data.blurDataURL && !node.blurDataURL) node.blurDataURL = data.blurDataURL;
      if (data.resolvedPath && !node.resolvedPath) node.resolvedPath = data.resolvedPath;
      if (data.attachmentId && !node.attachmentId) node.attachmentId = Number(data.attachmentId) || null;
      if (data.field && !node.field) node.field = data.field;
      if (data.optimize && node.optimize === 'auto') node.optimize = data.optimize;
      if (data.variants) node.variants = data.variants;
      if (data.srcset) node.srcset = data.srcset;
    }

    if (data.usageLocations) {
      for (const loc of data.usageLocations) {
        node.addUsage(loc);
      }
    }

    return node;
  }

  getAsset(id) {
    return this.nodes.get(id) || null;
  }

  getAllAssets() {
    return Array.from(this.nodes.values());
  }

  getLocalImages() {
    return this.getAllAssets().filter(
      (a) => a.classification === 'local-static' && (a.type === 'image' || a.type === 'svg'),
    );
  }

  getPriorityAssets() {
    return this.getAllAssets().filter((a) => a.priority === true);
  }

  getExternalAssets() {
    return this.getAllAssets().filter((a) => a.classification === 'external-url');
  }

  getWpAttachments() {
    return this.getAllAssets().filter((a) => a.classification === 'wp-attachment');
  }

  toJSON() {
    const assets = {};
    for (const [id, node] of this.nodes) {
      assets[id] = {
        id: node.id,
        type: node.type,
        classification: node.classification,
        source: node.source,
        output: node.output,
        width: node.width,
        height: node.height,
        priority: node.priority,
        loading: node.loading,
        decoding: node.decoding,
        sizes: node.sizes,
        placeholder: node.placeholder,
        optimize: node.optimize,
        field: node.field,
        attachmentId: node.attachmentId,
        usageCount: node.usageLocations.length,
        usageLocations: node.usageLocations,
      };
    }
    return {
      themeRoot: this.themeRoot,
      totalAssets: this.nodes.size,
      assets,
    };
  }
}

/**
 * Scan a theme codebase and populate an AssetGraph.
 *
 * @param {string} themeRoot
 * @param {Object} [options]
 * @returns {AssetGraph}
 */
export function scanAssetGraph(themeRoot, options = {}) {
  const graph = new AssetGraph(themeRoot);
  const srcDir = path.join(themeRoot, 'src');

  if (!existsSync(srcDir)) {
    return graph;
  }

  const files = [];
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.forgewp' && entry.name !== 'dist') {
            scanDir(full);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js|html)$/.test(entry.name)) {
          files.push(full);
        }
      }
    } catch {}
  }
  scanDir(srcDir);

  for (const file of files) {
    let content = '';
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const relFile = path.relative(themeRoot, file).replace(/\\/g, '/');

    if (!ts) {
      // Regex fallback if TS is unavailable
      scanWithRegex(content, relFile, themeRoot, graph);
      continue;
    }

    try {
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      scanAst(sourceFile, relFile, themeRoot, graph, ts);
    } catch {
      scanWithRegex(content, relFile, themeRoot, graph);
    }
  }

  return graph;
}

/**
 * AST Scanner for JSX elements (<WpImage>, <img>) and static imports.
 */
function scanAst(sourceFile, relFile, themeRoot, graph, ts) {
  function getAttrValue(attr) {
    if (!attr || !attr.initializer) return true;
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      const expr = attr.initializer.expression;
      if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
      if (ts.isNumericLiteral(expr)) return Number(expr.text);
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (ts.isIdentifier(expr)) return expr.text;
    }
    return null;
  }

  function visit(node) {
    // 1. Detect static image / font import declarations
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text;
      if (/\.(png|jpe?g|webp|avif|svg|gif|woff2?|ttf|eot)$/i.test(spec)) {
        const isFont = /\.(woff2?|ttf|eot)$/i.test(spec);
        const isSvg = /\.svg$/i.test(spec);
        const type = isFont ? 'font' : isSvg ? 'svg' : 'image';
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        graph.addAsset({
          id: spec,
          type,
          classification: 'local-static',
          source: spec,
          usageLocations: [{ file: relFile, line }],
        });
      }
    }

    // 2. Detect JSX Elements (<WpImage ... /> or <img ... />)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);

      if (tagName === 'WpImage' || tagName === 'img') {
        const attributes = {};
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name) {
            const attrName = prop.name.getText(sourceFile);
            attributes[attrName] = getAttrValue(prop);
          }
        }

        const src = attributes.src;
        const id = attributes.id;
        const field = attributes.field;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        if (src || id !== undefined || field !== undefined) {
          const classification = classifyAssetSource(src, id, field);
          const rawSource = src != null ? String(src) : (field ? `field:${field}` : `id:${id}`);
          const assetId = String(src || (field ? `field:${field}` : `id:${id}`));
          const isSvg = typeof src === 'string' && /\.svg(\?.*)?$/i.test(src);
          const type = isSvg ? 'svg' : (classification === 'external-url' ? 'image' : 'image');

          graph.addAsset({
            id: assetId,
            type,
            classification,
            source: rawSource,
            width: attributes.width,
            height: attributes.height,
            priority: attributes.priority === true || attributes.fetchpriority === 'high' || attributes.fetchPriority === 'high',
            loading: attributes.loading,
            decoding: attributes.decoding || 'async',
            sizes: attributes.sizes,
            placeholder: attributes.placeholder,
            blurDataURL: attributes.blurDataURL,
            optimize: attributes.optimize,
            field: typeof field === 'string' ? field : undefined,
            attachmentId: id != null && !isNaN(Number(id)) ? Number(id) : undefined,
            usageLocations: [{ file: relFile, line, component: tagName }],
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * Fallback regex scanner if TypeScript parser is unavailable.
 */
function scanWithRegex(content, relFile, themeRoot, graph) {
  // Static imports
  const importRegex = /import\s+[\w*\s{},]+\s+from\s+['"]([^'"]+\.(?:png|jpe?g|webp|avif|svg|gif|woff2?|ttf|eot))['"]/gi;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const spec = match[1];
    const isFont = /\.(woff2?|ttf|eot)$/i.test(spec);
    const isSvg = /\.svg$/i.test(spec);
    graph.addAsset({
      id: spec,
      type: isFont ? 'font' : isSvg ? 'svg' : 'image',
      classification: 'local-static',
      source: spec,
      usageLocations: [{ file: relFile }],
    });
  }

  // <WpImage> and <img> tags
  const tagRegex = /<(?:WpImage|img)\b([^>]*)\/?>/gi;
  while ((match = tagRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const getAttr = (name) => {
      const m = attrsStr.match(new RegExp(`\\b${name}=(?:["']([^"']*)["']|{([^}]*)})`, 'i'));
      return m ? m[1] || m[2] : null;
    };

    const src = getAttr('src');
    const id = getAttr('id');
    const field = getAttr('field');
    const priority = attrsStr.includes('priority') || attrsStr.includes('fetchpriority="high"');

    if (src || id || field) {
      const classification = classifyAssetSource(src, id, field);
      const rawSource = src || (field ? `field:${field}` : `id:${id}`);
      graph.addAsset({
        id: rawSource,
        type: typeof src === 'string' && /\.svg/i.test(src) ? 'svg' : 'image',
        classification,
        source: rawSource,
        width: getAttr('width'),
        height: getAttr('height'),
        priority,
        sizes: getAttr('sizes'),
        field: field || undefined,
        attachmentId: id && !isNaN(Number(id)) ? Number(id) : undefined,
        usageLocations: [{ file: relFile }],
      });
    }
  }
}
