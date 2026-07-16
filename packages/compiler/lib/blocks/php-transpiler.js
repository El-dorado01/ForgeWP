import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { findHtmlTagEnd, resolveIconToSvgHtml } from "./shared-utils.js";
import { readComponentSource } from "../hydration/is-interactive.js";
import { tryParseSource, traverse, markLegacyFallback } from "./ast-parser.js";

/**
 * Removes every `<WpEditable ...>...</WpEditable>` / self-closing
 * `<WpEditable ... />` block from `content`, using findHtmlTagEnd's
 * brace/quote-aware scan rather than a naive `[^>]*` regex — a WpEditable's
 * onChange handler commonly contains a TypeScript generic cast like
 * `as Partial<Props>`, whose OWN `>` would end a naive regex match early,
 * leaving the WpEditable tag (and its onChange) completely unstripped and
 * silently defeating any check meant to ignore it.
 */
function stripWpEditableBlocks(content) {
  let result = "";
  let pos = 0;
  while (true) {
    const idx = content.indexOf("<WpEditable", pos);
    if (idx === -1) {
      result += content.slice(pos);
      break;
    }
    const afterName = content[idx + "<WpEditable".length];
    if (afterName !== undefined && /[a-zA-Z0-9_]/.test(afterName)) {
      // False match (e.g. <WpEditableFoo>) — not our tag, keep scanning past it.
      result += content.slice(pos, idx + "<WpEditable".length);
      pos = idx + "<WpEditable".length;
      continue;
    }
    result += content.slice(pos, idx);
    const tagEnd = findHtmlTagEnd(content, idx);
    if (tagEnd === -1) {
      // Malformed/unmatched tag — stop stripping rather than loop forever.
      result += content.slice(idx);
      break;
    }
    const isSelfClosing = content[tagEnd - 1] === "/";
    if (isSelfClosing) {
      pos = tagEnd + 1;
    } else {
      const closeIdx = content.indexOf("</WpEditable>", tagEnd + 1);
      pos = closeIdx === -1 ? tagEnd + 1 : closeIdx + "</WpEditable>".length;
    }
  }
  return result;
}

/**
 * Parses a JSX tag's attribute text (everything between the tag name and its
 * closing `>`/`/>`) into `{ name, expr }` pairs — `name="literal"` and
 * `name={expr}` forms. Spread attributes (`{...rest}`) and boolean shorthand
 * (bare `name`) are skipped (returned as null entries filtered out) rather
 * than guessed at.
 */
function parseJsxAttributes(attrsStr) {
  const attrs = [];
  const re = /([a-zA-Z_][\w-]*)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(attrsStr)) !== null) {
    const name = m[1];
    if (m[2] !== undefined) {
      attrs.push({ name, expr: m[2].trim(), isStringLiteral: false });
    } else {
      const literal = m[3] !== undefined ? m[3] : m[4];
      attrs.push({ name, expr: literal, isStringLiteral: true });
    }
  }
  return attrs;
}

/**
 * Builds a PHP expression for `array('name' => value, ...)` from a nested
 * component call site's JSX attributes, for embedding into a
 * data-forgewp-props JSON blob. Handles the shapes actually seen in
 * compiled output — a plain string literal; `attributes.X` / `attributes['X']`
 * (the dual-host prop-alias rewrite — bareAttrRefsSafely and similar earlier
 * passes already rewrite a plain `{searchPlaceholder}` reference into this
 * form by the time expandNestedComponentTags runs, so this is the MORE common
 * real shape, not the bare identifier); and a bare identifier, for whichever
 * call sites reach this before that rewrite. Anything more complex is
 * DROPPED from the props object rather than risking broken PHP, so the other
 * (safely-resolvable) props still come through.
 *
 * For a bare identifier specifically, PHP's `isset()` decides at RUNTIME
 * whether it ended up as a local variable (e.g. `$searchPlaceholder =
 * $searchPlaceholderProp ?? $searchPlaceholderMeta;`, computed by the
 * separate local-var-extraction pass elsewhere in this compiler) or falls
 * back to the block's own $attributes entry of the same name — this
 * sidesteps needing to know, at the point this JSX is being expanded, which
 * of those two the compiler's other passes will end up choosing (they run
 * at a different stage).
 */
function buildPhpPropsArrayExpr(attrsStr) {
  const attrs = parseJsxAttributes(attrsStr);
  const parts = [];
  for (const { name, expr, isStringLiteral } of attrs) {
    // setAttributes is a Gutenberg-editor-only callback — always null/inert
    // on the frontend, never a real data prop worth serializing for hydration.
    if (name === 'key' || name === 'ref' || name === 'setAttributes') continue;
    let phpValue;
    const attrAccessMatch = expr.match(/^attributes(?:\.([a-zA-Z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])$/);
    if (isStringLiteral) {
      phpValue = `'${expr.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    } else if (attrAccessMatch) {
      const attrKey = attrAccessMatch[1] || attrAccessMatch[2];
      phpValue = `($attributes['${attrKey}'] ?? null)`;
    } else if (/^[a-zA-Z_$][\w$]*$/.test(expr)) {
      phpValue = `(isset($${expr}) ? $${expr} : ($attributes['${expr}'] ?? null))`;
    } else {
      continue; // complex expression — skip rather than risk broken PHP
    }
    parts.push(`'${name}' => ${phpValue}`);
  }
  return `array(${parts.join(', ')})`;
}

/**
 * Extract the JSX an `edit`/`save` property (or a named function/const
 * declaration) returns from `code`.
 *
 * AST-based (see ast-parser.js): parses `code` once, locates the target
 * function or object property by name, and reads its returned
 * JSXElement/JSXFragment node directly off the AST — no more brace-balancing
 * text scan trying to (re-)discover where that already-parsed JSX begins and
 * ends, which was misidentifying ternary/paren boundaries (scratch category
 * H: nested ternaries containing fragments, etc.).
 *
 * `code` is frequently a substring produced by older text-slicing callers
 * (`code.substring(searchIndex)`) rather than a standalone-parseable module,
 * so a parse failure falls back to the legacy text-scanning implementation.
 */
export function extractJsx(code, propertyName) {
  const ast = tryParseSource(code);
  if (ast) {
    try {
      const jsxNode = locateTargetJsx(ast, propertyName, false);
      if (jsxNode) return code.slice(jsxNode.start, jsxNode.end).trim();
    } catch {
      // Fall through to the legacy scanner below.
    }
  }
  // Legacy text-scan fallback deleted (Phase 4 — zero contributions across
  // the entire known theme surface). Marker stays as a field signal.
  markLegacyFallback('php-transpiler:extractJsx-would-have-tried-legacy');
  return null;
}

function isJsxNode(node) {
  return !!node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
}

function isFunctionLikeNode(node) {
  return !!node && (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression');
}

/**
 * Collect the JSX arguments of every `return` statement reachable from
 * `bodyNode` without crossing into a nested function's own body — a
 * `.map(item => { return <li/> })` inside the target function must not be
 * mistaken for the target function's own return.
 */
function collectTopLevelReturnJsx(bodyNode, out) {
  if (!bodyNode) return;
  switch (bodyNode.type) {
    case 'BlockStatement':
      for (const stmt of bodyNode.body) collectTopLevelReturnJsx(stmt, out);
      break;
    case 'ReturnStatement':
      if (isJsxNode(bodyNode.argument)) out.push(bodyNode.argument);
      break;
    case 'IfStatement':
      collectTopLevelReturnJsx(bodyNode.consequent, out);
      if (bodyNode.alternate) collectTopLevelReturnJsx(bodyNode.alternate, out);
      break;
    case 'TryStatement':
      collectTopLevelReturnJsx(bodyNode.block, out);
      if (bodyNode.handler) collectTopLevelReturnJsx(bodyNode.handler.body, out);
      if (bodyNode.finalizer) collectTopLevelReturnJsx(bodyNode.finalizer, out);
      break;
    case 'SwitchStatement':
      for (const c of bodyNode.cases) {
        for (const stmt of c.consequent) collectTopLevelReturnJsx(stmt, out);
      }
      break;
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'LabeledStatement':
      collectTopLevelReturnJsx(bodyNode.body, out);
      break;
    default:
      break; // Don't descend into function-like nodes or plain expressions.
  }
}

/** `fnNode` is an Arrow/Function/ObjectMethod — anything with a `.body`. */
function extractJsxFromFunctionNode(fnNode, preferLast) {
  const body = fnNode && fnNode.body;
  if (isJsxNode(body)) return body; // Concise arrow body: () => <div/>
  if (body && body.type === 'BlockStatement') {
    const found = [];
    collectTopLevelReturnJsx(body, found);
    if (found.length === 0) return null;
    return preferLast ? found[found.length - 1] : found[0];
  }
  return null;
}

/**
 * Find a function/property named `name`: an object property/method (the
 * `edit:`/`save:` shape defineBlock({...}) uses), a function declaration, or
 * a const-assigned function — in that priority order, matching the legacy
 * scanner's `propertyName:` → `function propertyName` → `const propertyName`
 * search order.
 */
function findNamedFunction(ast, name) {
  let objectMatch = null;
  let funcDeclMatch = null;
  let varDeclMatch = null;

  traverse(ast, {
    ObjectProperty(path) {
      if (objectMatch) return;
      const key = path.node.key;
      const keyName = key.type === 'Identifier' ? key.name : key.type === 'StringLiteral' ? key.value : null;
      if (keyName === name && isFunctionLikeNode(path.node.value)) {
        objectMatch = path.node.value;
      }
    },
    ObjectMethod(path) {
      if (objectMatch) return;
      const key = path.node.key;
      const keyName = key.type === 'Identifier' ? key.name : key.type === 'StringLiteral' ? key.value : null;
      if (keyName === name) objectMatch = path.node;
    },
    FunctionDeclaration(path) {
      if (!funcDeclMatch && path.node.id && path.node.id.name === name) funcDeclMatch = path.node;
    },
    VariableDeclarator(path) {
      if (
        !varDeclMatch &&
        path.node.id.type === 'Identifier' &&
        path.node.id.name === name &&
        isFunctionLikeNode(path.node.init)
      ) {
        varDeclMatch = path.node.init;
      }
    },
  });

  return objectMatch || funcDeclMatch || varDeclMatch || null;
}

/** Whole-program fallback: the first function (in source order) that returns JSX. */
function findFirstJsxReturningFunction(ast, preferLast) {
  let result = null;
  traverse(ast, {
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod'(path) {
      if (result) return;
      const jsx = extractJsxFromFunctionNode(path.node, preferLast);
      if (jsx) {
        result = jsx;
        path.stop();
      }
    },
  });
  return result;
}

function locateTargetJsx(ast, propertyName, preferLast) {
  if (propertyName) {
    const fnNode = findNamedFunction(ast, propertyName);
    // Found the named property/decl but it has no JSX (e.g. `edit: () => null`)
    // — legacy never widens the search back out in this case, so neither do we.
    if (fnNode) return extractJsxFromFunctionNode(fnNode, preferLast);
    // Name not found at all — mirrors legacy's `propIndex = 0` whole-code fallback.
    return findFirstJsxReturningFunction(ast, preferLast);
  }
  return findFirstJsxReturningFunction(ast, preferLast);
}

/** AST twin of extractJsxPreferLastReturn: locate `name`'s function and take
 * its LAST top-level returned JSX (the main render path, after early
 * loading/empty-state returns). Null when `code` doesn't parse. */
function extractJsxAstPreferLast(code, name) {
  const ast = tryParseSource(code);
  if (!ast) return null;
  try {
    const jsxNode = locateTargetJsx(ast, name, true);
    if (jsxNode) return code.slice(jsxNode.start, jsxNode.end).trim();
  } catch {
    // fall through to the legacy scanners at the call site
  }
  return null;
}

export function isFullyParenthesized(expr) {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') {
      depth--;
      if (depth === 0 && i < expr.length - 1) {
        return false;
      }
    }
  }
  return depth === 0;
}

export function parenthesizeTernaryExpression(expr) {
  const questionCount = (expr.replace(/\?\?/g, '').match(/\?/g) || []).length;
  if (questionCount <= 1) return expr;

  let depth = 0;
  let firstQuestionIdx = -1;
  let firstColonIdx = -1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      continue;
    }
    
    if (inSingleQuote || inDoubleQuote || inBacktick) {
      continue;
    }

    if (char === '(' || char === '{' || char === '[') depth++;
    else if (char === ')' || char === '}' || char === ']') depth--;
    else if (depth === 0) {
      if (char === '?' && (expr[i + 1] === '?' || expr[i + 1] === ':')) {
        i++;
        continue;
      }
      if (char === '?' && firstQuestionIdx === -1) {
        firstQuestionIdx = i;
      } else if (char === ':' && firstQuestionIdx !== -1 && firstColonIdx === -1) {
        if (expr[i + 1] === ':') {
          i++;
          continue;
        }
        firstColonIdx = i;
        break;
      }
    }
  }

  if (firstQuestionIdx === -1 || firstColonIdx === -1) {
    return expr;
  }

  const cond = expr.substring(0, firstQuestionIdx).trim();
  const truthy = expr.substring(firstQuestionIdx + 1, firstColonIdx).trim();
  const falsy = expr.substring(firstColonIdx + 1).trim();

  const newTruthy = parenthesizeTernaryExpression(truthy);
  const newFalsy = parenthesizeTernaryExpression(falsy);

  const wrapTruthy = (truthy.replace(/\?\?/g, '').includes('?') && !isFullyParenthesized(truthy)) ? `(${newTruthy})` : newTruthy;
  const wrapFalsy = (falsy.replace(/\?\?/g, '').includes('?') && !isFullyParenthesized(falsy)) ? `(${newFalsy})` : newFalsy;

  return `${cond} ? ${wrapTruthy} : ${wrapFalsy}`;
}

/**
 * @param {string} jsExpr
 * @param {string[]} blockAttrKeys
 * @param {Set<string>} localVars
 * @param {Set<string>} [freeFunctions]  PHP function names that must stay bare (not $var)
 */
/**
 * Replace calls to unknown JS functions with a safe PHP empty string.
 * Prevents `($resolveBlockPaddingY ?? null)(...)` fatals when imported
 * helpers (or other browser-only functions) have no PHP equivalent.
 *
 * Known PHP helpers / freeFunctions stay as real calls.
 */
export function neutralizeUnknownJsCalls(expr, freeFunctions = new Set()) {
  if (!expr || typeof expr !== 'string') return expr;

  const callable = new Set([
    'esc_attr', 'esc_html', 'esc_url', 'esc_js', 'esc_textarea',
    'is_string', 'is_array', 'is_object', 'is_numeric', 'isset', 'empty',
    'floatval', 'intval', 'strval', 'boolval', 'count', 'strlen', 'trim',
    'sprintf', 'printf', 'json_encode', 'json_decode', 'absint',
    'preg_replace', 'explode',
    'forgewp_resolve_page_link', 'wp_kses_post', 'wpautop',
    'Number', 'String', 'Boolean', 'parseInt', 'parseFloat',
    'Math.max', 'Math.min', 'Math.round', 'Math.floor', 'Math.ceil', 'Math.abs',
    ...freeFunctions,
  ]);

  let result = '';
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    // Preserve string literals
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      result += c;
      i++;
      while (i < expr.length) {
        if (expr[i] === '\\') {
          result += expr[i] + (expr[i + 1] || '');
          i += 2;
          continue;
        }
        result += expr[i];
        if (expr[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    const rest = expr.slice(i);
    const m = rest.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/);
    if (m) {
      const name = m[1];
      const openIdx = i + m[0].length - 1;
      if (!callable.has(name) && !name.startsWith('forgewp_')) {
        // Find matching close paren for the whole call
        let depth = 0;
        let j = openIdx;
        let inStr = null;
        let esc = false;
        for (; j < expr.length; j++) {
          const ch = expr[j];
          if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inStr) inStr = null;
            continue;
          }
          if (ch === "'" || ch === '"' || ch === '`') {
            inStr = ch;
            continue;
          }
          if (ch === '(') depth++;
          else if (ch === ')') {
            depth--;
            if (depth === 0) {
              // Drop entire call — SSR must not invoke missing JS helpers
              result += "''";
              i = j + 1;
              break;
            }
          }
        }
        if (j < expr.length && depth === 0) continue;
      } else {
        result += m[0];
        i += m[0].length;
        continue;
      }
    }

    result += c;
    i++;
  }
  return result;
}

// Translates EXPR.replace(<regex literal>, 'replacement') (optionally chained
// with .trim() and/or .split('sep')) into PHP's preg_replace('/pattern/flags',
// 'replacement', EXPR) (wrapped in trim(...)/explode('sep', ...) as chained).
// Without this, a call chain stripping border-prefixed classes out of a
// dynamic color string (row.color, optional chained, regex-replaced,
// trimmed, with an || fallback) had no translation path at all and leaked as
// literal, unexecuted JS text straight into an HTML attribute on the visitor
// page (e.g. a className prop). JS's "g" flag has no PCRE equivalent —
// preg_replace already replaces every match by default — so it's simply
// dropped; other flags (i, m, s, u) pass straight through since they're
// valid PCRE modifiers too.
export function translateReplaceTrim(jsExpr) {
  if (!jsExpr || typeof jsExpr !== 'string') return jsExpr;
  const callRegex = /([A-Za-z_$][\w$.\[\]'"]*)\.replace\(\s*\/((?:\\.|[^\/\\])*)\/([a-z]*)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g;
  let result = jsExpr.replace(callRegex, (match, subject, pattern, flags, replacement) => {
    const pcreModifiers = flags.replace(/g/g, '');
    return `preg_replace('/${pattern}/${pcreModifiers}', ${replacement}, ${subject})`;
  });
  // Fold a directly-chained `.trim()` or `.split('sep')` into the wrapping
  // call — only when it immediately follows a replace we just translated
  // (identified via the preg_replace(...) text we just produced), so an
  // unrelated `.trim()`/`.split()` elsewhere in the expression is left for
  // the generic handling below. `.split()`'s regex has no PHP method-call
  // equivalent to chain onto a bare function-call result the way JS does
  // (`preg_replace(...).split(...)` isn't valid PHP), so it must be folded
  // into an outer explode(...) call here rather than left to a later,
  // identifier-only `.split()` rule.
  result = result.replace(/(preg_replace\((?:[^()]|\([^()]*\))*\))\.trim\(\)/g, 'trim($1)');
  result = result.replace(
    /(preg_replace\((?:[^()]|\([^()]*\))*\)|trim\((?:[^()]|\([^()]*\))*\))\.split\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g,
    (match, inner, sep) => `explode(${sep}, ${inner})`,
  );
  // A standalone `.trim()` with no preceding `.replace()` (e.g. a plain
  // `facebookUrl.trim()` filter-condition check) — the fold above only
  // covers one already chained onto a just-translated preg_replace(...).
  result = result.replace(
    /([A-Za-z_$][\w$]*(?:\[[^\]]*\])*(?:\.[A-Za-z_$][\w$]*(?:\[[^\]]*\])*)*)\.trim\(\)/g,
    (m, subject) => `trim(${subject})`,
  );
  return result;
}

export function translateJsonParse(jsExpr) {
  if (!jsExpr || typeof jsExpr !== 'string') return jsExpr;
  let result = '';
  let i = 0;
  while (i < jsExpr.length) {
    const rest = jsExpr.slice(i);
    const match = rest.match(/^JSON\s*\.\s*parse\s*\(/);
    if (match) {
      const openIdx = i + match[0].length - 1;
      const closeIdx = findMatchingParenClose(jsExpr, openIdx);
      if (closeIdx !== -1) {
        const inner = jsExpr.substring(openIdx + 1, closeIdx);
        const translatedInner = translateJsonParse(inner);
        result += `json_decode(${translatedInner}, true)`;
        i = closeIdx + 1;
        continue;
      }
    }
    result += jsExpr[i];
    i++;
  }
  return result;
}

export function translateJsExpressionToPhp(jsExpr, blockAttrKeys = [], localVars = new Set(), freeFunctions = new Set()) {
  const skipWords = new Set([
    'true', 'false', 'null', 'undefined', 'attributes', 'props',
    'esc_attr', 'esc_html', 'esc_url', 'esc_js', 'esc_textarea',
    'is_string', 'is_array', 'is_object', 'is_numeric', 'isset', 'empty',
    'json_decode', 'json_encode', 'Number', 'String', 'Boolean', 'parseInt', 'parseFloat',
    'useWpPageLink', 'count', 'array_filter', 'array_map', 'explode', 'trim', 'array',
    'preg_replace',
  ]);
  for (const fn of freeFunctions) {
    skipWords.add(fn);
  }

  // Replace ?. with . first
  let cleanedExpr = jsExpr.replace(/\?\./g, '.');

  cleanedExpr = translateJsonParse(cleanedExpr);
  cleanedExpr = translateReplaceTrim(cleanedExpr);

  // Replace .length with count((array)(...)) for PHP 8 compatibility
  cleanedExpr = cleanedExpr.replace(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*)\.length\b/g, 'count((array)($1))');

  // Neutralize browser/theme helpers with no PHP twin (padding maps, etc.)
  cleanedExpr = neutralizeUnknownJsCalls(cleanedExpr, freeFunctions);

  // First convert dot notation for properties: someVar.prop -> someVar['prop']
  let phpExpr = cleanedExpr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`|(\b(?:attributes|props))\b\.([a-zA-Z0-9_-]+)(?![a-zA-Z0-9_-])(?!\.)|(\b(?:attributes|props))\b\.([a-zA-Z0-9_-]+)(?![a-zA-Z0-9_-])(?=\.)|(?<!\b(?:attributes|props))\.([a-zA-Z0-9_-]+)/g, (match, attrGroup, attrNextGroup, attrGroup2, attrNextGroup2, generalProp) => {
    if (match.startsWith("'") || match.startsWith('"') || match.startsWith('`')) {
      return match;
    }
    if (generalProp) {
      return `['${generalProp}']`;
    }
    if (attrGroup && attrNextGroup) {
      return `($attributes['${attrNextGroup}'] ?? null)`;
    }
    if (attrGroup2 && attrNextGroup2) {
      return `$attributes['${attrNextGroup2}']`;
    }
    return match;
  });

  phpExpr = phpExpr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match, offset, str) => {
    if (match.startsWith("'") || match.startsWith('"')) {
      return match;
    }
    // Already a PHP variable ($row, $attributes, …) — do not re-wrap
    if (offset > 0 && str[offset - 1] === '$') {
      return match;
    }
    if (skipWords.has(match)) {
      return match;
    }
    // Free function call: name( → keep bare name
    if (freeFunctions.has(match)) {
      return match;
    }
    if (blockAttrKeys.includes(match)) {
      const nextChar = str[offset + match.length];
      if (nextChar === '.' || nextChar === '[') {
        return `$attributes['${match}']`;
      }
      return `($attributes['${match}'] ?? null)`;
    }
    if (localVars.has(match)) {
      const nextChar = str[offset + match.length];
      if (nextChar === '.' || nextChar === '[') {
        return `$${match}`;
      }
      return `($${match} ?? null)`;
    }
    // Loop vars already rewritten to $row['x'] may still leave bare identifiers in mixed expr —
    // only $prefix when clearly a simple JS identifier (not PHP keywords we missed)
    const nextChar = str[offset + match.length];
    if (nextChar === '[' || nextChar === '-') {
      // e.g. leftover from broken `$($row` — leave alone if looks wrong
      return match;
    }
    return `($${match} ?? null)`;
  });

  // Wrap any raw multi-level property access chains in ( ... ?? null)
  phpExpr = phpExpr.replace(
    /(\$(?:attributes|[a-zA-Z0-9_]+)(?:\[\s*(['"])[a-zA-Z0-9_-]+\2\s*\]){2,})/g,
    '($1 ?? null)'
  );

  const parenthesized = parenthesizeTernaryExpression(phpExpr);

  // Replace JS logical OR (||) with PHP Elvis operator (?:)
  let finalPhpExpr = parenthesized.replace(/\|\|/g, '?:');

  const questionCount = (finalPhpExpr.replace(/\?\?/g, '').replace(/\?:/g, '').match(/\?/g) || []).length;
  if (questionCount >= 1 && !isFullyParenthesized(finalPhpExpr)) {
    return `(${finalPhpExpr})`;
  }

  return finalPhpExpr;
}

export function extractCurlyExpression(str, startPos) {
  let depth = 1;
  let pos = startPos;
  let inQuote = false;
  let quoteChar = null;
  while (pos < str.length && depth > 0) {
    const char = str[pos];
    if (inQuote) {
      if (char === '\\') {
        pos += 2;
        continue;
      }
      if (char === quoteChar) {
        inQuote = false;
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inQuote = true;
        quoteChar = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      }
    }
    pos++;
  }
  if (depth === 0) {
    return str.substring(startPos, pos - 1);
  }
  return null;
}

export function extractJsxByTagBalancing(code) {
  const startMatch = code.match(/<[a-zA-Z]|<>/);
  if (!startMatch) return null;
  const startIndex = startMatch.index;
  
  let index = startIndex;
  let tagStack = [];
  let curlyDepth = 0;
  let inQuote = null;
  let esc = false;
  
  while (index < code.length) {
    const c = code[index];
    
    if (curlyDepth > 0) {
      if (inQuote) {
        if (esc) {
          esc = false;
        } else if (c === '\\') {
          esc = true;
        } else if (c === inQuote) {
          inQuote = null;
        }
        index++;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        inQuote = c;
        index++;
        continue;
      }
      if (c === '{') {
        curlyDepth++;
        index++;
        continue;
      }
      if (c === '}') {
        curlyDepth--;
        index++;
        continue;
      }
    } else {
      if (c === '{') {
        curlyDepth = 1;
        index++;
        continue;
      }
    }
    
    if (c === '<') {
      if (code.substring(index, index + 5) === '<?php') {
        const phpEnd = code.indexOf('?>', index);
        if (phpEnd !== -1) {
          index = phpEnd + 2;
          continue;
        }
      }
      if (code.substring(index, index + 4) === '<!--') {
        const commentEnd = code.indexOf('-->', index);
        if (commentEnd !== -1) {
          index = commentEnd + 3;
          continue;
        }
      }
      
      const isCloseTag = code[index + 1] === '/';
      const tagMatch = isCloseTag
        ? code.substring(index).match(/^<\/([A-Za-z][A-Za-z0-9_-]*|<>)/)
        : code.substring(index).match(/^<([A-Za-z][A-Za-z0-9_-]*|<>)/);
        
      if (tagMatch) {
        if (isCloseTag) {
          const tagEnd = findHtmlTagEnd(code, index);
          if (tagEnd === -1) break;
          const tagName = tagMatch[1];
          if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
            tagStack.pop();
            if (tagStack.length === 0) {
              return code.substring(startIndex, tagEnd + 1);
            }
          }
          index = tagEnd + 1;
          continue;
        } else {
          const tagEnd = findHtmlTagEnd(code, index);
          if (tagEnd === -1) break;
          const tagName = tagMatch[1];
          const tagContent = code.substring(index + 1, tagEnd).trim();
          const isSelfClosing = tagContent.endsWith('/') || ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tagName.toLowerCase());
          if (!isSelfClosing) {
            tagStack.push(tagName);
          } else {
            if (tagStack.length === 0) {
              return code.substring(startIndex, tagEnd + 1);
            }
          }
          index = tagEnd + 1;
          continue;
        }
      }
    }
    index++;
  }
  return null;
}

const SKIP_NESTED_COMPONENTS = new Set([
  'WpLink',
  'WpEditable',
  'Button',
  'Hydrate',
  'WpHead',
  'WpImage',
  'WpRepeater',
  'WpIcon',
]);

export function resolveImportedComponentJsx(compName, sourceCode, sourceFilePath, themeRoot, mode = 'editor', callSiteAttrsStr = '') {
  const importRegex = new RegExp(
    `import\\s+(?:\\{\\s*${compName}\\s*\\}|${compName})\\s+from\\s+["']([^"']+)["']`,
  );
  const match = sourceCode.match(importRegex);
  if (!match) return null;

  let importPath = match[1];
  let resolvedPath = '';
  if (importPath.startsWith('@/')) {
    resolvedPath = path.resolve(themeRoot, importPath.replace('@/', './src/'));
  } else {
    resolvedPath = path.resolve(path.dirname(sourceFilePath), importPath);
  }

  let finalPath = '';
  for (const ext of ['.tsx', '.jsx', '/index.tsx', '/index.jsx']) {
    if (existsSync(resolvedPath + ext)) {
      finalPath = resolvedPath + ext;
      break;
    }
  }
  if (!finalPath && existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
    finalPath = resolvedPath;
  }
  if (!finalPath) return null;

  try {
    // readComponentSource (not raw readFileSync): the nested component may
    // itself have been auto-split, in which case its rewritten shell — not
    // the dev's original file content — is the real source of truth.
    const compContent = readComponentSource(finalPath);

    // Strip <WpEditable ...>...</WpEditable> before the handler check below —
    // same reasoning as is-interactive.js's isAttributeOfWpEditable: WpEditable's
    // onChange is inert on the frontend and shouldn't by itself count as live-data.
    const compContentForHandlerCheck = stripWpEditableBlocks(compContent);

    // Strip import statements before the hook-usage checks below — an
    // auto-split shell keeps its original (now partly unused) import list
    // verbatim (island-split.js's buildShellSource never trims imports, only
    // the relocated declarations/JSX), so a leftover `import { useWpQuery }`
    // whose only call site moved into an extracted island would otherwise
    // still match these word-boundary regexes against the bare import line
    // and falsely brand the whole shell a live-data island.
    const compContentForHookCheck = compContent.replace(/^\s*import\s[^;]*;/gm, "");

    // Live-data / stateful islands cannot be safely inlined into the editor IIFE:
    // - React hooks (useState/useEffect/…) won't run in new Function()
    // - useWpQuery / useWpTerms early-return JSX leaves free vars like `terms`
    //   undefined when only the last return is extracted
    // - an inline on[A-Z] handler (e.g. onClick) is just as real an
    //   interactivity signal as a hook — a purely event-driven island (no
    //   hooks at all, e.g. a click handler auto-extracted by the island-split
    //   compiler pass) would otherwise fall through and get silently inlined
    //   as static markup, never wired up to any hydration boundary
    // Show a stable placeholder; the real island still hydrates on the visitor page.
    const isLiveDataIsland =
      /\buse(State|Effect|Reducer|LayoutEffect|ImperativeHandle)\b/.test(compContentForHookCheck) ||
      /\bReact\.use(State|Effect|Reducer)\b/.test(compContentForHookCheck) ||
      /\buseWp(Query|Terms|SearchParams|Location|Search)\b/.test(compContentForHookCheck) ||
      /\buseIsEditorPreview\b/.test(compContentForHookCheck) ||
      /\bon[A-Z][a-zA-Z]*\s*=/.test(compContentForHandlerCheck);

    if (isLiveDataIsland) {
      // render.php is the block's real frontend output — the editor-only "interactive
      // preview" placeholder must never end up here (it would replace the actual
      // component for every visitor). Emit a proper nested hydration boundary instead,
      // matching the same data-forgewp-hydrate contract used for the top-level block
      // wrapper; Smart Discovery already builds this component its own JS chunk since
      // it uses live-data hooks, so the client hydrator can mount it directly.
      if (mode === 'php') {
        const islandSlug = compName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        // Nested islands need their own props the same way the top-level block
        // wrapper does (data-forgewp-props) — without this, whatever the JSX
        // call site actually passed (e.g. searchPlaceholder={searchPlaceholder})
        // never reaches the client-hydrated component at all, silently landing
        // as undefined post-hydration even though the attribute clearly has a
        // value server-side.
        const propsArrayExpr = buildPhpPropsArrayExpr(callSiteAttrsStr);
        const propsAttr = `data-forgewp-props="<?php echo esc_attr( json_encode( ${propsArrayExpr} ) ); ?>" `;
        const hydrationBoundary = (
          `<div className="forgewp-hydrate-boundary" ` +
          `data-forgewp-hydrate="${islandSlug}" ` +
          propsAttr +
          `data-forgewp-trigger="visible" ` +
          `style={{display:'block'}}>` +
          `</div>`
        );
        return { jsx: hydrationBoundary, sourceCode: compContent, sourceFilePath: finalPath };
      }

      // Parent may own dual-host / WpEditable fields even when the nested island
      // is interactive — guide editors to the sidebar and any canvas fields.
      const parentHasEditables =
        /\bWpEditable\b/.test(sourceCode) ||
        /\bsetAttributes\b/.test(sourceCode) ||
        /\bpickEditable\b/.test(sourceCode) ||
        /\bdefineEditable\b/.test(sourceCode) ||
        /\bmergeEditable\b/.test(sourceCode);

      const hasLiveQuery =
        /\buseWp(Query|Terms)\b/.test(compContent);

      // Keep guidance free of double-quotes so JSX → createElement string
      // coercion never breaks the editor Function() body.
      const guidance = parentHasEditables
        ? (
          hasLiveQuery
            ? (
              `This section loads live data (hotels, terms, posts) on the visitor page. ` +
              `Edit headings and labels in the block sidebar under Block Settings, ` +
              `or use any inline fields shown on the canvas above this box. ` +
              `The live grid/list appears on the frontend after save.`
            )
            : (
              `This section is interactive on the live site (forms, state, live data). ` +
              `Edit text and options in the block sidebar under Block Settings, ` +
              `or use any inline fields shown on the canvas above/below this box. ` +
              `The full interactive UI appears on the visitor page.`
            )
        )
        : (
          hasLiveQuery
            ? (
              `This section loads live data on the visitor page (not in the editor canvas). ` +
              `Preview the full grid/list on the frontend after publishing.`
            )
            : (
              `This section is interactive on the live site (forms, state, live data). ` +
              `The full UI appears on the visitor page - use the canvas/sidebar when ` +
              `this block exposes editable fields.`
            )
        );

      const placeholder = (
        `<div className="forgewp-editor-island-placeholder" ` +
        `style={{padding:'14px 16px',border:'1px dashed #c3c4c7',borderRadius:'8px',` +
        `background:'#f6f7f7',color:'#646970',fontSize:'12px',lineHeight:'1.55'}}>` +
        `<strong style={{display:'block',marginBottom:'6px',color:'#1d2327',fontSize:'13px'}}>` +
        `${compName} - interactive preview</strong>` +
        `<span style={{display:'block'}}>${guidance}</span>` +
        `</div>`
      );
      return { jsx: placeholder, sourceCode: compContent, sourceFilePath: finalPath };
    }

    const funcIndex = compContent.indexOf(`function ${compName}`);
    const constIndex = compContent.indexOf(`const ${compName}`);
    // default export: export default function Comp / export default Comp
    const defaultFn = compContent.indexOf(`export default function ${compName}`);
    const searchIndex =
      defaultFn !== -1
        ? defaultFn
        : funcIndex !== -1
          ? funcIndex
          : constIndex;
    if (searchIndex === -1) return null;

    // Prefer the last top-level return in the function body (main render
    // path). Early returns inside if/try often are loading/success branches
    // and must not be the only thing expanded into the parent block canvas.
    // AST-first (locateTargetJsx with preferLast — the whole module is clean
    // TSX here, so this virtually always succeeds); the legacy brace-depth
    // text scans below remain as the fallback chain.
    let compJsx = extractJsxAstPreferLast(compContent, compName);
    if (!compJsx) {
      markLegacyFallback('php-transpiler:resolveImportedComponentJsx-extraction');
      compJsx =
        extractJsx(compContent.substring(searchIndex), compName) ||
        extractJsx(compContent, compName);
    }
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
    if (!compJsx) return null;
    // Return the resolved file's own content/path alongside its JSX so callers can
    // recurse into it using ITS imports — a component nested two or more levels deep
    // (e.g. wrapper -> BlockComponent -> Grid) has an import that only exists in
    // BlockComponent's source, not the wrapper's, so re-using the original sourceCode/
    // sourceFilePath at every depth would never find it.
    return { jsx: compJsx, sourceCode: compContent, sourceFilePath: finalPath };
  } catch {
    return null;
  }
}

/**
 * AST pass for expandNestedComponentTags: parse the JSX text, walk for
 * PascalCase component call sites, resolve + recursively expand each, and
 * splice replacements by exact node byte offsets — no close-tag `indexOf`
 * scan that a nested same-name component (`<Card><Card/></Card>`) or a `>`
 * inside an attribute expression could derail.
 *
 * Returns the (possibly unchanged) text, or null when jsxText isn't
 * parseable — after a PHP-mode island splice the output contains a literal
 * `<?php … ?>` hydration attribute, at which point the caller falls back to
 * the legacy text scan for any remaining tags.
 */
function expandNestedTagsAstPass(jsxText, sourceCode, sourceFilePath, themeRoot, _depth, mode) {
  const ast = tryParseSource(jsxText);
  if (!ast) return null;

  const splices = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
    if (node.type === 'JSXElement') {
      const name = node.openingElement.name.type === 'JSXIdentifier' ? node.openingElement.name.name : '';
      if (name && /^[A-Z]/.test(name) && !SKIP_NESTED_COMPONENTS.has(name)) {
        const selfClosing = node.openingElement.selfClosing;
        const attrsEnd = node.openingElement.end - (selfClosing ? 2 : 1);
        const callSiteAttrsStr = jsxText.slice(node.openingElement.name.end, attrsEnd);
        const resolved = resolveImportedComponentJsx(name, sourceCode, sourceFilePath, themeRoot, mode, callSiteAttrsStr);
        if (resolved) {
          const compJsx = expandNestedComponentTags(
            resolved.jsx, resolved.sourceCode, resolved.sourceFilePath, themeRoot, _depth + 1, mode,
          );
          splices.push({ start: node.start, end: node.end, text: compJsx });
          return; // replaced wholesale — don't descend into the old children
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (AST_PHP_METADATA_KEYS.has(key)) continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item.type === 'string') walk(item);
        }
      } else if (val && typeof val.type === 'string') {
        walk(val);
      }
    }
  };
  walk(ast.program);

  if (splices.length === 0) return jsxText;
  splices.sort((a, b) => b.start - a.start); // splice right-to-left, offsets stay valid
  let out = jsxText;
  for (const s of splices) {
    out = out.slice(0, s.start) + s.text + out.slice(s.end);
  }
  return out;
}

export function expandNestedComponentTags(jsx, sourceCode, sourceFilePath, themeRoot, _depth = 0, mode = 'editor') {
  if (_depth > 10) return jsx; // guard against pathological/circular import chains
  let output = jsx;
  for (let pass = 0; pass < 20; pass++) {
    const expanded = expandNestedTagsAstPass(output, sourceCode, sourceFilePath, themeRoot, _depth, mode);
    if (expanded === null) {
      // Unparseable (PHP island boundary spliced in on an earlier pass, or
      // a non-JSX fragment) — legacy text scan handles whatever remains.
      // Legacy text-scan fallback deleted (Phase 4 — zero entries on the
      // entire known theme surface). Remaining tags stay as-is; marker kept.
      markLegacyFallback('php-transpiler:expandNestedComponentTags-would-have-tried-legacy');
      return output;
    }
    if (expanded === output) return output; // fixpoint — nothing left to expand
    output = expanded;
  }
  return output;
}

/**
 * Inlines calls to a locally-defined "icon wrapper" component — e.g.
 * `function ValueIcon({ name, className }) { const slug = (name || 'award')
 * .toLowerCase(); ... return <WpIcon name={slug} className={className}
 * provider='lucide' />; }` — used so a curated icon set renders as real
 * tree-shaken Lucide components in the browser while degrading identically
 * server-side: forgewp_render_theme_icon's PHP registry covers the same
 * curated slugs, and its sanitize_title() call already lowercases, so only
 * the bare `|| 'default'` fallback needs preserving.
 *
 * expandNestedComponentTags only resolves IMPORTED components (matched via
 * `import … from`) — a same-file helper like this is invisible to it, so
 * without this pass, `<ValueIcon name={row.icon} .../>` silently renders
 * nothing on the visitor page.
 */
export function inlineIconWrapperTags(jsx, sourceCode) {
  if (!jsx || !sourceCode || !/<WpIcon\b/.test(sourceCode)) return jsx;

  let output = jsx;
  const fnRegex = /function\s+([A-Z][A-Za-z0-9_]*)\s*\(\s*\{([^{}]*)\}[^)]*\)\s*\{/g;
  let m;
  while ((m = fnRegex.exec(sourceCode)) !== null) {
    const compName = m[1];
    if (!new RegExp(`<${compName}\\b`).test(output)) continue;

    const bodyOpenIdx = fnRegex.lastIndex - 1;
    const bodyCloseIdx = findMatchingCurlyClose(sourceCode, bodyOpenIdx);
    if (bodyCloseIdx === -1) continue;
    const body = sourceCode.slice(bodyOpenIdx + 1, bodyCloseIdx);

    const wpIconMatch = body.match(/<WpIcon\s+([^>]*?)\/?>/);
    if (!wpIconMatch) continue;
    const wpAttrs = wpIconMatch[1];
    const nameAttr = wpAttrs.match(/\bname\s*=\s*\{\s*([A-Za-z0-9_$]+)\s*\}/);
    const classAttr = wpAttrs.match(/\bclassName\s*=\s*\{\s*([A-Za-z0-9_$]+)\s*\}/);
    const providerAttr = wpAttrs.match(/\bprovider\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    if (!nameAttr) continue;
    const provider = (providerAttr && (providerAttr[1] || providerAttr[2])) || 'lucide';

    const paramNames = m[2].split(',').map((p) => p.trim().split(':')[0].trim()).filter(Boolean);

    // What the wrapper actually feeds WpIcon's `name` — either a param
    // directly, or (the one real-world shape seen so far) a local const of
    // the form `const X = (PARAM || 'default').toLowerCase();`. Only that
    // specific shape is resolved; anything else bails (tag left untouched,
    // same as today) rather than risk mistranslating unknown logic.
    let namePropParam = null;
    let nameDefault = null;
    if (paramNames.includes(nameAttr[1])) {
      namePropParam = nameAttr[1];
    } else {
      const declRx = new RegExp(
        `const\\s+${nameAttr[1]}\\s*=\\s*\\(\\s*([A-Za-z0-9_$]+)\\s*\\|\\|\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")\\s*\\)\\.toLowerCase\\(\\)`,
      );
      const declMatch = body.match(declRx);
      if (declMatch && paramNames.includes(declMatch[1])) {
        namePropParam = declMatch[1];
        nameDefault = declMatch[2];
      }
    }
    if (!namePropParam) continue;

    const classPropParam = classAttr && paramNames.includes(classAttr[1]) ? classAttr[1] : null;

    const tagRx = new RegExp(`<${compName}\\b([^>]*?)/>`, 'g');
    output = output.replace(tagRx, (fullTag, attrsStr) => {
      const getAttrValue = (attrName) => {
        const litM = attrsStr.match(new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));
        if (litM) return `'${(litM[1] ?? litM[2] ?? '').replace(/'/g, "\\'")}'`;
        const exprM = attrsStr.match(new RegExp(`\\b${attrName}\\s*=\\s*\\{\\s*([\\s\\S]*?)\\s*\\}`));
        if (exprM) return exprM[1].trim();
        return null;
      };

      const nameCallSiteValue = getAttrValue(namePropParam);
      if (nameCallSiteValue === null) return fullTag;
      const nameExpr = nameDefault ? `${nameCallSiteValue} || ${nameDefault}` : nameCallSiteValue;

      let classAttrOut = '';
      if (classPropParam) {
        const classVal = getAttrValue(classPropParam);
        if (classVal !== null) classAttrOut = ` className={${classVal}}`;
      }

      return `<WpIcon name={${nameExpr}} provider="${provider}"${classAttrOut} />`;
    });
  }
  return output;
}

export function convertJsObjectToPhp(jsObjStr) {
  let clean = jsObjStr.trim();
  if (clean.startsWith('{') && clean.endsWith('}')) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  const props = [];
  const propRegex = /([a-zA-Z0-9_-]+)\s*:\s*('[^']*'|"[^"]*"|__\('[^']*'\)|__\("[^"]*"\)|[a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = propRegex.exec(clean)) !== null) {
    const key = match[1];
    const val = match[2];
    props.push(`'${key}' => ${val}`);
  }
  return `array(${props.join(', ')})`;
}

export function convertJsArrayToPhp(jsArrStr) {
  let clean = jsArrStr.trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  const objects = [];
  const objRegex = /\{[^\}]+\}/g;
  let match;
  while ((match = objRegex.exec(clean)) !== null) {
    objects.push(convertJsObjectToPhp(match[0]));
  }
  if (objects.length > 0) {
    return `array(${objects.join(', ')})`;
  }
  return `array(${clean})`;
}

// A className expression's operands are always strings, so unlike the
// generic case, JS `+` concatenation can be safely rewritten to PHP's `.`
// without risking a numeric-addition misread elsewhere.
export function translateClassNameExpr(jsExpr, blockAttrKeys = [], localVars = new Set(), freeFunctions = new Set()) {
  const phpExpr = translateJsExpressionToPhp(jsExpr, blockAttrKeys, localVars, freeFunctions);
  return phpExpr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\+/g, (m) => (m === '+' ? '.' : m));
}

// Handles a loop-body `class(Name)?={...}` attribute whose expression is more
// than a bare `{varName.field}`/`{varName}` (e.g. `row.color?.replace(/x/, '')
// .trim() || 'fallback'`) — the simpler passes in substituteLoopVarInJsx only
// match those two exact shapes and otherwise leave the whole expression as
// raw, unrendered JS text. Runs last, so it only ever sees whatever the
// simpler passes didn't already convert away.
function substituteLoopVarInClassAttr(jsx, varName) {
  let output = jsx;
  const attrRx = /\b(?:class|className)\s*=\s*\{/g;
  let match;
  while ((match = attrRx.exec(output)) !== null) {
    const openBraceIdx = match.index + match[0].length - 1;
    const closeBraceIdx = findMatchingCurlyClose(output, openBraceIdx);
    if (closeBraceIdx === -1) continue;
    const exprText = output.slice(openBraceIdx + 1, closeBraceIdx).trim();
    const phpExpr = translateClassNameExpr(exprText, [], new Set([varName]));
    const replacement = `class="<?php echo esc_attr( ${phpExpr} ); ?>"`;
    output = output.slice(0, match.index) + replacement + output.slice(closeBraceIdx + 1);
    attrRx.lastIndex = match.index + replacement.length;
  }
  return output;
}

// Replaces `{varName.field}` / bare `{varName}` occurrences inside a .map() loop body,
// distinguishing attribute position (`attr={varName.field}` — needs quotes + esc_url/esc_attr)
// from text-content position (`{varName.field}` between tags — esc_html, no quotes). Loop-body
// substitution used to always apply the text-content form regardless of position, which left
// attribute values like `src={row.avatar}` as unquoted, incorrectly-escaped PHP.
function substituteLoopVarInJsx(innerJsx, varName) {
  const fieldRx = new RegExp(`([a-zA-Z0-9_-]+=)?\\{\\s*${varName}\\.([a-zA-Z0-9_-]+)\\s*\\}`, 'g');
  let processedJsx = innerJsx.replace(fieldRx, (m, attrPrefix, field) => {
    if (attrPrefix) {
      const attrName = attrPrefix.slice(0, -1);
      const escFunc = (attrName === 'href' || attrName === 'src') ? 'esc_url' : 'esc_attr';
      return `${attrName}="<?php echo ${escFunc}( $${varName}['${field}'] ?? '' ); ?>"`;
    }
    return `<?php echo esc_html( $${varName}['${field}'] ?? '' ); ?>`;
  });
  const primitiveRx = new RegExp(`([a-zA-Z0-9_-]+=)?\\{\\s*${varName}\\s*\\}`, 'g');
  processedJsx = processedJsx.replace(primitiveRx, (m, attrPrefix) => {
    if (attrPrefix) {
      const attrName = attrPrefix.slice(0, -1);
      const escFunc = (attrName === 'href' || attrName === 'src') ? 'esc_url' : 'esc_attr';
      return `${attrName}="<?php echo ${escFunc}( $${varName} ?? '' ); ?>"`;
    }
    return `<?php echo esc_html( $${varName} ); ?>`;
  });
  // Remaining uses inside expressions/helpers: avatarUrl(row.avatar) → avatarUrl($row['avatar'])
  // Skip already-PHP `$row`, string/array keys like ['row'], and quoted text.
  processedJsx = processedJsx.replace(
    new RegExp(`(?<![.$\\w'\\"])${varName}\\.([a-zA-Z0-9_-]+)\\b`, 'g'),
    `$${varName}['$1']`,
  );
  processedJsx = processedJsx.replace(
    new RegExp(`(?<![.$\\w'\\"])${varName}\\b(?!\\s*['\\"])`, 'g'),
    `$${varName}`,
  );
  processedJsx = substituteLoopVarInClassAttr(processedJsx, varName);
  return processedJsx;
}

export function transpileLoops(phpMarkup) {
  // 1. Literal Array Maps: {[ ... ].map((item) => ( ... ))}
  const literalMapRegex = /\{\s*(\[[^\]]*\])\s*\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*(?:,\s*[a-zA-Z0-9_-]+)?\s*\)\s*=>\s*\(\s*(<[\s\S]*?>)\s*\)\s*\)\s*\}/g;
  phpMarkup = phpMarkup.replace(literalMapRegex, (match, arrayExpr, varName, innerJsx) => {
    try {
      const phpArray = convertJsArrayToPhp(arrayExpr);
      let processedJsx = substituteLoopVarInJsx(innerJsx, varName);
      processedJsx = processedJsx.replace(/className=/g, 'class=');
      return `<?php foreach (${phpArray} as $${varName}): ?>\n${processedJsx}\n<?php endforeach; ?>`;
    } catch (e) {
      return match;
    }
  });

  // 2. Identifier Maps: {items.map((item) => ( ... ))}
  const idMapRegex = /\{\s*([a-zA-Z0-9_-]+)\s*\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*(?:,\s*[a-zA-Z0-9_-]+)?\s*\)\s*=>\s*\(\s*(<[\s\S]*?>)\s*\)\s*\)\s*\}/g;
  phpMarkup = phpMarkup.replace(idMapRegex, (match, arrayVar, varName, innerJsx) => {
    try {
      let processedJsx = substituteLoopVarInJsx(innerJsx, varName);
      processedJsx = processedJsx.replace(/className=/g, 'class=');
      return `<?php foreach (($attributes['${arrayVar}'] ?? $${arrayVar} ?? array()) as $${varName}): ?>\n${processedJsx}\n<?php endforeach; ?>`;
    } catch (e) {
      return match;
    }
  });

  // 3. String Split and Map: {(tags || '').split(',').map(...).filter(...).map((tag) => ( ... ))}
  const splitMapRegex = /\{\s*\((?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\|\|\s*(['"])\2\)\s*\.split\(\s*(['"])([^'"]+)\3\s*\)(?:\.map\(\s*[a-zA-Z0-9_-]+\s*=>\s*[a-zA-Z0-9_-]+\.trim\(\)\s*\))?(?:\.filter\(\s*[a-zA-Z0-9_-]+\s*\))?\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*\)\s*=>\s*\(\s*(<[\s\S]*?>)\s*\)\s*\)\s*\}/g;
  phpMarkup = phpMarkup.replace(splitMapRegex, (match, arrayVar, q1, q2, separator, varName, innerJsx) => {
    try {
      let processedJsx = substituteLoopVarInJsx(innerJsx, varName);
      processedJsx = processedJsx.replace(/className=/g, 'class=');
      const phpExpr = `$attributes['${arrayVar}'] ?? ''`;
      return `<?php foreach (array_filter(array_map('trim', explode('${separator}', ${phpExpr}))) as $${varName}): ?>\n${processedJsx}\n<?php endforeach; ?>`;
    } catch (e) {
      return match;
    }
  });

  return phpMarkup;
}

export function transpileConditionals(phpMarkup, attrKeys = []) {
  let index = phpMarkup.length;
  while (true) {
    const matchIndex = phpMarkup.lastIndexOf('&&', index);
    if (matchIndex === -1) break;
    
    // Ignore if inside an active <?php ... ?> block
    const lastPhpStart = phpMarkup.lastIndexOf('<?php', matchIndex);
    const lastPhpEnd = phpMarkup.lastIndexOf('?>', matchIndex);
    if (lastPhpStart !== -1 && lastPhpStart > lastPhpEnd) {
      index = matchIndex - 1;
      continue;
    }
    
    const openBrace = phpMarkup.lastIndexOf('{', matchIndex);
    if (openBrace !== -1 && openBrace > matchIndex - 100) {
      const condVar = phpMarkup.substring(openBrace + 1, matchIndex).trim();
      if (/^[a-zA-Z0-9_.\-\s&|!=<>'"]+$/.test(condVar)) {
        const openParen = phpMarkup.indexOf('(', matchIndex);
        if (openParen !== -1 && openParen < matchIndex + 10) {
          const innerJsx = extractJsxByTagBalancing(phpMarkup.substring(openParen + 1));
          if (innerJsx) {
            const trueJsxIndex = phpMarkup.indexOf(innerJsx, openParen);
            const closeParenIndexActual = trueJsxIndex + innerJsx.length;
            const endBrace = phpMarkup.indexOf('}', closeParenIndexActual);
            if (endBrace !== -1) {
              const gap = phpMarkup.substring(closeParenIndexActual, endBrace).trim();
              if (gap === ')' || gap === '') {
                const phpCond = translateJsExpressionToPhp(condVar, attrKeys);
                const replacement = `<?php if (${phpCond}): ?>\n${innerJsx}\n<?php endif; ?>`;
                phpMarkup = phpMarkup.substring(0, openBrace) + replacement + phpMarkup.substring(endBrace + 1);
                index = openBrace - 1;
                continue;
              }
            }
          }
        }
      }
    }
    index = matchIndex - 1;
  }
  return phpMarkup;
}

export function findMatchingParenClose(str, openIdx) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = openIdx; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === '\\') {
        esc = true;
      } else if (c === inStr) {
        inStr = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract one ternary branch starting right after its opening paren. If the
 * branch is JSX (starts with a tag), tag-balance it as before. Otherwise it's a
 * plain expression (bare identifier, string literal, etc.) — dual-host
 * components commonly write `{cond ? (<Editable/>) : (plainValue)}`, where the
 * non-editable branch is just the raw underlying value, not JSX. Previously
 * extractJsxByTagBalancing's unbounded `<letter` search would run off into
 * unrelated markup much further down the file and fail, silently leaving the
 * entire ternary — including the literal `{cond ? (` text — untranspiled and
 * visible on the live page.
 */
function extractTernaryBranch(phpMarkup, openParenIdx, attrKeys) {
  const after = phpMarkup.substring(openParenIdx + 1);
  if (/^\s*</.test(after)) {
    const jsx = extractJsxByTagBalancing(after);
    if (!jsx) return null;
    const jsxIndex = phpMarkup.indexOf(jsx, openParenIdx);
    return { content: jsx, endIndex: jsxIndex + jsx.length };
  }
  const closeIdx = findMatchingParenClose(phpMarkup, openParenIdx);
  if (closeIdx === -1) return null;
  const rawExpr = phpMarkup.substring(openParenIdx + 1, closeIdx).trim();
  if (!rawExpr) return null;

  // Only attempt real translation for genuinely simple expressions — bare
  // identifiers, property chains, logical-OR fallbacks, or a single plain
  // function call. translateJsExpressionToPhp is a regex-based translator, not
  // a real parser — IIFEs, arrow functions, and multi-statement bodies (e.g. a
  // `.find()` lookup wrapped in `(() => { const x = ...; return ...; })()`)
  // are far beyond what it can safely rewrite, and previously came out as
  // mangled, syntactically-broken PHP. Degrade to a blank string instead.
  const looksComplex = /=>|\bfunction\b|;|\bconst\b|\blet\b|\bvar\b/.test(rawExpr);
  const content = looksComplex
    ? `<?php echo ''; ?>`
    : `<?php echo esc_html( ${translateJsExpressionToPhp(rawExpr, attrKeys)} ); ?>`;
  return { content, endIndex: closeIdx + 1 };
}

export function parseTernaryBounds(str) {
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inQuote = null;
  let esc = false;
  
  let qIdx = -1;
  let colonIdx = -1;
  let ternaryCount = 0;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    
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
    
    if (c === '(') { parenDepth++; continue; }
    if (c === ')') { parenDepth--; continue; }
    if (c === '{') { braceDepth++; continue; }
    if (c === '}') { braceDepth--; continue; }
    if (c === '[') { bracketDepth++; continue; }
    if (c === ']') { bracketDepth--; continue; }
    
    if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      if (c === '?') {
        if (str[i + 1] === '?') {
          i++;
          continue;
        }
        if (str[i - 1] === '<' || str[i + 1] === '>') {
          continue;
        }
        if (qIdx === -1) {
          qIdx = i;
        }
        ternaryCount++;
      } else if (c === ':') {
        if (qIdx !== -1) {
          ternaryCount--;
          if (ternaryCount === 0) {
            colonIdx = i;
            break;
          }
        }
      }
    }
  }
  
  if (qIdx !== -1 && colonIdx !== -1) {
    return { qIdx, colonIdx };
  }
  return null;
}

export function stripParenWrap(s) {
  const trimmed = s.trim();
  if (trimmed[0] !== '(' || trimmed[trimmed.length - 1] !== ')') return trimmed;
  const close = findMatchingParenClose(trimmed, 0);
  if (close !== trimmed.length - 1) return trimmed;
  return stripParenWrap(trimmed.slice(1, -1));
}

export function transpileTernaryString(expr, attrKeys = []) {
  const bounds = parseTernaryBounds(expr);
  if (!bounds) {
    const trimmed = expr.trim();
    if (/^\s*</.test(trimmed) || /^\s*<>\s*/.test(trimmed)) {
      return transpileTernaries(trimmed, attrKeys);
    }
    const parenStripped = stripParenWrap(trimmed);
    if (parenStripped !== trimmed) {
      return transpileTernaryString(parenStripped, attrKeys);
    }
    const looksComplex = /=>|\bfunction\b|;|\bconst\b|\blet\b|\bvar\b/.test(trimmed);
    if (looksComplex) return `<?php echo ''; ?>`;
    return `<?php echo esc_html( ${translateJsExpressionToPhp(trimmed, attrKeys)} ); ?>`;
  }

  const { qIdx, colonIdx } = bounds;
  const condVar = expr.substring(0, qIdx).trim();
  const trueBranchRaw = expr.substring(qIdx + 1, colonIdx).trim();
  const falseBranchRaw = expr.substring(colonIdx + 1).trim();

  let trueBranch = stripParenWrap(trueBranchRaw);
  let falseBranch = stripParenWrap(falseBranchRaw);

  const isJsx = (s) => /^\s*</.test(s.trim()) || /^\s*<>\s*/.test(s.trim());

  let trueContent = '';
  if (isJsx(trueBranch)) {
    trueContent = transpileTernaries(trueBranch, attrKeys);
  } else {
    trueContent = transpileTernaryString(trueBranch, attrKeys);
  }

  let falseContent = '';
  if (isJsx(falseBranch)) {
    falseContent = transpileTernaries(falseBranch, attrKeys);
  } else {
    falseContent = transpileTernaryString(falseBranch, attrKeys);
  }

  const phpCond = translateJsExpressionToPhp(condVar, attrKeys);
  return `<?php if (${phpCond}): ?>\n${trueContent}\n<?php else: ?>\n${falseContent}\n<?php endif; ?>`;
}

export function transpileTernaries(phpMarkup, attrKeys = []) {
  let index = phpMarkup.length;
  while (true) {
    const openBrace = phpMarkup.lastIndexOf('{', index);
    if (openBrace === -1) break;

    // Ignore if inside an active <?php ... ?> block
    const lastPhpStart = phpMarkup.lastIndexOf('<?php', openBrace);
    const lastPhpEnd = phpMarkup.lastIndexOf('?>', openBrace);
    if (lastPhpStart !== -1 && lastPhpStart > lastPhpEnd) {
      index = openBrace - 1;
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
      const braceContent = phpMarkup.substring(openBrace + 1, closeBrace).trim();
      const bounds = parseTernaryBounds(braceContent);
      if (bounds) {
        const transpiled = transpileTernaryString(braceContent, attrKeys);
        phpMarkup = phpMarkup.substring(0, openBrace) + transpiled + phpMarkup.substring(closeBrace + 1);
        index = openBrace - 1;
        continue;
      }
    }
    index = openBrace - 1;
  }
  return phpMarkup;
}

/**
 * Inline local JSX-returning render-helper calls (`{cell(a, b)}`) directly
 * into the markup, substituting each parameter with its call-site argument
 * text. jsHelperToPhpFunction can't turn these into real PHP functions (JSX
 * has no PHP-function-body equivalent), so without this the call site would
 * otherwise pass straight through every other transform untouched and leak
 * literal JS text into render.php. Running this first lets the substituted
 * JSX flow through the normal transpileConditionals/transpileTernaries/etc.
 * pipeline exactly like markup the dev wrote directly inline.
 */
export function inlineJsxRenderHelperCalls(text, templates) {
  if (!templates || templates.size === 0) return text;
  let result = text;
  let guard = 0;
  let changed = true;
  while (changed && guard < 50) {
    changed = false;
    guard++;
    for (const [name, tmpl] of templates) {
      const callRegex = new RegExp(`\\{\\s*${name}\\s*\\(`, 'g');
      const match = callRegex.exec(result);
      if (!match) continue;

      const parenStart = match.index + match[0].length - 1;
      const parenEnd = findMatchingParenClose(result, parenStart);
      if (parenEnd === -1) continue;

      let closeBraceIdx = parenEnd + 1;
      while (closeBraceIdx < result.length && /\s/.test(result[closeBraceIdx])) closeBraceIdx++;
      if (result[closeBraceIdx] !== '}') continue;

      const argsText = result.slice(parenStart + 1, parenEnd);
      const args = splitTopLevelArgs(argsText);

      let jsxBody = tmpl.jsxBody;
      tmpl.params.forEach((p, idx) => {
        const argExpr = args[idx] !== undefined ? args[idx].trim() : 'null';
        const isStringLiteral = /^'(?:[^'\\]|\\.)*'$/.test(argExpr) || /^"(?:[^"\\]|\\.)*"$/.test(argExpr);

        // A JSX attribute assigned via braces (`className={className}`) needs
        // the whole `={param}` replaced, not just the identifier inside —
        // substituting only the identifier would leave `={'literal string'}`,
        // which the downstream attr-to-PHP pass doesn't recognize (it only
        // handles `attr="..."` / `attr='...'` or `attr={identifier}`),
        // producing literal, broken `class={'...'}` text in the rendered page.
        jsxBody = jsxBody.replace(
          new RegExp(`=\\{\\s*${p}\\s*\\}`, 'g'),
          isStringLiteral ? `=${argExpr}` : `={${argExpr}}`,
        );

        // Remaining occurrences (children `{value}`, computed keys `[key]`,
        // etc). A bare `IDENT=` (single `=`, not `==`/`===`) is a JSX
        // attribute name (`value={value}` — the LHS `value=` is markup, not
        // the parameter), so it must be excluded or the attribute name
        // itself gets corrupted.
        jsxBody = jsxBody.replace(
          new RegExp(`(?<![\\w$])${p}(?![\\w$])(?!\\s*=(?!=))`, 'g'),
          argExpr,
        );
      });

      let isBareJsx = /^<[A-Za-z/]|^<>/.test(jsxBody.trim());

      // Chained dispatch ternaries (`tagName === 'p' ? (<p/>) : tagName === 'h2'
      // ? (<h2/>) : (<span/>)`) are a shape transpileTernaries doesn't support
      // (it only handles a single cond ? A : B, not further ternaries inside
      // the false branch). Since every param has already been substituted
      // with its real call-site argument text above, each condition in the
      // chain is now fully resolved data (`setAttributes` — always undefined
      // in render.php — or a literal-vs-literal comparison like `'h2' ===
      // 'div'`), so it can be evaluated at compile time instead of requiring
      // runtime PHP branching. Falls back to leaving the chain untouched
      // (for transpileTernaries to attempt) if anything isn't staticly
      // resolvable, e.g. a call site that passes a real variable.
      if (!isBareJsx) {
        const resolved = resolveStaticTernaryChain(jsxBody);
        if (resolved !== null) {
          jsxBody = resolved;
          isBareJsx = true;
        }
      }

      // A bare JSX element/fragment (`<div>…</div>`) doesn't need the
      // surrounding `{}` — strip it, matching how a dev would write it
      // inline. A ternary/conditional expression (`cond ? (<A/>) : (<B/>)`)
      // is not valid JSX on its own — transpileTernaries/transpileConditionals
      // specifically look for the `{` immediately before the condition to
      // find its boundaries, so those braces must be kept.
      const replacement = isBareJsx ? jsxBody : `{${jsxBody}}`;
      result = result.slice(0, match.index) + replacement + result.slice(closeBraceIdx + 1);
      changed = true;
    }
  }
  return result;
}

/**
 * Resolve a chain of `cond ? (branch) : cond2 ? (branch2) : … : (fallback)`
 * down to a single JSX branch by evaluating each condition at compile time.
 * `setAttributes` is treated as always-false (render.php never defines it —
 * see translateJsExpressionToPhp's `($x ?? null)` fallback for unknown
 * identifiers, which is the same effective behavior at runtime). Any other
 * condition must be a safely `Function`-evaluable literal expression (e.g.
 * `'h2' === 'div'`) with no identifiers left in it — anything else aborts
 * and returns null so the caller leaves the original text untouched.
 */
function resolveStaticTernaryChain(expr, depth = 0) {
  if (depth > 20) return null;
  const trimmed = expr.trim();

  const bareJsxMatch = /^<[A-Za-z/]|^<>/.test(trimmed);
  if (bareJsxMatch) return trimmed;

  const parenWrapped = stripJsxParenWrap(trimmed);
  if (parenWrapped !== null) return parenWrapped;

  const condMatch = trimmed.match(/^([^()?:]+?)\s*\?\s*\(/);
  if (!condMatch) return null;

  const cond = condMatch[1].trim();
  const trueParenStart = trimmed.indexOf('(', condMatch[0].length - 1);
  const trueParenEnd = findMatchingParenClose(trimmed, trueParenStart);
  if (trueParenEnd === -1) return null;

  let condValue;
  if (cond === 'setAttributes') {
    condValue = false;
  } else {
    try {
      const evaluated = new Function(`return (${cond});`)();
      if (typeof evaluated !== 'boolean') return null;
      condValue = evaluated;
    } catch {
      return null;
    }
  }

  if (condValue) {
    return resolveStaticTernaryChain(
      trimmed.slice(trueParenStart + 1, trueParenEnd),
      depth + 1,
    );
  }

  const colonIdx = trimmed.indexOf(':', trueParenEnd);
  if (colonIdx === -1) return null;
  return resolveStaticTernaryChain(trimmed.slice(colonIdx + 1), depth + 1);
}

function stripJsxParenWrap(s) {
  if (s[0] !== '(' || s[s.length - 1] !== ')') return null;
  const close = findMatchingParenClose(s, 0);
  if (close !== s.length - 1) return null;
  const inner = s.slice(1, -1).trim();
  return /^<[A-Za-z/]|^<>/.test(inner) ? inner : null;
}

function splitTopLevelArgs(argsText) {
  const args = [];
  let depth = 0;
  let current = '';
  let inStr = null;
  let esc = false;
  for (let i = 0; i < argsText.length; i++) {
    const c = argsText[i];
    if (inStr) {
      current += c;
      if (esc) {
        esc = false;
      } else if (c === '\\') {
        esc = true;
      } else if (c === inStr) {
        inStr = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      current += c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) args.push(current);
  return args;
}

function findMatchingBracketClose(str, openIdx) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = openIdx; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingCurlyClose(str, openIdx) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = openIdx; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findTopLevelColon(str) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ':' && depth === 0) return i;
  }
  return -1;
}

// Resolves a locally-defined, trivial SVG wrapper component (e.g. a hand-
// rolled brand icon not in any icon package: `const TiktokIcon = (props) =>
// (<svg viewBox="..." className={props.className}>...</svg>)`) by extracting
// its literal JSX and swapping its own className passthrough for a
// placeholder — substituteStaticMapRow fills that in with the real call
// site's className once resolved, the same way a package icon's className
// gets merged into its real <svg>. Only this single "just forwards its own
// className" shape is supported; anything else returns null so the caller
// can fall back to today's behavior instead of risking a bad inline.
function resolveLocalSvgComponent(sourceCode, compName) {
  if (!sourceCode) return null;
  const declRx = new RegExp(`const\\s+${compName}\\s*=\\s*\\([^)]*\\)(?:\\s*:[^=]+)?\\s*=>\\s*\\(`);
  const declMatch = sourceCode.match(declRx);
  if (!declMatch) return null;
  const parenOpenIdx = declMatch.index + declMatch[0].length - 1;
  const parenCloseIdx = findMatchingParenClose(sourceCode, parenOpenIdx);
  if (parenCloseIdx === -1) return null;
  const jsx = sourceCode.slice(parenOpenIdx + 1, parenCloseIdx).trim();
  if (!/^<svg\b/i.test(jsx)) return null;
  if (!/\bclassName\s*=\s*\{[^}]*\}/.test(jsx)) return null;
  return jsx.replace(/\bclassName\s*=\s*\{[^}]*\}/, 'class="__FORGEWP_ICON_CLASS__"');
}

// Resolves one object-literal field value (raw JS text) to either a PHP
// expression (literal string, or code referencing an already-defined local
// var like $phone) or, for a value that's a bare component reference
// matching settings.importMap (e.g. `icon: Phone`), a deferred icon
// reference — actual SVG resolution happens at substitution time, once the
// JSX call site's own className is known (so e.g. `<Icon className="w-4 h-4" />`
// gets that class merged into the real <svg>, matching how a directly-named
// `<Phone className="…" />` tag is already resolved elsewhere in this file).
function resolveStaticMapValue(rawValue, settings, localVarNames, sourceCode = '', freeFunctions = new Set()) {
  // Strip a trailing TS type assertion (`undefined as string | undefined`,
  // `x as const`, …) — the fields in this object-literal idiom commonly carry
  // one to satisfy a shared row type across items with different value shapes.
  let v = rawValue.trim().replace(/\s+as\s+[^,}]+$/, '').trim();

  if (v === 'undefined' || v === 'null') {
    return { kind: 'text', phpText: 'null' };
  }

  const strMatch = v.match(/^'((?:[^'\\]|\\.)*)'$|^"((?:[^"\\]|\\.)*)"$/);
  if (strMatch) {
    const text = (strMatch[1] ?? strMatch[2] ?? '').replace(/\\(['"])/g, '$1');
    return { kind: 'text', phpText: `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` };
  }

  if (v.startsWith('`') && v.endsWith('`')) {
    const templateContent = v.slice(1, -1);
    const parts = [];
    let lastIdx = 0;
    const rx = /\$\{\s*([\s\S]*?)\s*\}/g;
    let m;
    while ((m = rx.exec(templateContent)) !== null) {
      const textBefore = templateContent.substring(lastIdx, m.index);
      if (textBefore) parts.push(`'${textBefore.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
      const exprName = m[1].trim();
      parts.push(localVarNames.has(exprName) ? `$${exprName}` : `(${translateJsExpressionToPhp(exprName, Object.keys(settings.attributes || {}), localVarNames, freeFunctions)})`);
      lastIdx = rx.lastIndex;
    }
    const textAfter = templateContent.substring(lastIdx);
    if (textAfter) parts.push(`'${textAfter.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
    return { kind: 'text', phpText: parts.join(' . ') || "''" };
  }

  // `cond ? trueBranch : falseBranch` — e.g. `url ? getHandle(url) : ''`.
  // Recurse into each branch (handles a template literal or helper call in
  // the true branch, a plain string in the false branch) rather than falling
  // straight to the generic fallback below, which has no ternary-aware
  // per-branch handling and would otherwise mistranslate the whole thing.
  const ternaryBounds = parseTernaryBounds(v);
  if (ternaryBounds) {
    const condText = v.slice(0, ternaryBounds.qIdx).trim();
    const trueText = v.slice(ternaryBounds.qIdx + 1, ternaryBounds.colonIdx).trim();
    const falseText = v.slice(ternaryBounds.colonIdx + 1).trim();
    const trueResolved = resolveStaticMapValue(trueText, settings, localVarNames, sourceCode, freeFunctions);
    const falseResolved = resolveStaticMapValue(falseText, settings, localVarNames, sourceCode, freeFunctions);
    // Icons never appear in a ternary branch for this idiom, only text does —
    // only combine when both branches actually resolved to plain text.
    if (trueResolved.kind === 'text' && falseResolved.kind === 'text') {
      const condPhp = translateJsExpressionToPhp(condText, Object.keys(settings.attributes || {}), localVarNames, freeFunctions);
      return { kind: 'text', phpText: `(${condPhp} ? ${trueResolved.phpText} : ${falseResolved.phpText})` };
    }
  }

  const identMatch = v.match(/^[A-Za-z_$][\w$]*$/);
  if (identMatch) {
    if (settings.importMap && settings.importMap[v]) {
      return { kind: 'icon', componentName: v, packageName: settings.importMap[v] };
    }
    if (localVarNames.has(v)) {
      return { kind: 'text', phpText: `$${v}` };
    }
    const svgTemplate = resolveLocalSvgComponent(sourceCode, v);
    if (svgTemplate) {
      return { kind: 'icon', componentName: v, packageName: '__local__', svgTemplate };
    }
    // An unresolvable capitalized (component-like) reference — e.g. a locally
    // defined component this scope can't safely inline any other way —
    // degrades to nothing rather than leaking a broken `$CompName` PHP
    // variable reference into the output.
    if (/^[A-Z]/.test(v)) {
      return { kind: 'text', phpText: "''" };
    }
  }

  // Best-effort fallback for anything else (e.g. a nested expression this
  // scope doesn't specifically model) — pass through translateJsExpressionToPhp,
  // which already handles the common shapes (attribute keys, ?? fallbacks, etc).
  return { kind: 'text', phpText: translateJsExpressionToPhp(v, Object.keys(settings.attributes || {}), localVarNames, freeFunctions) };
}

// Substitutes one row's resolved alias values into the JSX template text.
// Mirrors substituteLoopVarInJsx's attr-vs-text distinction, but per-alias
// with that row's own already-resolved value rather than a generic $row[key].
function substituteStaticMapRow(jsxTemplate, resolved, themeRoot) {
  let out = jsxTemplate;
  for (const [alias, value] of Object.entries(resolved)) {
    if (value.kind === 'icon') {
      const tagRx = new RegExp(`<${alias}\\b([^>]*?)/>`, 'g');
      out = out.replace(tagRx, (fullTag, attrsStr) => {
        const classMatch = attrsStr.match(/className\s*=\s*"([^"]*)"|className\s*=\s*'([^']*)'/);
        const className = classMatch ? (classMatch[1] ?? classMatch[2] ?? '') : '';
        if (value.packageName === '__local__' && value.svgTemplate) {
          return value.svgTemplate.replace('__FORGEWP_ICON_CLASS__', className);
        }
        const svg = resolveIconToSvgHtml(value.componentName, value.packageName, themeRoot, className);
        return svg || fullTag;
      });
      continue;
    }
    const phpExpr = value.phpText;
    const attrRx = new RegExp(`([a-zA-Z0-9_-]+)=\\{\\s*${alias}\\s*\\}`, 'g');
    out = out.replace(attrRx, (m, attrName) => {
      const escFunc = (attrName === 'href' || attrName === 'src') ? 'esc_url' : 'esc_attr';
      return `${attrName}="<?php echo ${escFunc}(${phpExpr}); ?>"`;
    });
    // Bare `{alias}` (child-text position) — but NOT `${alias}` (a template-
    // literal interpolation, e.g. inside className={`… ${color}`}), which
    // the generic substitution below handles by embedding the raw value —
    // wrapping it in <?php echo …?> here too would double-process it.
    const bareRx = new RegExp(`(?<!\\$)\\{\\s*${alias}\\s*\\}`, 'g');
    out = out.replace(bareRx, `<?php echo esc_html(${phpExpr}); ?>`);
    // Remaining bare occurrences — inside __(alias), `${alias}` template
    // interpolation, or a ternary condition like `alias ? (A) : (B)` — get
    // the raw resolved PHP expression substituted directly; whichever later
    // pipeline stage processes that construct picks it up from there. Must
    // NOT match the attribute *name* left behind by attrRx above (e.g. the
    // literal `href="` in `href="<?php echo esc_url(...); ?>"` — same text
    // as the alias itself), so an immediately-following `="` is excluded.
    out = out.replace(new RegExp(`(?<![\\w$'"])${alias}(?![\\w$])(?!=")`, 'g'), phpExpr);
  }
  out = out.replace(/className=/g, 'class=');
  return out;
}

function unrollStaticArrayMap(arrayLiteralText, destructureText, jsxTemplate, settings, themeRoot, localVarNames, filterInfo = null, sourceCode = '', freeFunctions = new Set()) {
  const inner = arrayLiteralText.trim().replace(/^\[/, '').replace(/\]$/, '');
  const itemTexts = splitTopLevelArgs(inner).map((s) => s.trim()).filter(Boolean);
  if (itemTexts.length === 0) return null;

  const destructureEntries = splitTopLevelArgs(destructureText).map((s) => s.trim()).filter(Boolean);
  const aliasToKey = new Map(); // alias -> original object key
  for (const entry of destructureEntries) {
    const renameMatch = entry.match(/^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)$/);
    if (renameMatch) {
      aliasToKey.set(renameMatch[2], renameMatch[1]);
      continue;
    }
    const shorthandMatch = entry.match(/^([A-Za-z_$][\w$]*)/);
    if (shorthandMatch) aliasToKey.set(shorthandMatch[1], shorthandMatch[1]);
  }
  if (aliasToKey.size === 0) return null;

  const items = itemTexts.map((itemText) => {
    const t = itemText.trim();
    if (!t.startsWith('{') || !t.endsWith('}')) return null;
    const objInner = t.slice(1, -1);
    const pairs = splitTopLevelArgs(objInner).map((s) => s.trim()).filter(Boolean);
    const obj = {};
    for (const pair of pairs) {
      const colonIdx = findTopLevelColon(pair);
      if (colonIdx === -1) continue;
      obj[pair.slice(0, colonIdx).trim()] = pair.slice(colonIdx + 1).trim();
    }
    return obj;
  });
  if (items.some((it) => it === null)) return null;

  const copies = items.map((obj) => {
    const resolved = {};
    for (const [alias, key] of aliasToKey) {
      const rawValue = obj[key];
      resolved[alias] = rawValue === undefined
        ? { kind: 'text', phpText: "''" }
        : resolveStaticMapValue(rawValue, settings, localVarNames, sourceCode, freeFunctions);
    }
    let rowJsx = substituteStaticMapRow(jsxTemplate, resolved, themeRoot);

    // A trailing `.filter((s) => s.href && …)` on the source array (e.g. hiding
    // social-platform rows with no configured URL) can't be evaluated at
    // compile time — the values it checks are only known at request time
    // (a WordPress option). Re-express it as a per-row runtime PHP guard
    // instead of dropping the row outright or ignoring the filter.
    if (filterInfo) {
      const fieldRx = new RegExp(`\\b${filterInfo.paramName}\\.([A-Za-z_$][\\w$]*)`, 'g');
      const substitutedCond = filterInfo.conditionText.replace(fieldRx, (m, field) => {
        const raw = obj[field];
        if (raw === undefined) return 'null';
        const trimmed = raw.trim();
        return /^[A-Za-z_$][\w$]*$/.test(trimmed) ? trimmed : `(${trimmed})`;
      });
      const phpCond = translateJsExpressionToPhp(substitutedCond, Object.keys(settings.attributes || {}), localVarNames, freeFunctions);
      rowJsx = `<?php if (${phpCond}): ?>\n${rowJsx}\n<?php endif; ?>`;
    }

    return rowJsx;
  });
  return copies.join('\n');
}

// Looks up `const IDENTIFIER = [ {...}, {...} ]` (optionally followed by a
// `.filter((param) => condition)` chain) directly in the component's own
// source — used for a `{socialList.map(({ destructured }) => (<jsx>))}` JSX
// call site, where the array literal isn't inline at the .map() call (unlike
// the phone/email/address/hours case) but a separate, previously-declared
// header const. Returns null if IDENTIFIER isn't declared this way (i.e. it's
// a genuine runtime array better left to transpileLoops).
export function findHeaderConstArrayWithFilter(sourceCode, identifier) {
  const declRx = new RegExp(`const\\s+${identifier}\\s*=\\s*\\[`);
  const declMatch = sourceCode.match(declRx);
  if (!declMatch) return null;
  const bracketOpenIdx = declMatch.index + declMatch[0].length - 1;
  const bracketCloseIdx = findMatchingBracketClose(sourceCode, bracketOpenIdx);
  if (bracketCloseIdx === -1) return null;
  const arrayLiteralText = sourceCode.slice(bracketOpenIdx, bracketCloseIdx + 1);

  let filterInfo = null;
  const afterArray = sourceCode.slice(bracketCloseIdx + 1);
  const filterCallMatch = afterArray.match(/^\s*(?:as\s+const\s*)?\.filter\(/);
  if (filterCallMatch) {
    const filterParenOpenIdx = bracketCloseIdx + 1 + filterCallMatch[0].length - 1;
    const filterParenCloseIdx = findMatchingParenClose(sourceCode, filterParenOpenIdx);
    if (filterParenCloseIdx !== -1) {
      const filterArgText = sourceCode.slice(filterParenOpenIdx + 1, filterParenCloseIdx).trim();
      const arrowMatch = filterArgText.match(/^(?:\(\s*([a-zA-Z_$][\w$]*)\s*\)|([a-zA-Z_$][\w$]*))\s*=>\s*([\s\S]+)$/);
      if (arrowMatch) {
        const paramName = arrowMatch[1] || arrowMatch[2];
        let conditionText = arrowMatch[3].trim();
        if (
          conditionText.startsWith('(') &&
          conditionText.endsWith(')') &&
          findMatchingParenClose(conditionText, 0) === conditionText.length - 1
        ) {
          conditionText = conditionText.slice(1, -1).trim();
        }
        filterInfo = { paramName, conditionText };
      }
    }
  }
  return { arrayLiteralText, filterInfo };
}

// `{NAME.length > 0 && (...)}` guarding a static-array-with-filter header
// const (e.g. `{socialList.length > 0 && (<div>…</div>)}`) can't be resolved
// at compile time either, for the same reason the .filter() itself can't —
// re-expressed as "is at least one row's own filter condition true at
// request time", i.e. each row's condition OR'd together.
//
// That OR'd condition is long (one clause per row), and transpileConditionals
// only recognizes `{COND && (...)}` when COND's own opening `{` sits within
// ~100 characters of the `&&` — inlining the full expression here pushes the
// two too far apart for it to ever match, silently leaving the whole `{...}`
// block unconverted. So instead of inlining, this assigns the condition to a
// short-named PHP var in a "prelude" the caller must prepend ahead of the
// rest of the markup, and substitutes just that short bare name inline.
export function translateStaticArrayLengthCheck(jsx, sourceCode, settings, localVarNames, freeFunctions = new Set()) {
  if (!sourceCode) return { jsx, prelude: '' };
  let prelude = '';
  const rx = /\b([a-zA-Z_$][\w$]*)\.length\s*>\s*0\b/g;
  const outJsx = jsx.replace(rx, (m, identifier) => {
    const found = findHeaderConstArrayWithFilter(sourceCode, identifier);
    if (!found || !found.filterInfo) return m;
    try {
      const inner = found.arrayLiteralText.trim().replace(/^\[/, '').replace(/\]$/, '');
      const itemTexts = splitTopLevelArgs(inner).map((s) => s.trim()).filter(Boolean);
      const conds = itemTexts.map((itemText) => {
        const t = itemText.trim();
        if (!t.startsWith('{') || !t.endsWith('}')) return null;
        const objInner = t.slice(1, -1);
        const pairs = splitTopLevelArgs(objInner).map((s) => s.trim()).filter(Boolean);
        const obj = {};
        for (const pair of pairs) {
          const colonIdx = findTopLevelColon(pair);
          if (colonIdx === -1) continue;
          obj[pair.slice(0, colonIdx).trim()] = pair.slice(colonIdx + 1).trim();
        }
        const fieldRx = new RegExp(`\\b${found.filterInfo.paramName}\\.([A-Za-z_$][\\w$]*)`, 'g');
        const substituted = found.filterInfo.conditionText.replace(fieldRx, (mm, field) => {
          const raw = obj[field];
          if (raw === undefined) return 'null';
          const trimmed = raw.trim();
          return /^[A-Za-z_$][\w$]*$/.test(trimmed) ? trimmed : `(${trimmed})`;
        });
        return translateJsExpressionToPhp(substituted, Object.keys(settings.attributes || {}), localVarNames, freeFunctions);
      });
      if (conds.some((c) => c === null)) return m;
      const varName = `__forgewp_haslen_${identifier}`;
      prelude += `$${varName} = (${conds.join(' || ')});\n`;
      return varName;
    } catch (e) {
      return m;
    }
  });
  return { jsx: outJsx, prelude };
}

// Handles `{IDENTIFIER.map(({ destructured }) => (<jsx>))}` where IDENTIFIER
// is a bare reference to a header const declared as `const IDENTIFIER = [
// {...}, ... ].filter(...)` (e.g. a social-links array built from a fixed set
// of platforms, filtered down to whichever ones have a URL configured) —
// distinct from transpileLoops' "Identifier Maps" case, which only handles a
// non-destructured loop param (`items.map((item) => …)`), and from the inline-
// array-literal case below, whose array is written directly at the .map()
// call site rather than referenced by name.
function transpileNamedStaticArrayObjectMap(phpMarkup, settings, themeRoot, localVarNames, sourceCode, freeFunctions = new Set()) {
  if (!sourceCode) return phpMarkup;
  const openRegex = /\{\s*([a-zA-Z_$][\w$]*)\s*\.map\(\s*\(\s*\{/g;
  let result = '';
  let cursor = 0;
  let match;
  while ((match = openRegex.exec(phpMarkup)) !== null) {
    if (match.index < cursor) continue;
    const identifier = match[1];
    const destructureBraceOpenIdx = match.index + match[0].length - 1;
    const destructureBraceCloseIdx = findMatchingCurlyClose(phpMarkup, destructureBraceOpenIdx);
    if (destructureBraceCloseIdx === -1) continue;

    const afterDestructure = phpMarkup.slice(destructureBraceCloseIdx + 1);
    const arrowMatch = afterDestructure.match(/^[^)]*\)\s*=>\s*\(/);
    if (!arrowMatch) continue;

    const jsxOpenParenIdx = destructureBraceCloseIdx + 1 + arrowMatch[0].length - 1;
    const jsxCloseParenIdx = findMatchingParenClose(phpMarkup, jsxOpenParenIdx);
    if (jsxCloseParenIdx === -1) continue;

    const afterJsx = phpMarkup.slice(jsxCloseParenIdx + 1);
    const closeMatch = afterJsx.match(/^\s*\)\s*\}/);
    if (!closeMatch) continue;

    const wholeMatchEnd = jsxCloseParenIdx + 1 + closeMatch[0].length;

    const found = findHeaderConstArrayWithFilter(sourceCode, identifier);
    let unrolled = null;
    if (found) {
      const destructureText = phpMarkup.slice(destructureBraceOpenIdx + 1, destructureBraceCloseIdx);
      const jsxTemplate = phpMarkup.slice(jsxOpenParenIdx + 1, jsxCloseParenIdx);
      try {
        unrolled = unrollStaticArrayMap(
          found.arrayLiteralText,
          destructureText,
          jsxTemplate,
          settings,
          themeRoot,
          localVarNames,
          found.filterInfo,
          sourceCode,
          freeFunctions,
        );
      } catch (e) {
        unrolled = null;
      }
    }

    result += phpMarkup.slice(cursor, match.index);
    // Not a recognized static-array-with-filter header const — leave
    // untouched for transpileLoops (or whatever else already handles it)
    // rather than risk mistranslating a genuine runtime array.
    result += unrolled !== null ? unrolled : phpMarkup.slice(match.index, wholeMatchEnd);
    cursor = wholeMatchEnd;
    openRegex.lastIndex = cursor;
  }
  result += phpMarkup.slice(cursor);
  return result;
}

/**
 * Handles `(ARRAY_LITERAL as const).map(({ destructured }) => (<jsx>))` — a
 * common "small, fixed set of static rows with dynamic values" pattern (e.g.
 * a phone/email/address/hours details list, or a social-links array),
 * distinct from transpileLoops' simpler cases (which all require a bare
 * identifier before `.map()`, not an inline array-of-objects literal, and
 * don't support a destructured/renamed param). Since the array's shape is
 * fully known at compile time, this unrolls the loop into N literal copies
 * rather than emitting a PHP foreach — letting each row's own icon (a JSX
 * component reference, e.g. `icon: Phone`) be resolved to real SVG markup
 * once, per row, at compile time.
 */
export function transpileStaticArrayObjectMap(phpMarkup, settings, themeRoot, localVarNames, sourceCode = '', freeFunctions = new Set()) {
  phpMarkup = transpileNamedStaticArrayObjectMap(phpMarkup, settings, themeRoot, localVarNames, sourceCode, freeFunctions);

  const openRegex = /\{\s*\(\s*\[/g;
  let result = '';
  let cursor = 0;
  let match;
  while ((match = openRegex.exec(phpMarkup)) !== null) {
    if (match.index < cursor) continue;
    const bracketOpenIdx = match.index + match[0].length - 1;
    const bracketCloseIdx = findMatchingBracketClose(phpMarkup, bracketOpenIdx);
    if (bracketCloseIdx === -1) continue;

    const afterArray = phpMarkup.slice(bracketCloseIdx + 1);
    const mapHeadMatch = afterArray.match(/^\s*(?:as\s+const\s*)?\)\s*\.map\(\s*\(\s*\{/);
    if (!mapHeadMatch) continue;

    const destructureBraceOpenAbs = bracketCloseIdx + 1 + mapHeadMatch[0].length - 1;
    const destructureBraceCloseAbs = findMatchingCurlyClose(phpMarkup, destructureBraceOpenAbs);
    if (destructureBraceCloseAbs === -1) continue;

    const afterDestructure = phpMarkup.slice(destructureBraceCloseAbs + 1);
    // Must end exactly ON the opening `(` (no trailing `\s*`) — arrowMatch[0].length
    // is used below to index straight to that paren for the balance scan; consuming
    // trailing whitespace after it would point the scan at a space instead.
    const arrowMatch = afterDestructure.match(/^[^)]*\)\s*=>\s*\(/);
    if (!arrowMatch) continue;

    const jsxOpenParenIdx = destructureBraceCloseAbs + 1 + arrowMatch[0].length - 1;
    const jsxCloseParenIdx = findMatchingParenClose(phpMarkup, jsxOpenParenIdx);
    if (jsxCloseParenIdx === -1) continue;

    const afterJsx = phpMarkup.slice(jsxCloseParenIdx + 1);
    const closeMatch = afterJsx.match(/^\s*\)\s*\}/);
    if (!closeMatch) continue;

    const wholeMatchEnd = jsxCloseParenIdx + 1 + closeMatch[0].length;

    const arrayLiteralText = phpMarkup.slice(bracketOpenIdx, bracketCloseIdx + 1);
    const destructureText = phpMarkup.slice(destructureBraceOpenAbs + 1, destructureBraceCloseAbs);
    const jsxTemplate = phpMarkup.slice(jsxOpenParenIdx + 1, jsxCloseParenIdx);

    let unrolled = null;
    try {
      unrolled = unrollStaticArrayMap(arrayLiteralText, destructureText, jsxTemplate, settings, themeRoot, localVarNames, null, sourceCode, freeFunctions);
    } catch (e) {
      unrolled = null;
    }

    result += phpMarkup.slice(cursor, match.index);
    // Safe fallback on any parse failure: leave the original text untouched
    // rather than emit anything broken — same bail philosophy used
    // throughout this pipeline.
    result += unrolled !== null ? unrolled : phpMarkup.slice(match.index, wholeMatchEnd);
    cursor = wholeMatchEnd;
    openRegex.lastIndex = cursor;
  }
  result += phpMarkup.slice(cursor);
  return result;
}

/**
 * ===========================================================================
 * AST-based PHP markup emitter — Phase 2 Step 4 (PHP half).
 * ===========================================================================
 *
 * generatePhpMarkupFromJsx parses the raw extracted JSX once and walks the
 * real AST to emit render.php markup directly, replacing the bulk of what
 * used to be ~20 independently-evolved regex/text passes in index.js
 * (JSX-tag balancing, brace-depth scanning for ternaries/conditionals,
 * attribute-shape regexes layered by increasing generality, …) with
 * recursive emitters keyed on node.type: ConditionalExpression,
 * LogicalExpression (&&), CallExpression (.map()), generic JSXElement/
 * JSXFragment/JSXText/JSXExpressionContainer.
 *
 * Deliberately NOT reimplemented here (left to the existing text-based
 * passes, unchanged, running on this function's output as a safety net):
 * - transpileStaticArrayObjectMap / translateStaticArrayLengthCheck: these
 *   resolve a `const X = [...] as const` array declared elsewhere in the
 *   *same source file* and statically unroll `.map()` over it into N literal
 *   copies of the row template. That's a cross-reference into sibling source
 *   text, not a property of the JSX subtree being emitted here — a
 *   genuinely different concern from "turn this parsed expression into PHP".
 *   tryEmitPhpMapLoop below only takes over the loop shapes it can resolve
 *   with confidence (a bare attribute/local-var array, or the `(x || '').
 *   split(...)` string-split shape); anything else — an array literal
 *   target, an `as const` cast, chained `.filter()` in an unrecognized
 *   shape — is left as the original verbatim JSX text `{...}` so these
 *   existing passes can still catch and unroll it downstream exactly as
 *   before.
 *
 * Every leaf expression still goes through the existing, unchanged
 * translateJsExpressionToPhp — this migration is about correctly *finding*
 * expression/condition/loop boundaries via a real parser, not about
 * reimplementing PHP code generation for expressions that already works.
 *
 * Returns the emitted PHP markup string, or null if `jsxCode` doesn't parse
 * as a single clean JSX expression (falls back to the legacy text pipeline
 * — see index.js's call site) or if emission hits an unexpected shape it
 * has no safe fallback for.
 */
export function generatePhpMarkupFromJsx(jsxCode, blockSettings, context) {
  const ast = tryParseSource(jsxCode);
  const body = ast && ast.program.body;
  if (!(body && body.length === 1 && body[0].type === 'ExpressionStatement')) return null;
  const rootExpr = body[0].expression;
  if (rootExpr.type !== 'JSXElement' && rootExpr.type !== 'JSXFragment') return null;

  const fullContext = {
    attrKeys: Object.keys((blockSettings && blockSettings.attributes) || {}),
    localVars: (context && context.localVars) || new Set(),
    freeFunctions: (context && context.freeFunctions) || new Set(),
    themeRoot: context && context.themeRoot,
    importMap: (blockSettings && blockSettings.importMap) || {},
    textDomain: (context && context.textDomain) || 'hotelchecker24',
  };

  try {
    return emitPhpNode(rootExpr, jsxCode, blockSettings, fullContext);
  } catch {
    return null;
  }
}

const VOID_HTML_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
  'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'stop', 'use',
]);

function isJsxNodePhp(node) {
  return !!node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
}

function getPhpJsxTagName(nameNode) {
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${getPhpJsxTagName(nameNode.object)}.${nameNode.property.name}`;
  }
  if (nameNode.type === 'JSXNamespacedName') return `${nameNode.namespace.name}:${nameNode.name.name}`;
  return '';
}

/** `[{ name, valueNode, hasValue }]` — valueNode is a StringLiteral or the
 * inner expression of a JSXExpressionContainer; null when boolean-shorthand. */
function readPhpJsxAttrs(openingElement) {
  const attrs = [];
  for (const attr of openingElement.attributes) {
    if (attr.type !== 'JSXAttribute') continue; // spreads: never modeled by the legacy regex pipeline either
    const name = getPhpJsxTagName(attr.name) || (attr.name.type === 'JSXIdentifier' ? attr.name.name : '');
    if (!attr.value) {
      attrs.push({ name, valueNode: null, hasValue: false });
    } else if (attr.value.type === 'JSXExpressionContainer') {
      attrs.push({ name, valueNode: attr.value.expression, hasValue: true });
    } else {
      attrs.push({ name, valueNode: attr.value, hasValue: true }); // StringLiteral
    }
  }
  return attrs;
}

function findPhpAttr(attrs, name) {
  return attrs.find((a) => a.name === name) || null;
}

function isStrippedPhpAttrName(name) {
  return name === 'ref' || name === 'disabled' || name === 'checked' || /^on[A-Z]/.test(name);
}

/**
 * Emit one JSX child/branch/condition expression that is NOT itself JSX.
 * Mirrors extractTernaryBranch's "only translate genuinely simple
 * expressions" bail: an IIFE, arrow function, or multi-statement body is far
 * beyond what translateJsExpressionToPhp can safely rewrite, so it degrades
 * to a blank echo instead of emitting mangled PHP.
 */
function emitPhpLeafExpression(exprNode, code, context) {
  const exprText = code.slice(exprNode.start, exprNode.end);
  const looksComplex = /=>|\bfunction\b|;|\bconst\b|\blet\b|\bvar\b/.test(exprText);
  if (looksComplex) return `<?php echo ''; ?>`;
  const phpExpr = translateJsExpressionToPhp(exprText, context.attrKeys, context.localVars, context.freeFunctions);
  return `<?php echo esc_html( ${phpExpr} ); ?>`;
}

/** A ternary/`&&` branch: JSX recurses into the element emitter; a further
 * nested ternary/`&&` recurses into emitPhpExpression; anything else is a
 * leaf expression. */
function emitPhpBranch(node, code, blockSettings, context) {
  if (isJsxNodePhp(node)) return emitPhpNode(node, code, blockSettings, context);
  if (node.type === 'ConditionalExpression' || (node.type === 'LogicalExpression' && node.operator === '&&')) {
    return emitPhpExpression(node, code, blockSettings, context);
  }
  return emitPhpLeafExpression(node, code, context);
}

/**
 * `<arrayTarget>.map((param[, index]) => ( <JSX/> ))` → PHP foreach.
 * Only resolves the loop shapes transpileLoops' bare-identifier/split-map
 * regexes already covered — a bare attribute/local-var array, or `(x || '').
 * split(sep)[...].map(...)`. Anything else (array literal, `as const` cast,
 * unrecognized chain) returns null so the caller falls back to verbatim JSX
 * text for transpileStaticArrayObjectMap/transpileLoops to catch downstream.
 */
function tryEmitPhpMapLoop(callExpr, code, blockSettings, context) {
  if (callExpr.arguments.length !== 1 || callExpr.arguments[0].type !== 'ArrowFunctionExpression') return null;
  const arrow = callExpr.arguments[0];
  if (!isJsxNodePhp(arrow.body)) return null; // only concise `=> ( <JSX/> )` bodies, matching legacy's scope
  if (arrow.params.length < 1 || arrow.params.length > 2) return null;
  if (arrow.params[0].type !== 'Identifier') return null; // no destructured loop params on this path

  const arrayTarget = callExpr.callee.object;
  let phpArrayExpr = null;

  if (arrayTarget.type === 'Identifier') {
    // Matches legacy's idMapRegex exactly: always try the attribute override
    // first, then the bare identifier (a computed local var in the common
    // case; PHP just treats an undefined one as null via `??`, harmless),
    // then an empty array — never branch on whether it's "really" a known
    // local var, since legacy's transpileLoops never had that information
    // available either (it takes no localVars argument at all).
    const name = arrayTarget.name;
    phpArrayExpr = `($attributes['${name}'] ?? $${name} ?? array())`;
  } else {
    const split = matchPhpSplitMapTarget(arrayTarget, code);
    if (split) {
      phpArrayExpr = `array_filter(array_map('trim', explode('${split.separator}', ($attributes['${split.varName}'] ?? ''))))`;
    }
  }
  if (!phpArrayExpr) return null; // complex target (array literal, `as const`, …) — bail

  const varName = arrow.params[0].name;
  const innerContext = { ...context, localVars: new Set([...context.localVars, varName]) };
  let innerContent = emitPhpNode(arrow.body, code, blockSettings, innerContext);
  innerContent = innerContent.replace(/className=/g, 'class=');

  return `<?php foreach (${phpArrayExpr} as $${varName}): ?>\n${innerContent}\n<?php endforeach; ?>`;
}

/** `(x || '').split(',')[.map(trim)][.filter(Boolean)]` → { varName, separator } | null */
function matchPhpSplitMapTarget(node, code) {
  let current = node;
  // Peel optional trailing .filter(...) / .map(trim-like) calls.
  while (
    current.type === 'CallExpression' &&
    current.callee.type === 'MemberExpression' &&
    (current.callee.property.name === 'filter' || current.callee.property.name === 'map')
  ) {
    current = current.callee.object;
  }
  if (
    current.type !== 'CallExpression' ||
    current.callee.type !== 'MemberExpression' ||
    current.callee.property.name !== 'split'
  ) {
    return null;
  }
  const sepArg = current.arguments[0];
  if (!sepArg || sepArg.type !== 'StringLiteral') return null;
  const base = current.callee.object;
  if (base.type !== 'LogicalExpression' || base.operator !== '||') return null;
  if (base.left.type !== 'Identifier') return null;
  const fallback = base.right;
  const isEmptyStringFallback =
    (fallback.type === 'StringLiteral' && fallback.value === '');
  if (!isEmptyStringFallback) return null;
  return { varName: base.left.name, separator: sepArg.value };
}

/** True when `node` (a ternary/&& condition) reads `.length` off a bare
 * identifier that is neither a block attribute nor a computed local —
 * i.e. a static array const only resolvable by reading the source file. */
function hasUnresolvableLengthGuard(node, context) {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return false;
  if (
    node.type === 'MemberExpression' && !node.computed &&
    node.property.type === 'Identifier' && node.property.name === 'length' &&
    node.object.type === 'Identifier' &&
    !context.localVars.has(node.object.name) &&
    !context.attrKeys.includes(node.object.name)
  ) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (AST_PHP_METADATA_KEYS.has(key)) continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item.type === 'string' && hasUnresolvableLengthGuard(item, context)) return true;
      }
    } else if (val && typeof val.type === 'string' && hasUnresolvableLengthGuard(val, context)) {
      return true;
    }
  }
  return false;
}

const AST_PHP_METADATA_KEYS = new Set([
  'loc', 'start', 'end', 'range', 'extra', 'leadingComments',
  'trailingComments', 'innerComments', 'comments',
]);

function emitPhpExpression(exprNode, code, blockSettings, context) {
  if (isJsxNodePhp(exprNode)) return emitPhpNode(exprNode, code, blockSettings, context);

  if (exprNode.type === 'ConditionalExpression') {
    const condText = code.slice(exprNode.test.start, exprNode.test.end);
    const phpCond = translateJsExpressionToPhp(condText, context.attrKeys, context.localVars, context.freeFunctions);
    const trueContent = emitPhpBranch(exprNode.consequent, code, blockSettings, context);
    const falseContent = emitPhpBranch(exprNode.alternate, code, blockSettings, context);
    return `<?php if (${phpCond}): ?>\n${trueContent}\n<?php else: ?>\n${falseContent}\n<?php endif; ?>`;
  }

  if (exprNode.type === 'LogicalExpression' && exprNode.operator === '&&') {
    // A `X.length > 0` guard where X is neither a block attribute nor a
    // computed local is a compile-time-static array const (e.g. a socialList
    // whose rows each carry their own URL-filter condition). Its length
    // cannot be known here — translateStaticArrayLengthCheck resolves it by
    // reading the array's declaration out of the component source, and that
    // pass matches on the literal `{X.length > 0 && (` text. Leave the whole
    // expression as verbatim JSX so it still finds its pattern downstream;
    // emitting the generic count($X ?? null) form instead would make the
    // guard always-false at render time (no $X PHP variable ever exists).
    if (hasUnresolvableLengthGuard(exprNode.left, context)) {
      return `{${code.slice(exprNode.start, exprNode.end)}}`;
    }
    const condText = code.slice(exprNode.left.start, exprNode.left.end);
    const phpCond = translateJsExpressionToPhp(condText, context.attrKeys, context.localVars, context.freeFunctions);
    const content = emitPhpBranch(exprNode.right, code, blockSettings, context);
    return `<?php if (${phpCond}): ?>\n${content}\n<?php endif; ?>`;
  }

  if (
    exprNode.type === 'CallExpression' &&
    exprNode.callee.type === 'MemberExpression' &&
    exprNode.callee.property.type === 'Identifier' &&
    exprNode.callee.property.name === 'map'
  ) {
    const loop = tryEmitPhpMapLoop(exprNode, code, blockSettings, context);
    if (loop !== null) return loop;
    // Bail to verbatim JSX text — see generatePhpMarkupFromJsx's doc comment.
    return `{${code.slice(exprNode.start, exprNode.end)}}`;
  }

  // i18n: {__('Text', 'domain')}
  if (exprNode.type === 'CallExpression' && exprNode.callee.type === 'Identifier' && exprNode.callee.name === '__') {
    const arg0 = exprNode.arguments[0];
    if (arg0 && arg0.type === 'StringLiteral') {
      const escaped = arg0.value.replace(/'/g, "\\'").trim().replace(/\s+/g, ' ');
      return `<?php echo esc_html( __('${escaped}', '${context.textDomain}') ); ?>`;
    }
  }

  if (exprNode.type === 'Identifier') {
    const varName = exprNode.name;
    const attrConfig = blockSettings && blockSettings.attributes && blockSettings.attributes[varName];
    const escFunc = attrConfig && attrConfig.control === 'richText' ? 'wp_kses_post' : 'esc_html';
    const prefix = context.localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
    return `<?php echo ${escFunc}( ${prefix} ?? '' ); ?>`;
  }

  if (
    exprNode.type === 'MemberExpression' && !exprNode.computed &&
    exprNode.object.type === 'Identifier' && exprNode.property.type === 'Identifier'
  ) {
    const objName = exprNode.object.name;
    if (objName === 'attributes' || objName === 'props') {
      // Legacy's final `{attributes.X}` pass STRIPS the attributes./props.
      // prefix and then prefers the computed local var when one exists
      // (`const description = descriptionProp ?? descriptionMeta` must win
      // over the raw block attribute — the local carries the dual-host
      // meta-fallback resolution). Match that exactly.
      const varName = exprNode.property.name;
      const attrConfig = blockSettings && blockSettings.attributes && blockSettings.attributes[varName];
      const escFunc = attrConfig && attrConfig.control === 'richText' ? 'wp_kses_post' : 'esc_html';
      const prefix = context.localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
      return `<?php echo ${escFunc}( ${prefix} ?? '' ); ?>`;
    }
    const prefix = context.localVars.has(objName) ? `$${objName}` : `$attributes['${objName}']`;
    return `<?php echo esc_html( ${prefix}['${exprNode.property.name}'] ?? '' ); ?>`;
  }

  return emitPhpLeafExpression(exprNode, code, context);
}

function emitPhpChildren(children, code, blockSettings, context) {
  let out = '';
  for (const child of children) {
    if (child.type === 'JSXText') {
      out += child.value;
    } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      out += emitPhpNode(child, code, blockSettings, context);
    } else if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type === 'JSXEmptyExpression') continue; // {/* comment */}
      out += emitPhpExpression(child.expression, code, blockSettings, context);
    }
  }
  return out;
}

/** style={{ prop: expr, ... }} → a single interpolated `style="..."` HTML attribute. */
function emitPhpStyleAttr(objExpr, code, context) {
  const parts = [];
  for (const prop of objExpr.properties) {
    if (prop.type !== 'ObjectProperty') continue;
    const propName = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    const kebabProp = propName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    const valText = code.slice(prop.value.start, prop.value.end);
    const phpExpr = translateJsExpressionToPhp(valText, context.attrKeys, context.localVars, context.freeFunctions);
    parts.push(`${kebabProp}: <?php echo esc_attr( ${phpExpr} ); ?>;`);
  }
  return `style="${parts.join(' ')}"`;
}

/** Generic `attr="literal"` / `attr={expr}` HTML attribute rendering (the
 * cascade of increasingly-generic regexes in index.js, unified). */
function emitPhpSingleAttr(name, valueNode, hasValue, code, context) {
  if (!hasValue) return name; // boolean shorthand
  if (valueNode.type === 'StringLiteral') {
    return `${name}="${valueNode.value}"`;
  }
  // {'literal'} written with braces instead of the natural JSX shorthand.
  if (valueNode.type === 'StringLiteral' || (valueNode.type === 'TemplateLiteral' && valueNode.expressions.length === 0)) {
    const text = valueNode.type === 'StringLiteral' ? valueNode.value : valueNode.quasis[0].value.cooked;
    return `${name}="${text}"`;
  }
  const escFunc = name === 'href' || name === 'src' ? 'esc_url' : 'esc_attr';
  // Bare `attr={x}` / dotted `attr={x.y}` — legacy's specific attribute-value
  // cascade (distinct from the generic translateJsExpressionToPhp fallback
  // below) always uses `?? ''`, not `?? null`, and never double-wraps in
  // parens; match it exactly rather than going through the generic path,
  // which is semantically equivalent PHP but a needless divergence.
  if (valueNode.type === 'Identifier') {
    const varName = valueNode.name;
    const prefix = context.localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
    return `${name}="<?php echo ${escFunc}( ${prefix} ?? '' ); ?>"`;
  }
  if (
    valueNode.type === 'MemberExpression' && !valueNode.computed &&
    valueNode.object.type === 'Identifier' && valueNode.property.type === 'Identifier'
  ) {
    const objName = valueNode.object.name;
    if (objName === 'attributes' || objName === 'props') {
      // Same prefix-strip-then-prefer-local resolution as the child-position
      // `{attributes.X}` case — see emitPhpExpression's comment.
      const varName = valueNode.property.name;
      const prefix = context.localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
      return `${name}="<?php echo ${escFunc}( ${prefix} ?? '' ); ?>"`;
    }
    const prefix = context.localVars.has(objName) ? `$${objName}` : `$attributes['${objName}']`;
    return `${name}="<?php echo ${escFunc}( ${prefix}['${valueNode.property.name}'] ?? '' ); ?>"`;
  }
  // i18n: attr={__('Text')} — matches legacy's attr-position `__()` regex.
  // Must come before the generic fallback: `__` is not a known PHP-callable
  // to translateJsExpressionToPhp, whose neutralizeUnknownJsCalls pass would
  // blank the whole call (losing e.g. an image's alt text).
  if (
    valueNode.type === 'CallExpression' && valueNode.callee.type === 'Identifier' &&
    valueNode.callee.name === '__' &&
    valueNode.arguments[0] && valueNode.arguments[0].type === 'StringLiteral'
  ) {
    const escaped = valueNode.arguments[0].value.replace(/'/g, "\\'").trim().replace(/\s+/g, ' ');
    return `${name}="<?php echo esc_attr( __('${escaped}', '${context.textDomain}') ); ?>"`;
  }
  // class/className operands are always strings — safe to rewrite JS `+`
  // concatenation to PHP's `.` there (translateClassNameExpr), unlike the
  // generic case where `+` might be real numeric addition.
  const isClassAttr = name === 'class';
  const translate = (text) =>
    isClassAttr
      ? translateClassNameExpr(text, context.attrKeys, context.localVars, context.freeFunctions)
      : translateJsExpressionToPhp(text, context.attrKeys, context.localVars, context.freeFunctions);
  if (valueNode.type === 'TemplateLiteral') {
    // Interpolated FRAGMENTS always use esc_attr, even for href/src — the
    // scheme/static part of the URL lives in the literal quasis (e.g.
    // href={`mailto:${email}`}), and esc_url on a schemeless fragment would
    // "normalize" it by prepending http://, corrupting the assembled URL.
    let out = '';
    for (let i = 0; i < valueNode.quasis.length; i++) {
      out += valueNode.quasis[i].value.cooked;
      if (i < valueNode.expressions.length) {
        const exprText = code.slice(valueNode.expressions[i].start, valueNode.expressions[i].end);
        out += `<?php echo esc_attr( ${translate(exprText)} ); ?>`;
      }
    }
    return `${name}="${out}"`;
  }
  const exprText = code.slice(valueNode.start, valueNode.end);
  return `${name}="<?php echo ${escFunc}( ${translate(exprText)} ); ?>"`;
}

function emitPhpAttrsExcluding(attrs, code, context, extraExclude) {
  const parts = [];
  for (const { name, valueNode, hasValue } of attrs) {
    if (extraExclude.has(name)) continue;
    if (name === 'className') continue; // handled by caller (renamed to class=)
    if (name === 'key') continue;
    if (isStrippedPhpAttrName(name) && hasValue) continue;
    parts.push(emitPhpSingleAttr(name === 'className' ? 'class' : name, valueNode, hasValue, code, context));
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

/** Resolves a WpIcon `name={...}` expression the same way index.js's inline
 * <WpIcon> handling did — a bare loop-row property, a PHP-already var, a
 * plain attr key, or a translated fallback for anything else. */
function resolvePhpIconNameExpr(expr, context) {
  if (/\$[a-zA-Z_]/.test(expr)) return expr;
  if (/^(?:attributes|props)\./.test(expr)) {
    return translateJsExpressionToPhp(expr, context.attrKeys, context.localVars, context.freeFunctions);
  }
  const dotted = expr.match(/^([a-zA-Z_][\w$]*)\.([a-zA-Z_][\w$]*)$/);
  if (dotted) return `($${dotted[1]}['${dotted[2]}'] ?? '')`;
  const dottedFallback = expr.match(
    /^([a-zA-Z_][\w$]*)\.([a-zA-Z_][\w$]*)\s*\|\|\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/,
  );
  if (dottedFallback) return `($${dottedFallback[1]}['${dottedFallback[2]}'] ?: ${dottedFallback[3]})`;
  if (/^[a-zA-Z_][\w$]*$/.test(expr)) {
    return context.localVars.has(expr) ? `($${expr} ?? '')` : `($attributes['${expr}'] ?? '')`;
  }
  return translateJsExpressionToPhp(expr, context.attrKeys, context.localVars, context.freeFunctions);
}

function emitPhpWpIcon(attrs, code, context) {
  const nameAttr = findPhpAttr(attrs, 'name');
  const classAttr = findPhpAttr(attrs, 'className') || findPhpAttr(attrs, 'class');
  const providerAttr = findPhpAttr(attrs, 'provider');

  let namePhp = "''";
  if (nameAttr && nameAttr.valueNode) {
    namePhp = nameAttr.valueNode.type === 'StringLiteral'
      ? JSON.stringify(nameAttr.valueNode.value)
      : resolvePhpIconNameExpr(code.slice(nameAttr.valueNode.start, nameAttr.valueNode.end), context);
  }
  let classPhp = "''";
  if (classAttr && classAttr.valueNode) {
    classPhp = classAttr.valueNode.type === 'StringLiteral'
      ? JSON.stringify(classAttr.valueNode.value)
      : translateJsExpressionToPhp(code.slice(classAttr.valueNode.start, classAttr.valueNode.end), context.attrKeys, context.localVars, context.freeFunctions);
  }
  const provider = (providerAttr && providerAttr.valueNode && providerAttr.valueNode.type === 'StringLiteral')
    ? providerAttr.valueNode.value
    : 'lucide';
  return `<?php forgewp_render_theme_icon( ${namePhp}, ${classPhp}, ${JSON.stringify(provider)} ); ?>`;
}

function emitPhpWpEditable(attrs, children, code, blockSettings, context) {
  const tagAttr = findPhpAttr(attrs, 'tagName');
  const tag = (tagAttr && tagAttr.valueNode && tagAttr.valueNode.type === 'StringLiteral') ? tagAttr.valueNode.value : 'div';

  const valueAttr = findPhpAttr(attrs, 'value');
  let content;
  if (!valueAttr || !valueAttr.valueNode) {
    content = emitPhpChildren(children, code, blockSettings, context);
  } else {
    const vn = valueAttr.valueNode;
    let bareVarName = null;
    if (vn.type === 'Identifier') {
      bareVarName = vn.name;
    } else if (
      vn.type === 'MemberExpression' && !vn.computed &&
      vn.object.type === 'Identifier' && (vn.object.name === 'attributes' || vn.object.name === 'props') &&
      vn.property.type === 'Identifier'
    ) {
      bareVarName = vn.property.name;
    }

    if (bareVarName) {
      // This is the (dead server-side) `setAttributes ? <WpEditable/> : …`
      // branch — `setAttributes` is never defined in render.php, so this
      // never actually executes, but still needs to be valid PHP. Prefer the
      // dual-host local var when one shadows this name (e.g. `const badge =
      // badgeProp ?? badgeMeta`) for consistency with how a plain `{badge}`
      // child expression resolves elsewhere in this same emitter.
      const attrConfig = blockSettings && blockSettings.attributes && blockSettings.attributes[bareVarName];
      const escFunc = attrConfig && attrConfig.control === 'richText' ? 'wp_kses_post' : 'esc_html';
      const prefix = context.localVars.has(bareVarName) ? `$${bareVarName}` : `$attributes['${bareVarName}']`;
      content = `<?php echo ${escFunc}( ${prefix} ?? '' ); ?>`;
    } else if (vn.type === 'MemberExpression' && !vn.computed && vn.object.type === 'Identifier' && vn.property.type === 'Identifier') {
      content = `<?php echo esc_html( $${vn.object.name}['${vn.property.name}'] ?? '' ); ?>`;
    } else {
      content = emitPhpBranch(vn, code, blockSettings, context);
    }
  }

  // emitPhpAttrsExcluding always skips className (the generic-element caller
  // is expected to prepend it as class= — WpEditable is a caller too).
  let attrsPhp = emitPhpAttrsExcluding(attrs, code, context, new Set(['tagName', 'value', 'onChange']));
  const classAttr = findPhpAttr(attrs, 'className');
  if (classAttr) {
    attrsPhp = ` ${emitPhpSingleAttr('class', classAttr.valueNode, classAttr.hasValue, code, context)}` + attrsPhp;
  }
  return `<${tag}${attrsPhp}>${content}</${tag}>`;
}

function emitPhpGenericElement(tagName, attrs, children, node, code, blockSettings, context) {
  const dsetAttr = findPhpAttr(attrs, 'dangerouslySetInnerHTML');
  let contentOverride = null;
  if (dsetAttr && dsetAttr.valueNode && dsetAttr.valueNode.type === 'ObjectExpression') {
    const htmlProp = dsetAttr.valueNode.properties.find(
      (p) => p.type === 'ObjectProperty' && (p.key.name === '__html' || p.key.value === '__html'),
    );
    if (htmlProp) {
      if (htmlProp.value.type === 'Identifier') {
        const varName = htmlProp.value.name;
        const prefix = context.localVars.has(varName) ? `$${varName}` : `$attributes['${varName}']`;
        contentOverride = `<?php echo wp_kses_post( ${prefix} ?? '' ); ?>`;
      } else {
        const exprText = code.slice(htmlProp.value.start, htmlProp.value.end);
        const phpExpr = translateJsExpressionToPhp(exprText, context.attrKeys, context.localVars, context.freeFunctions);
        contentOverride = `<?php echo wp_kses_post( ${phpExpr} ); ?>`;
      }
    }
  }

  const styleAttr = findPhpAttr(attrs, 'style');
  let attrsPhp = emitPhpAttrsExcluding(attrs, code, context, new Set(['dangerouslySetInnerHTML', 'style']));
  const classAttr = findPhpAttr(attrs, 'className');
  if (classAttr) {
    attrsPhp = ` ${emitPhpSingleAttr('class', classAttr.valueNode, classAttr.hasValue, code, context)}` + attrsPhp;
  }
  if (styleAttr && styleAttr.valueNode && styleAttr.valueNode.type === 'ObjectExpression') {
    attrsPhp += ' ' + emitPhpStyleAttr(styleAttr.valueNode, code, context);
  }

  const content = contentOverride !== null ? contentOverride : emitPhpChildren(children, code, blockSettings, context);
  if (!content && node.openingElement.selfClosing && VOID_HTML_TAGS.has(tagName.toLowerCase())) {
    return `<${tagName}${attrsPhp} />`;
  }
  return `<${tagName}${attrsPhp}>${content}</${tagName}>`;
}

function emitPhpNode(node, code, blockSettings, context) {
  if (node.type === 'JSXFragment') {
    return emitPhpChildren(node.children, code, blockSettings, context);
  }

  const tagName = getPhpJsxTagName(node.openingElement.name);
  const attrs = readPhpJsxAttrs(node.openingElement);

  if (tagName === 'WpIcon') return emitPhpWpIcon(attrs, code, context);
  if (tagName === 'WpEditable') return emitPhpWpEditable(attrs, node.children, code, blockSettings, context);

  const isPascalCase = /^[A-Z]/.test(tagName);
  if (isPascalCase && context.importMap[tagName] && context.themeRoot) {
    const classAttr = findPhpAttr(attrs, 'className');
    let classNameStr = '';
    if (classAttr && classAttr.valueNode) {
      classNameStr = classAttr.valueNode.type === 'StringLiteral'
        ? classAttr.valueNode.value
        : `<?php echo esc_attr( ${translateJsExpressionToPhp(code.slice(classAttr.valueNode.start, classAttr.valueNode.end), context.attrKeys, context.localVars, context.freeFunctions)} ); ?>`;
    }
    const svgHtml = resolveIconToSvgHtml(tagName, context.importMap[tagName], context.themeRoot, '');
    if (svgHtml) {
      const classAttrRegex = /class="([^"]*)"/;
      const hasClassAttr = svgHtml.match(classAttrRegex);
      if (hasClassAttr) {
        return svgHtml.replace(classAttrRegex, `class="${(hasClassAttr[1] + ' ' + classNameStr).trim()}"`);
      }
      return svgHtml.replace('<svg', `<svg class="${classNameStr.trim()}"`);
    }
  }

  if (tagName === 'WpLink') {
    const hrefAttr = findPhpAttr(attrs, 'href');
    const classAttr = findPhpAttr(attrs, 'className');
    const href = hrefAttr && hrefAttr.valueNode
      ? (hrefAttr.valueNode.type === 'StringLiteral' ? hrefAttr.valueNode.value : emitPhpSingleAttr('href', hrefAttr.valueNode, true, code, context).match(/="([\s\S]*)"$/)[1])
      : '#';
    const cls = classAttr ? ` class='${classAttr.valueNode && classAttr.valueNode.type === 'StringLiteral' ? classAttr.valueNode.value : ''}'` : '';
    const content = emitPhpChildren(node.children, code, blockSettings, context);
    return `<a href="${href}"${cls}>${content}</a>`;
  }
  if (tagName === 'Button') {
    const classAttr = findPhpAttr(attrs, 'className');
    const cls = classAttr ? ` class='${classAttr.valueNode && classAttr.valueNode.type === 'StringLiteral' ? classAttr.valueNode.value : ''}'` : '';
    const content = emitPhpChildren(node.children, code, blockSettings, context);
    return `<button${cls}>${content}</button>`;
  }

  // Unknown PascalCase component (no importMap icon match, not a known
  // special tag): legacy strips self-closing instances entirely and unwraps
  // paired instances to just their children — a component with no PHP/HTML
  // equivalent contributes nothing of its own to the rendered page.
  if (isPascalCase) {
    if (node.openingElement.selfClosing || node.children.length === 0) return '';
    return emitPhpChildren(node.children, code, blockSettings, context);
  }

  return emitPhpGenericElement(tagName, attrs, node.children, node, code, blockSettings, context);
}
