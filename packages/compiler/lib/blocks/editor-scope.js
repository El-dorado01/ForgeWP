/**
 * Build editor-IIFE scope injections for identifiers that components import
 * (e.g. `defaults` from cms/editables, layout helpers, module-level consts).
 *
 * The Gutenberg customEditJsx runs via `new Function(...)` and does not have
 * ESM imports — anything the inlined body references must be injected here.
 *
 * Also builds a serializable `editorScope` object that the editor runtime can
 * pass as Function parameters — a second line of defense if string injection
 * is missing or stripped.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDefineEditable } from "./scanner.js";
import { stripTypeScriptSyntax } from "./source-sanitize.js";

/**
 * @param {string} sourceCode  Component source
 * @param {string} filePath    Absolute path to component
 * @param {string} themeRoot
 * @param {string} iifeBody    customEditJsx body (to know which symbols are used)
 * @returns {{ injections: string, scope: Record<string, unknown> }}
 */
export function buildEditorScopeInjections(sourceCode, filePath, themeRoot, iifeBody) {
  if (!sourceCode || !iifeBody) return { injections: "", scope: {} };

  const chunks = [];
  /** @type {Record<string, unknown>} */
  const scope = {};
  const used = (name) => new RegExp(`\\b${name}\\b`).test(iifeBody);

  // ── defaults from cms/editables (or any defineEditable module) ───────────
  if (used("defaults")) {
    const defaultsObj = resolveImportedDefaults(sourceCode, filePath, themeRoot);
    // Always define — empty bag still prevents "defaults is not defined"
    const bag = defaultsObj && typeof defaultsObj === "object" ? defaultsObj : {};
    scope.defaults = bag;
    chunks.push(`var defaults = ${JSON.stringify(bag)};`);
  }

  // ── Module-level string/number/boolean consts (e.g. BAKED_PADDING = 'lg') ─
  const moduleConsts = extractModuleLevelLiterals(sourceCode);
  for (const [name, value] of Object.entries(moduleConsts)) {
    if (used(name)) {
      scope[name] = value;
      chunks.push(`var ${name} = ${JSON.stringify(value)};`);
    }
  }

  // ── Module-level object consts (e.g. SECTION_PADDING_Y = { ... }) ───────
  // Prefer resolving from imports; also scan local source.
  const objectConsts = extractModuleLevelObjectConsts(sourceCode);
  for (const [name, value] of Object.entries(objectConsts)) {
    if (used(name) && !(name in scope)) {
      scope[name] = value;
      chunks.push(`var ${name} = ${JSON.stringify(value)};`);
    }
  }

  // ── Relative helper imports (sectionPaddingY, resolveBlockPaddingY, …) ───
  const helperResult = resolveImportedHelpers(sourceCode, filePath, iifeBody, scope);
  if (helperResult.code) chunks.push(helperResult.code);

  // ── i18n free function: __( '…' ) ────────────────────────────────────────
  // Components often do `const { __ } = useWpI18n()`. Nested expansions and
  // some preambles omit that destructure, leaving bare `__(…)` references.
  // Identity stub is correct for the editor canvas (no real gettext needed).
  if (/\b__\s*\(/.test(iifeBody) && !/\bconst\s*\{\s*__\s*\}/.test(iifeBody)) {
    chunks.push(`var __ = function(s) { return s; };`);
  }

  // ── Lucide / icon package free components ───────────────────────────────
  // Data rows often store icon: Phone and render <Icon />. Without ESM, inject
  // thin wrappers around forgeWpRenderIcon for every used PascalCase import
  // from lucide-react (and similar) that appears in the IIFE body.
  const iconStubs = buildIconComponentStubs(sourceCode, iifeBody);
  if (iconStubs) chunks.push(iconStubs);

  // ── String→icon maps: const VALUE_ICONS = { award: Award, … } ────────────
  // Helpers like ValueIcon close over these maps. Values are components — inject
  // slug→forgeWpRenderIcon wrappers so the helper body can resolve Static icons.
  const iconMaps = buildIconMapInjections(sourceCode, iifeBody);
  if (iconMaps) chunks.push(iconMaps);

  // ── Dual-host prop aliases ──────────────────────────────────────────────
  // 1) *Prop names (titleProp ← attributes.title)
  // 2) Destructuring renames (stat1Value: v1p ← attributes.stat1Value)
  const propAliasCode = buildPropAliasInjections(sourceCode, iifeBody);
  if (propAliasCode) chunks.push(propAliasCode);

  return {
    injections: chunks.filter(Boolean).join("\n"),
    scope,
  };
}

/**
 * Inject `var Phone = (p) => forgeWpRenderIcon('phone', …)` style stubs for
 * lucide-react (etc.) imports referenced in the editor IIFE.
 */
function buildIconComponentStubs(sourceCode, iifeBody) {
  if (!sourceCode || !iifeBody) return "";
  const importRe =
    /import\s+\{([^}]+)\}\s+from\s+['"](lucide-react|@lucide\/react|react-icons\/[\w-]+)['"]/g;
  const names = [];
  let m;
  while ((m = importRe.exec(sourceCode)) !== null) {
    for (const part of m[1].split(",")) {
      const bits = part.trim().split(/\s+as\s+/);
      const local = (bits[1] || bits[0] || "").trim();
      if (local && /^[A-Z]/.test(local) && new RegExp(`\\b${local}\\b`).test(iifeBody)) {
        names.push(local);
      }
    }
  }
  if (names.length === 0) return "";

  const lines = [
    `// Icon component stubs (lucide etc. → forgeWpRenderIcon)`,
  ];
  for (const name of names) {
    // PascalCase → likely registry slug (Phone → phone, MapPin → map-pin)
    const slug = name
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase();
    lines.push(
      `var ${name} = function(p) {` +
        ` return (typeof forgeWpRenderIcon === 'function')` +
        ` ? forgeWpRenderIcon(${JSON.stringify(slug)}, p && (p.className || p.class) || '', 'lucide')` +
        ` : null; };`,
    );
  }
  return lines.join("\n");
}

/**
 * Inject `var VALUE_ICONS = { award: fn, … }` for maps used by helpers like ValueIcon.
 * Source shape: `const VALUE_ICONS = { award: Award, shield: Shield, … }`
 */
function buildIconMapInjections(sourceCode, iifeBody) {
  if (!sourceCode || !iifeBody) return "";
  // const NAME = { key: Ident, … }  (optional TS type annotation)
  const re =
    /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\{/g;
  const chunks = [];
  let m;
  while ((m = re.exec(sourceCode)) !== null) {
    const mapName = m[1];
    if (!new RegExp(`\\b${mapName}\\b`).test(iifeBody)) continue;

    const braceStart = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < sourceCode.length; i++) {
      if (sourceCode[i] === "{") depth++;
      else if (sourceCode[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    const body = sourceCode.slice(braceStart + 1, end);
    // key: PascalCaseIdent pairs
    const pairRe = /([A-Za-z_$][\w$]*)\s*:\s*([A-Z][A-Za-z0-9_$]*)/g;
    const entries = [];
    let p;
    while ((p = pairRe.exec(body)) !== null) {
      const key = p[1];
      const slug = key
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
      entries.push(
        `${JSON.stringify(key)}: function(pr) {` +
          ` return (typeof forgeWpRenderIcon === 'function')` +
          ` ? forgeWpRenderIcon(${JSON.stringify(slug)}, pr && (pr.className || pr.class) || '', 'lucide')` +
          ` : null; }`,
      );
    }
    if (entries.length === 0) continue;
    chunks.push(
      `// Icon map stub for ${mapName}`,
      `var ${mapName} = { ${entries.join(", ")} };`,
    );
  }
  return chunks.join("\n");
}

/**
 * Resolve `import { defaults } from '…'` / `import { defaults as X }` to a plain object.
 */
function resolveImportedDefaults(sourceCode, filePath, themeRoot) {
  // import { editable as frontPageEditable, defaults } from '…'
  // import { defaults } from '…'
  const importRe =
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let im;
  while ((im = importRe.exec(sourceCode)) !== null) {
    const names = im[1].split(",").map((p) => p.trim());
    let localDefaultsName = null;
    for (const part of names) {
      const bits = part.split(/\s+as\s+/);
      const orig = bits[0].trim();
      const local = (bits[1] || bits[0]).trim();
      if (orig === "defaults" || local === "defaults") {
        localDefaultsName = local;
        break;
      }
    }
    if (!localDefaultsName) continue;

    const resolved = resolveModuleFile(path.dirname(filePath), im[2], themeRoot);
    if (!resolved) continue;

    const schemaCode = readFileSync(resolved, "utf8");
    const schema = parseDefineEditable(schemaCode);
    if (!schema) continue;

    const defaultsObj = {};
    for (const [key, field] of Object.entries(schema)) {
      if (field && typeof field === "object" && "default" in field) {
        defaultsObj[key] = field.default;
      }
    }
    return defaultsObj;
  }
  return null;
}

/**
 * Top-level `const NAME = 'literal' | number | boolean` (after strip).
 */
function extractModuleLevelLiterals(sourceCode) {
  const stripped = stripTypeScriptSyntax(sourceCode);
  const out = {};
  // Only consider declarations before the first export function/component-ish line
  const firstExportFn = stripped.search(
    /export\s+(?:default\s+)?(?:function|const)\s+[A-Z]/,
  );
  const head =
    firstExportFn === -1 ? stripped : stripped.slice(0, firstExportFn);

  const re =
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|[^\\])*?)\2\s*;/g;
  let m;
  while ((m = re.exec(head)) !== null) {
    out[m[1]] = m[3].replace(/\\(['"])/g, "$1");
  }
  const reNum =
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*;/g;
  while ((m = reNum.exec(head)) !== null) {
    out[m[1]] = Number(m[2]);
  }
  const reBool =
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(true|false)\s*;/g;
  while ((m = reBool.exec(head)) !== null) {
    out[m[1]] = m[2] === "true";
  }
  return out;
}

/**
 * Top-level `const NAME = { ... }` with JSON-ish object literals (no functions).
 */
function extractModuleLevelObjectConsts(sourceCode) {
  const stripped = stripTypeScriptSyntax(sourceCode);
  const out = {};
  const re =
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(\{)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1];
    const braceStart = m.index + m[0].length - 1;
    const objStr = extractBalanced(stripped, braceStart, "{", "}");
    if (!objStr) continue;
    // Skip if looks like it contains functions / spreads we can't JSON.parse
    if (/\bfunction\b|=>|\.\.\./.test(objStr)) continue;
    try {
      // Quote bare keys: { none: '' } → { "none": '' } then normalize quotes
      const jsonish = objStr
        .replace(/'/g, '"')
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
        .replace(/,\s*}/g, "}");
      out[name] = JSON.parse(jsonish);
    } catch {
      // ignore non-JSON objects
    }
  }
  return out;
}

/**
 * Inline simple exported helpers from relative imports when referenced in the IIFE.
 * Falls back to no-op stubs if the module can't be inlined safely.
 * Also pulls object consts (SECTION_PADDING_Y) from those modules into scope.
 */
function resolveImportedHelpers(sourceCode, filePath, iifeBody, scope) {
  const chunks = [];
  const importRe =
    /import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+|@\/[^'"]+)['"]/g;
  let im;
  while ((im = importRe.exec(sourceCode)) !== null) {
    const from = im[2];
    // Skip editables (handled as defaults) and wordpress bridge
    if (from.includes("editables") || from.includes("wordpress")) continue;

    const names = im[1].split(",").map((p) => p.trim());
    const resolved = resolveModuleFile(path.dirname(filePath), from);
    let modCode = null;
    /** @type {Record<string, unknown>} */
    let modObjects = {};
    /** @type {Record<string, unknown>} */
    let modLiterals = {};
    if (resolved) {
      modCode = stripTypeScriptSyntax(readFileSync(resolved, "utf8"));
      modObjects = extractModuleLevelObjectConsts(modCode);
      modLiterals = extractModuleLevelLiterals(modCode);
    }

    // Collect inlined helper source so we can pull free object consts they need
    // (e.g. sectionPaddingY body references SECTION_PADDING_Y even when the
    // component source never mentions that name).
    const inlinedHelperCode = [];

    for (const part of names) {
      const bits = part.split(/\s+as\s+/);
      const orig = bits[0].trim();
      const local = (bits[1] || bits[0]).trim();
      if (!local || local === "defaults" || local === "editable") continue;
      // Skip type-only names
      if (orig === "type" || local.startsWith("type ")) continue;
      if (!new RegExp(`\\b${local}\\b`).test(iifeBody)) continue;

      // Already injected as object/literal const
      if (local in scope) continue;

      if (!resolved || !modCode) {
        chunks.push(stubHelper(local));
        continue;
      }

      // Imported name is a module-level object/literal const
      if (orig in modObjects) {
        scope[local] = modObjects[orig];
        chunks.push(`var ${local} = ${JSON.stringify(modObjects[orig])};`);
        continue;
      }
      if (orig in modLiterals) {
        scope[local] = modLiterals[orig];
        chunks.push(`var ${local} = ${JSON.stringify(modLiterals[orig])};`);
        continue;
      }

      const fn = extractExportedFunction(modCode, orig);
      if (fn && looksLikeJsxComponent(fn)) {
        // A React component (contains raw JSX), not a plain helper — naive brace
        // extraction would dump its untranspiled JSX straight into the editor IIFE,
        // producing invalid JS ("Unexpected token '<'"). Its actual rendering is
        // already handled at the JSX-tag level (island placeholder for live-data
        // components); it's never *called* like a function, so a safe no-op stub
        // is enough to satisfy stray references (e.g. its name appearing inside a
        // placeholder string like "DestinationsGrid - interactive preview").
        chunks.push(stubHelper(local));
        continue;
      }
      if (fn) {
        let code = fn;
        if (orig !== local) {
          code = code
            .replace(
              new RegExp(
                `^(export\\s+)?(function\\s+|const\\s+)${orig}\\b`,
              ),
              `$1$2${local}`,
            )
            .replace(
              new RegExp(`^export\\s+function\\s+${orig}\\b`),
              `function ${local}`,
            )
            .replace(
              new RegExp(`^export\\s+const\\s+${orig}\\b`),
              `const ${local}`,
            );
        } else {
          code = code.replace(/^export\s+/, "");
        }
        chunks.push(code);
        inlinedHelperCode.push(code);
      } else {
        chunks.push(stubHelper(local));
      }
    }

    // After inlining helpers, inject any module consts those helpers reference
    const helperBlob = inlinedHelperCode.join("\n");
    if (helperBlob) {
      for (const [name, value] of Object.entries(modObjects)) {
        if (
          new RegExp(`\\b${name}\\b`).test(helperBlob) &&
          !(name in scope)
        ) {
          scope[name] = value;
          // Prepend so helpers can close over it — push to front of chunks
          chunks.unshift(`var ${name} = ${JSON.stringify(value)};`);
        }
      }
      for (const [name, value] of Object.entries(modLiterals)) {
        if (
          new RegExp(`\\b${name}\\b`).test(helperBlob) &&
          !(name in scope)
        ) {
          scope[name] = value;
          chunks.unshift(`var ${name} = ${JSON.stringify(value)};`);
        }
      }
    }
  }
  return { code: chunks.join("\n\n") };
}

/**
 * Names that must NEVER be redeclared inside customEditJsx.
 * Shadowing `setAttributes` / `attributes` breaks RichText onChange and
 * turns `setAttributes ? <WpEditable/> : static` into permanent static text
 * (sidebar still works because InspectorControls uses the outer callback).
 */
const EDITOR_RESERVED_LOCALS = new Set([
  "setAttributes",
  "attributes",
  "clientId",
  "isSelected",
  "context",
  "className",
  "name",
  "props",
  "createElement",
  "React",
  "useBlockProps",
  "blockProps",
  "children",
  "ref",
  "key",
  "__attr",
]);

/**
 * Build const aliases for dual-host props:
 * - titleProp ← attributes.title
 * - v1p ← attributes.stat1Value (from `stat1Value: v1p` destructure)
 *
 * Never alias reserved editor bindings (especially setAttributes).
 */
function buildPropAliasInjections(sourceCode, iifeBody) {
  const chunks = [];
  const aliases = new Map(); // localName → attrKey

  // From component destructuring: { title: titleProp, stat1Value: v1p, paddingY: paddingYProp }
  const destructureAliases = extractDestructureAliases(sourceCode);
  for (const [local, attrKey] of Object.entries(destructureAliases)) {
    if (EDITOR_RESERVED_LOCALS.has(local) || EDITOR_RESERVED_LOCALS.has(attrKey)) {
      continue;
    }
    if (new RegExp(`\\b${local}\\b`).test(iifeBody)) {
      aliases.set(local, attrKey);
    }
  }

  // Also catch *Prop convention even without destructure map
  const re = /\b([A-Za-z_$][\w$]*)Prop\b/g;
  let m;
  while ((m = re.exec(iifeBody)) !== null) {
    const local = m[0]; // e.g. titleProp
    const base = m[1]; // e.g. title
    if (EDITOR_RESERVED_LOCALS.has(local) || EDITOR_RESERVED_LOCALS.has(base)) {
      continue;
    }
    if (!aliases.has(local)) {
      aliases.set(local, base);
    }
  }

  if (aliases.size === 0) return "";

  chunks.push(`// Dual-host prop aliases (block attributes → local names used in components)`);
  chunks.push(
    `var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};`,
  );

  for (const [local, attrKey] of aliases) {
    if (EDITOR_RESERVED_LOCALS.has(local)) continue;
    // Prefer attributes[attrKey], then attributes[local], else undefined
    chunks.push(
      `var ${local} = (typeof __attr[${JSON.stringify(attrKey)}] !== 'undefined')` +
        ` ? __attr[${JSON.stringify(attrKey)}]` +
        ` : (typeof __attr[${JSON.stringify(local)}] !== 'undefined' ? __attr[${JSON.stringify(local)}] : undefined);`,
    );
  }

  return chunks.join("\n");
}

/**
 * Parse `export function Foo({ a: aLocal, b: bLocal, c }: Props)` renames.
 * Returns { aLocal: 'a', bLocal: 'b', c: 'c' } for names used as locals.
 *
 * IMPORTANT: run on the original source — stripTypeScriptSyntax treats
 * `stat1Value: v1p` as a type annotation and deletes the rename.
 */
function extractDestructureAliases(sourceCode) {
  // Find first component-like function with object destructure props.
  // Match up to the closing `}` of the destructure, then optional `}: Type`.
  const fnMatch = sourceCode.match(
    /(?:export\s+)?(?:default\s+)?function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*\{/,
  );
  const arrowMatch = !fnMatch
    ? sourceCode.match(
        /(?:export\s+)?const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(\s*\{/,
      )
    : null;
  const startMatch = fnMatch || arrowMatch;
  if (!startMatch) return {};

  const openIdx = startMatch.index + startMatch[0].length - 1; // points at `{`
  const destructure = extractBalanced(sourceCode, openIdx, "{", "}");
  if (!destructure || destructure.length < 2) return {};
  const body = destructure.slice(1, -1); // inside braces

  const out = {};
  // Split on commas at depth 0 (simple — props are flat)
  const parts = splitTopLevel(body, ",");
  for (const part of parts) {
    const p = part.trim();
    if (!p || p.startsWith("...")) continue;
    // name: rename  OR  name = default  OR  name
    // Prefer rename: `stat1Value: v1p` / `title: titleProp`
    const renameMatch = p.match(
      /^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\s*(?:=|$)/,
    );
    if (renameMatch) {
      out[renameMatch[2]] = renameMatch[1];
      continue;
    }
    const plainMatch = p.match(/^([A-Za-z_$][\w$]*)/);
    if (plainMatch) {
      out[plainMatch[1]] = plainMatch[1];
    }
  }
  return out;
}

function splitTopLevel(s, sep) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    if (c === sep && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function extractBalanced(s, startIdx, open, close) {
  if (s[startIdx] !== open) return null;
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Heuristic: does this extracted function body contain raw JSX? Real plain-JS
 * helpers (padding resolvers, formatters, className builders, etc.) never emit
 * a `<Tag`, `<tag-name`, `</Tag>` or self-closing `<Tag .../>` sequence — those
 * only appear in component render bodies.
 */
function looksLikeJsxComponent(code) {
  return /<\/?[A-Za-z][\w.]*[\s/>]/.test(code);
}

function stubHelper(name) {
  // Safe no-op stubs for editor preview — must not throw.
  if (/padding|Padding|className|Class/.test(name)) {
    return `function ${name}() { var a = arguments; if (a.length === 0) return ''; var v = a[0]; return (typeof v === 'string' ? v : ''); }`;
  }
  if (/resolve|Resolve/.test(name)) {
    return `function ${name}() { var a = arguments; return a[a.length - 1]; }`;
  }
  return `function ${name}() { return undefined; }`;
}

function extractExportedFunction(modCode, name) {
  // function name(...) { ... }
  const start = modCode.search(
    new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`),
  );
  if (start !== -1) {
    // Balance the parameter list's own parens first — a destructured param
    // (`function X({ a, b }: Props) { ... }`) contains a `{`/`}` pair of its
    // own that a naive "find the first {" would mistake for the function
    // body's opening brace, truncating the extraction right after the
    // parameter list and silently dropping the entire body.
    const parenStart = modCode.indexOf("(", start);
    let parenDepth = 0;
    let parenEnd = -1;
    for (let i = parenStart; i < modCode.length; i++) {
      if (modCode[i] === "(") parenDepth++;
      else if (modCode[i] === ")") {
        parenDepth--;
        if (parenDepth === 0) {
          parenEnd = i;
          break;
        }
      }
    }
    const brace =
      parenEnd !== -1
        ? modCode.indexOf("{", parenEnd)
        : modCode.indexOf("{", start);
    if (brace !== -1) {
      let depth = 0;
      for (let i = brace; i < modCode.length; i++) {
        if (modCode[i] === "{") depth++;
        else if (modCode[i] === "}") {
          depth--;
          if (depth === 0) {
            return modCode.slice(start, i + 1).replace(/^export\s+/, "");
          }
        }
      }
    }
  }

  // const name = (...) => { ... } or (...) => expr;
  const constStart = modCode.search(
    new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=`),
  );
  if (constStart !== -1) {
    let i = modCode.indexOf("=", constStart) + 1;
    while (i < modCode.length && /\s/.test(modCode[i])) i++;
    // scan to top-level semicolon
    let depthParen = 0;
    let depthBrace = 0;
    let inStr = null;
    let esc = false;
    const exprStart = constStart;
    for (; i < modCode.length; i++) {
      const c = modCode[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inStr = c;
        continue;
      }
      if (c === "(") depthParen++;
      else if (c === ")") depthParen--;
      else if (c === "{") depthBrace++;
      else if (c === "}") depthBrace--;
      else if (c === ";" && depthParen === 0 && depthBrace === 0) {
        return modCode
          .slice(exprStart, i + 1)
          .replace(/^export\s+/, "");
      }
    }
  }

  return null;
}

function resolveModuleFile(fromDir, importPath, themeRoot) {
  let base = importPath;
  if (base.startsWith("@/") && themeRoot) {
    base = path.resolve(themeRoot, base.replace("@/", "src/"));
    // treat as absolute-ish path from here
    const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
    for (const ext of extensions) {
      const p = base + ext;
      if (existsSync(p) && !requiresDir(p)) return p;
      const idx = path.join(base, "index" + (ext || ".ts"));
      if (existsSync(idx)) return idx;
    }
    return null;
  }

  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  for (const ext of extensions) {
    let p = path.resolve(fromDir, importPath + ext);
    if (existsSync(p)) return p;
    p = path.resolve(fromDir, importPath, "index" + ext);
    if (existsSync(p)) return p;
  }
  // bare path with extension already
  const direct = path.resolve(fromDir, importPath);
  if (existsSync(direct)) return direct;
  return null;
}

function requiresDir(p) {
  try {
    return existsSync(p) && !p.match(/\.\w+$/);
  } catch {
    return false;
  }
}
