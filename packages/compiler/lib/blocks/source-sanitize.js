/**
 * TypeScript cleanup + same-file helper extraction for the block compiler.
 *
 * The Gutenberg editor runs plain JS (customEditJsx via new Function), not the
 * original TSX module. Developers still write normal TypeScript — casts, typed
 * params, and module-level helpers — so we sanitize and hoist what the editor
 * (and best-effort PHP render) need.
 */

import { translateReplaceTrim } from "./php-transpiler.js";

const JS_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'function', 'const', 'let', 'var', 'new', 'typeof', 'instanceof',
  'void', 'delete', 'throw', 'try', 'catch', 'finally', 'class', 'extends',
  'super', 'import', 'export', 'default', 'from', 'as', 'of', 'in', 'await',
  'async', 'yield', 'this', 'true', 'false', 'null', 'undefined', 'NaN',
  'Infinity', 'debugger', 'with', 'enum', 'implements', 'interface', 'package',
  'private', 'protected', 'public', 'static', 'readonly', 'keyof', 'infer',
  'satisfies', 'asserts', 'is', 'never', 'unknown', 'any', 'string', 'number',
  'boolean', 'object', 'symbol', 'bigint',
]);

/**
 * Strip common TypeScript syntax so the remaining text is valid plain JS.
 * Not a full TS parser — covers the patterns that show up in component JSX,
 * helpers, and local const initializers.
 */
export function stripTypeScriptSyntax(code) {
  if (!code || typeof code !== 'string') return code;

  let s = code;

  // Remove multi-line and single-line type-only import/export noise if present
  s = s.replace(/^import\s+type\s+[\s\S]*?;\s*/gm, '');
  s = s.replace(/^export\s+type\s+[\s\S]*?;\s*/gm, '');

  // `as const` / `as any` / `as Type` / `as { ... }` / `as (...)` casts
  s = stripAsCasts(s);

  // Non-null assertions: value! / foo!.bar  (not != or !==)
  s = s.replace(/(\w|\))!(?!=)/g, '$1');

  // Optional generic on calls: foo<string>(  →  foo(
  s = s.replace(/\b([A-Za-z_$][\w$]*)\s*<\s*[A-Za-z_$][\w$.,\s|&[\]<>]*\s*>\s*\(/g, '$1(');

  // Parameter / property type annotations inside (...):  (val: string, n?: number)
  // and destructured props: ({ a, b }: Props)
  s = stripParamTypeAnnotations(s);

  // Variable annotations: const x: string =  / let y: Foo =
  s = s.replace(
    /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;\n]+?(\s*=)/g,
    '$1 $2$3',
  );

  // Return type annotations: ): string {  / ): Promise<void> =>
  // Do NOT use a bare `=` terminator — that matches query strings in ternary
  // branches: `) : 'https://...?auto=format&...'` → corrupted `)=format`.
  s = s.replace(
    /\)\s*:\s*(?:[A-Za-z_$]|Promise\b)[A-Za-z0-9_$.<>\[\]|&,\s]*?\s*(\{|=>)/g,
    ')$1',
  );

  // Angle-bracket type assertions leftover: <string>x  (rare in TSX)
  // Avoid matching JSX — only when preceded by = ( or ,
  s = s.replace(/(=|\(|,)\s*<\s*[A-Za-z_$][\w$.,\s|&[\]]*\s*>\s*(?=[A-Za-z_$('"`])/g, '$1');

  // satisfies Type
  s = s.replace(/\s+satisfies\s+[A-Za-z_$][\w$<>[\]|&.,\s]*/g, '');

  return s;
}

function stripAsCasts(code) {
  let result = '';
  let i = 0;
  while (i < code.length) {
    // `expr as Type` — including property access: event.target as Node
    // Do NOT require a non-word char before the space (that skipped real casts).
    // Distinguish from import renames (`foo as bar`) via type-like RHS heuristics.
    if (/\s/.test(code[i]) && /^\s+as\s+/.test(code.slice(i))) {
      const m = code.slice(i).match(/^\s+as\s+/);
      const afterAs = i + m[0].length;
      const next = code.slice(afterAs);
      const isTypeLike =
        /^(const|any|unknown|never|string|number|boolean|object|null|undefined|keyof|typeof|readonly|Partial|Pick|Omit|Record|Required|Readonly)\b/.test(
          next,
        ) ||
        /^[A-Z(]/.test(next) ||
        next.startsWith('{') ||
        next.startsWith('[') ||
        /^[A-Za-z_$][\w$]*\s*[<.\[]/.test(next);

      if (isTypeLike) {
        i = afterAs;
        i = skipTypeToken(code, i);
        continue;
      }
      // lowercase bare identifier after `as` → likely import rename; keep
    }
    result += code[i];
    i++;
  }
  return result;
}

function skipTypeToken(code, start) {
  let i = start;
  while (i < code.length && /\s/.test(code[i])) i++;
  if (i >= code.length) return i;

  // String / template literal types: 'span' | "foo" | `bar`
  if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
    const q = code[i];
    i++;
    while (i < code.length && code[i] !== q) {
      if (code[i] === '\\') {
        i += 2;
        continue;
      }
      if (q === '`' && code[i] === '$' && code[i + 1] === '{') {
        i += 2;
        let d = 1;
        while (i < code.length && d > 0) {
          if (code[i] === '{') d++;
          else if (code[i] === '}') d--;
          i++;
        }
        continue;
      }
      i++;
    }
    if (i < code.length) i++; // closing quote
    while (i < code.length && /\s/.test(code[i])) i++;
    if ((code[i] === '|' || code[i] === '&') && code[i + 1] !== code[i]) {
      i++;
      while (i < code.length && /\s/.test(code[i])) i++;
      return skipTypeToken(code, i);
    }
    return i;
  }

  // Numeric literal types: 0 | 1
  if (/[0-9]/.test(code[i])) {
    while (i < code.length && /[0-9._]/.test(code[i])) i++;
    while (i < code.length && /\s/.test(code[i])) i++;
    if ((code[i] === '|' || code[i] === '&') && code[i + 1] !== code[i]) {
      i++;
      while (i < code.length && /\s/.test(code[i])) i++;
      return skipTypeToken(code, i);
    }
    return i;
  }

  if (code[i] === '{' || code[i] === '(' || code[i] === '[') {
    const open = code[i];
    const close = open === '{' ? '}' : open === '(' ? ')' : ']';
    let depth = 0;
    while (i < code.length) {
      if (code[i] === open) depth++;
      else if (code[i] === close) {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
      i++;
    }
    // trailing [] or | Other
    while (code[i] === '[' || code[i] === '|' || code[i] === '&' || code[i] === '<' || /\s/.test(code[i])) {
      if (code[i] === '[') {
        while (i < code.length && code[i] !== ']') i++;
        if (code[i] === ']') i++;
      } else if (code[i] === '<') {
        let d = 0;
        while (i < code.length) {
          if (code[i] === '<') d++;
          else if (code[i] === '>') {
            d--;
            if (d === 0) {
              i++;
              break;
            }
          }
          i++;
        }
      } else if (code[i] === '|' || code[i] === '&') {
        i++;
        while (i < code.length && /\s/.test(code[i])) i++;
        i = skipTypeToken(code, i);
        break;
      } else {
        i++;
      }
    }
    return i;
  }

  // keyof T / typeof x / readonly T
  const prefixKw = code.slice(i).match(/^(keyof|typeof|readonly)\b/);
  if (prefixKw) {
    i += prefixKw[0].length;
    while (i < code.length && /\s/.test(code[i])) i++;
    return skipTypeToken(code, i);
  }

  // Identifier / qualified / generic / indexed type: Foo, Foo.Bar, Foo<T>, Foo['bar']
  while (i < code.length && /[A-Za-z0-9_$.]/.test(code[i])) i++;
  while (i < code.length) {
    while (i < code.length && /\s/.test(code[i])) i++;
    if (i >= code.length) break;

    if (code[i] === '<') {
      let d = 0;
      while (i < code.length) {
        if (code[i] === '<') d++;
        else if (code[i] === '>') {
          d--;
          if (d === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      continue;
    }
    // Foo[] or Foo['key'] / Foo["key"]
    if (code[i] === '[') {
      let d = 0;
      while (i < code.length) {
        if (code[i] === '[') d++;
        else if (code[i] === ']') {
          d--;
          if (d === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      continue;
    }
    if ((code[i] === '|' || code[i] === '&') && code[i + 1] !== code[i]) {
      i++;
      while (i < code.length && /\s/.test(code[i])) i++;
      return skipTypeToken(code, i);
    }
    break;
  }
  return i;
}

function stripParamTypeAnnotations(code) {
  // Walk and inside parentheses that look like parameter lists, drop `: type`
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '(') {
      // Find matching close, then peek if followed by function-ish tail.
      // IMPORTANT: do NOT treat `) : value` (ternary) as a typed param list —
      // that used to strip ternary branches like `: String(x)` inside
      // `cond ? (a ? b : c) : 'url'`.
      const close = findMatching(code, i, '(', ')');
      if (close !== -1) {
        const afterStr = code.slice(close + 1);
        // Function-like tails only — NOT ternary `) : (` (true-branch paren of
        // `cond ? (…jsx…) : (…)` was misread as typed params and stripped
        // object fields like `{ [key]: val }` inside the branch).
        const isFunctionLike =
          /^\s*=>/.test(afterStr) ||
          /^\s*\{/.test(afterStr) ||
          // ): Type =>  /  ): Type {  — type must start with ident, never `(`
          /^\s*:\s*(?:[A-Za-z_$]|Promise\b)[A-Za-z0-9_$.<>\[\]|&,\s]*?\s*(=>|\{)/.test(
            afterStr,
          );
        const inner = code.slice(i + 1, close);
        // Match ident types AND string-literal param types: tagName: 'span' | 'p'
        if (isFunctionLike && /:\s*(?:[A-Za-z_{$'"0-9]|Promise\b)/.test(inner)) {
          const cleaned = stripTypesInsideParams(inner);
          result += '(' + cleaned + ')';
          i = close + 1;
          continue;
        }
      }
    }
    result += code[i];
    i++;
  }
  return result;
}

/** TS primitive / keyword types — never valid as destructure rename bindings. */
const TS_TYPE_KEYWORDS = new Set([
  'string',
  'number',
  'boolean',
  'any',
  'unknown',
  'never',
  'object',
  'void',
  'null',
  'undefined',
  'bigint',
  'symbol',
  'true',
  'false',
  'keyof',
  'typeof',
  'readonly',
  'infer',
  'Partial',
  'Pick',
  'Omit',
  'Record',
  'Required',
  'Readonly',
  'Promise',
  'Array',
  'Map',
  'Set',
]);

/**
 * Inside object destructure patterns `{ icon: Icon }`, `icon: Icon` is a
 * rename binding — NOT a type annotation. Only treat as type when the RHS
 * looks like a real type (primitive keyword, union, generic, string literal…).
 */
function isObjectPatternRename(afterColon) {
  const rest = afterColon.replace(/^\s+/, '');
  if (!rest || /^['"`0-9({[<]/.test(rest)) return false;
  if (/^(keyof|typeof|readonly|infer)\b/.test(rest)) return false;
  const m = rest.match(/^([A-Za-z_$][\w$]*)\s*(?=[,}=]|$)/);
  if (!m) return false;
  if (TS_TYPE_KEYWORDS.has(m[1])) return false;
  const afterId = rest.slice(m[1].length).replace(/^\s+/, '');
  if (
    afterId.startsWith('<') ||
    afterId.startsWith('[') ||
    afterId.startsWith('|') ||
    afterId.startsWith('&') ||
    afterId.startsWith('.')
  ) {
    return false;
  }
  return true;
}

function stripTypesInsideParams(inner) {
  // Remove `: Type` after identifiers / } in param lists.
  // Preserve object-pattern renames: `{ icon: Icon, label }` stays intact.
  let s = '';
  let i = 0;
  let braceDepth = 0;
  while (i < inner.length) {
    // Skip strings
    if (inner[i] === '"' || inner[i] === "'" || inner[i] === '`') {
      const q = inner[i];
      s += q;
      i++;
      while (i < inner.length && inner[i] !== q) {
        if (inner[i] === '\\') {
          s += inner[i] + (inner[i + 1] || '');
          i += 2;
          continue;
        }
        s += inner[i++];
      }
      if (i < inner.length) s += inner[i++];
      continue;
    }

    if (inner[i] === '{') braceDepth++;
    if (inner[i] === '}') braceDepth = Math.max(0, braceDepth - 1);

    // Type annotation colon: after ident, `)`, `]`, `}`, `?`, or whitespace.
    // Must include `}` so destructured params with a type work:
    //   ({ name, className }: { name?: string })  — colon sits right after `}`
    if (
      inner[i] === ':' &&
      (i === 0 ||
        /[\w$?)\]}]/.test(inner[i - 1]) ||
        /\s/.test(inner[i - 1]))
    ) {
      const after = inner.slice(i + 1);
      // Inside `{ … }` → keep renames like `icon: Icon`
      if (braceDepth > 0 && isObjectPatternRename(after)) {
        s += ':';
        i++;
        continue;
      }
      // Type annotation — skip until , or ) or = (default)
      i++;
      while (i < inner.length && /\s/.test(inner[i])) i++;
      i = skipTypeToken(inner, i);
      continue;
    }
    // Optional `?` before type on params: name?:
    s += inner[i];
    i++;
  }
  // Clean `name?` leftover optional markers on params (incl. last param)
  s = s.replace(/([A-Za-z_$][\w$]*)\?(?=\s*[,)=]|$)/g, '$1');
  return s;
}

function findMatching(code, openIdx, openChar, closeChar) {
  let depth = 0;
  let inS = false;
  let inD = false;
  let inB = false;
  for (let i = openIdx; i < code.length; i++) {
    const c = code[i];
    if (inS) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") inS = false;
      continue;
    }
    if (inD) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"') inD = false;
      continue;
    }
    if (inB) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inB = false;
      continue;
    }
    if (c === "'") inS = true;
    else if (c === '"') inD = true;
    else if (c === '`') inB = true;
    else if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Built-ins / framework identifiers that look like PascalCase helpers but
 * must never be hoisted from the component file.
 */
const PASCAL_HELPER_SKIP = new Set([
  'React',
  'Fragment',
  'Component',
  'PureComponent',
  'Suspense',
  'StrictMode',
  'WpEditable',
  'WpLink',
  'WpIcon',
  'WpRepeater',
  'WpHead',
  'WpImage',
  'Hydrate',
  'Button',
  'InspectorControls',
  'RichText',
  'InnerBlocks',
  'ServerSideRender',
  'JSON',
  'Math',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Error',
  'Promise',
  'Map',
  'Set',
  'Symbol',
  'RegExp',
  'URL',
  'URLSearchParams',
  'FormData',
  'File',
  'Blob',
  'Image',
  'Element',
  'Node',
  'Document',
  'Window',
]);

/**
 * Find helper names referenced in code:
 * - lowercase call sites: getSocialHandle(
 * - PascalCase free refs / tags: TiktokIcon, icon: PinterestIcon, <MyIcon />
 *
 * PascalCase values are how local SVG/icon components are usually passed around
 * (e.g. `icon: TiktokIcon` in a social list). Those are never "called" with `(`,
 * so a call-only scan would miss them and leave "X is not defined" in the editor.
 */
export function findCalledHelperNames(code) {
  const names = new Set();
  if (!code) return names;

  // camelCase / lowercase calls: helper(
  const callRx = /\b([a-z][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = callRx.exec(code)) !== null) {
    const name = m[1];
    if (!JS_KEYWORDS.has(name)) {
      names.add(name);
    }
  }

  // PascalCase identifiers used as values or JSX tags (not after `.`)
  const pascalRx = /(?<![.\w$])([A-Z][A-Za-z0-9_$]*)\b/g;
  while ((m = pascalRx.exec(code)) !== null) {
    const name = m[1];
    if (PASCAL_HELPER_SKIP.has(name)) continue;
    if (JS_KEYWORDS.has(name)) continue;
    // Skip ALL_CAPS constants (BAKED_PADDING is handled separately)
    if (/^[A-Z][A-Z0-9_]+$/.test(name)) continue;
    names.add(name);
  }

  return names;
}

/**
 * Extract a top-level function or const-arrow helper by name from a source file.
 * Returns the full declaration string (function / const), or null.
 */
export function extractTopLevelHelper(sourceCode, name) {
  if (!sourceCode || !name) return null;

  const patterns = [
    // function name(
    new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`, 'm'),
    // const name = (
    new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:async\\s*)?(?:function\\s*)?\\(`, 'm'),
    // const name = async (
    new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*async\\s*\\(`, 'm'),
  ];

  for (const re of patterns) {
    const match = re.exec(sourceCode);
    if (!match) continue;
    const start = match.index;
    // Find end of declaration
    const from = sourceCode.slice(start);
    // Arrow single-expression: const name = (a) => expr;
    const arrowExpr = from.match(
      new RegExp(
        `^(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*(?!\\{)`,
      ),
    );
    if (arrowExpr) {
      // Read until semicolon at depth 0
      let i = arrowExpr[0].length;
      let depth = 0;
      let inS = false;
      let inD = false;
      let inB = false;
      while (i < from.length) {
        const c = from[i];
        if (inS) {
          if (c === '\\') {
            i += 2;
            continue;
          }
          if (c === "'") inS = false;
          i++;
          continue;
        }
        if (inD) {
          if (c === '\\') {
            i += 2;
            continue;
          }
          if (c === '"') inD = false;
          i++;
          continue;
        }
        if (inB) {
          if (c === '\\') {
            i += 2;
            continue;
          }
          if (c === '`') inB = false;
          i++;
          continue;
        }
        if (c === "'") inS = true;
        else if (c === '"') inD = true;
        else if (c === '`') inB = true;
        else if (c === '(' || c === '{' || c === '[') depth++;
        else if (c === ')' || c === '}' || c === ']') depth--;
        else if (c === ';' && depth <= 0) {
          i++;
          break;
        }
        i++;
      }
      return from.slice(0, i).trim();
    }

    // Block body: find `{` that opens the function/arrow body — NOT a
    // destructure brace inside params, e.g.
    //   function ValueIcon({ name, className }: Props) { … }
    //   const fn = ({ a }: T) => { … }
    const bodyBrace = findFunctionBodyOpenBrace(from);
    if (bodyBrace === -1) continue;
    const bodyEnd = findMatching(from, bodyBrace, '{', '}');
    if (bodyEnd === -1) continue;
    let end = bodyEnd + 1;
    if (from[end] === ';') end++;
    return from.slice(0, end).trim();
  }

  return null;
}

/**
 * Locate the `{` that opens a function/arrow block body, skipping braces that
 * belong to parameter destructuring or TypeScript param/return type literals.
 *
 * @param {string} from  Declaration starting at `function name` / `const name =`
 * @returns {number} index of body `{`, or -1
 */
function findFunctionBodyOpenBrace(from) {
  const isFunctionKeyword = /^\s*(?:export\s+)?function\b/.test(from);

  if (!isFunctionKeyword) {
    // const name = (…) => { … }  — only scan the signature, not later arrows
    // in the rest of the file. Cap search to the first statement-ish region.
    const sigEnd = Math.min(from.length, 500);
    const head = from.slice(0, sigEnd);
    const arrowIdx = head.search(/=>/);
    if (arrowIdx !== -1) {
      let i = arrowIdx + 2;
      while (i < from.length && /\s/.test(from[i])) i++;
      if (from[i] === '{') return i;
      // Expression-body arrow — no block brace on this declaration
      return -1;
    }
  }

  // function name(params) {  or  function name(params): Type {
  // (also const name = function(params) { … })
  const parenOpen = from.indexOf('(');
  if (parenOpen === -1) return -1;
  const parenClose = findMatching(from, parenOpen, '(', ')');
  if (parenClose === -1) return -1;
  let i = parenClose + 1;
  while (i < from.length && /\s/.test(from[i])) i++;
  // Optional return type: ): Type {
  if (from[i] === ':') {
    i++;
    while (i < from.length && /\s/.test(from[i])) i++;
    i = skipTypeToken(from, i);
    while (i < from.length && /\s/.test(from[i])) i++;
  }
  if (from[i] === '{') return i;
  return -1;
}

/**
 * Collect same-file helpers referenced by `code`, including transitive callees.
 * @returns {{ name: string, code: string }[]}
 */
/**
 * Helpers that are full React data islands (useWpQuery / useState / …) must not
 * be hoisted into the editor IIFE — they leave free vars like `terms` and raw
 * JSX early-returns. Nested tags already become placeholders via expandNested.
 */
function isUnsafeEditorHelper(code) {
  if (!code) return false;
  return (
    /\buse(State|Effect|Reducer|LayoutEffect|ImperativeHandle)\b/.test(code) ||
    /\bReact\.use(State|Effect|Reducer)\b/.test(code) ||
    /\buseWp(Query|Terms|SearchParams|Location|Search)\b/.test(code) ||
    /\buseIsEditorPreview\b/.test(code)
  );
}

export function extractSameFileHelpers(sourceCode, codeThatUsesThem, excludeNames = new Set()) {
  const result = [];
  const seen = new Set(excludeNames);
  let pending = [...findCalledHelperNames(codeThatUsesThem)];

  while (pending.length > 0) {
    const name = pending.shift();
    if (seen.has(name)) continue;
    seen.add(name);

    const raw = extractTopLevelHelper(sourceCode, name);
    if (!raw) continue;

    // Skip live-data / hook components (e.g. DestinationsGrid, FeaturedHotelsGrid)
    // even if their name appears in a placeholder string.
    if (isUnsafeEditorHelper(raw)) continue;

    const cleaned = stripTypeScriptSyntax(raw);
    result.push({ name, code: cleaned });

    // Transitive helpers used inside this helper
    for (const inner of findCalledHelperNames(cleaned)) {
      if (!seen.has(inner)) pending.push(inner);
    }
  }

  return result;
}

/** Brace-balanced scan for the `}` matching the `{` at openIdx (string/backtick-aware). */
function findMatchingBraceClose(str, openIdx) {
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

/**
 * `try { A } catch (e) { B }` / `try { A } catch { B }` → PHP's own
 * `try { A } catch (\Throwable $e) { B }`. PHP requires a catch variable
 * (JS's parameterless `catch {}` doesn't have one), so `$e` is added when
 * missing. Brace-balanced rather than a lazy regex so a nested `if { }`
 * inside either block doesn't get treated as the block's own closing brace.
 */
function translateTryCatch(code) {
  const tryRegex = /\btry\s*\{/g;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = tryRegex.exec(code)) !== null) {
    const tryBraceOpen = match.index + match[0].length - 1;
    const tryBraceClose = findMatchingBraceClose(code, tryBraceOpen);
    if (tryBraceClose === -1) continue;

    const afterTry = code.slice(tryBraceClose + 1);
    const catchMatch = afterTry.match(/^\s*catch\s*(?:\(\s*([A-Za-z_$][\w$]*)\s*\))?\s*\{/);
    if (!catchMatch) continue;

    const catchBraceOpenAbs = tryBraceClose + 1 + catchMatch[0].length - 1;
    const catchBraceClose = findMatchingBraceClose(code, catchBraceOpenAbs);
    if (catchBraceClose === -1) continue;

    const catchVar = catchMatch[1] || 'e';
    const tryBody = code.slice(tryBraceOpen + 1, tryBraceClose);
    const catchBody = code.slice(catchBraceOpenAbs + 1, catchBraceClose);

    result += code.slice(lastIndex, match.index);
    result += `try {${tryBody}} catch (\\Throwable $${catchVar}) {${catchBody}}`;
    lastIndex = catchBraceClose + 1;
    tryRegex.lastIndex = catchBraceClose + 1;
  }
  result += code.slice(lastIndex);
  return result;
}

/**
 * Best-effort convert a small pure JS helper to a PHP function.
 * Returns PHP source or null if conversion looks unsafe.
 */
export function jsHelperToPhpFunction(phpName, jsHelperCode) {
  try {
    let code = stripTypeScriptSyntax(jsHelperCode).trim();

    let params = [];
    let body = '';

    const fnMatch = code.match(/^(?:export\s+)?function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*;?$/);
    if (fnMatch) {
      params = splitParams(fnMatch[1]);
      body = fnMatch[2];
    } else {
      const arrowBlock = code.match(
        /^(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}\s*;?$/,
      );
      if (arrowBlock) {
        params = splitParams(arrowBlock[1]);
        body = arrowBlock[2];
      } else {
        const arrowExpr = code.match(
          /^(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*([\s\S]+?)\s*;?\s*$/,
        );
        if (arrowExpr) {
          params = splitParams(arrowExpr[1]);
          body = `return ${arrowExpr[2].replace(/;?\s*$/, '')};`;
        } else {
          return null;
        }
      }
    }

    // Reject helpers that clearly need a JS runtime / DOM / React event model.
    // (Emitting them as PHP causes fatals like "Value of type null is not callable".)
    if (
      /use[A-Z]|window\.|document\.|React\.|fetch\s*\(|await\s|import\s|require\s*\(/.test(body) ||
      /\.contains\b|addEventListener|removeEventListener|preventDefault|stopPropagation/.test(body) ||
      /\bset[A-Z][A-Za-z0-9_]*\s*\(/.test(body) || // setCategoryOpen(false)
      /\bcreateElement\b|wp\.blockEditor|wp\.element/.test(body)
    ) {
      return null;
    }

    // Reject helpers that return raw JSX (icon components, render-prop cells,
    // etc.) — these are presentational React components, not translatable
    // logic, and naive brace extraction would dump untranspiled JSX straight
    // into a PHP function body ("unexpected token '<'"). The rendering of any
    // JSX these return is handled elsewhere (icon registry, island placeholder);
    // a missing PHP function here just means the call site degrades to nothing.
    if (/<\/?[A-Za-z][\w.]*[\s/>]/.test(body)) {
      return null;
    }

    // .replace(/pattern/flags, 'str') → preg_replace(...) (optionally .trim()
    // chained → trim(preg_replace(...))). Reuses the same translation the JSX
    // expression pipeline uses, so a helper like getSocialHandle (which strips
    // a trailing slash via .replace before .split('/')) gets a real PHP twin
    // instead of being rejected outright.
    let preprocessedBody = translateReplaceTrim(body);

    // X.split('sep') → explode('sep', X) — single string-literal separator,
    // the only shape these helpers actually use.
    preprocessedBody = preprocessedBody.replace(
      /([A-Za-z_$][\w$.\[\]'"]*)\.split\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g,
      (full, subject, sep) => `explode(${sep}, ${subject})`,
    );

    // X.length → count((array)(X)), matching the same PHP 8-safe cast used
    // elsewhere in this pipeline (translateJsExpressionToPhp) so e.g.
    // `parts.length > 0 ? parts[parts.length - 1] : …` translates correctly.
    preprocessedBody = preprocessedBody.replace(
      /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*)\.length\b/g,
      'count((array)($1))',
    );

    // try { A } catch (e) { B } / try { A } catch { B } → PHP's own try/catch.
    // PHP requires a catch variable (JS's parameterless `catch {}` doesn't
    // have one), so one is added when missing. Brace-balanced (not a lazy
    // regex) so a nested `if { }` inside either block doesn't truncate early.
    preprocessedBody = translateTryCatch(preprocessedBody);

    // Reject helpers using JS String/Array/RegExp prototype methods this
    // function still can't safely rewrite — this remains a regex-based
    // translator, not a real parser. Falling back to no PHP function is safe:
    // the call site is neutralized to an empty string by neutralizeUnknownJsCalls.
    //
    // Note: `try {`/`catch (\Throwable $e) {` are NOT rejected here — that's
    // exactly what a successfully-translated try/catch now looks like (PHP's
    // own syntax), so checking for that text would reject every helper this
    // function just correctly translated. Only a bare `catch {` proves
    // translateTryCatch didn't run/match — PHP has no parameterless catch.
    if (
      /\.(slice|trim|includes|indexOf|lastIndexOf|join|push|pop|shift|unshift|concat|toLowerCase|toUpperCase|charAt|charCodeAt|substring|substr|padStart|padEnd|repeat|startsWith|endsWith|match|matchAll|search|test|exec|toFixed|filter|reduce|some|every|find|findIndex|flat|flatMap|sort|reverse)\s*\(/.test(preprocessedBody) ||
      /\.length\b/.test(preprocessedBody) ||
      /\bcatch\s*\{/.test(preprocessedBody)
    ) {
      return null;
    }

    let phpBody = preprocessedBody;

    // typeof x === 'string' etc. before $ prefixing
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*===\s*(['"])string\2/g, 'is_string($1)');
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*!==\s*(['"])string\2/g, '!is_string($1)');
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*===\s*(['"])number\2/g, 'is_numeric($1)');
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*===\s*(['"])object\2/g, '(is_array($1) || is_object($1))');
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*===\s*(['"])undefined\2/g, '!isset($1)');
    phpBody = phpBody.replace(/typeof\s+([A-Za-z_$][\w$]*)\s*!==\s*(['"])undefined\2/g, 'isset($1)');

    // !x → empty($x) before $ prefixing
    phpBody = phpBody.replace(/!\s*([A-Za-z_$][\w$]*)\b/g, (_, n) => `empty($${n})`);

    // 'key' in obj → safe array/object key-existence check (JS `in` has no PHP
    // equivalent). Must run before $ prefixing so we can emit $obj directly.
    phpBody = phpBody.replace(
      /(['"])([A-Za-z_$][\w$]*)\1\s+in\s+([A-Za-z_$][\w$]*)\b/g,
      (full, q, key, obj) =>
        `(is_array($${obj}) ? array_key_exists('${key}', $${obj}) : (is_object($${obj}) ? property_exists($${obj}, '${key}') : false))`,
    );

    // String(x) → strval(x) — JS's String() cast has no direct PHP equivalent.
    phpBody = phpBody.replace(/\bString\(/g, 'strval(');

    // Collapse a redundant single-identifier paren left behind by TS cast
    // stripping (e.g. `(val as { url?: string }).url` → `(val).url`) so the
    // property-access rule below still recognizes it as `val.url`.
    phpBody = phpBody.replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)(?=\s*\.)/g, '$1');

    // Prefix identifiers with $ (params + locals), skip keywords
    const localNames = new Set(params);
    const declRx = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
    let dm;
    while ((dm = declRx.exec(phpBody)) !== null) localNames.add(dm[1]);

    phpBody = phpBody.replace(/\b(?:const|let|var)\s+/g, '');

    // Property access: x.y → array/object safe (before bare $ prefix)
    phpBody = phpBody.replace(
      /\b([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)/g,
      (full, obj, prop) => {
        if (JS_KEYWORDS.has(obj) || obj.startsWith('$')) return full;
        return `(is_array($${obj}) ? ($${obj}['${prop}'] ?? null) : (is_object($${obj}) ? ($${obj}->${prop} ?? null) : null))`;
      },
    );

    // Bare params / locals → $name (skip keywords and already-prefixed)
    for (const p of localNames) {
      phpBody = phpBody.replace(new RegExp(`(?<![\\w$])${p}(?![\\w$])`, 'g'), `$${p}`);
    }

    // Fix double $$
    phpBody = phpBody.replace(/\$\$+/g, '$');

    // empty($x) may have been written empty($$1) incorrectly — normalize empty($var)
    phpBody = phpBody.replace(/empty\(\$\$+/g, 'empty($');

    phpBody = phpBody
      .replace(/\bundefined\b/g, 'null')
      .replace(/===/g, '==')
      .replace(/!==/g, '!=')
      .replace(/\|\|/g, '?:');

    // Reject if params still look like TS leftovers
    if (params.some((p) => /[^A-Za-z0-9_$]/.test(p))) {
      return null;
    }

    const phpParams = params.map((p) => `$${p}`).join(', ');
    return `if (!function_exists('${phpName}')) {\n  function ${phpName}(${phpParams}) {\n${indentPhp(phpBody, 4)}\n  }\n}\n`;
  } catch {
    return null;
  }
}

/**
 * Best-effort convert a small JSX-returning helper (the common local
 * render-prop pattern — `const cell = (a, b) => (<div>…</div>)`, including
 * the dual-host ternary-chain shape —
 * `(v, k, cls, tag) => setAttributes ? <WpEditable/> : tag === 'p' ? <p/> : …`
 * — into an inlinable JSX template: its params plus the raw body text.
 *
 * jsHelperToPhpFunction rejects these (JSX can't become a PHP function body),
 * but leaving the call site untouched means the literal JS text
 * (`{cell(a, b)}`) ends up in render.php verbatim — the caller is expected to
 * inline this template at each call site instead, after which the body's
 * ternaries/JSX flow through the same transpileTernaries/transpileConditionals
 * pipeline that already handles this exact pattern when written inline.
 *
 * Only the simple arrow-expression-body shape is handled (no intermediate
 * statements before the returned expression), and only when the body
 * contains JSX and none of the JS-runtime-only constructs the regex-based
 * transpiler can't safely rewrite (mirrors jsHelperToPhpFunction's own
 * reject list). Anything else returns null so the caller's neutralization
 * safety net can take over instead of leaking broken text into the page.
 */
export function jsxHelperToTemplate(jsHelperCode) {
  try {
    const code = stripTypeScriptSyntax(jsHelperCode).trim();
    const arrowExpr = code.match(
      /^(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*([\s\S]+?)\s*;?\s*$/,
    );
    if (!arrowExpr) return null;

    const params = splitParams(arrowExpr[1]);
    if (params.some((p) => /[^A-Za-z0-9_$]/.test(p))) return null;

    let jsxBody = arrowExpr[2].trim();
    if (jsxBody.startsWith('(') && jsxBody.endsWith(')') && isBalancedParenWrap(jsxBody)) {
      jsxBody = jsxBody.slice(1, -1).trim();
    }

    // Must actually contain JSX somewhere (a bare JS value/ternary with no
    // JSX belongs to jsHelperToPhpFunction's real-PHP-function path instead;
    // reaching here for JSX-less code means it was rejected for a different,
    // unsafe reason and shouldn't be inlined as markup either).
    if (!/<[A-Za-z/]|<>/.test(jsxBody)) return null;

    if (
      /use[A-Z]|window\.|document\.|React\.|fetch\s*\(|await\s|import\s|require\s*\(/.test(jsxBody) ||
      /\.contains\b|addEventListener|removeEventListener/.test(jsxBody) ||
      // setAttributes(...) is exempt: it's the WordPress dual-host prop, not a
      // React state setter, and `setAttributes ? A : B` (its universal usage
      // shape here) already resolves safely to B in render.php — translateJsExpressionToPhp
      // turns the unknown bare identifier into `($setAttributes ?? null)`,
      // which is falsy since that PHP variable is never defined server-side.
      /\bset(?!Attributes\b)[A-Z][A-Za-z0-9_]*\s*\(/.test(jsxBody) ||
      /\btry\s*\{|\bcatch\s*[({]/.test(jsxBody) ||
      /\.(replace|split|slice|trim|includes|indexOf|lastIndexOf|join|push|pop|shift|unshift|concat|toLowerCase|toUpperCase|charAt|charCodeAt|substring|substr|padStart|padEnd|repeat|startsWith|endsWith|match|matchAll|search|exec|toFixed|filter|reduce|some|every|find|findIndex|flat|flatMap|sort|reverse)\s*\(/.test(jsxBody) ||
      /\.length\b/.test(jsxBody)
    ) {
      return null;
    }

    return { params, jsxBody };
  } catch {
    return null;
  }
}

function isBalancedParenWrap(s) {
  if (s[0] !== '(' || s[s.length - 1] !== ')') return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i === s.length - 1;
    }
  }
  return false;
}

function splitParams(paramStr) {
  if (!paramStr || !paramStr.trim()) return [];
  // After TS strip, params are plain names or defaults
  return paramStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const name = p.replace(/=.*$/, '').trim();
      // destructuring not supported
      if (name.startsWith('{') || name.startsWith('[')) return null;
      return name.replace(/^\.\.\./, '');
    })
    .filter(Boolean);
}

function indentPhp(body, spaces) {
  const pad = ' '.repeat(spaces);
  return body
    .split('\n')
    .map((line) => (line.trim() ? pad + line.trimEnd() : ''))
    .join('\n');
}

/**
 * Remove a top-level `const name = …` / `function name…` declaration from a
 * preamble string (balanced scan). Used so hoisted helpers aren't also left
 * inline — avoids "Identifier has already been declared" in the editor IIFE.
 */
export function stripTopLevelHelperDecl(code, name) {
  if (!code || !name) return code;
  const patterns = [
    new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=`),
    new RegExp(`(?:export\\s+)?function\\s+${name}\\b`),
  ];
  for (const re of patterns) {
    const m = code.match(re);
    if (!m || m.index === undefined) continue;
    const start = m.index;
    let i = start + m[0].length;
    // Skip to end of statement: for const, find expression end at top-level `;`
    // or for function, find matching body `}`
    if (m[0].includes('function')) {
      while (i < code.length && code[i] !== '{') i++;
      if (code[i] === '{') {
        let depth = 0;
        for (; i < code.length; i++) {
          if (code[i] === '{') depth++;
          else if (code[i] === '}') {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
        }
      }
    } else {
      // const name = <expr> ;
      let depthParen = 0;
      let depthBrace = 0;
      let depthBracket = 0;
      let inStr = null;
      let escape = false;
      for (; i < code.length; i++) {
        const c = code[i];
        if (inStr) {
          if (escape) escape = false;
          else if (c === '\\') escape = true;
          else if (c === inStr) inStr = null;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') {
          inStr = c;
          continue;
        }
        if (c === '(') depthParen++;
        else if (c === ')') depthParen--;
        else if (c === '{') depthBrace++;
        else if (c === '}') depthBrace--;
        else if (c === '[') depthBracket++;
        else if (c === ']') depthBracket--;
        else if (
          c === ';' &&
          depthParen === 0 &&
          depthBrace === 0 &&
          depthBracket === 0
        ) {
          i++;
          break;
        }
      }
    }
    while (i < code.length && /\s/.test(code[i])) i++;
    return code.slice(0, start) + code.slice(i);
  }
  return code;
}

/**
 * Build a unique PHP function name for a block helper.
 */
export function phpHelperName(blockSlug, helperName) {
  const safeSlug = String(blockSlug).replace(/[^a-zA-Z0-9_]/g, '_');
  const safeHelper = String(helperName).replace(/[^a-zA-Z0-9_]/g, '_');
  return `forgewp_blk_${safeSlug}_${safeHelper}`;
}

/**
 * Rewrite bare attribute identifiers to `attributes.key` for the Gutenberg
 * customEditJsx IIFE — without breaking declarations.
 *
 * Unsafe (old):  `const title = …` → `const attributes.title = …`
 *   → SyntaxError: missing initializer in const declaration
 *
 * Safe: skip binding names after const/let/var; skip object keys (`title:`);
 * skip property access already under `attributes.` / `props.`.
 *
 * Style-agnostic: works with any local aliasing pattern the developer chooses.
 *
 * @param {string} code
 * @param {string[]} attrKeys
 * @returns {string}
 */
/**
 * True when `offset` sits inside a string / template literal in `code`.
 * Prevents rewriting `'authority'` → `'attributes.authority'`.
 */
function isInsideStringLiteral(code, offset) {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = 0; i < offset && i < code.length; i++) {
    const c = code[i];
    if (inSingle) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inBacktick = false;
      // template ${…} re-enters code mode for the expression
      else if (c === '$' && code[i + 1] === '{') {
        i += 2;
        let d = 1;
        while (i < offset && i < code.length && d > 0) {
          if (code[i] === '{') d++;
          else if (code[i] === '}') d--;
          i++;
        }
        i--; // for-loop will ++
      }
      continue;
    }
    if (c === "'") inSingle = true;
    else if (c === '"') inDouble = true;
    else if (c === '`') inBacktick = true;
  }
  return inSingle || inDouble || inBacktick;
}

export function rewriteAttrRefsSafely(code, attrKeys) {
  if (!code || !attrKeys || attrKeys.length === 0) return code;

  let out = code;
  for (const key of attrKeys) {
    if (!key || !/^[A-Za-z_$][\w$]*$/.test(key)) continue;

    // 1. Shorthand object properties: { listicleId } -> { listicleId: attributes.listicleId }
    const shorthandRegex = new RegExp(`(?<=[{,]\\s*)${key}(?=\\s*[,}])`, 'g');
    out = out.replace(shorthandRegex, (match, offset, full) => {
      if (isInsideStringLiteral(full, offset)) return match;
      return `${key}: attributes.${key}`;
    });

    // 2. Spreads: ...team → ...attributes.team (not inside strings)
    out = out.replace(new RegExp(`\\.\\.\\.${key}\\b`, 'g'), (match, offset) => {
      if (isInsideStringLiteral(out, offset)) return match;
      return `...attributes.${key}`;
    });

    // 3. Normal references
    out = out.replace(
      new RegExp(`(?<![.\\w$])${key}(?![\\w$])(?!\\s*:)`, 'g'),
      (match, offset, full) => {
        if (isInsideStringLiteral(full, offset)) return match;

        // Look behind (skip whitespace) for declaration keywords
        let i = offset - 1;
        while (i >= 0 && /\s/.test(full[i])) i--;
        // End of previous token
        let end = i;
        while (i >= 0 && /[A-Za-z0-9_$]/.test(full[i])) i--;
        const prevWord = full.slice(i + 1, end + 1);
        if (prevWord === 'const' || prevWord === 'let' || prevWord === 'var') {
          return match; // binding name — keep
        }
        // Already attributes.key / props.key (lookbehind for .)
        if (end >= 0 && full[end] === '.') {
          return match;
        }
        return `attributes.${key}`;
      },
    );
  }
  return out;
}
