import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  scanAndGenerateBlocks,
  parseDefineBlock,
  parseDefineEditable,
  mapEditableFieldToAttribute,
  normalizeInnerBlocksConfig,
  resolveComponentEditableSchema,
  extractPickAttrMetaMap,
  flushEditableIssues,
} from "./scanner.js";
import { findHtmlTagEnd, resolveIconToSvgHtml, warmupIconCache } from "./shared-utils.js";
import {
  generateReactCreateElement,
  resolveIconToCreateElement,
  parseJsxToAst,
  transpileJsxInPreamble,
} from "./editor-transpiler.js";
import {
  extractJsx,
  expandNestedComponentTags,
  inlineIconWrapperTags,
  transpileLoops,
  transpileConditionals,
  transpileTernaries,
  transpileStaticArrayObjectMap,
  translateStaticArrayLengthCheck,
  translateJsExpressionToPhp,
  extractCurlyExpression,
  inlineJsxRenderHelperCalls,
  generatePhpMarkupFromJsx,
} from "./php-transpiler.js";
import {
  stripTypeScriptSyntax,
  extractSameFileHelpers,
  jsHelperToPhpFunction,
  jsxHelperToTemplate,
  phpHelperName,
  rewriteAttrRefsSafely,
  stripTopLevelHelperDecl,
} from "./source-sanitize.js";
import { buildEditorScopeInjections } from "./editor-scope.js";
import { markLegacyFallback } from "./ast-parser.js";
import { isComponentInteractive, readComponentSource } from "../hydration/is-interactive.js";
import { splitInteractiveIslands } from "../hydration/island-split.js";

export { scanAndGenerateBlocks, warmupIconCache, flushEditableIssues };

function findThemeCssFile(outDir) {
  if (!outDir) return 'index.css';
  const assetsDir = path.join(outDir, 'assets');
  if (existsSync(assetsDir)) {
    const files = readdirSync(assetsDir);
    const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
    if (cssFile) {
      return cssFile;
    }
  }
  return 'index.css';
}

/**
 * Merge a class-attribute expression into the first opening tag found in
 * `markup`. If that tag already has a class/className attribute, the new
 * expression is appended inside the existing quotes; otherwise a new
 * attribute is added. Used to apply paddingY/paddingX classes directly to a
 * block's own top-level element without requiring any per-block wiring.
 */
function injectClassExprIntoFirstTag(markup, classExpr, attrName = 'class') {
  const startMatch = markup.match(/<[a-zA-Z]/);
  if (!startMatch) return markup;
  const tagStart = startMatch.index;

  // A naive [^<>]* attrs scan breaks the moment an attribute value contains an
  // embedded <?php ... ?> block (the "<" of "<?php" looks like a new tag start),
  // which is the common case here since the tag's own class attribute is often
  // itself a PHP echo. findHtmlTagEnd already understands <?php ... ?> and
  // quoted strings and is used for exactly this elsewhere in the compiler.
  const tagEnd = findHtmlTagEnd(markup, tagStart);
  if (tagEnd === -1) return markup;

  const tagNameMatch = markup.slice(tagStart + 1, tagEnd).match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (!tagNameMatch) return markup;
  const tagName = tagNameMatch[1];
  const attrsStr = markup.slice(tagStart + 1 + tagName.length, tagEnd);

  const classAttrRegex = new RegExp(`\\s${attrName}=(["'])([\\s\\S]*?)\\1`);
  const classAttrMatch = attrsStr.match(classAttrRegex);
  let newAttrsStr;
  if (classAttrMatch) {
    const quote = classAttrMatch[1];
    const existing = classAttrMatch[2];
    const replacement = ` ${attrName}=${quote}${existing} ${classExpr}${quote}`;
    newAttrsStr =
      attrsStr.slice(0, classAttrMatch.index) +
      replacement +
      attrsStr.slice(classAttrMatch.index + classAttrMatch[0].length);
  } else {
    newAttrsStr = `${attrsStr} ${attrName}="${classExpr}"`;
  }
  const newTag = `<${tagName}${newAttrsStr}>`;
  return markup.slice(0, tagStart) + newTag + markup.slice(tagEnd + 1);
}

function injectPaddingClassesIntoPhpMarkup(markup) {
  return injectClassExprIntoFirstTag(
    markup,
    `<?php echo esc_attr( forgewp_padding_classes($attributes ?? array()) ); ?>`,
    'class',
  );
}

// Same token sets as forgewp_padding_classes() (PHP) and buildPaddingClassesJsExpr()
// (JS) below — keep all three in sync.
const PADDING_Y_TOKEN_PRESETS = [
  ['lg', ['py-12', 'sm:py-16']],
  ['md', ['py-8', 'sm:py-10']],
  ['sm', ['py-4', 'sm:py-6']],
];
const PADDING_X_TOKEN_PRESETS = [
  ['lg', ['px-4', 'sm:px-6', 'lg:px-8']],
  ['md', ['px-4', 'sm:px-6']],
  ['sm', ['px-4']],
];

/**
 * A dev writes ordinary Tailwind padding classes (or none) on their block's own
 * top-level element — no special convention required. If those classes exactly
 * match one of the four padding presets, the compiler adopts it as that
 * attribute's default (so retrofitting off hand-rolled padding doesn't silently
 * reset a block's shipped appearance) and removes the literal tokens from the
 * static className, so the sidebar-driven forgewp_padding_classes() call is the
 * only thing controlling padding from then on — otherwise switching presets in
 * the sidebar would layer the new classes on top of the never-changing old ones.
 */
function detectPresetMatch(classSet, presets) {
  for (const [level, tokens] of presets) {
    if (tokens.every((t) => classSet.has(t))) {
      return { level, tokens };
    }
  }
  return null;
}

/**
 * Find the first tag in `jsxText` and read its static className (plain string
 * or a template literal with no ${} interpolation) — deliberately conservative;
 * a dynamic className (computed, conditional, etc.) is left untouched and just
 * yields no detected default (falls back to 'none'), since safely rewriting an
 * arbitrary expression's literal text is out of scope here.
 */
function detectPaddingDefaultsFromJsx(jsxText) {
  const empty = { paddingY: 'none', paddingX: 'none', yTokens: [], xTokens: [] };
  if (!jsxText) return empty;
  const tagMatch = jsxText.match(/^\s*<[a-zA-Z][a-zA-Z0-9]*\b([^>]*)>/);
  if (!tagMatch) return empty;
  const attrsStr = tagMatch[1] || '';
  const classMatch = attrsStr.match(/className=(?:"([^"]*)"|'([^']*)'|\{`([^`$]*)`\})/);
  const classStr = classMatch ? (classMatch[1] ?? classMatch[2] ?? classMatch[3] ?? '') : '';
  if (!classStr) return empty;

  const classSet = new Set(classStr.split(/\s+/).filter(Boolean));
  const yMatch = detectPresetMatch(classSet, PADDING_Y_TOKEN_PRESETS);
  const xMatch = detectPresetMatch(classSet, PADDING_X_TOKEN_PRESETS);
  return {
    paddingY: yMatch ? yMatch.level : 'none',
    paddingX: xMatch ? xMatch.level : 'none',
    yTokens: yMatch ? yMatch.tokens : [],
    xTokens: xMatch ? xMatch.tokens : [],
  };
}

/**
 * Remove specific detected preset tokens (whole classes only, not substrings)
 * from the first tag's className in `markup`, wherever that className lives —
 * a plain string or a `<?php ... ?>`-embedded PHP echo of a static value.
 */
function stripPaddingTokensFromFirstTag(markup, tokens) {
  if (!tokens || tokens.length === 0) return markup;
  const startMatch = markup.match(/<[a-zA-Z]/);
  if (!startMatch) return markup;
  const tagStart = startMatch.index;
  const tagEnd = findHtmlTagEnd(markup, tagStart);
  if (tagEnd === -1) return markup;

  let tag = markup.slice(tagStart, tagEnd + 1);
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Trailing boundary must NOT require whitespace/end-of-string — the token is
    // almost always immediately followed by the class attribute's closing quote
    // (e.g. `sm:py-10'`), which neither \s nor $ matches. A negative lookahead
    // for "still part of a longer class-like token" is the correct boundary.
    tag = tag.replace(new RegExp(`(^|\\s)${escaped}(?![\\w:-])`, 'g'), '$1').replace(/ {2,}/g, ' ');
  }
  return markup.slice(0, tagStart) + tag + markup.slice(tagEnd + 1);
}

function buildPaddingClassesJsExpr() {
  const py = "({none:'',sm:'py-4 sm:py-6',md:'py-8 sm:py-10',lg:'py-12 sm:py-16'}[attributes.paddingY] || '')";
  const px = "({none:'',sm:'px-4',md:'px-4 sm:px-6',lg:'px-4 sm:px-6 lg:px-8'}[attributes.paddingX] || '')";
  return `(${py} + ' ' + ${px}).trim()`;
}

/**
 * Scan forward from `start` for the first top-level (depth-0) comma, respecting
 * strings and nested (), [], {}. Returns -1 if none found before `end`.
 */
function findTopLevelComma(code, start, end) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = start; i < end; i++) {
    const c = code[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return -1;
      depth--;
    } else if (c === ',' && depth === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Remove specific whole-class tokens from a quoted JS string literal, leaving
 * non-string-literal expressions (template literals, ternaries, …) untouched —
 * safe no-op fallback rather than risking a mangled expression.
 */
function stripPaddingTokensFromJsStringLiteral(exprText, tokens) {
  if (!tokens || tokens.length === 0) return exprText;
  const m = exprText.match(/^(["'])([\s\S]*)\1$/);
  if (!m) return exprText;
  const quote = m[1];
  let inner = m[2];
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp(`(^|\\s)${escaped}(?![\\w:-])`, 'g'), '$1').replace(/ {2,}/g, ' ').trim();
  }
  return `${quote}${inner}${quote}`;
}

/**
 * Merge computed paddingY/paddingX classes into the ROOT createElement call's
 * props object in a generated customEditJsx string — mirrors
 * injectPaddingClassesIntoPhpMarkup for the live editor-canvas path. Handles
 * `createElement("tag", null, …)` and `createElement("tag", { ... }, …)`, with
 * or without an existing className key. `tokensToStrip` removes any detected
 * preset classes from the existing className first (see
 * detectPaddingDefaultsFromJsx) so they don't linger alongside the new
 * sidebar-driven computation once a preset is confirmed adopted as the default.
 */
function injectPaddingClassesIntoEditJsx(code, tokensToStrip = []) {
  if (!code || !code.includes('createElement(')) return code;
  const callIdx = code.indexOf('createElement(');
  const argsStart = callIdx + 'createElement('.length;

  const firstCommaIdx = findTopLevelComma(code, argsStart, code.length);
  if (firstCommaIdx === -1) return code;

  let propsStart = firstCommaIdx + 1;
  while (propsStart < code.length && /\s/.test(code[propsStart])) propsStart++;

  const paddingExpr = buildPaddingClassesJsExpr();

  if (code.slice(propsStart, propsStart + 4) === 'null') {
    return code.slice(0, propsStart) + `{ className: ${paddingExpr} }` + code.slice(propsStart + 4);
  }

  if (code[propsStart] !== '{') return code;

  // Find the matching close brace for the props object
  let depth = 0;
  let inStr = null;
  let esc = false;
  let propsEnd = -1;
  for (let i = propsStart; i < code.length; i++) {
    const c = code[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        propsEnd = i;
        break;
      }
    }
  }
  if (propsEnd === -1) return code;

  const propsText = code.slice(propsStart, propsEnd + 1);
  const classNameMatch = propsText.match(/\bclassName\s*:\s*/);
  let newPropsText;
  if (classNameMatch) {
    const valueStart = classNameMatch.index + classNameMatch[0].length;
    const commaIdx = findTopLevelComma(propsText, valueStart, propsText.length - 1);
    const valueEnd = commaIdx === -1 ? propsText.length - 1 : commaIdx;
    const existingValueExpr = stripPaddingTokensFromJsStringLiteral(
      propsText.slice(valueStart, valueEnd).trim(),
      tokensToStrip,
    );
    const merged = `((${existingValueExpr}) || '') + ' ' + ${paddingExpr}`;
    newPropsText = propsText.slice(0, valueStart) + merged + propsText.slice(valueEnd);
  } else {
    newPropsText = '{ className: ' + paddingExpr + ', ' + propsText.slice(1);
  }
  return code.slice(0, propsStart) + newPropsText + code.slice(propsEnd + 1);
}

/**
 * Scans components and pages recursively for JSDoc annotated blocks,
 * auto-generates wrapper block code inside src/blocks/generated/,
 * then compiles both handcrafted and generated blocks into WordPress block files.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @param {{ strict?: boolean }} [options] strict: fail export on from/pick issues
 * @returns {string[]} Compiled block slugs
 */
export function compileBlocks(themeRoot, outDir, options = {}) {
  // Auto-split components that mix static/attribute-driven content with
  // genuine interactivity into a static shell + extracted islands, BEFORE
  // anything below reads component source — readComponentSource (used by
  // every readFileSync call in this function, and by isComponentInteractive)
  // transparently returns the split shell instead of the dev's original,
  // still-fully-interactive file content once this has run.
  try {
    splitInteractiveIslands(themeRoot);
  } catch (err) {
    console.warn('[ForgeWP Compiler] Error running splitInteractiveIslands:', err.message);
  }

  // Scan + generate wrappers; collect issues (flush after processDir so compile-time resolves are included)
  scanAndGenerateBlocks(themeRoot, { strict: false, resetIssues: true, flush: false });

  const cssFile = findThemeCssFile(outDir);

  const handcraftedDir = path.join(themeRoot, 'src', 'blocks');
  const generatedDir = path.join(themeRoot, 'src', 'blocks', 'generated');

  const blockSlugs = [];
  const processedSlugs = new Set();

  function processDir(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      // Don't recurse into generated folder if processing handcrafted dir
      if (dir === handcraftedDir && entry === 'generated') continue;

      const entryPath = path.join(dir, entry);
      let blockFile = '';
      let blockSlug = '';

      if (statSync(entryPath).isDirectory()) {
        const indexPath = path.join(entryPath, 'index.tsx');
        if (existsSync(indexPath)) {
          blockFile = indexPath;
          blockSlug = entry
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
        }
      } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
        blockFile = entryPath;
        blockSlug = entry
          .replace(/\.(tsx|jsx)$/, '')
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
      }

      if (blockFile && !processedSlugs.has(blockSlug)) {
        processedSlugs.add(blockSlug);
        try {
          const code = readComponentSource(blockFile);

          const importMap = {};
          const importRx = /import\s+(?:type\s+)?(?:\{([^}]+)\}|([A-Za-z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g;
          let importMatch;
          while ((importMatch = importRx.exec(code)) !== null) {
            const namedImports = importMatch[1]; // e.g. "ArrowRight, Search, ChevronDown"
            const defaultImport = importMatch[2]; // e.g. "React"
            const fromPkg = importMatch[3];       // e.g. "lucide-react"
            // Skip relative imports and known framework imports
            if (fromPkg.startsWith('.') || fromPkg.startsWith('@/') || fromPkg.startsWith('react') || fromPkg.startsWith('next')) continue;
            if (namedImports) {
              for (const name of namedImports.split(',')) {
                const n = name.replace(/\s+as\s+\S+/, '').trim();
                if (n && /^[A-Z]/.test(n)) importMap[n] = fromPkg;
              }
            } else if (defaultImport && /^[A-Z]/.test(defaultImport)) {
              importMap[defaultImport] = fromPkg;
            }
          }

          const settingsMatch = code.match(
            /export\s+const\s+settings\s*=\s*(\{[\s\S]*?\});/,
          );
          let settings = {
            apiVersion: 3,
            name: `forgewp/${blockSlug}`,
            title: blockSlug
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            category: 'design',
            icon: 'admin-generic',
            attributes: {},
            supports: {
              html: false
            },
            editorStyle: `file:../../assets/${cssFile}`,
            render: 'file:./render.php',
            // Compile-time metadata used by generateReactCreateElement to resolve icon components
            importMap,
            themeRoot,
          };

          let parsedSettings = null;
          if (code.includes('defineBlock(')) {
            parsedSettings = parseDefineBlock(code, blockSlug);
          } else if (settingsMatch) {
            try {
              const evalFn = new Function(`return ${settingsMatch[1]};`);
              parsedSettings = evalFn();
            } catch (e) {
              console.warn(
                `[Gutenberg Block Compiler] Error parsing legacy settings for ${blockSlug}:`,
                e.message,
              );
            }
          }

          if (parsedSettings) {
            const parsedAttrs = parsedSettings.attributes || {};
            settings = { ...settings, ...parsedSettings };
            settings.attributes = {
              ...parsedAttrs
            };
            if (!settings.supports) {
              settings.supports = {};
            }
            settings.supports.html = false;
            settings.editorStyle = `file:../../assets/${cssFile}`;
            settings.name = settings.name ? (settings.name.includes('/') ? settings.name : `forgewp/${settings.name}`) : `forgewp/${blockSlug}`;
            settings.apiVersion = 3;
            settings.render = 'file:./render.php';
            if (!settings.usesContext) {
              settings.usesContext = [];
            }
            if (!settings.usesContext.includes("postId")) {
              settings.usesContext.push("postId");
            }
            if (!settings.usesContext.includes("postType")) {
              settings.usesContext.push("postType");
            }
          }

          // Editable schema: defineEditable / pickEditable / re-export / JSDoc from+pick
          // Prefer the component source when this is a generated wrapper.
          let editableSchema = resolveComponentEditableSchema(code, blockFile, themeRoot);
          let dualHostMeta = extractPickAttrMetaMap(code);
          // Always resolve the component file for dualHostMeta (generated
          // wrappers re-export editable but do not contain pickEditable maps).
          const compImport = code.match(
            /import\s+(?:(\w+)|\{[^}]*\b(\w+)\b[^}]*\})\s+from\s+['"](\.\.?\/[^'"]+)['"]/,
          );
          // Hoisted for the BAKED_PADDING lookup below — for a generated wrapper
          // (src/blocks/generated/*.tsx), `code` is the wrapper's own text and
          // never contains the component's module-level consts; the real source
          // is only reachable through this same import resolution.
          let resolvedComponentSource = code;
          let resolvedComponentSourcePath = blockFile;
          if (compImport) {
            const importPath = compImport[3];
            const extensions = ['.tsx', '.ts', '.jsx', '.js'];
            for (const ext of extensions) {
              const p = path.resolve(path.dirname(blockFile), importPath + ext);
              if (existsSync(p)) {
                const compCode = readComponentSource(p);
                resolvedComponentSource = compCode;
                resolvedComponentSourcePath = p;
                if (!editableSchema) {
                  editableSchema = resolveComponentEditableSchema(compCode, p, themeRoot);
                }
                if (!dualHostMeta) {
                  dualHostMeta = extractPickAttrMetaMap(compCode);
                }
                break;
              }
            }
          }
          // Legacy direct defineEditable on the block file
          if (!editableSchema && code.includes('defineEditable(')) {
            editableSchema = parseDefineEditable(code);
          }
          if (dualHostMeta && Object.keys(dualHostMeta).length > 0) {
            // attrKey → post meta key (ACF). Used on save_post so block edits
            // update page meta that baked templates read via useWpMeta.
            settings.dualHostMeta = dualHostMeta;
          }

          if (editableSchema) {
            if (!settings.attributes) {
              settings.attributes = {
                align: {
                  type: 'string',
                  default: 'full'
                }
              };
            }
            for (const [key, field] of Object.entries(editableSchema)) {
              const mapped = mapEditableFieldToAttribute(field);
              settings.attributes[key] = {
                ...(settings.attributes[key] || {}),
                ...mapped
              };
            }
          }

          // Every ForgeWP block ships with paddingY/paddingX by default — no
          // per-block wiring needed. A dev writes normal Tailwind padding
          // classes (or none) on their own top-level element; if they match a
          // known preset exactly, the compiler adopts it as that attribute's
          // default and strips the literal tokens from the static className
          // (see stripPaddingTokensFromFirstTag below) so the sidebar-driven
          // forgewp_padding_classes() call is the only thing controlling
          // padding from then on. No dev code changes required either way.
          if (!settings.attributes) settings.attributes = {};
          const PADDING_OPTIONS = [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ];
          const detectedPadding = detectPaddingDefaultsFromJsx(
            extractJsx(resolvedComponentSource) || '',
          );
          settings._detectedPaddingTokens = {
            y: detectedPadding.yTokens,
            x: detectedPadding.xTokens,
          };
          if (!settings.attributes.paddingY) {
            settings.attributes.paddingY = {
              type: 'string',
              default: detectedPadding.paddingY,
              control: 'select',
              label: 'Vertical Padding',
              options: PADDING_OPTIONS,
            };
          }
          if (!settings.attributes.paddingX) {
            settings.attributes.paddingX = {
              type: 'string',
              default: detectedPadding.paddingX,
              control: 'select',
              label: 'Horizontal Padding',
              options: PADDING_OPTIONS,
            };
          }

          if (settings.category) {
            if (!settings.category.startsWith('forgewp-')) {
              settings.category = `forgewp-${settings.category}`;
            }
          } else {
            settings.category = 'forgewp-theme';
          }

          if (settings.attributes && Object.keys(settings.attributes).length > 0) {
            settings.example = { attributes: {} };
            for (const [key, attr] of Object.entries(settings.attributes)) {
              settings.example.attributes[key] = attr.default !== undefined && attr.default !== '' 
                ? attr.default 
                : (attr.type === 'number' ? 100 : (attr.type === 'boolean' ? true : `Sample ${key}`));
            }
          }

          // ── Parent shell blocks (InnerBlocks layout) ─────────────────────
          // No content JSX required — shell + $content from child blocks.
          if (settings.innerBlocks) {
            const normalizedIb = normalizeInnerBlocksConfig(settings.innerBlocks);
            if (!normalizedIb) {
              console.warn(
                `[Gutenberg Block Compiler] Skipping parent shell ${blockSlug}: invalid innerBlocks config.`,
              );
              continue;
            }
            settings.isParentShell = true;
            settings.innerBlocks = normalizedIb;
            settings.shell = settings.shell && typeof settings.shell === 'object' ? settings.shell : {};
            const shellClass = String(settings.shell.className || '').trim();
            const gridClass = String(settings.shell.gridClassName || '').trim();

            const blockFolderName = settings.name.replace('forgewp/', '');
            const renderPhpContent = `<?php
/**
 * Parent shell block — ${settings.title}
 * Autogenerated by ForgeWP Theme Compiler. Do not modify manually.
 *
 * Layout-only wrapper. Child blocks are rendered into $content via InnerBlocks.
 */
$shell_class = ${JSON.stringify(shellClass ? `forgewp-block-shell ${shellClass}` : 'forgewp-block-shell')};
$grid_class  = ${JSON.stringify(gridClass ? `forgewp-block-shell__grid ${gridClass}` : 'forgewp-block-shell__grid')};
?>
<div class="<?php echo esc_attr( $shell_class ); ?>">
  <div class="<?php echo esc_attr( $grid_class ); ?>" style="min-width:0">
    <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks HTML ?>
  </div>
</div>
`;

            const blockOutDir = path.join(outDir, 'blocks', blockFolderName);
            mkdirSync(blockOutDir, { recursive: true });

            const {
              edit: _editShell,
              customEditJsx: _cejShell,
              importMap: _imShell,
              themeRoot: _trShell,
              isParentShell: _ips,
              innerBlocks: _ibMeta,
              shell: _shellMeta,
              ...blockJsonSettings
            } = settings;

            // Keep render + standard fields; drop compiler-only metadata from block.json
            const jsonOut = {
              apiVersion: 3,
              name: settings.name,
              title: settings.title,
              category: settings.category,
              icon: settings.icon,
              description: settings.description || '',
              attributes: settings.attributes || {},
              supports: { html: false },
              editorStyle: settings.editorStyle,
              render: 'file:./render.php',
              usesContext: settings.usesContext || ['postId', 'postType'],
            };

            writeFileSync(
              path.join(blockOutDir, 'block.json'),
              JSON.stringify(jsonOut, null, 2),
              'utf8',
            );
            writeFileSync(
              path.join(blockOutDir, 'render.php'),
              renderPhpContent,
              'utf8',
            );

            // forgeWpBlocks keeps full settings (isParentShell, innerBlocks, shell)
            blockSlugs.push(settings);
            console.log(
              `[Gutenberg Block Compiler] Parent shell registered: ${settings.name}`,
            );
            continue;
          }

          // Extract JSX from save first, then edit as fallback
          let jsx = '';
          if (code.includes('save:')) {
            jsx = extractJsx(code, 'save');
          }
          if (!jsx && code.includes('edit:')) {
            jsx = extractJsx(code, 'edit');
          }

          if (!jsx) {
            const returnMatch = code.match(/return\s*\(\s*(<[\s\S]*?>)\s*\)/);
            if (returnMatch) {
              jsx = returnMatch[1];
            } else {
              const returnMatchSingle = code.match(/return\s+(<[\s\S]*?>);/);
              if (returnMatchSingle) {
                jsx = returnMatchSingle[1];
              }
            }
          }

          if (!jsx) {
            console.warn(
              `[Gutenberg Block Compiler] Skipping block ${blockSlug}: No returning JSX element found.`,
            );
            continue;
          }

          let jsxSourceFile = blockFile;
          let jsxSourceCode = code;
          let resolvedComponentName = '';
          if (jsx) {
            const componentTagMatch = jsx.trim().match(/^<([A-Z][a-zA-Z0-9_-]*)\s*([^>]*?)\/?>$/);
            if (componentTagMatch) {
              const compName = componentTagMatch[1];
              resolvedComponentName = compName;
              const importRegex = new RegExp(`import\\s+(?:\\{\\s*${compName}\\s*\\}|${compName})\\s+from\\s+["']([^"']+)["']`);
              const match = code.match(importRegex);
              if (match) {
                let importPath = match[1];
                let resolvedPath = '';
                if (importPath.startsWith('@/')) {
                  resolvedPath = path.resolve(themeRoot, importPath.replace('@/', './src/'));
                } else {
                  resolvedPath = path.resolve(path.dirname(blockFile), importPath);
                }

                let finalPath = '';
                for (const ext of ['.tsx', '.jsx', '/index.tsx', '/index.jsx']) {
                  if (existsSync(resolvedPath + ext)) {
                    finalPath = resolvedPath + ext;
                    break;
                  }
                }
                if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
                  finalPath = resolvedPath;
                }

                if (finalPath && existsSync(finalPath)) {
                  try {
                    const compContent = readComponentSource(finalPath);
                    const funcIndex = compContent.indexOf(`function ${compName}`);
                    const constIndex = compContent.indexOf(`const ${compName}`);
                    const searchIndex = funcIndex !== -1 ? funcIndex : constIndex;

                    let propKeys = [];
                    if (searchIndex !== -1) {
                      const sub = compContent.substring(searchIndex);
                      const paramMatch = sub.match(/\(\s*\{([\s\S]*?)\}/);
                      if (paramMatch) {
                        const paramBody = paramMatch[1];
                        const keyRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*[^,]+)?/g;
                        let kMatch;
                        while ((kMatch = keyRegex.exec(paramBody)) !== null) {
                          if (!kMatch[1].includes(':')) {
                            propKeys.push(kMatch[1].trim());
                          }
                        }
                      }
                    }

                    let compJsx = '';
                    if (searchIndex !== -1) {
                      compJsx = extractJsx(compContent.substring(searchIndex), compName) || extractJsx(compContent, compName);
                      if (!compJsx) {
                        const sub = compContent.substring(searchIndex);
                        const returnMatch = sub.match(/return\s*\(\s*(<[\s\S]*?>)\s*\)/);
                        if (returnMatch) {
                          compJsx = returnMatch[1];
                        } else {
                          const returnMatchSingle = sub.match(/return\s+(<[\s\S]*?>);/);
                          if (returnMatchSingle) {
                            compJsx = returnMatchSingle[1];
                          }
                        }
                      }
                    }

                    if (compJsx) {
                      if (propKeys.length > 0) {
                        for (const key of propKeys) {
                          const rx = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
                          compJsx = compJsx.replace(rx, `{attributes.${key}}`);
                          const attrRx = new RegExp(`(src|href|alt|title)=\\{\\s*${key}\\s*\\}`, 'gi');
                          compJsx = compJsx.replace(attrRx, `$1={attributes.${key}}`);
                        }
                      }
                      jsx = compJsx;
                      jsxSourceFile = finalPath;
                      jsxSourceCode = compContent;

                      const compImportRx = /import\s+(?:type\s+)?(?:\{([^}]+)\}|([A-Za-z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g;
                      let compImportMatch;
                      while ((compImportMatch = compImportRx.exec(compContent)) !== null) {
                        const namedImports = compImportMatch[1];
                        const defaultImport = compImportMatch[2];
                        const fromPkg = compImportMatch[3];
                        if (fromPkg.startsWith('.') || fromPkg.startsWith('@/') || fromPkg.startsWith('react') || fromPkg.startsWith('next')) continue;
                        if (namedImports) {
                          for (const name of namedImports.split(',')) {
                            const n = name.replace(/\s+as\s+\S+/, '').trim();
                            if (n && /^[A-Z]/.test(n)) importMap[n] = fromPkg;
                          }
                        } else if (defaultImport && /^[A-Z]/.test(defaultImport)) {
                          importMap[defaultImport] = fromPkg;
                        }
                      }
                      settings.importMap = importMap;
                    }
                  } catch (err) {
                    console.warn(`[Gutenberg Block Compiler] Failed to resolve component source for ${compName}:`, err.message);
                  }
                }
              }
            }
          }

          // Same-file "icon wrapper" helper components (e.g. ValueIcon) are
          // invisible to expandNestedComponentTags (imports-only) — rewrite
          // them to a direct <WpIcon> tag first so the dedicated WpIcon pass
          // further down actually picks them up.
          jsx = inlineIconWrapperTags(jsx, jsxSourceCode);
          jsx = expandNestedComponentTags(jsx, jsxSourceCode, jsxSourceFile, themeRoot, 0, 'php');

          // A block whose OWN top-level component uses live-data hooks (useState/
          // useWpQuery/…) can never be safely inlined into the editor's new Function()
          // IIFE — the same reasoning resolveImportedComponentJsx already applies to
          // a NESTED interactive reference (hooks don't run there, useWpQuery's early-
          // return JSX leaves free vars undefined, etc.). Without this check, such a
          // block fell through to ServerSideRender instead (hasCustomAttrs is false
          // when the block has no editable schema, so editJsx below never populates),
          // which renders the real render.php output live in the editor canvas — and
          // that PHP always sets its loading-state stubs ($loading = true, empty
          // arrays) unconditionally, so the canvas gets stuck showing a skeleton
          // loader or an empty shell instead of a stable "interactive preview" notice.
          const isTopLevelLiveDataBlock = isComponentInteractive(resolvedComponentSourcePath);
          if (isTopLevelLiveDataBlock) {
            const hasLiveQuery = /\buseWp(Query|Terms)\b/.test(resolvedComponentSource);
            const guidance = hasLiveQuery
              ? (
                'This section loads live data on the visitor page (not in the editor canvas). ' +
                'Preview the full grid/list on the frontend after publishing.'
              )
              : (
                'This section is interactive on the live site (forms, state, live data). ' +
                'The full UI appears on the visitor page - use the canvas/sidebar when ' +
                'this block exposes editable fields.'
              );
            settings.customEditJsx =
              `createElement("div", { className: "forgewp-editor-island-placeholder", style: {padding:'14px 16px',border:'1px dashed #c3c4c7',borderRadius:'8px',background:'#f6f7f7',color:'#646970',fontSize:'12px',lineHeight:'1.55'} }, ` +
              `createElement("strong", { style: {display:'block',marginBottom:'6px',color:'#1d2327',fontSize:'13px'} }, ${JSON.stringify(`${settings.title} - interactive preview`)}), ` +
              `createElement("span", { style: {display:'block'} }, ${JSON.stringify(guidance)}))`;
          } else {
            let editJsx = '';
            // paddingY/paddingX are excluded here — they're on every block by
            // default and shouldn't by themselves flip a simple/static block from
            // ServerSideRender (which just runs the real render.php for its editor
            // preview) into the live customEditJsx canvas.
            const hasCustomAttrs = settings.attributes && Object.keys(settings.attributes).filter(k => k !== 'align' && k !== 'paddingY' && k !== 'paddingX').length > 0;
            if (code.includes('edit:') && hasCustomAttrs) {
              editJsx = extractJsx(code, 'edit');
            }
            if (editJsx) {
              try {
                editJsx = expandNestedComponentTags(editJsx, code, blockFile, themeRoot, 0, 'editor');
                // Strip TS casts / annotations before AST → plain JS for new Function()
                editJsx = stripTypeScriptSyntax(editJsx);

                const propKeys = Object.keys(settings.attributes || {});
                if (propKeys.length > 0) {
                  for (const key of propKeys) {
                    const rx = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
                    editJsx = editJsx.replace(rx, `{attributes.${key}}`);
                  }

                  // Rewrite bare attribute identifiers (and spread `...attr`) inside JSX
                  // expression braces. Use balanced-brace scanning so nested objects
                  // (e.g. setAttributes({ team: [...team, { ... }] })) are fully covered.
                  // Spread must be handled first: `(?<![.\\w])team` fails on `...team`
                  // because the last `.` of the spread looks like property access.
                  const rewriteAttrRefsInExpr = (expr) =>
                    rewriteAttrRefsSafely(expr, propKeys);

                  let rebuilt = '';
                  let scan = 0;
                  while (scan < editJsx.length) {
                    const eqBrace = editJsx.indexOf('={', scan);
                    if (eqBrace === -1) {
                      rebuilt += editJsx.slice(scan);
                      break;
                    }
                    rebuilt += editJsx.slice(scan, eqBrace + 2);
                    let depth = 1;
                    let pos = eqBrace + 2;
                    let inSingle = false;
                    let inDouble = false;
                    let inBacktick = false;
                    while (pos < editJsx.length && depth > 0) {
                      const c = editJsx[pos];
                      if (inSingle) {
                        if (c === '\\') { pos += 2; continue; }
                        if (c === "'") inSingle = false;
                      } else if (inDouble) {
                        if (c === '\\') { pos += 2; continue; }
                        if (c === '"') inDouble = false;
                      } else if (inBacktick) {
                        if (c === '\\') { pos += 2; continue; }
                        if (c === '`') inBacktick = false;
                      } else {
                        if (c === "'") inSingle = true;
                        else if (c === '"') inDouble = true;
                        else if (c === '`') inBacktick = true;
                        else if (c === '{') depth++;
                        else if (c === '}') depth--;
                      }
                      pos++;
                    }
                    const expr = editJsx.slice(eqBrace + 2, pos - 1);
                    rebuilt += rewriteAttrRefsInExpr(expr) + '}';
                    scan = pos;
                  }
                  editJsx = rebuilt;
                }

                const ast = parseJsxToAst(editJsx);
                if (!ast) throw new Error('editJsx did not parse as a single JSX expression');
                const customEditJsx = generateReactCreateElement(ast, settings);
                const paddingTokensToStrip = settings._detectedPaddingTokens
                  ? [...settings._detectedPaddingTokens.y, ...settings._detectedPaddingTokens.x]
                  : [];
                settings.customEditJsx = injectPaddingClassesIntoEditJsx(customEditJsx, paddingTokensToStrip);
              } catch (e) {
                console.warn(`[Gutenberg Block Compiler] Failed to parse custom edit JSX for ${blockSlug}:`, e.message);
              }
            }
          }

          // Same-file helpers + TS-stripped locals for the editor IIFE / PHP render
          let hoistedHelperJs = '';
          let phpHelperDefinitions = '';
          const phpFreeFunctions = new Set();
          const helperNameToPhp = new Map();
          // JSX-returning helpers (e.g. `const cell = (a,b) => (<div>…)`) can't
          // become real PHP functions — jsHelperToPhpFunction rejects them —
          // so their call sites get inlined as literal JSX instead. Keyed by
          // helper name -> { params, jsxBody }.
          const jsxRenderHelperTemplates = new Map();
          const allSameFileHelperNames = new Set();

          let phpVarDefinitions = '';
          let jsVarDefinitions = '';
          const localVars = new Set();
          const clientOnlyVars = new Set();
          if (!resolvedComponentName) {
            const funcMatch = jsxSourceCode.match(/(?:export\s+default\s+function|export\s+function|function)\s+([a-zA-Z0-9_$]+)/) ||
                              jsxSourceCode.match(/(?:export\s+const|const)\s+([a-zA-Z0-9_$]+)/);
            if (funcMatch && funcMatch[1] !== 'editable') {
              resolvedComponentName = funcMatch[1];
            }
          }

          if (resolvedComponentName) {
            const funcIndex = jsxSourceCode.indexOf(`function ${resolvedComponentName}`);
            const constIndex = jsxSourceCode.indexOf(`const ${resolvedComponentName}`);
            const searchIndex = funcIndex !== -1 ? funcIndex : constIndex;
            if (searchIndex !== -1) {
              const sub = jsxSourceCode.substring(searchIndex);
              const returnMatch = sub.match(/return\s*\(?\s*</);
              const returnIdx = returnMatch ? returnMatch.index : -1;
              if (returnIdx !== -1) {
                const header = sub.substring(0, returnIdx);
                const attrKeys = Object.keys(settings.attributes || {});
                
                const closeParenIdx = header.indexOf(')');
                const bodyBraceIdx = header.indexOf('{', closeParenIdx);
                let bodyHeader = bodyBraceIdx !== -1 ? header.substring(bodyBraceIdx + 1) : header;
                
                bodyHeader = stripTypeScriptSyntax(bodyHeader);

                // Rewrite bare attribute identifiers to attributes.X for the editor
                // IIFE — but NEVER rewrite binding names:
                //   const title = …  → must stay `const title`, not `const attributes.title`
                // (that produces "missing initializer in const declaration").
                bodyHeader = rewriteAttrRefsSafely(bodyHeader, attrKeys);

                // Helpers defined before `return` may still contain JSX
                // (e.g. `const cell = () => (<div>…</div>)`). Convert those to
                // createElement so the editor IIFE is plain JS.
                if (/<[A-Za-z/$]/.test(bodyHeader) || /<>/.test(bodyHeader)) {
                  bodyHeader = transpileJsxInPreamble(bodyHeader, settings);
                }
                jsVarDefinitions = bodyHeader;

                // Optional `(?:\s*:\s*[^=]+?)?` after the name consumes (and discards) a
                // TypeScript type annotation — e.g. `const members: TeamMember[] = …` —
                // which the name charset itself can't include (no `:`). Without it the
                // whole declaration silently failed to match at all, so a repeater local
                // like `const members: TeamMember[] = Array.isArray(teamProp) ? …` never
                // even reached the value-translation logic below.
                const varRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$,\s\[\]{}]+)(?:\s*:\s*[^=]+?)?\s*=\s*((?:[^;`"']|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*?);/g;
                let vMatch;
                const reserved = ['setAttributes', 'attributes', 'clientId', 'isSelected', 'name', 'context', 'className', 'attrs'];
                const phpStringLiteral = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

                while ((vMatch = varRegex.exec(bodyHeader)) !== null) {
                  const rawNames = vMatch[1];
                  const varValue = vMatch[2].trim();
                  const names = (rawNames.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || []);
                  if (names.length === 0) continue;

                  // useWpPageLink(slug, fallback) resolves to a real page URL server-side
                  // via a dedicated PHP helper. Handled before the generic /useWp/ clientOnly
                  // check below, which would otherwise silently drop it — leaving any
                  // `href={pageLinkVar}` pointing at $attributes['pageLinkVar'] (undefined).
                  const pageLinkMatch = varValue.match(/^useWpPageLink\(\s*(['"])((?:[^'"\\]|\\.)*)\1\s*(?:,\s*(['"])((?:[^'"\\]|\\.)*)\3\s*)?\)$/);
                  if (pageLinkMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const slug = pageLinkMatch[2].replace(/\\(['"])/g, '$1');
                    const fallback = (pageLinkMatch[4] || '').replace(/\\(['"])/g, '$1');
                    localVars.add(names[0]);
                    phpVarDefinitions += `$${names[0]} = forgewp_resolve_page_link(${phpStringLiteral(slug)}, ${phpStringLiteral(fallback)});\n`;
                    continue;
                  }

                  // useWpOption(name, default) reads a real WordPress site option —
                  // trivially get_option() server-side. Without this dedicated case it
                  // fell through to the generic /useWp/ clientOnly check below (which
                  // exists for hooks that genuinely have no server twin, like useState),
                  // silently dropping the value and everything derived from it — e.g.
                  // ContactDetails' entire phone/email/address/hours list and social
                  // links array are each `const x = useWpOption(...)`, so the whole
                  // section rendered empty on the frontend even though these are plain,
                  // always-available WordPress options.
                  // Trailing comma (`,?` before the closing paren) covers the common
                  // Prettier-formatted multi-line call — e.g. `useWpOption(\n  'x',\n  'y',\n)`
                  // — which otherwise fails to match at all and silently drops the value.
                  const wpOptionMatch = varValue.match(/^useWpOption\(\s*(['"])((?:[^'"\\]|\\.)*)\1\s*(?:,\s*(['"])((?:[^'"\\]|\\.)*)\3\s*,?\s*)?\)$/);
                  if (wpOptionMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const optionName = wpOptionMatch[2].replace(/\\(['"])/g, '$1');
                    const fallback = (wpOptionMatch[4] || '').replace(/\\(['"])/g, '$1');
                    localVars.add(names[0]);
                    phpVarDefinitions += `$${names[0]} = get_option(${phpStringLiteral(optionName)}, ${phpStringLiteral(fallback)});\n`;
                    continue;
                  }

                  // useWpMeta(key, default) reads a page/post meta field —
                  // translates to forgewp_get_meta_value() server-side.
                  // Trailing comma / multiline calls are handled via [\\s\\S]*? inside the regex.
                  const wpMetaMatch = varValue.match(/^useWpMeta\(\s*(['"])((?:[^'"\\]|\\.)*)\1\s*,\s*([\s\S]*?)\s*\)$/);
                  if (wpMetaMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const metaKey = wpMetaMatch[2].replace(/\\(['"])/g, '$1');
                    const rawFallback = wpMetaMatch[3].trim().replace(/,$/, '').trim();
                    let phpFallback = 'null';
                    
                    const defaultsPropMatch = rawFallback.match(/^defaults\.([A-Za-z0-9_$]+)$/);
                    if (defaultsPropMatch) {
                      const schemaKey = defaultsPropMatch[1];
                      let attrKey = schemaKey;
                      if (dualHostMeta) {
                        for (const [aKey, mKey] of Object.entries(dualHostMeta)) {
                          if (mKey === schemaKey) {
                            attrKey = aKey;
                            break;
                          }
                        }
                      }
                      const attrDef = settings.attributes?.[attrKey];
                      if (attrDef && typeof attrDef.default !== 'undefined') {
                        phpFallback = phpStringLiteral(attrDef.default);
                      }
                    } else if (/^(['"])(.*?)\1$/.test(rawFallback)) {
                      const stringLiteral = rawFallback.slice(1, -1).replace(/\\(['"])/g, '$1');
                      phpFallback = phpStringLiteral(stringLiteral);
                    } else {
                      phpFallback = translateJsExpressionToPhp(rawFallback, attrKeys, localVars);
                    }
                    
                    let isRichText = false;
                    let attrKey = metaKey;
                    if (dualHostMeta) {
                      for (const [aKey, mKey] of Object.entries(dualHostMeta)) {
                        if (mKey === metaKey) {
                          attrKey = aKey;
                          break;
                        }
                      }
                    }
                    const attrDefForRichText = settings.attributes?.[attrKey];
                    if (attrDefForRichText && (attrDefForRichText.control === 'richText' || attrDefForRichText.control === 'wysiwyg')) {
                      isRichText = true;
                    }

                    localVars.add(names[0]);
                    phpVarDefinitions += `$${names[0]} = forgewp_get_meta_value(${phpStringLiteral(metaKey)}, ${phpFallback}, ${isRichText ? 'true' : 'false'}, null);\n`;
                    continue;
                  }

                  // resolveBlockPaddingY(setAttributes, XProp, bakedDefault) — per
                  // src/lib/section-padding.ts, "page host: always the baked default;
                  // block host: attribute prop". render.php only ever renders a real,
                  // active block (there is no "page host" render path here), so it
                  // should always take the block-host branch: read the attribute,
                  // fall back to the baked default. Previously this whole call fell
                  // through to the generic unknownCall clientOnly check below, which
                  // dropped it entirely — leaving padding permanently blank on the
                  // frontend regardless of what the user picked in the sidebar.
                  const paddingMatch = varValue.match(/^resolveBlockPaddingY\(\s*setAttributes\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*,?\s*\)$/);
                  if (paddingMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const propArg = paddingMatch[1];
                    const attrKey = propArg.endsWith('Prop') ? propArg.slice(0, -4) : propArg;
                    let bakedDefault = paddingMatch[2];
                    const bakedLiteralMatch = bakedDefault.match(/^['"]([^'"]*)['"]$/);
                    if (bakedLiteralMatch) {
                      bakedDefault = bakedLiteralMatch[1];
                    } else {
                      const constMatch = jsxSourceCode.match(
                        new RegExp(`const\\s+${bakedDefault}\\s*=\\s*(['"])([^'"]*)\\1`),
                      );
                      bakedDefault = constMatch ? constMatch[2] : 'md';
                    }
                    localVars.add(names[0]);
                    phpVarDefinitions += `$${names[0]} = $attributes[${phpStringLiteral(attrKey)}] ?? ${phpStringLiteral(bakedDefault)};\n`;
                    // sectionPaddingY(paddingY) — sibling helper, same file — gets a
                    // real PHP twin too, via the same call-site rename used for
                    // same-file hoisted helpers below.
                    phpFreeFunctions.add('forgewp_section_padding_y');
                    helperNameToPhp.set('sectionPaddingY', 'forgewp_section_padding_y');
                    continue;
                  }

                  // sectionPaddingY(paddingY) assigned to its own local var, e.g.
                  // `const pad = sectionPaddingY(paddingY);` then `${pad}` later —
                  // a second shape of the same helper pair (the other shape, inline
                  // inside a class template literal, is handled by the
                  // helperNameToPhp call-site rename below). Only reachable once the
                  // paddingY-producing resolveBlockPaddingY() declaration above has
                  // already run and registered the rename.
                  const sectionPaddingCallMatch = varValue.match(/^sectionPaddingY\(\s*([A-Za-z_$][\w$]*)\s*\)$/);
                  if (sectionPaddingCallMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const argName = sectionPaddingCallMatch[1];
                    const argRef = localVars.has(argName)
                      ? `$${argName}`
                      : `($attributes[${phpStringLiteral(argName)}] ?? null)`;
                    localVars.add(names[0]);
                    phpVarDefinitions += `$${names[0]} = forgewp_section_padding_y(${argRef});\n`;
                    continue;
                  }

                  // Dual-shape image/media fallback chain — the idiom used wherever
                  // an "image" control attribute might be an object ({url, alt, id},
                  // the shape the media picker actually saves) OR a plain string (a
                  // baked default authored directly in block.json, e.g.
                  // ContactHero/AboutHero's cardImage/image1/image2):
                  //   const cardImage = (cardImageProp && (cardImageProp as any).url)
                  //     || cardImageProp || cardImageMeta || '';
                  // In JS, `(x as any).url` on a plain string just evaluates to
                  // `undefined` — harmless. The naive PHP transpilation of `.url`
                  // is unconditional array-index syntax (`$x['url']`), and PHP 8
                  // throws a fatal TypeError indexing a string with a non-numeric
                  // key ("Cannot access offset of type string on string") — turning
                  // an untouched compile-time default into a site-breaking crash
                  // the moment this block is actually inserted (WordPress applies
                  // block.json's own default into $attributes even when nothing
                  // was customized). Recognizing the idiom and guarding it with
                  // is_array() preserves the same string-or-object either way.
                  // Note: by the time this loop sees varValue, TypeScript `as`
                  // casts have already been stripped upstream (stripAsCasts),
                  // so `(cardImageProp as any).url` has already become plain
                  // `(cardImageProp).url` here — the `as any` never survives
                  // to this point, so the regex must not require it.
                  const imageDualShapeMatch = varValue.match(
                    /^\(\s*([A-Za-z_$][\w$]*)\s*&&\s*\(\s*\1\s*\)\.url\s*\)\s*\|\|\s*\1\s*\|\|\s*([A-Za-z_$][\w$]*)\s*\|\|\s*'([^']*)'$/,
                  );
                  if (imageDualShapeMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const propArg = imageDualShapeMatch[1];
                    const metaArg = imageDualShapeMatch[2];
                    const fallbackLiteral = imageDualShapeMatch[3];
                    const attrKey = propArg.endsWith('Prop') ? propArg.slice(0, -4) : propArg;
                    if (attrKeys.includes(attrKey)) {
                      const attrRef = `($attributes[${phpStringLiteral(attrKey)}] ?? null)`;
                      const metaRef = localVars.has(metaArg) ? `$${metaArg}` : `($attributes[${phpStringLiteral(metaArg)}] ?? null)`;
                      localVars.add(names[0]);
                      phpVarDefinitions += `$${names[0]} = (is_array(${attrRef}) ? (${attrRef}['url'] ?? '') : (${attrRef} ?? '')) ?: (${metaRef} ?: ${phpStringLiteral(fallbackLiteral)});\n`;
                      continue;
                    }
                  }

                  // Array/repeater dual-host fallback chain — the idiom every
                  // repeater-backed section uses (AboutTeam's `members`, AboutValues'
                  // `rows`, AboutStats' `rows`, …):
                  //   const members = Array.isArray(teamProp) ? teamProp
                  //     : Array.isArray(teamMeta) ? teamMeta : (defaults.team_members as X[]);
                  // The local var name (members) deliberately differs from the real
                  // attribute key (team) for readability, but `.map()`'s loop-transpile
                  // step (transpileLoops) just uses whatever identifier is literally
                  // mapped-over as BOTH the attribute-key guess AND the local-var name
                  // (`$attributes['members'] ?? $members ?? array()`) — it has no way
                  // to know the JS variable's real data-flow origin. Since this whole
                  // expression can't be `new Function()`-evaluated (teamProp/teamMeta/
                  // defaults aren't defined in isolation) it fell through to the
                  // generic bare-identifier fallback, producing `($teamProp ?? null)`
                  // — always null — so the repeater silently rendered empty on the
                  // frontend even though the block attribute had real rows. Recognizing
                  // the idiom directly and resolving `teamProp` back to its attribute
                  // key (strip the "Prop" suffix convention every dual-host component
                  // uses) makes transpileLoops's own `?? $members` fallback pick up the
                  // real value with no changes needed there.
                  const arrayPropMetaMatch = varValue.match(
                    /^Array\.isArray\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\?\s*\1\s*:\s*Array\.isArray\(\s*[A-Za-z_$][\w$]*\s*\)\s*\?\s*[A-Za-z_$][\w$]*\s*:\s*\(?\s*defaults\.[A-Za-z_$][\w$]*\s*(?:as\s+[^)]+)?\)?$/,
                  );
                  if (arrayPropMetaMatch && names.length === 1 && !reserved.includes(names[0])) {
                    const propArg = arrayPropMetaMatch[1];
                    const attrKey = propArg.endsWith('Prop') ? propArg.slice(0, -4) : propArg;
                    if (attrKeys.includes(attrKey)) {
                      localVars.add(names[0]);
                      phpVarDefinitions += `$${names[0]} = $attributes[${phpStringLiteral(attrKey)}] ?? array();\n`;
                      continue;
                    }
                  }

                  let referencesClientOnly = false;
                  for (const clientVar of clientOnlyVars) {
                    const rx = new RegExp(`\\b${clientVar}\\b`);
                    if (rx.test(varValue)) {
                      referencesClientOnly = true;
                      break;
                    }
                  }

                  // Calls to imported/theme helpers (resolveBlockPaddingY, sectionPaddingY,
                  // setState setters, DOM handlers, …) are not PHP-callable. Treat as
                  // client-only so render.php never does ($fn ?? null)(...).
                  const unknownCall = varValue.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/);
                  const knownPhpCall =
                    unknownCall &&
                    /^(Number|String|Boolean|parseInt|parseFloat|JSON\.parse|Math\.\w+|useWpPageLink|useWpMeta)$/.test(
                      unknownCall[1],
                    );
                  const isClientOnly =
                    referencesClientOnly ||
                    /useRef|useState|useEffect|useMemo|useCallback|useWp|useIsEditorPreview|isEditorPreview|React\.|typeof\s+window|document\.|window\./.test(
                      varValue,
                    ) ||
                    varValue.includes('<') ||
                    varValue.includes('>') ||
                    (unknownCall && !knownPhpCall) ||
                    // dual-host layout helpers take setAttributes — never SSR
                    /\bsetAttributes\b/.test(varValue);

                  if (isClientOnly) {
                    for (const name of names) {
                      clientOnlyVars.add(name);
                    }
                  } else {
                    for (const varName of names) {
                      if (!reserved.includes(varName)) {
                        localVars.add(varName);
                        
                        let phpVal = '';
                        if (varValue.startsWith('`') && varValue.endsWith('`')) {
                          const templateContent = varValue.slice(1, -1);
                          const parts = [];
                          let lastIdx = 0;
                          const rx = /\$\{\s*([\s\S]*?)\s*\}/g;
                          let m;
                          while ((m = rx.exec(templateContent)) !== null) {
                            const textBefore = templateContent.substring(lastIdx, m.index);
                            if (textBefore) {
                              parts.push(JSON.stringify(textBefore));
                            }
                            const expr = translateJsExpressionToPhp(m[1], attrKeys, localVars);
                            parts.push(expr);
                            lastIdx = rx.lastIndex;
                          }
                          const textAfter = templateContent.substring(lastIdx);
                          if (textAfter) {
                            parts.push(JSON.stringify(textAfter));
                          }
                          phpVal = parts.join(' . ');
                        } else {
                          let evaluatedVal;
                          let evalSuccess = false;
                          try {
                            evaluatedVal = new Function(`return (${varValue});`)();
                            evalSuccess = true;
                          } catch (e) {}

                          if (evalSuccess) {
                            const convertJsValueToPhp = (val) => {
                              if (val === null) return 'null';
                              if (val === undefined) return 'null';
                              if (typeof val === 'boolean') return val ? 'true' : 'false';
                              if (typeof val === 'number') return String(val);
                              if (typeof val === 'string') return JSON.stringify(val);
                              if (Array.isArray(val)) {
                                  return '[' + val.map(convertJsValueToPhp).join(', ') + ']';
                              }
                              if (typeof val === 'object') {
                                const parts = Object.entries(val).map(([k, v]) => {
                                  return `${JSON.stringify(k)} => ${convertJsValueToPhp(v)}`;
                                });
                                return '[' + parts.join(', ') + ']';
                              }
                              return 'null';
                            };
                            phpVal = convertJsValueToPhp(evaluatedVal);
                          } else {
                            phpVal = translateJsExpressionToPhp(varValue, attrKeys, localVars);
                          }
                        }

                        // Last line of defense: never emit null callables
                        if (/\(\s*\$\w+\s*\?\?\s*null\s*\)\s*\(/.test(phpVal) || /\bnull\s*\(/.test(phpVal)) {
                          clientOnlyVars.add(varName);
                          localVars.delete(varName);
                          continue;
                        }
                        
                        phpVarDefinitions += `$${varName} = ${phpVal};\n`;
                      }
                    }
                  }
                }
              }
            }
          }

          // Hoist same-file helpers referenced by the component (e.g. avatarUrl())
          // into the editor IIFE so developers can write normal TS modules.
          if (settings.customEditJsx || jsx) {
            const usageBlob = [settings.customEditJsx || '', jsx || '', jsVarDefinitions || ''].join('\n');
            const exclude = new Set([
              resolvedComponentName,
              'defineEditable',
              'defineBlock',
              'editable',
              ...Object.keys(settings.attributes || {}),
            ].filter(Boolean));
            const helpers = extractSameFileHelpers(jsxSourceCode, usageBlob, exclude);
            for (const h of helpers) allSameFileHelperNames.add(h.name);
            if (helpers.length > 0) {
              // Helpers may return JSX (e.g. const cell = () => <div/>). Convert for editor.
              // If the same helper also lives in jsVarDefinitions (inline const before return),
              // drop the body copy so we don't double-declare in the IIFE.
              for (const h of helpers) {
                if (jsVarDefinitions) {
                  jsVarDefinitions = stripTopLevelHelperDecl(jsVarDefinitions, h.name);
                }
              }
              hoistedHelperJs = helpers
                .map((h) => {
                  let code = h.code;
                  if (/<[A-Za-z/$]/.test(code) || /<>/.test(code)) {
                    code = transpileJsxInPreamble(code, settings);
                  }
                  return code;
                })
                .join('\n\n');
              // Prefer defineBlock name (forgewp/slug) over generated wrapper file slug
              const helperSlug = (settings.name || blockSlug).replace(/^forgewp\//, '');
              for (const h of helpers) {
                const phpName = phpHelperName(helperSlug, h.name);
                const phpFn = jsHelperToPhpFunction(phpName, h.code);
                if (phpFn) {
                  phpHelperDefinitions += phpFn;
                  phpFreeFunctions.add(phpName);
                  helperNameToPhp.set(h.name, phpName);
                } else {
                  const template = jsxHelperToTemplate(h.code);
                  if (template) {
                    jsxRenderHelperTemplates.set(h.name, template);
                  } else {
                    console.warn(
                      `[Gutenberg Block Compiler] Could not convert helper "${h.name}" to PHP for block ${blockSlug}; editor still works.`,
                    );
                  }
                }
              }
            }
          }

          // The top-level live-data placeholder (set above when isTopLevelLiveDataBlock)
          // is a fully self-contained createElement(...) call — it references none of
          // the component's own local vars. jsVarDefinitions is extracted by cutting the
          // component body off right before its FIRST `return (<...`, which for a
          // component with an early-return branch (e.g. `if (loading) { return (...) }`)
          // is that branch's own return, not the top-level one — leaving the `if (loading) {`
          // opening brace hoisted into the preamble with no matching close. Safe for the
          // real editJsx path (whose FIRST return generally IS the top-level one), but
          // actively harmful here, so skip preamble injection entirely for this branch.
          if (settings.customEditJsx && !isTopLevelLiveDataBlock) {
            let preamble = [hoistedHelperJs, jsVarDefinitions].filter(Boolean).join('\n\n');
            // Final pass: any residual JSX in the combined preamble
            if (preamble && (/<[A-Za-z/$]/.test(preamble) || /<>/.test(preamble))) {
              preamble = transpileJsxInPreamble(preamble, settings);
            }

            // Inject `defaults`, module consts (BAKED_PADDING), SECTION_PADDING_Y,
            // imported helpers, and dual-host prop aliases so the IIFE does not throw
            // "defaults is not defined" (no ESM in new Function).
            // Also attach settings.editorScope for a runtime second line of defense.
            const iifeProbe = `${preamble}\n${settings.customEditJsx}`;
            const scopeResult = buildEditorScopeInjections(
              jsxSourceCode || code,
              jsxSourceFile || blockFile,
              themeRoot,
              iifeProbe,
            );
            const scopeInjections =
              typeof scopeResult === 'string'
                ? scopeResult
                : (scopeResult && scopeResult.injections) || '';
            const editorScope =
              scopeResult && typeof scopeResult === 'object' && scopeResult.scope
                ? scopeResult.scope
                : {};
            if (Object.keys(editorScope).length > 0) {
              settings.editorScope = editorScope;
            }
            if (scopeInjections) {
              preamble = [scopeInjections, preamble].filter(Boolean).join('\n\n');
            }

            if (preamble) {
              settings.customEditJsx = `(() => {\n${preamble}\nreturn ${settings.customEditJsx};\n})()`;
            } else if (scopeInjections) {
              settings.customEditJsx = `(() => {\n${scopeInjections}\nreturn ${settings.customEditJsx};\n})()`;
            }
          }

          let phpMarkup = jsx;

          // Inline local JSX-returning render-helper calls (e.g. `{cell(a, b)}`)
          // before anything else touches phpMarkup — must run first so the
          // substituted JSX flows through the normal transpileConditionals/
          // transpileTernaries/etc. pipeline below like markup the dev wrote
          // directly inline, instead of surviving as literal, unexecuted JS text.
          if (jsxRenderHelperTemplates.size > 0) {
            phpMarkup = inlineJsxRenderHelperCalls(phpMarkup, jsxRenderHelperTemplates);
          }

          // Rewrite helper calls to PHP function names before expression transpile
          if (helperNameToPhp.size > 0) {
            for (const [jsName, phpName] of helperNameToPhp) {
              phpMarkup = phpMarkup.replace(
                new RegExp(`\\b${jsName}\\s*\\(`, 'g'),
                `${phpName}(`,
              );
            }
          }

          // AST-based markup emission (Phase 2 Step 4, PHP half): parses
          // phpMarkup once and emits render.php markup directly via
          // recursive node.type-keyed emitters — see generatePhpMarkupFromJsx's
          // doc comment in php-transpiler.js. Every text pass below this point
          // (icon/WpEditable/dangerouslySetInnerHTML substitution, attribute
          // escaping, className rename, ternary/conditional/loop transpile,
          // tag unwrapping, …) only matches specific literal patterns
          // (`<WpIcon`, `className=`, `{expr}`, …) that no longer appear in
          // this function's output for anything it successfully resolved —
          // so they remain safe, idempotent no-ops there, while still fully
          // processing the one thing it deliberately leaves as verbatim JSX
          // text: a `.map()` loop whose array target isn't a simple
          // attribute/local-var/split-string shape (a static array literal,
          // an `as const` cast, …), which needs transpileStaticArrayObjectMap's
          // cross-file resolution, not a property of the JSX subtree alone.
          const astPhpMarkup = generatePhpMarkupFromJsx(phpMarkup, settings, {
            localVars,
            freeFunctions: phpFreeFunctions,
            themeRoot,
          });
          if (astPhpMarkup === null) {
            markLegacyFallback('index:generatePhpMarkupFromJsx');
          }
          if (astPhpMarkup !== null) {
            phpMarkup = astPhpMarkup;
          }

          if (settings.importMap) {
            let startSearch = 0;
            while (true) {
              const match = phpMarkup.substring(startSearch).match(/<([A-Z][a-zA-Z0-9]*)(?:\s+([^>]*?))?\s*(\/>|>([\s\S]*?)<\/\1>)/);
              if (!match) break;

              const fullTag = match[0];
              const compName = match[1];
              const attrsStr = match[2] || '';

              const matchIndex = phpMarkup.indexOf(fullTag, startSearch);
              if (matchIndex === -1) {
                startSearch += 1;
                continue;
              }

              if (settings.importMap[compName]) {
                const packageName = settings.importMap[compName];
                const svgHtml = resolveIconToSvgHtml(compName, packageName, themeRoot, '');
                if (svgHtml) {
                  let userClassPhp = '';
                  const classAttrMatch = attrsStr.match(/class(?:Name)?=\s*(?:"([^"]*)"|'([^']*)'|\{)/i);
                  if (classAttrMatch) {
                    if (classAttrMatch[1] !== undefined) {
                      userClassPhp = classAttrMatch[1];
                    } else if (classAttrMatch[2] !== undefined) {
                      userClassPhp = classAttrMatch[2];
                    } else {
                      const braceStartIdx = classAttrMatch.index + classAttrMatch[0].length;
                      const exprVal = extractCurlyExpression(attrsStr, braceStartIdx);
                      if (exprVal) {
                        if (exprVal.startsWith('`') && exprVal.endsWith('`')) {
                          const templateContent = exprVal.slice(1, -1);
                          const parts = [];
                          let lastIdx = 0;
                          const rx = /\$\{\s*([\s\S]*?)\s*\}/g;
                          let m;
                          while ((m = rx.exec(templateContent)) !== null) {
                            const textBefore = templateContent.substring(lastIdx, m.index);
                            if (textBefore) {
                              parts.push(JSON.stringify(textBefore));
                            }
                            const expr = translateJsExpressionToPhp(m[1], Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
                            parts.push(expr);
                            lastIdx = rx.lastIndex;
                          }
                          const textAfter = templateContent.substring(lastIdx);
                          if (textAfter) {
                            parts.push(JSON.stringify(textAfter));
                          }
                          userClassPhp = '<?php echo esc_attr(' + parts.join(' . ') + '); ?>';
                        } else {
                          const phpExpr = translateJsExpressionToPhp(exprVal, Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
                          userClassPhp = '<?php echo esc_attr(' + phpExpr + '); ?>';
                        }
                      }
                    }
                  }

                  let finalSvg = svgHtml;
                  const classAttrRegex = /class="([^"]*)"/;
                  const hasClassAttr = finalSvg.match(classAttrRegex);
                  if (hasClassAttr) {
                    const existingClasses = hasClassAttr[1];
                    const combinedClass = (existingClasses + ' ' + userClassPhp).trim();
                    finalSvg = finalSvg.replace(classAttrRegex, `class="${combinedClass}"`);
                  } else {
                    finalSvg = finalSvg.replace('<svg', `<svg class="${userClassPhp.trim()}"`);
                  }

                  phpMarkup = phpMarkup.substring(0, matchIndex) + finalSvg + phpMarkup.substring(matchIndex + fullTag.length);
                  startSearch = matchIndex + finalSvg.length;
                  continue;
                }
              }

              startSearch = matchIndex + fullTag.length;
            }
          }

          // Dynamic <WpIcon name={...} className="..." /> → forgewp_render_theme_icon(...)
          let iconSearch = 0;
          while (true) {
            const iIndex = phpMarkup.indexOf('<WpIcon', iconSearch);
            if (iIndex === -1) break;
            const tagEnd = findHtmlTagEnd(phpMarkup, iIndex);
            if (tagEnd === -1) {
              iconSearch = iIndex + 7;
              continue;
            }
            const fullTagStr = phpMarkup.substring(iIndex, tagEnd + 1);
            const isSelfClosing = fullTagStr.endsWith('/>');
            let replacementEndIndex = tagEnd + 1;
            if (!isSelfClosing) {
              const closeTag = '</WpIcon>';
              const closeIndex = phpMarkup.indexOf(closeTag, tagEnd + 1);
              if (closeIndex !== -1) {
                replacementEndIndex = closeIndex + closeTag.length;
              }
            }
            const attrsStr = isSelfClosing
              ? fullTagStr.substring('<WpIcon'.length, fullTagStr.length - 2)
              : fullTagStr.substring('<WpIcon'.length, fullTagStr.length - 1);

            const nameLit = attrsStr.match(/name\s*=\s*(?:"([^"]*)"|'([^']*)')/);
            const nameExpr = attrsStr.match(/name\s*=\s*\{\s*([\s\S]*?)\s*\}/);
            const classLit = attrsStr.match(/class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const classExpr = attrsStr.match(/class(?:Name)?\s*=\s*\{\s*([\s\S]*?)\s*\}/i);
            const providerMatch = attrsStr.match(/provider\s*=\s*(?:"([^"]*)"|'([^']*)')/);
            const provider = (providerMatch && (providerMatch[1] || providerMatch[2])) || 'lucide';

            let namePhp = "''";
            if (nameLit) {
              namePhp = JSON.stringify(nameLit[1] || nameLit[2] || '');
            } else if (nameExpr) {
              let expr = nameExpr[1].trim();
              // Already PHP from loop rewrite: $row['icon']
              if (/\$[a-zA-Z_]/.test(expr)) {
                namePhp = expr;
              } else if (/^(?:attributes|props)\./.test(expr)) {
                namePhp = translateJsExpressionToPhp(expr, Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
              } else if (/^[a-zA-Z_][\w$]*\.[a-zA-Z_][\w$]*$/.test(expr)) {
                // row.icon — loop vars resolve in foreach; prefer $row['icon'] only
                const m = expr.match(/^([a-zA-Z_][\w$]*)\.([a-zA-Z_][\w$]*)$/);
                if (m) {
                  namePhp = `($${m[1]}['${m[2]}'] ?? '')`;
                } else {
                  namePhp = translateJsExpressionToPhp(expr, Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
                }
              } else if (/^[a-zA-Z_][\w$]*\.[a-zA-Z_][\w$]*\s*\|\|\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/.test(expr)) {
                // row.icon || 'default' — the same bare loop-var fast path as
                // above, extended with a literal fallback (produced by
                // inlineIconWrapperTags for a local icon-wrapper's default).
                const m2 = expr.match(/^([a-zA-Z_][\w$]*)\.([a-zA-Z_][\w$]*)\s*\|\|\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/);
                namePhp = `($${m2[1]}['${m2[2]}'] ?: ${m2[3]})`;
              } else if (/^[a-zA-Z_][\w$]*$/.test(expr)) {
                namePhp = localVars.has(expr)
                  ? `($${expr} ?? '')`
                  : `($attributes['${expr}'] ?? '')`;
              } else {
                namePhp = translateJsExpressionToPhp(expr, Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
              }
            }

            let classPhp = "''";
            if (classLit) {
              classPhp = JSON.stringify(classLit[1] || classLit[2] || '');
            } else if (classExpr) {
              classPhp = translateJsExpressionToPhp(classExpr[1].trim(), Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
            }

            const replacement = `<?php forgewp_render_theme_icon( ${namePhp}, ${classPhp}, ${JSON.stringify(provider)} ); ?>`;
            phpMarkup = phpMarkup.substring(0, iIndex) + replacement + phpMarkup.substring(replacementEndIndex);
            iconSearch = iIndex + replacement.length;
          }

          let wStartSearch = 0;
          while (true) {
            const wIndex = phpMarkup.indexOf('<WpEditable', wStartSearch);
            if (wIndex === -1) break;
            
            const tagEnd = findHtmlTagEnd(phpMarkup, wIndex);
            if (tagEnd === -1) {
              wStartSearch = wIndex + 11;
              continue;
            }
            
            const fullTagStr = phpMarkup.substring(wIndex, tagEnd + 1);
            const isSelfClosing = fullTagStr.endsWith('/>');
            
            const attrsStr = isSelfClosing 
              ? fullTagStr.substring('<WpEditable'.length, fullTagStr.length - 2)
              : fullTagStr.substring('<WpEditable'.length, fullTagStr.length - 1);
            
            let children = '';
            let replacementEndIndex = tagEnd + 1;
            
            if (!isSelfClosing) {
              const closeTag = '</WpEditable>';
              const closeIndex = phpMarkup.indexOf(closeTag, tagEnd + 1);
              if (closeIndex !== -1) {
                children = phpMarkup.substring(tagEnd + 1, closeIndex);
                replacementEndIndex = closeIndex + closeTag.length;
              }
            }
            
            const getAttr = (name) => {
              const regex = new RegExp(
                `${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*(?:attributes\\.|props\\.)?([a-zA-Z0-9_-]+)\\s*\\})`
              );
              const m = attrsStr.match(regex);
              return m ? m[1] || m[2] || m[3] || '' : '';
            };

            // Loop-variable property access, e.g. value={item.label} inside a repeater .map() body
            const getDottedAttr = (name) => {
              const regex = new RegExp(
                `${name}=\\{\\s*([a-zA-Z0-9_$]+)\\.([a-zA-Z0-9_$]+)\\s*\\}`
              );
              const m = attrsStr.match(regex);
              return m ? { varName: m[1], prop: m[2] } : null;
            };

            const tag = getAttr('tagName') || 'div';
            const valueVar = getAttr('value');
            const valueDotted = valueVar ? null : getDottedAttr('value');

            let cleanAttrs = attrsStr
              .replace(/tagName=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/value=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/onChange=\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/g, '')
              .trim();

            if (cleanAttrs) cleanAttrs = ' ' + cleanAttrs;

            const content = valueDotted
              ? `<?php echo esc_html( $${valueDotted.varName}['${valueDotted.prop}'] ?? '' ); ?>`
              : (valueVar ? `{attributes.${valueVar}}` : (children || ''));

            const replacement = `<${tag}${cleanAttrs}>${content}</${tag}>`;

            phpMarkup = phpMarkup.substring(0, wIndex) + replacement + phpMarkup.substring(replacementEndIndex);
            wStartSearch = wIndex + replacement.length;
          }

          // `dangerouslySetInnerHTML={{ __html: X }}` (the plain, non-WpEditable
          // side of a dual-host div, e.g. the "visitor" branch when the
          // WpEditable branch uses tagName="div") has no PHP/HTML translation
          // anywhere else in the pipeline — left alone, the attribute passes
          // through as literal, inert text and the actual HTML content is
          // never echoed at all, rendering blank. Always uses wp_kses_post
          // (not esc_html) since the whole point of dangerouslySetInnerHTML is
          // "this is HTML, don't escape it" — true regardless of whether the
          // backing attribute happens to be declared richText.
          let dsetSearch = 0;
          while (true) {
            const dIndex = phpMarkup.indexOf('dangerouslySetInnerHTML', dsetSearch);
            if (dIndex === -1) break;

            const tagStart = phpMarkup.lastIndexOf('<', dIndex);
            const tagEnd = tagStart === -1 ? -1 : findHtmlTagEnd(phpMarkup, tagStart);
            if (tagStart === -1 || tagEnd === -1 || tagEnd < dIndex) {
              dsetSearch = dIndex + 'dangerouslySetInnerHTML'.length;
              continue;
            }

            const fullTagStr = phpMarkup.substring(tagStart, tagEnd + 1);
            const dsetAttrMatch = fullTagStr.match(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([a-zA-Z0-9_$]+)\s*\}\}/);
            const tagNameMatch = fullTagStr.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
            if (!dsetAttrMatch || !tagNameMatch) {
              dsetSearch = dIndex + 'dangerouslySetInnerHTML'.length;
              continue;
            }

            const tagName = tagNameMatch[1];
            const varName = dsetAttrMatch[1];
            const isSelfClosing = fullTagStr.endsWith('/>');

            const cleanAttrs = fullTagStr
              .substring(tagName.length + 1, fullTagStr.length - (isSelfClosing ? 2 : 1))
              .replace(/dangerouslySetInnerHTML=\{\{[\s\S]*?\}\}/, '')
              .trim();

            const prefix = localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
            const content = `<?php echo wp_kses_post( ${prefix} ?? '' ); ?>`;

            let replacementEndIndex = tagEnd + 1;
            if (!isSelfClosing) {
              const closeTag = `</${tagName}>`;
              const closeIndex = phpMarkup.indexOf(closeTag, tagEnd + 1);
              if (closeIndex !== -1) {
                replacementEndIndex = closeIndex + closeTag.length;
              }
            }

            const replacement = `<${tagName}${cleanAttrs ? ' ' + cleanAttrs : ''}>${content}</${tagName}>`;
            phpMarkup = phpMarkup.substring(0, tagStart) + replacement + phpMarkup.substring(replacementEndIndex);
            dsetSearch = tagStart + replacement.length;
          }

          phpMarkup = phpMarkup.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

          phpMarkup = phpMarkup.replace(/style=\{\{\s*([\s\S]*?)\s*\}\}/g, (match, styleObjStr) => {
            try {
              const pairs = styleObjStr.split(',').map(pair => pair.trim()).filter(Boolean);
              const attrKeys = Object.keys(settings.attributes || {});
              const phpStyles = pairs.map(pair => {
                const colonIndex = pair.indexOf(':');
                if (colonIndex === -1) return '';
                const prop = pair.substring(0, colonIndex).trim();
                const valExpr = pair.substring(colonIndex + 1).trim();
                
                const kebabProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
                
                let phpExpr = valExpr
                  .replace(/(?:attributes|props)\['([a-zA-Z0-9_-]+)'\]/g, "$attributes['$1']")
                  .replace(/(?:attributes|props)\.([a-zA-Z0-9_-]+)/g, "$attributes['$1']");

                phpExpr = phpExpr.replace(/(?<![.$'"\w])([a-zA-Z0-9_-]+)(?![.$'"\w])/g, (m, word) => {
                  if (attrKeys.includes(word)) {
                    return `$attributes['${word}']`;
                  }
                  return m;
                });
                
                phpExpr = phpExpr.replace(/\+/g, '.');
                
                return `${kebabProp}: <?php echo esc_attr( ${phpExpr} ); ?>;`;
              }).filter(Boolean).join(' ');
              return `style="${phpStyles}"`;
            } catch (err) {
              return match;
            }
          });

          const attrRegex = /\s+(?:on[A-Z][a-zA-Z]*|ref|disabled|checked)=\s*(\{)/g;
          let attrMatch;
          const attrMatches = [];
          while ((attrMatch = attrRegex.exec(phpMarkup)) !== null) {
            attrMatches.push(attrMatch);
          }
          for (let idx = attrMatches.length - 1; idx >= 0; idx--) {
            const m = attrMatches[idx];
            const startIndex = m.index;
            const braceIndex = startIndex + m[0].length - 1;
            let depth = 1;
            let pos = braceIndex + 1;
            while (pos < phpMarkup.length && depth > 0) {
              if (phpMarkup[pos] === '{') depth++;
              else if (phpMarkup[pos] === '}') depth--;
              pos++;
            }
            if (depth === 0) {
              phpMarkup = phpMarkup.substring(0, startIndex) + phpMarkup.substring(pos);
            }
          }

          // Runs before transpileLoops: an inline `(ARRAY_LITERAL as const).map(...)`
          // (a fixed set of static rows with dynamic values/icons — e.g. a
          // phone/email/address/hours details list) doesn't match any of
          // transpileLoops' bare-identifier-only patterns and would otherwise
          // render empty.
          //
          // A row value referencing a same-file helper (e.g. `getSocialHandle(...)`)
          // needs the SAME call-site rename applied to phpMarkup above (line ~1341)
          // applied here too — this reads straight from the original jsxSourceCode,
          // which still has the pre-rename JS name and would otherwise get the call
          // silently dropped as "unknown" once translated.
          let sourceCodeForStaticMap = jsxSourceCode;
          if (helperNameToPhp.size > 0) {
            for (const [jsName, phpName] of helperNameToPhp) {
              sourceCodeForStaticMap = sourceCodeForStaticMap.replace(
                new RegExp(`\\b${jsName}\\s*\\(`, 'g'),
                `${phpName}(`,
              );
            }
          }
          phpMarkup = transpileStaticArrayObjectMap(phpMarkup, settings, themeRoot, localVars, sourceCodeForStaticMap, phpFreeFunctions);
          // {socialList.length > 0 && (...)} guards a static-array-with-filter
          // header const the same way — its length can't be known at compile
          // time either, so re-express as "at least one row's own filter
          // condition holds" before the generic && handling below runs.
          const lengthCheckResult = translateStaticArrayLengthCheck(phpMarkup, sourceCodeForStaticMap, settings, localVars, phpFreeFunctions);
          phpMarkup = lengthCheckResult.jsx;
          phpVarDefinitions += lengthCheckResult.prelude;

          // Must run after transpileStaticArrayObjectMap/translateStaticArrayLengthCheck
          // above (which need to see a template literal's raw `${propName}`
          // text to inline that row's own static value) but before
          // transpileLoops/transpileConditionals/transpileTernaries below:
          // those scan for bare `{...}` JSX expression containers with no
          // awareness that a `${...}` inside a backtick template literal
          // isn't one — transpileTernaries in particular will happily "find"
          // the ternary inside e.g. `${cond ? 'a' : 'b'}`, transpile it in
          // place as if it were a real top-level JSX ternary, and leave the
          // surrounding backtick/`$` characters behind as broken literal text
          // (a stray `$` sitting right before the resulting <?php if (...): ?>
          // block). Resolving every remaining attr={`...`} template literal
          // into a plain PHP-interpolated string here removes the
          // backtick/${} syntax before those later passes can ever misread it.
          phpMarkup = phpMarkup.replace(
            /([a-zA-Z0-9_-]+)=\{\s*`([\s\S]*?)`\s*\}/g,
            (match, attr, templateLiteralContent) => {
              const escFunc = (attr === 'href' || attr === 'src') ? 'esc_url' : 'esc_attr';
              const processed = templateLiteralContent.replace(/\$\{\s*([\s\S]*?)\s*\}/g, (m, jsExpr) => {
                const phpExpr = translateJsExpressionToPhp(jsExpr, Object.keys(settings.attributes || {}), localVars, phpFreeFunctions);
                return `<?php echo ${escFunc}( ${phpExpr} ); ?>`;
              });
              const attrName = attr === 'className' ? 'class' : attr;
              return `${attrName}="${processed}"`;
            },
          );

          phpMarkup = transpileLoops(phpMarkup);
          phpMarkup = transpileConditionals(phpMarkup, Object.keys(settings.attributes || {}));
          phpMarkup = transpileTernaries(phpMarkup, Object.keys(settings.attributes || {}));

          // React Fragment shorthand (`<>…</>`) has no PHP/HTML equivalent —
          // a Fragment's only job is "no wrapper element", so once the
          // ternary/conditional balancing above (which needs these markers
          // present to correctly track branch nesting — see
          // extractJsxByTagBalancing's <> handling) has finished, the tags
          // themselves are just deleted; the children were already carried
          // through as plain markup. Left unstripped, they show up as
          // literal, visible "<>" text on the rendered page.
          phpMarkup = phpMarkup.replace(/<>/g, '').replace(/<\/>/g, '');

          phpMarkup = phpMarkup.replace(
            /(placeholder|label|title|alt|value)=\{\s*__\(\s*(['"])([\s\S]*?)\2\s*(?:,\s*['"][a-zA-Z0-9_-]+['"])?\s*,?\s*\)\s*\}/g,
            (match, attr, q1, text) => {
              const escaped = text.replace(/'/g, "\\'").trim().replace(/\s+/g, ' ');
              return `${attr}="<?php echo esc_attr( __('${escaped}', 'hotelchecker24') ); ?>"`;
            }
          );

          phpMarkup = phpMarkup.replace(
            /\{\s*__\(\s*(['"])([\s\S]*?)\1\s*(?:,\s*['"][a-zA-Z0-9_-]+['"])?\s*,?\s*\)\s*\}/g,
            (match, q1, text) => {
              const escaped = text.replace(/'/g, "\\'").trim().replace(/\s+/g, ' ');
              return `<?php echo esc_html( __('${escaped}', 'hotelchecker24') ); ?>`;
            }
          );

          phpMarkup = phpMarkup.replace(/className=/g, 'class=');

          const attrKeysForPhp = Object.keys(settings.attributes || {});
          const toPhp = (expr) =>
            translateJsExpressionToPhp(expr, attrKeysForPhp, localVars, phpFreeFunctions);

          phpMarkup = phpMarkup.replace(/class=\{\`([\s\S]*?)\`\}/g, (match, templateLiteralContent) => {
            const processed = templateLiteralContent.replace(/\$\{\s*([\s\S]*?)\s*\}/g, (m, jsExpr) => {
              const phpExpr = toPhp(jsExpr);
              return `<?php echo esc_attr( ${phpExpr} ); ?>`;
            });
            return `class="${processed}"`;
          });

          phpMarkup = phpMarkup.replace(
            /([a-zA-Z0-9_-]+)=\{\s*(?:attributes\.|props\.)?(?!(?:attributes|props)\b)([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\}/gi,
            (match, attr, varName, prop) => {
              const escFunc = (attr === 'href' || attr === 'src') ? 'esc_url' : 'esc_attr';
              const prefix = localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
              return `${attr}="<?php echo ${escFunc}( ${prefix}['${prop}'] ?? '' ); ?>"`;
            }
          );

          phpMarkup = phpMarkup.replace(
            /\{\s*(?:attributes\.|props\.)?(?!(?:attributes|props)\b)([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\}/g,
            (match, varName, prop) => {
              const prefix = localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
              return `<?php echo esc_html( ${prefix}['${prop}'] ?? '' ); ?>`;
            }
          );

          phpMarkup = phpMarkup.replace(
            /([a-zA-Z0-9_-]+)=\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/gi,
            (match, attr, varName) => {
              const escFunc =
                attr === 'href' || attr === 'src' ? 'esc_url' : 'esc_attr';
              const prefix = localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
              return `${attr}="<?php echo ${escFunc}( ${prefix} ?? '' ); ?>"`;
            },
          );

          phpMarkup = phpMarkup.replace(
            /\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/g,
            (match, varName) => {
              const isRichText = settings.attributes && settings.attributes[varName] && settings.attributes[varName].control === 'richText';
              const escFunc = isRichText ? 'wp_kses_post' : 'esc_html';
              const prefix = localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
              return `<?php echo ${escFunc}( ${prefix} ?? '' ); ?>`;
            },
          );

          // Remaining attr={complexExpr} — helpers, ternaries, already-PHP loop args, etc.
          phpMarkup = phpMarkup.replace(
            /([a-zA-Z0-9_-]+)=\{([^{}]+)\}/g,
            (match, attr, expr) => {
              const trimmed = expr.trim();
              if (!trimmed || trimmed.startsWith('/*') || trimmed.includes('<?php')) {
                return match;
              }
              // Skip pure string literals
              if (/^['"`]/.test(trimmed) && !trimmed.includes('${')) {
                return match;
              }
              const escFunc =
                attr === 'href' || attr === 'src' ? 'esc_url' : 'esc_attr';
              // Already rewritten to PHP vars inside loop bodies (e.g. $row['avatar'])
              if (/\$[a-zA-Z_]/.test(trimmed) && !/[a-zA-Z_]\(/.test(trimmed.replace(/forgewp_blk_\w+\s*\(/g, ''))) {
                // May still contain helper calls: forgewp_blk_x($row['avatar'])
                if (trimmed.includes('forgewp_blk_') || /\w+\s*\(/.test(trimmed)) {
                  return `${attr}="<?php echo ${escFunc}( ${trimmed} ); ?>"`;
                }
                return `${attr}="<?php echo ${escFunc}( ${trimmed} ); ?>"`;
              }
              if (trimmed.includes('forgewp_blk_') || /\$[a-zA-Z_]/.test(trimmed)) {
                return `${attr}="<?php echo ${escFunc}( ${trimmed} ); ?>"`;
              }
              try {
                const phpExpr = toPhp(trimmed);
                return `${attr}="<?php echo ${escFunc}( ${phpExpr} ); ?>"`;
              } catch {
                return match;
              }
            },
          );

          phpMarkup = phpMarkup.replace(
            /\s+key=(?:\{(?:\?>|[^>])*?\}|"(?:\?>|[^>])*?"|'(?:\?>|[^>])*?')/g,
            ''
          );

          phpMarkup = phpMarkup.replace(
            /<[A-Z][a-zA-Z0-9]*(?:\s(?:\?>|[^>])*?)?\/>/g,
            ''
          );

          phpMarkup = phpMarkup.replace(
            /<([A-Z][a-zA-Z0-9]*)(?:\s(?:\?>|[^>])*?)?>([\s\S]*?)<\/\1>/g,
            (match, tagName, children) => {
              if (tagName === 'WpLink') {
                const hrefMatch = match.match(/href=(?:"([^"]*)"|'([^']*)')/);
                const classMatch = match.match(/class=(?:"([^"]*)"|'([^']*)')/);
                const href = hrefMatch ? (hrefMatch[1] || hrefMatch[2]) : '#';
                const cls = classMatch ? ` class='${classMatch[1] || classMatch[2]}'` : '';
                return `<a href="${href}"${cls}>${children}</a>`;
              }
              if (tagName === 'Button') {
                const classMatch = match.match(/class=(?:"([^"]*)"|'([^']*)')/);
                const cls = classMatch ? ` class='${classMatch[1] || classMatch[2]}'` : '';
                return `<button${cls}>${children}</button>`;
              }
              return children;
            }
          );

          // Safety net for client-only JS expressions (e.g., .map, =>, etc.)
          let braceIdx = phpMarkup.length;
          while (true) {
            const openBrace = phpMarkup.lastIndexOf('{', braceIdx);
            if (openBrace === -1) break;

            const lastPhpStart = phpMarkup.lastIndexOf('<?php', openBrace);
            const lastPhpEnd = phpMarkup.lastIndexOf('?>', openBrace);
            if (lastPhpStart !== -1 && lastPhpStart > lastPhpEnd) {
              braceIdx = openBrace - 1;
              continue;
            }

            let depth = 1;
            let closeBrace = -1;
            let inQuote = null;
            let esc = false;
            for (let j = openBrace + 1; j < phpMarkup.length; j++) {
              const c = phpMarkup[j];
              if (inQuote) {
                if (esc) {
                  esc = false;
                } else if (c === '\\') {
                  esc = true;
                } else if (c === inQuote) {
                  inQuote = null;
                }
                continue;
              }
              if (c === "'" || c === '"' || c === '`') {
                inQuote = c;
                continue;
              }
              if (c === '{') depth++;
              else if (c === '}') {
                depth--;
                if (depth === 0) {
                  closeBrace = j;
                  break;
                }
              }
            }

            if (closeBrace !== -1) {
              const braceContent = phpMarkup.substring(openBrace + 1, closeBrace);
              if (/(?:=>|\.map\s*\(|\.find\s*\(|\.filter\s*\(|\.slice\s*\(|\.split\s*\(|setState|setSearch|setSelected|setCategory|setCountry|setAttributes|setFilter|&&)/.test(braceContent)) {
                phpMarkup = phpMarkup.substring(0, openBrace) + '' + phpMarkup.substring(closeBrace + 1);
                braceIdx = openBrace - 1;
                continue;
              }
            }
            braceIdx = openBrace - 1;
          }

          phpMarkup = phpMarkup.replace(
            /\{[a-zA-Z_$][a-zA-Z0-9_$]*\s*&&\s*\([\s\S]*?\)\s*\}/g,
            ''
          );

          phpMarkup = phpMarkup.replace(/^\s*\)\}\s*$/gm, '');

          const allowedSelfClosing = [
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
            'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'stop', 'use'
          ];
          phpMarkup = phpMarkup.replace(/<([a-zA-Z0-9-]+)(?:\s+([^>]*?))?\s*\/>/g, (match, tagName, attrs) => {
            if (allowedSelfClosing.includes(tagName.toLowerCase())) {
              return match;
            }
            const attrsStr = attrs ? ` ${attrs}` : '';
            return `<${tagName}${attrsStr}></${tagName}>`;
          });

          // Safety net: any remaining call to a known local same-file helper
          // that wasn't converted to a real PHP function nor inlined as a JSX
          // template (e.g. a render-helper with statements before its JSX
          // return) must never leak into the page as literal, unexecuted JS
          // text — drop the call site instead.
          for (const helperName of allSameFileHelperNames) {
            if (helperNameToPhp.has(helperName) || jsxRenderHelperTemplates.has(helperName)) continue;
            const leftoverCallRegex = new RegExp(`\\{\\s*${helperName}\\s*\\([^{}]*\\)\\s*\\}`, 'g');
            if (leftoverCallRegex.test(phpMarkup)) {
              console.warn(
                `[Gutenberg Block Compiler] Dropping unconvertible helper call "${helperName}(...)" from render.php for block ${blockSlug} — content will be blank on the frontend for this call site.`,
              );
              phpMarkup = phpMarkup.replace(leftoverCallRegex, '');
            }
          }

          if (settings._detectedPaddingTokens) {
            phpMarkup = stripPaddingTokensFromFirstTag(phpMarkup, settings._detectedPaddingTokens.y);
            phpMarkup = stripPaddingTokensFromFirstTag(phpMarkup, settings._detectedPaddingTokens.x);
          }
          phpMarkup = injectPaddingClassesIntoPhpMarkup(phpMarkup);

          const blockFolderName = settings.name.replace('forgewp/', '');
          // Only components isComponentInteractive() flags get a client-side hydration
          // bundle (see islands-scanner.js) — a data-forgewp-hydrate wrapper on anything
          // else is a dead attribute: the hydrator finds no manifest entry for it, never
          // mounts, and logs a console.error on every page load for no reason. Omitting
          // the wrapper for non-interactive blocks also removes any possibility of a
          // future hydration bundle silently re-rendering over (and discarding) this
          // server-computed markup — the exact bug class that caused paddingY/paddingX
          // to work in SSR but get clobbered the instant a needless hydration ran.
          const isHydratedBlock = isComponentInteractive(resolvedComponentSourcePath);
          const hydrationWrapperOpen = isHydratedBlock
            ? `<div data-forgewp-hydrate="${blockFolderName}" data-forgewp-trigger="visible" data-forgewp-props="<?php echo esc_attr( json_encode( $attributes ?? array() ) ); ?>" style="display:block">\n`
            : '';
          const hydrationWrapperClose = isHydratedBlock ? '\n</div>\n' : '\n';
          const renderPhpContent = `<?php
/**
 * Gutenberg dynamic block template — ${settings.title}
 * Autogenerated by ForgeWP Theme Compiler. Do not modify manually.
 */
$loading = true;
$isLoading = true;
$hotels = array();
$posts = array();
$listicles = array();
$destinations = array();
${phpHelperDefinitions}${phpVarDefinitions}?>
${hydrationWrapperOpen}${phpMarkup}${hydrationWrapperClose}`;

          const blockOutDir = path.join(outDir, 'blocks', blockFolderName);
          mkdirSync(blockOutDir, { recursive: true });

          const {
            edit: _edit,
            customEditJsx: _customEditJsx,
            editorScope: _editorScope,
            dualHostMeta: _dualHostMeta,
            ...blockJsonSettings
          } = settings;
          if (blockJsonSettings.attributes) {
            const cleanedAttrs = {};
            for (const [key, attr] of Object.entries(blockJsonSettings.attributes)) {
              if (attr && typeof attr === 'object') {
                // Strip editor-only metadata (controls, labels, repeater mode/fields, etc.)
                const { control, label, options, min, max, mode, fields, provider, ...wpAttr } = attr;
                cleanedAttrs[key] = wpAttr;
              } else {
                cleanedAttrs[key] = attr;
              }
            }
            blockJsonSettings.attributes = cleanedAttrs;
          }

          writeFileSync(
            path.join(blockOutDir, 'block.json'),
            JSON.stringify(blockJsonSettings, null, 2),
            'utf8',
          );
          writeFileSync(
            path.join(blockOutDir, 'render.php'),
            renderPhpContent,
            'utf8',
          );

          blockSlugs.push(settings);
        } catch (e) {
          console.error(
            `[Gutenberg Block Compiler] Failed to compile block ${blockSlug}:`,
            e.message,
          );
        }
      }
    }
  }

  processDir(handcraftedDir);
  processDir(generatedDir);

  // Default: warn only. `forgewp export --strict` fails the export.
  flushEditableIssues({ strict: !!options.strict });

  return blockSlugs;
}
