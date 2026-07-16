import { findHtmlTagEnd, resolveIconToSvgHtml } from "./shared-utils.js";
import { markLegacyFallback, tryParseSource } from "./ast-parser.js";
import { rewriteAttrRefsSafely } from "./source-sanitize.js";

const _iconResolveCache = new Map();

export function parseAttributes(attrStr) {
  const attrs = {};
  let i = 0;
  while (i < attrStr.length) {
    while (i < attrStr.length && /\s/.test(attrStr[i])) {
      i++;
    }
    if (i >= attrStr.length) break;
    
    const keyMatch = attrStr.substring(i).match(/^([a-zA-Z0-9_-]+)/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const key = keyMatch[1];
    i += key.length;
    
    while (i < attrStr.length && /\s/.test(attrStr[i])) {
      i++;
    }
    if (i < attrStr.length && attrStr[i] === '=') {
      i++; 
      while (i < attrStr.length && /\s/.test(attrStr[i])) {
        i++;
      }
      if (i >= attrStr.length) {
        attrs[key] = true;
        break;
      }
      
      const char = attrStr[i];
      if (char === '"' || char === "'") {
        const quote = char;
        let val = '';
        i++; 
        while (i < attrStr.length && attrStr[i] !== quote) {
          if (attrStr[i] === '\\') {
            val += attrStr[i + 1] || '';
            i += 2;
          } else {
            val += attrStr[i];
            i++;
          }
        }
        if (i < attrStr.length) i++; 
        attrs[key] = val;
      } else if (char === '{') {
        let val = '';
        let braceCount = 0;
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let inBacktick = false;
        
        while (i < attrStr.length) {
          const c = attrStr[i];
          val += c;
          
          if (c === '"' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
          } else if (c === "'" && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
          } else if (c === '`' && !inDoubleQuote && !inSingleQuote) {
            inBacktick = !inBacktick;
          }
          
          if (!inDoubleQuote && !inSingleQuote && !inBacktick) {
            if (c === '{') {
              braceCount++;
            } else if (c === '}') {
              braceCount--;
              if (braceCount === 0) {
                i++; 
                break;
              }
            }
          }
          i++;
        }
        attrs[key] = val.trim();
      } else {
        let val = '';
        while (i < attrStr.length && !/\s/.test(attrStr[i]) && attrStr[i] !== '>') {
          val += attrStr[i];
          i++;
        }
        attrs[key] = val;
      }
    } else {
      attrs[key] = true;
    }
  }
  return attrs;
}

/**
 * Parse a JSX string into an AST for generateReactCreateElement to consume.
 *
 * AST-based: parses `jsx` with @babel/parser (see ast-parser.js) and, when it
 * parses cleanly as a single JSX expression, returns the real
 * JSXElement/JSXFragment node directly — retiring the hand-rolled tokenizer
 * (parseJsxToAstLegacy below) for every case it can, along with the whole
 * class of bugs it had (nested ternaries containing fragments, generic-vs-
 * comparison `<` ambiguity, etc. — real syntax the tokenizer can't represent
 * doesn't need representing once a real parser is doing the work).
 *
 * `jsx` is sometimes not standalone-parseable — e.g. multiple adjacent root
 * elements with no wrapping fragment, which the legacy tokenizer tolerated
 * (it isn't a real parser) but real JSX syntax forbids — so a parse failure
 * falls back to the legacy tokenizer.
 */
export function parseJsxToAst(jsx) {
  if (typeof jsx === 'string' && jsx.trim()) {
    const ast = tryParseSource(jsx);
    const body = ast && ast.program.body;
    if (body && body.length === 1 && body[0].type === 'ExpressionStatement') {
      const expr = body[0].expression;
      if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') {
        return { realAst: true, node: expr, source: jsx };
      }
    }
  }
  markLegacyFallback('editor-transpiler:parseJsxToAst');
  return parseJsxToAstLegacy(jsx);
}

function parseJsxToAstLegacy(jsx) {
  const tokens = [];
  let index = 0;
  
  while (index < jsx.length) {
    const char = jsx[index];
    
    if (char === '<') {
      let tagEnd = findHtmlTagEnd(jsx, index);
      if (tagEnd === -1) break;
      
      let tagStr = jsx.substring(index, tagEnd + 1);
      const isClosing = tagStr.startsWith('</');
      const isSelfClosing = tagStr.endsWith('/>');
      // Short fragments: <> … </>
      const isFragment = /^<>/.test(tagStr) || /^<\/>/.test(tagStr);
      
      const tagNameMatch = tagStr.match(/<\/?([a-zA-Z0-9_-]+)/);
      const tagName = isFragment ? 'Fragment' : (tagNameMatch ? tagNameMatch[1] : '');
      
      tokens.push({
        type: 'tag',
        name: tagName,
        raw: tagStr,
        isClosing,
        isSelfClosing: isSelfClosing || /^<\/>/.test(tagStr),
      });
      
      index = tagEnd + 1;
    } else {
      let nextTag = jsx.indexOf('<', index);
      let text = nextTag === -1 ? jsx.substring(index) : jsx.substring(index, nextTag);
      
      if (text.trim()) {
        tokens.push({
          type: 'text',
          value: text
        });
      }
      
      index = nextTag === -1 ? jsx.length : nextTag;
    }
  }
  
  const root = { type: 'root', children: [] };
  const stack = [root];
  
  for (const token of tokens) {
    if (token.type === 'tag') {
      if (token.isClosing) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        const node = {
          type: 'element',
          name: token.name,
          attributes: parseAttributes(token.raw.substring(token.name.length + 1, token.raw.length - (token.isSelfClosing ? 2 : 1))),
          children: []
        };
        
        stack[stack.length - 1].children.push(node);
        
        if (!token.isSelfClosing && token.name !== 'img' && token.name !== 'input' && token.name !== 'br' && token.name !== 'hr') {
          stack.push(node);
        }
      }
    } else {
      stack[stack.length - 1].children.push({
        type: 'text',
        value: token.value
      });
    }
  }
  
  return root;
}

export function resolveIconToCreateElement(componentName, packageName, themeRoot, classNameStr) {
  const cacheKey = `${packageName}::${componentName}::${classNameStr}`;
  if (_iconResolveCache.has(cacheKey)) return _iconResolveCache.get(cacheKey);

  const svgHtml = resolveIconToSvgHtml(componentName, packageName, themeRoot, classNameStr);
  if (!svgHtml) {
    _iconResolveCache.set(cacheKey, null);
    return null;
  }

  const result = svgHtmlToCreateElement(svgHtml, classNameStr);
  _iconResolveCache.set(cacheKey, result);
  return result;
}

export function svgHtmlToCreateElement(svgHtml, overrideClassName) {
  function parseTagAttrs(attrStr) {
    const obj = {};
    const rx = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
    let m;
    while ((m = rx.exec(attrStr)) !== null) {
      obj[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
    }
    return obj;
  }

  function attrsToPropStr(attrs, overrideClass) {
    const props = { ...attrs };
    if (overrideClass !== undefined) props.className = overrideClass;
    const renames = {
      'class': 'className', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray',
      'stroke-dashoffset': 'strokeDashoffset', 'fill-rule': 'fillRule',
      'clip-rule': 'clipRule', 'clip-path': 'clipPath', 'font-size': 'fontSize',
      'text-anchor': 'textAnchor', 'dominant-baseline': 'dominantBaseline',
    };
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      const key = renames[k] || k;
      out[key] = v;
    }
    return JSON.stringify(out);
  }

  function parseChildren(html) {
    const children = [];
    let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        const tagEnd = html.indexOf('>', i);
        if (tagEnd === -1) break;
        const rawTag = html.slice(i + 1, tagEnd);
        const selfClosing = rawTag.endsWith('/');
        const cleanTag = selfClosing ? rawTag.slice(0, -1).trim() : rawTag.trim();
        const spaceIdx = cleanTag.search(/\s/);
        const tagName = spaceIdx === -1 ? cleanTag : cleanTag.slice(0, spaceIdx);
        if (tagName.startsWith('/')) { break; }
        const attrStr = spaceIdx === -1 ? '' : cleanTag.slice(spaceIdx + 1);
        const attrs = parseTagAttrs(attrStr);
        const propStr = attrsToPropStr(attrs);
        let content = '';
        if (!selfClosing && tagName !== 'br' && tagName !== 'hr' && tagName !== 'input') {
          const closeTag = `</${tagName}>`;
          const closeIdx = html.indexOf(closeTag, tagEnd + 1);
          if (closeIdx !== -1) {
            content = html.slice(tagEnd + 1, closeIdx);
            i = closeIdx + closeTag.length;
          } else {
            i = tagEnd + 1;
          }
        } else {
          i = tagEnd + 1;
        }
        const childCodes = content.trim() ? parseChildren(content) : [];
        const childrenArg = childCodes.length > 0 ? ', ' + childCodes.join(', ') : '';
        children.push(`createElement("${tagName}", ${propStr}${childrenArg})`);
      } else {
        const nextTag = html.indexOf('<', i);
        const text = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
        const trimmed = text.trim();
        if (trimmed) children.push(JSON.stringify(trimmed));
        i = nextTag === -1 ? html.length : nextTag;
      }
    }
    return children;
  }

  const svgOpenEnd = svgHtml.indexOf('>');
  if (svgOpenEnd === -1) return null;
  const svgTag = svgHtml.slice(1, svgOpenEnd);
  const svgTagEnd = svgTag.search(/\s/);
  const svgAttrs = svgTagEnd === -1 ? {} : parseTagAttrs(svgTag.slice(svgTagEnd + 1));
  const svgCloseIdx = svgHtml.lastIndexOf('</svg>');
  const svgInner = svgCloseIdx !== -1 ? svgHtml.slice(svgOpenEnd + 1, svgCloseIdx) : '';
  const childCodes = parseChildren(svgInner);
  const childrenArg = childCodes.length > 0 ? ', ' + childCodes.join(', ') : '';
  const propStr = attrsToPropStr(svgAttrs, overrideClassName);
  return `createElement("svg", ${propStr}${childrenArg})`;
}

/**
 * Scans forward from an opening bracket at str[startIndex] and returns the index of its
 * matching closing bracket, respecting nesting and string/template-literal boundaries.
 * Returns -1 if unbalanced.
 */
function scanBalancedBrackets(str, startIndex, openChar, closeChar) {
  let depth = 0;
  let i = startIndex;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  while (i < str.length) {
    const c = str[i];
    if (inSingle) {
      if (c === '\\') { i += 2; continue; }
      if (c === "'") inSingle = false;
    } else if (inDouble) {
      if (c === '\\') { i += 2; continue; }
      if (c === '"') inDouble = false;
    } else if (inBacktick) {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') inBacktick = false;
    } else {
      if (c === "'") inSingle = true;
      else if (c === '"') inDouble = true;
      else if (c === '`') inBacktick = true;
      else if (c === openChar) depth++;
      else if (c === closeChar) {
        depth--;
        if (depth === 0) return i;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Parse `.map(…)` callback params after the array expression.
 * Supports:
 *   (item) => (
 *   (item, index) => (
 *   item => (
 *   ({ a, b }) => (
 *   ({ a: A, b }) => (
 *   ({ a, b }, index) => (
 *
 * @returns {{ paramName: string, indexName?: string } | null}
 */
function matchMapCallbackParams(rest) {
  const m = rest.match(/^\s*\.map\(\s*/);
  if (!m) return null;
  let i = m[0].length;
  while (i < rest.length && /\s/.test(rest[i])) i++;

  // Bare single param: item => (
  if (/^[a-zA-Z_$]/.test(rest[i]) && rest[i] !== '(') {
    const id = rest.slice(i).match(/^([a-zA-Z0-9_$]+)\s*=>\s*\(\s*$/);
    if (!id) return null;
    return { paramName: id[1] };
  }

  if (rest[i] !== '(') return null;
  // Param list: ( … ) => (
  const closeParen = scanBalancedBrackets(rest, i, '(', ')');
  if (closeParen === -1) return null;
  const inside = rest.slice(i + 1, closeParen).trim();
  const after = rest.slice(closeParen + 1);
  if (!/^\s*=>\s*\(\s*$/.test(after)) return null;

  // Object destructure: { a, b: B }  or  { a, b }, index
  if (inside.startsWith('{')) {
    const closeBrace = scanBalancedBrackets(inside, 0, '{', '}');
    if (closeBrace === -1) return null;
    const destructure = inside.slice(0, closeBrace + 1);
    const tail = inside.slice(closeBrace + 1).trim();
    let indexName;
    if (tail.startsWith(',')) {
      const idx = tail.slice(1).trim().match(/^([a-zA-Z0-9_$]+)\s*$/);
      if (!idx) return null;
      indexName = idx[1];
    } else if (tail) {
      return null;
    }
    return { paramName: destructure, indexName };
  }

  // Simple: item  or  item, index
  const simple = inside.match(
    /^([a-zA-Z0-9_$]+)\s*(?:,\s*([a-zA-Z0-9_$]+)\s*)?$/,
  );
  if (!simple) return null;
  return { paramName: simple[1], indexName: simple[2] };
}

/**
 * Matches a `{ <arrayExpr>.map((param) => (` loop header text node, where <arrayExpr>
 * is a bare dotted identifier chain (`items`, `foo.bar`), an arbitrary parenthesized
 * expression (`(cond ? a : b)`, `(x || []).filter(y)`), or an array literal (`[1, 2, 3]`).
 * The non-identifier forms let components inline a ternary/fallback/literal list directly
 * into the `.map()` target — e.g. `{(categoryTerms.length > 0 ? A : B).map((tag) => (...))}`
 * or `{[1, 2, 3].map((i) => (...))}` — without needing to be hoisted into a separate local
 * variable just to satisfy this parser.
 *
 * Also supports object-destructure params: `.map(({ icon: Icon, label }) => (`.
 *
 * @returns {{ arrayExpr: string, paramName: string, indexName?: string } | null}
 */
function matchMapLoopHeader(cleanVal) {
  if (!cleanVal.startsWith('{')) return null;
  const body = cleanVal.slice(1).replace(/^\s+/, '');

  // Parenthesized expression or array literal target — matched via a balanced-bracket
  // scan since the expression itself may contain arbitrary nesting/strings.
  if (body.startsWith('(') || body.startsWith('[')) {
    const openChar = body[0];
    const closeChar = openChar === '(' ? ')' : ']';
    const closeIdx = scanBalancedBrackets(body, 0, openChar, closeChar);
    if (closeIdx === -1) return null;
    const arrayExpr = body.slice(0, closeIdx + 1);
    const rest = body.slice(closeIdx + 1);
    const cb = matchMapCallbackParams(rest);
    if (!cb) return null;
    return { arrayExpr, paramName: cb.paramName, indexName: cb.indexName };
  }

  // Bare identifier chain target: {items.map((x) => ( or {foo.bar.map(({a}) => (
  const identPrefix = cleanVal.match(
    /^\{\s*([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\s*(?=\.map\s*\()/,
  );
  if (!identPrefix) return null;
  const arrayExpr = identPrefix[1];
  const rest = cleanVal.slice(identPrefix[0].length);
  const cb = matchMapCallbackParams(rest);
  if (!cb) return null;
  return { arrayExpr, paramName: cb.paramName, indexName: cb.indexName };
}

function transpileCurlyExpressions(val) {
  const segments = [];
  let i = 0;
  while (i < val.length) {
    if (val[i] === '{') {
      let start = i;
      let depth = 0;
      const modes = [];
      let curMode = 'code';
      let j = start;
      
      while (j < val.length) {
        const c = val[j];
        const next = val[j+1];
        
        if (curMode === 'code') {
          if (c === '"') curMode = 'double';
          else if (c === "'") curMode = 'single';
          else if (c === '`') curMode = 'backtick';
          else if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (modes.length > 0) {
              curMode = modes.pop();
            } else if (depth === 0) {
              j++;
              break;
            }
          }
        } else if (curMode === 'double') {
          if (c === '"' && val[j-1] !== '\\') curMode = 'code';
        } else if (curMode === 'single') {
          if (c === "'" && val[j-1] !== '\\') curMode = 'code';
        } else if (curMode === 'backtick') {
          if (c === '`' && val[j-1] !== '\\') curMode = 'code';
          else if (c === '$' && next === '{') {
            modes.push('backtick');
            curMode = 'code';
            depth++;
            j++;
          }
        }
        j++;
      }
      
      segments.push({
        type: 'expression',
        value: val.substring(start + 1, j - 1).trim()
      });
      i = j;
    } else {
      let start = i;
      while (i < val.length && val[i] !== '{') {
        i++;
      }
      segments.push({
        type: 'text',
        value: val.substring(start, i)
      });
    }
  }

  if (segments.length === 1 && segments[0].type === 'expression') {
    return segments[0].value;
  }

  // Adjacent JSX expressions only (optional whitespace between), e.g.
  //   {cell(a)}{cell(b)}{cell(c)}
  // Must NOT become a template string — React elements coerce to "[object Object]".
  // Emit an array; React accepts arrays as createElement children.
  const nonWsText = segments.filter(
    (s) => s.type === 'text' && s.value.replace(/\s+/g, '').length > 0,
  );
  const exprs = segments.filter((s) => s.type === 'expression');
  if (nonWsText.length === 0 && exprs.length > 0) {
    if (exprs.length === 1) return exprs[0].value;
    return `[${exprs.map((e) => e.value).join(', ')}]`;
  }

  const literalParts = [];
  for (const seg of segments) {
    if (seg.type === 'expression') {
      literalParts.push(`\${${seg.value}}`);
    } else {
      literalParts.push(seg.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$'));
    }
  }
  return `\`${literalParts.join('')}\``;
}

function getJsxElementName(nameNode) {
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${getJsxElementName(nameNode.object)}.${nameNode.property.name}`;
  }
  if (nameNode.type === 'JSXNamespacedName') {
    return `${nameNode.namespace.name}:${nameNode.name.name}`;
  }
  return '';
}

/** Legacy-compatible `{name: value}` map from real JSXAttribute nodes — value
 * is `true` (boolean shorthand), a string literal's value, or the `{...}`
 * (braces included) source text of an expression attribute — matching what
 * parseAttributes() produced, so the WpIcon/WpEditable/prop-building logic
 * below (ported from generateReactCreateElement's legacy 'element' branch)
 * needs no changes to consume it. */
function readRealJsxAttributes(openingElement, code) {
  const attributes = {};
  for (const attr of openingElement.attributes) {
    if (attr.type !== 'JSXAttribute') continue; // spreads: legacy never modeled these either
    const name = getJsxElementName(attr.name) || (attr.name.type === 'JSXIdentifier' ? attr.name.name : '');
    if (!attr.value) {
      attributes[name] = true;
    } else if (attr.value.type === 'StringLiteral') {
      attributes[name] = attr.value.value;
    } else if (attr.value.type === 'JSXExpressionContainer') {
      attributes[name] = code.slice(attr.value.start, attr.value.end);
    }
  }
  return attributes;
}

/**
 * Rewrite bare block-attribute identifiers to `attributes.X` in a verbatim
 * source slice (a ternary/`&&` condition, a `.map()` array target, …) —
 * mirrors the narrower ad hoc regex the legacy children-loop applied to
 * ternary/`&&` conditions specifically, generalized via the same safe
 * rewriter index.js already uses for attribute-value expressions, and
 * applied uniformly to every non-JSX expression this emitter passes through
 * verbatim (also covers cases legacy's condition-only regex didn't reach,
 * like a `.filter()` predicate).
 */
function rewriteBareAttrRefs(text, blockSettings) {
  const attrKeys = Object.keys((blockSettings && blockSettings.attributes) || {});
  if (attrKeys.length === 0) return text;
  return rewriteAttrRefsSafely(text, attrKeys);
}

/**
 * Emit a plain JS expression (a ternary condition, `.map()` callback body,
 * `&&` right-hand side, arbitrary helper call, …) that may contain nested
 * JSX anywhere inside it. Splices each outermost JSX subtree's byte range
 * with its createElement(...) translation and leaves every other character —
 * the ternary/`&&`/`.map()` shell itself — verbatim from the original
 * source, then rewrites bare attribute references throughout. This is the
 * generalized replacement for the old regex-matched ternary/`&&`/loop-header
 * patterns: it works for any JS expression shape a real parser can produce,
 * not just the handful the old patterns anticipated.
 */
/**
 * Emit a plain JS expression (a ternary, `&&`, `.map()` call, arbitrary
 * helper call, …) that may contain nested JSX anywhere inside it.
 *
 * Recursive emitters keyed on node.type for the shapes that need bare
 * attr-key rewriting — ConditionalExpression and LogicalExpression rewrite
 * only their own condition (`test/left`), exactly where legacy's phpCond
 * regex applied it; a bare identifier BRANCH result (e.g. a local `const
 * badge = badgeProp ?? badgeMeta` dual-host variable that happens to share
 * its name with a block attribute key) must NOT be rewritten — legacy never
 * touched branch content, only conditions, and conflating the two would
 * silently replace an in-scope local variable read with the wrong value.
 * CallExpression rewrites a bare attr-key `.map()`/`.filter()` array target
 * the same way legacy's dedicated loop-header handling did. Everything else
 * falls through to a generic "splice nested JSX, leave the rest verbatim"
 * pass with no rewriting — the safe default for shapes with no known
 * condition-like part (a plain identifier, a helper call, …).
 */
function emitExpressionWithNestedJsx(exprNode, code, blockSettings) {
  if (exprNode.type === 'JSXElement' || exprNode.type === 'JSXFragment') {
    return generateFromRealJsxNode(exprNode, code, blockSettings);
  }

  if (exprNode.type === 'ConditionalExpression') {
    const cond = rewriteBareAttrRefs(code.slice(exprNode.test.start, exprNode.test.end), blockSettings);
    const trueCode = emitExpressionWithNestedJsx(exprNode.consequent, code, blockSettings);
    const falseCode = emitExpressionWithNestedJsx(exprNode.alternate, code, blockSettings);
    return `${cond} ? (${trueCode}) : (${falseCode})`;
  }

  if (exprNode.type === 'LogicalExpression' && exprNode.operator === '&&') {
    const cond = rewriteBareAttrRefs(code.slice(exprNode.left.start, exprNode.left.end), blockSettings);
    const rightCode = emitExpressionWithNestedJsx(exprNode.right, code, blockSettings);
    return `${cond} && (${rightCode})`;
  }

  const spans = [];
  collectOutermostJsx(exprNode, spans, code, blockSettings);

  if (exprNode.type === 'CallExpression' && exprNode.callee.type === 'MemberExpression') {
    const obj = exprNode.callee.object;
    const objText = code.slice(obj.start, obj.end);
    const rewrittenObj = rewriteBareAttrRefs(objText, blockSettings);
    if (rewrittenObj !== objText) {
      spans.push({ start: obj.start, end: obj.end, replacement: rewrittenObj });
    }
  }

  if (spans.length === 0) {
    return code.slice(exprNode.start, exprNode.end);
  }

  // Splice each span's replacement into the verbatim source, no further
  // rewriting of the surrounding text (see function doc above).
  spans.sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = exprNode.start;
  for (const span of spans) {
    out += code.slice(cursor, span.start);
    out += span.replacement;
    cursor = span.end;
  }
  out += code.slice(cursor, exprNode.end);
  return out;
}

const AST_NODE_METADATA_KEYS = new Set([
  'loc', 'start', 'end', 'range', 'extra', 'leadingComments',
  'trailingComments', 'innerComments', 'comments',
]);

/** Find JSXElement/JSXFragment descendants without descending into ones already found. */
function collectOutermostJsx(node, out, code, blockSettings) {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    out.push({
      start: node.start,
      end: node.end,
      replacement: generateFromRealJsxNode(node, code, blockSettings),
    });
    return;
  }
  for (const key of Object.keys(node)) {
    if (AST_NODE_METADATA_KEYS.has(key)) continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item.type === 'string') collectOutermostJsx(item, out, code, blockSettings);
      }
    } else if (val && typeof val.type === 'string') {
      collectOutermostJsx(val, out, code, blockSettings);
    }
  }
}

/** Real JSXElement/JSXFragment children → array of createElement(...) arg code strings. */
function emitRealJsxChildren(children, code, blockSettings) {
  const out = [];
  for (const child of children) {
    if (child.type === 'JSXText') {
      const val = child.value.trim();
      if (val) out.push(JSON.stringify(val));
      continue;
    }
    if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type === 'JSXEmptyExpression') continue; // {/* comment */}
      out.push(emitExpressionWithNestedJsx(child.expression, code, blockSettings));
      continue;
    }
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      out.push(generateFromRealJsxNode(child, code, blockSettings));
      continue;
    }
    if (child.type === 'JSXSpreadChild') {
      out.push(emitExpressionWithNestedJsx(child.expression, code, blockSettings));
    }
  }
  return out;
}

/**
 * Real-AST counterpart of generateReactCreateElement's legacy 'element'
 * branch. The WpIcon / WpEditable / generic-element-prop-building logic is
 * ported verbatim from that branch (same behavior, same edge-case handling)
 * — only attribute reading (readRealJsxAttributes) and child-list
 * computation (emitRealJsxChildren, above) differ, since those are exactly
 * the two things a real parser does more reliably than the legacy tokenizer.
 */
function generateFromRealJsxNode(node, code, blockSettings) {
  if (node.type === 'JSXFragment') {
    const childCodes = emitRealJsxChildren(node.children, code, blockSettings).filter(Boolean);
    if (childCodes.length === 0) return 'null';
    if (childCodes.length === 1) return childCodes[0];
    return `createElement(wp.element.Fragment, null, ${childCodes.join(', ')})`;
  }

  const tagName = getJsxElementName(node.openingElement.name);
  const attributes = readRealJsxAttributes(node.openingElement, code);

  // React short fragments <>…</>, and an explicit <Fragment> tag alike.
  if (tagName === 'Fragment') {
    const childCodes = emitRealJsxChildren(node.children, code, blockSettings).filter(Boolean);
    if (childCodes.length === 0) return 'null';
    if (childCodes.length === 1) return childCodes[0];
    return `createElement(wp.element.Fragment, null, ${childCodes.join(', ')})`;
  }

  // Dynamic icon from slug (repeater / attributes) — resolved at editor runtime via registry
  if (tagName === 'WpIcon') {
    let nameExpr = String(attributes.name || '""').trim();
    if (nameExpr.startsWith('{') && nameExpr.endsWith('}')) {
      nameExpr = nameExpr.slice(1, -1).trim();
    } else if (!(nameExpr.startsWith('"') || nameExpr.startsWith("'") || nameExpr.startsWith('`'))) {
      if (/^[a-zA-Z_$]/.test(nameExpr) && !nameExpr.includes('.')) {
        nameExpr = JSON.stringify(nameExpr);
      }
    }
    if (blockSettings && blockSettings.attributes && /^[a-zA-Z_$][\w$]*$/.test(nameExpr)) {
      if (Object.prototype.hasOwnProperty.call(blockSettings.attributes, nameExpr)) {
        nameExpr = `attributes.${nameExpr}`;
      }
    }
    let classExpr = '""';
    if (attributes.className) {
      const raw = String(attributes.className).trim();
      classExpr = raw.startsWith('{') && raw.endsWith('}')
        ? raw.slice(1, -1).trim()
        : JSON.stringify(raw);
    }
    const providerRaw = String(attributes.provider || 'lucide').replace(/['"]/g, '');
    return `forgeWpRenderIcon(${nameExpr}, ${classExpr}, ${JSON.stringify(providerRaw)})`;
  }

  if (tagName === 'WpEditable') {
    const tagRaw = String(attributes.tagName || 'div').trim();
    let tagExpr;
    let tagLiteral = 'div';
    if (tagRaw.startsWith('{') && tagRaw.endsWith('}')) {
      tagExpr = tagRaw.slice(1, -1).trim();
      const lit = tagExpr.match(/^['"]([\w-]+)['"]$/);
      if (lit) tagLiteral = lit[1];
      else tagLiteral = '';
    } else {
      tagLiteral = tagRaw.replace(/['"]/g, '') || 'div';
      tagExpr = JSON.stringify(tagLiteral);
    }

    let valStr = String(attributes.value || '').trim();
    if (valStr.startsWith('{') && valStr.endsWith('}')) {
      valStr = valStr.slice(1, -1).trim();
    }

    const isDotted = valStr.includes('.');
    let varName = 'value';
    const varMatch = valStr.match(/(?:attributes|props)?\.?([a-zA-Z0-9_-]+)$/);
    if (varMatch) {
      varName = varMatch[1];
    }
    const isAttrKey =
      blockSettings &&
      blockSettings.attributes &&
      Object.prototype.hasOwnProperty.call(blockSettings.attributes, varName);
    const valueExpr = isDotted
      ? valStr
      : isAttrKey
        ? `attributes.${varName}`
        : valStr;

    const className = attributes.className
      ? (attributes.className.startsWith('{')
          ? attributes.className.slice(1, -1)
          : JSON.stringify(attributes.className))
      : '""';

    const isLoopRowAccess = isDotted && !/^(?:attributes|props)\./.test(valStr);
    const attrConfig = (!isLoopRowAccess && blockSettings && blockSettings.attributes) ? blockSettings.attributes[varName] : null;

    const isSingleLine =
      (tagLiteral && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'].includes(tagLiteral)) ||
      (attrConfig && attrConfig.control === 'text') ||
      attributes.disableLineBreaks !== undefined;

    const singleLineProps = isSingleLine
      ? ',\n        disableLineBreaks: true,\n        allowedFormats: []'
      : '';

    const isMultiParagraph = attrConfig && attrConfig.control === 'richText' &&
      typeof attrConfig.default === 'string' && /<p[\s>]/i.test(attrConfig.default);
    const multilineProps = isMultiParagraph ? ",\n        multiline: 'p'" : '';

    let rawOnChange = String(attributes.onChange || '').trim();
    if (rawOnChange.startsWith('{') && rawOnChange.endsWith('}')) {
      rawOnChange = rawOnChange.slice(1, -1).trim();
    }
    rawOnChange = rawOnChange.replace(/\(\s*([a-zA-Z0-9_$]+)\s*:\s*[^),]+\)\s*=>/, '($1) =>');

    const standardSet =
      rawOnChange.match(
        /^\(\s*([a-zA-Z0-9_$]+)\s*\)\s*=>\s*setAttributes\s*\(\s*\{\s*([a-zA-Z0-9_$]+)\s*:\s*\1\s*\}\s*\)\s*$/,
      ) ||
      rawOnChange.match(
        /^\(\s*([a-zA-Z0-9_$]+)\s*\)\s*=>\s*setAttributes\s*&&\s*setAttributes\s*\(\s*\{\s*([a-zA-Z0-9_$]+)\s*:\s*\1\s*\}\s*\)\s*$/,
      );

    let onChangeExpr;
    if (standardSet) {
      const p = standardSet[1];
      const field = standardSet[2];
      onChangeExpr = `(${p}) => setAttributes({ ${field}: ${p} })`;
    } else if (
      rawOnChange &&
      !/setAttributes\s*\(\s*\{\s*attributes\./.test(rawOnChange) &&
      !/setAttributes\s*\(\s*\{\s*props\./.test(rawOnChange)
    ) {
      onChangeExpr = rawOnChange;
    } else {
      onChangeExpr = `function(val) { setAttributes({ ${varName}: val }); }`;
    }

    return `createElement(wp.blockEditor.RichText, {
        tagName: ${tagExpr},
        value: (function(){ var __v = (${valueExpr}); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: ${onChangeExpr},
        className: ${className}${singleLineProps}${multilineProps}
      })`;
  }

  const props = {};
  for (const [key, val] of Object.entries(attributes)) {
    const propKey = key === 'className' ? 'className' : key;
    if (val === true || val === '') {
      props[propKey] = 'true';
    } else if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
      // No bare-attr-ref rewriting here — matches legacy: attribute-value
      // expressions are rewritten upstream (index.js's own `={...}` pass)
      // before this ever runs; only child-position expressions (ternary/`&&`
      // conditions, .map() targets) get rewritten at this level, same as
      // legacy's own phpCond regex only applied there.
      props[propKey] = val.slice(1, -1).trim();
    } else {
      props[propKey] = JSON.stringify(val);
    }
  }

  const formatPropKey = (k) =>
    /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);

  const propsStr = Object.keys(props).length > 0
    ? `{ ${Object.entries(props).map(([k, v]) => `${formatPropKey(k)}: ${v}`).join(', ')} }`
    : 'null';

  const childCodesList = emitRealJsxChildren(node.children, code, blockSettings).filter(Boolean);
  const childrenStr = childCodesList.join(', ');

  const isPascalCase = /^[A-Z]/.test(tagName);
  if (isPascalCase && blockSettings && blockSettings.importMap && blockSettings.importMap[tagName] && blockSettings.themeRoot) {
    const packageName = blockSettings.importMap[tagName];
    const rawClassName = attributes.className || '';
    const classNameStr = rawClassName.startsWith('{') && rawClassName.endsWith('}')
      ? rawClassName.slice(1, -1).trim()
      : rawClassName;
    const resolved = resolveIconToCreateElement(tagName, packageName, blockSettings.themeRoot, classNameStr);
    if (resolved) return resolved;
  }

  const isHost = !isPascalCase || tagName.includes('-') || tagName === 'Fragment';
  const typeExpr = isHost ? JSON.stringify(tagName) : tagName;
  return `createElement(${typeExpr}, ${propsStr}${childrenStr ? `, ${childrenStr}` : ''})`;
}

export function generateReactCreateElement(node, blockSettings) {
  if (!node) return 'null';

  if (node.realAst) {
    return generateFromRealJsxNode(node.node, node.source, blockSettings);
  }

  if (node.type === 'root') {
    if (node.children.length === 1) {
      return generateReactCreateElement(node.children[0], blockSettings);
    }
    return `[${node.children.map(child => generateReactCreateElement(child, blockSettings)).join(', ')}]`;
  }
  
  if (node.type === 'text') {
    const val = node.value.trim();
    if (!val.includes('{') && !val.includes('}')) {
      return JSON.stringify(val);
    }
    return transpileCurlyExpressions(val);
  }
  
  if (node.type === 'element') {
    // React short fragments <>…</>
    if (node.name === 'Fragment') {
      const childCodes = (node.children || [])
        .map((c) => generateReactCreateElement(c, blockSettings))
        .filter(Boolean);
      if (childCodes.length === 0) return 'null';
      if (childCodes.length === 1) return childCodes[0];
      return `createElement(wp.element.Fragment, null, ${childCodes.join(', ')})`;
    }

    // Dynamic icon from slug (repeater / attributes) — resolved at editor runtime via registry
    if (node.name === 'WpIcon') {
      let nameExpr = String(node.attributes.name || '""').trim();
      if (nameExpr.startsWith('{') && nameExpr.endsWith('}')) {
        nameExpr = nameExpr.slice(1, -1).trim();
      } else if (!(nameExpr.startsWith('"') || nameExpr.startsWith("'") || nameExpr.startsWith('`'))) {
        // bare identifier or literal without braces (attribute parser may store bare)
        if (/^[a-zA-Z_$]/.test(nameExpr) && !nameExpr.includes('.')) {
          // string literal slug without quotes from name="award"
          nameExpr = JSON.stringify(nameExpr);
        }
      }
      // Prefer attributes.x for bare attr keys
      if (blockSettings && blockSettings.attributes && /^[a-zA-Z_$][\w$]*$/.test(nameExpr)) {
        if (Object.prototype.hasOwnProperty.call(blockSettings.attributes, nameExpr)) {
          nameExpr = `attributes.${nameExpr}`;
        }
      }
      let classExpr = '""';
      if (node.attributes.className) {
        const raw = String(node.attributes.className).trim();
        classExpr = raw.startsWith('{') && raw.endsWith('}')
          ? raw.slice(1, -1).trim()
          : JSON.stringify(raw);
      }
      const providerRaw = String(node.attributes.provider || 'lucide').replace(/['"]/g, '');
      return `forgeWpRenderIcon(${nameExpr}, ${classExpr}, ${JSON.stringify(providerRaw)})`;
    }

    if (node.name === 'WpEditable') {
      // tagName may be a static string (`"h2"`) or a dynamic expression (`{tagName}`)
      const tagRaw = String(node.attributes.tagName || 'div').trim();
      let tagExpr;
      let tagLiteral = 'div';
      if (tagRaw.startsWith('{') && tagRaw.endsWith('}')) {
        tagExpr = tagRaw.slice(1, -1).trim();
        // Only use for isSingleLine heuristics when the expression is a plain string literal
        const lit = tagExpr.match(/^['"]([\w-]+)['"]$/);
        if (lit) tagLiteral = lit[1];
        else tagLiteral = ''; // unknown dynamic tag
      } else {
        tagLiteral = tagRaw.replace(/['"]/g, '') || 'div';
        tagExpr = JSON.stringify(tagLiteral);
      }

      let valStr = String(node.attributes.value || '').trim();
      if (valStr.startsWith('{') && valStr.endsWith('}')) {
        valStr = valStr.slice(1, -1).trim();
      }

      // A dotted expression (e.g. `item.value` from a repeater .map() row, or an
      // explicit `attributes.heading`) already refers to a real in-scope JS value —
      // use it verbatim. Bare identifiers only get `attributes.` when they are real
      // block attribute keys — otherwise keep them (e.g. helper params `value`/`label`
      // in a local `cell()` factory, dual-host locals that were not rewritten).
      const isDotted = valStr.includes('.');
      let varName = 'value';
      const varMatch = valStr.match(/(?:attributes|props)?\.?([a-zA-Z0-9_-]+)$/);
      if (varMatch) {
        varName = varMatch[1];
      }
      const isAttrKey =
        blockSettings &&
        blockSettings.attributes &&
        Object.prototype.hasOwnProperty.call(blockSettings.attributes, varName);
      const valueExpr = isDotted
        ? valStr
        : isAttrKey
          ? `attributes.${varName}`
          : valStr;

      const className = node.attributes.className
        ? (node.attributes.className.startsWith('{')
            ? node.attributes.className.slice(1, -1)
            : JSON.stringify(node.attributes.className))
        : '""';

      // An earlier pass rewrites bare attribute-key identifiers (`content`) to
      // `attributes.content` before this code ever sees them, so most top-level
      // attribute references ARE dotted by the time we get here — only a genuinely
      // different dotted prefix (`item.value` from a repeater row) means "not a real
      // top-level attribute, skip the schema lookup".
      const isLoopRowAccess = isDotted && !/^(?:attributes|props)\./.test(valStr);
      const attrConfig = (!isLoopRowAccess && blockSettings && blockSettings.attributes) ? blockSettings.attributes[varName] : null;

      const isSingleLine =
        (tagLiteral && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'].includes(tagLiteral)) ||
        (attrConfig && attrConfig.control === 'text') ||
        node.attributes.disableLineBreaks !== undefined;

      const singleLineProps = isSingleLine
        ? ',\n        disableLineBreaks: true,\n        allowedFormats: []'
        : '';

      // richText fields commonly hold multi-paragraph HTML (<p>...</p><p>...</p>), which
      // WordPress's RichText otherwise flags as "unknown formatting" since <p> tags aren't
      // an inline format. `multiline: 'p'` is Gutenberg's own supported mode for this —
      // the same mechanism core blocks like Quote/Pullquote use.
      // Only genuinely multi-paragraph content (default value actually wrapped in <p>
      // tags) should get multiline: 'p' — RichText's multiline mode expects paragraph-
      // structured content and renders nothing for a plain unwrapped string, which is
      // what most richText fields (e.g. a hero subtitle) actually hold.
      const isMultiParagraph = attrConfig && attrConfig.control === 'richText' &&
        typeof attrConfig.default === 'string' && /<p[\s>]/i.test(attrConfig.default);
      const multilineProps = isMultiParagraph ? ",\n        multiline: 'p'" : '';

      // Honor the developer's actual onChange callback (needed for repeater rows,
      // which update a specific array index rather than a flat attribute) instead of
      // always synthesizing a flat setAttributes call. Strip any TS param type
      // annotation so the callback is valid as plain JS in the editor's execution context.
      let rawOnChange = String(node.attributes.onChange || '').trim();
      if (rawOnChange.startsWith('{') && rawOnChange.endsWith('}')) {
        rawOnChange = rawOnChange.slice(1, -1).trim();
      }
      rawOnChange = rawOnChange.replace(/\(\s*([a-zA-Z0-9_$]+)\s*:\s*[^),]+\)\s*=>/, '($1) =>');

      // Standard dual-host form: (val) => setAttributes({ field: val })
      // Re-emit cleanly so attr-rewrites never produce invalid {attributes.field}.
      const standardSet =
        rawOnChange.match(
          /^\(\s*([a-zA-Z0-9_$]+)\s*\)\s*=>\s*setAttributes\s*\(\s*\{\s*([a-zA-Z0-9_$]+)\s*:\s*\1\s*\}\s*\)\s*$/,
        ) ||
        rawOnChange.match(
          /^\(\s*([a-zA-Z0-9_$]+)\s*\)\s*=>\s*setAttributes\s*&&\s*setAttributes\s*\(\s*\{\s*([a-zA-Z0-9_$]+)\s*:\s*\1\s*\}\s*\)\s*$/,
        );

      let onChangeExpr;
      if (standardSet) {
        const p = standardSet[1];
        const field = standardSet[2];
        onChangeExpr = `(${p}) => setAttributes({ ${field}: ${p} })`;
      } else if (
        rawOnChange &&
        !/setAttributes\s*\(\s*\{\s*attributes\./.test(rawOnChange) &&
        !/setAttributes\s*\(\s*\{\s*props\./.test(rawOnChange)
      ) {
        onChangeExpr = rawOnChange;
      } else {
        onChangeExpr = `function(val) { setAttributes({ ${varName}: val }); }`;
      }

      // Parenthesize valueExpr: source may use `row.title ?? ''`, and bare
      // `row.title ?? '' || ''` is a SyntaxError (?? cannot mix with || without parens).
      // Coerce non-strings so RichText never receives objects ([object Object]).
      return `createElement(wp.blockEditor.RichText, {
        tagName: ${tagExpr},
        value: (function(){ var __v = (${valueExpr}); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: ${onChangeExpr},
        className: ${className}${singleLineProps}${multilineProps}
      })`;
    }
    
    const props = {};
    for (const [key, val] of Object.entries(node.attributes)) {
      const propKey = key === 'className' ? 'className' : key;
      if (val === true || val === '') {
        // Boolean JSX attr: aria-hidden / disabled
        props[propKey] = 'true';
      } else if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
        props[propKey] = val.slice(1, -1).trim();
      } else {
        props[propKey] = JSON.stringify(val);
      }
    }

    const formatPropKey = (k) =>
      /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    
    const propsStr = Object.keys(props).length > 0
      ? `{ ${Object.entries(props).map(([k, v]) => `${formatPropKey(k)}: ${v}`).join(', ')} }`
      : 'null';
      
    const processedChildCodes = [];
    let i = 0;
    while (i < node.children.length) {
      const child = node.children[i];
      
      // Skip empty text nodes, JSX comments, and block comments
      if (child.type === 'text') {
        const trimmed = child.value.trim();
        if (!trimmed || (trimmed.startsWith('{/*') && trimmed.endsWith('*/}')) || (trimmed.startsWith('/*') && trimmed.endsWith('*/'))) {
          i++;
          continue;
        }
      }

      let cleanVal = child.type === 'text' ? child.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';

      // Adjacent JSX expressions are often one text node:
      //   {editText(...)}{setAttributes ? (
      // Peel a trailing control-flow header so && / ternary / map can match.
      const peeledAnd = child.type === 'text' ? peelTrailingControlHeader(cleanVal, 'and') : null;
      if (peeledAnd) {
        if (peeledAnd.before) {
          const beforeCode = generateReactCreateElement(
            { type: 'text', value: peeledAnd.before },
            blockSettings,
          );
          if (beforeCode) processedChildCodes.push(beforeCode);
        }
        const jsCond = peeledAnd.cond;

        let j = i + 1;
        let condChildren = [];
        let foundEnd = false;
        while (j < node.children.length) {
          const nextChild = node.children[j];
          let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
          if (nextChild.type === 'text' && nextClean.startsWith(')}')) {
            const closingIndex = nextChild.value.indexOf(')}');
            const afterText = nextChild.value.substring(closingIndex + 2);
            if (afterText.trim()) {
              node.children.splice(j + 1, 0, {
                type: 'text',
                value: afterText
              });
            }
            nextChild.value = nextChild.value.substring(0, closingIndex + 2);
            foundEnd = true;
            break;
          }
          condChildren.push(nextChild);
          j++;
        }
        
        if (foundEnd) {
          let phpCond = jsCond;
          const attrKeys = Object.keys((blockSettings && blockSettings.attributes) || {});
          phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:) /g, (m, word) => {
            if (attrKeys.includes(word)) {
              return `attributes.${word}`;
            }
            return m;
          });
          // Also handle non-spaced words matching the regex key replacement:
          phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:)/g, (m, word) => {
            if (attrKeys.includes(word)) {
              return `attributes.${word}`;
            }
            return m;
          });
          
          const innerCodes = condChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
          const innerCode = innerCodes.length > 1 
            ? `createElement(wp.element.Fragment, null, ${innerCodes.join(', ')})`
            : innerCodes[0] || 'null';
            
          processedChildCodes.push(`${phpCond} && (${innerCode})`);
          i = j + 1;
          continue;
        }
      }

      // Parse split-and-map loop: {(tags || '').split(',').map(...).filter(...).map((tag) => ( ... ))}
      const splitMapRegex = /^\{\s*\((?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\|\|\s*(['"])\2\)\s*\.split\(\s*(['"])([^'"]+)\3\s*\)(?:\.map\(\s*[a-zA-Z0-9_-]+\s*=>\s*[a-zA-Z0-9_-]+\.trim\(\)\s*\))?(?:\.filter\(\s*[a-zA-Z0-9_-]+\s*\))?\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*\)\s*=>\s*\(\s*$/;
      if (child.type === 'text' && cleanVal.match(splitMapRegex)) {
        const loopMatch = cleanVal.match(splitMapRegex);
        const arrayVar = loopMatch[1];
        const separator = loopMatch[4];
        const varName = loopMatch[5];
        
        let j = i + 1;
        let loopChildren = [];
        let foundEnd = false;
        while (j < node.children.length) {
          const nextChild = node.children[j];
          let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
          if (nextChild.type === 'text' && nextClean.includes(')}')) {
            const closingIndex = nextChild.value.indexOf(')}');
            const afterText = nextChild.value.substring(closingIndex + 2);
            if (afterText.trim()) {
              node.children.splice(j + 1, 0, {
                type: 'text',
                value: afterText
              });
            }
            nextChild.value = nextChild.value.substring(0, closingIndex + 2);
            foundEnd = true;
            break;
          }
          loopChildren.push(nextChild);
          j++;
        }
        
        if (foundEnd) {
          const innerCodes = loopChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
          const innerCode = innerCodes.length > 1 
            ? `createElement(wp.element.Fragment, null, ${innerCodes.join(', ')})`
            : innerCodes[0] || 'null';
            
          processedChildCodes.push(`(attributes.${arrayVar} || '').split('${separator}').map(tag => tag.trim()).filter(Boolean).map((${varName}) => (${innerCode}))`);
          i = j + 1;
          continue;
        }
      }

      // Parse general array map loop: {arrayName.map((paramName) => ( ... ))} or
      // {(arbitraryExpr).map((paramName) => ( ... ))} — e.g. a ternary/fallback inlined
      // directly into the map target instead of hoisted to a local variable.
      const mapLoopHeader = child.type === 'text' ? matchMapLoopHeader(cleanVal) : null;
      if (mapLoopHeader) {
        // A bare single-word .map() target (e.g. `stats.map(...)`) is a destructured prop
        // in the source component — it's never actually bound as a local JS variable in
        // this generated closure, only `attributes.stats` is. Rewrite it accordingly, same
        // as WpEditable's value= resolution does for bare identifiers.
        const rawArrayName = mapLoopHeader.arrayExpr;
        const isBareAttrRef = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(rawArrayName) &&
          blockSettings && blockSettings.attributes &&
          Object.prototype.hasOwnProperty.call(blockSettings.attributes, rawArrayName);
        const arrayName = isBareAttrRef ? `attributes.${rawArrayName}` : rawArrayName;
        const paramName = mapLoopHeader.paramName;
        const indexName = mapLoopHeader.indexName;

        let j = i + 1;
        let loopChildren = [];
        let foundEnd = false;
        while (j < node.children.length) {
          const nextChild = node.children[j];
          let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
          if (nextChild.type === 'text' && nextClean.includes(')}')) {
            const closingIndex = nextChild.value.indexOf(')}');
            const afterText = nextChild.value.substring(closingIndex + 2);
            if (afterText.trim()) {
              node.children.splice(j + 1, 0, {
                type: 'text',
                value: afterText
              });
            }
            nextChild.value = nextChild.value.substring(0, closingIndex + 2);
            foundEnd = true;
            break;
          }
          loopChildren.push(nextChild);
          j++;
        }
        
        if (foundEnd) {
          const innerCodes = loopChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
          const innerCode = innerCodes.length > 1 
            ? `createElement(wp.element.Fragment, null, ${innerCodes.join(', ')})`
            : innerCodes[0] || 'null';
            
          // paramName may already be a full destructure `{ icon: Icon, label }`
          // — do not wrap destructure patterns in an extra outer paren pair incorrectly.
          // Always emit `.map((params) => …)` so multi-param and destructure both parse.
          const params = indexName ? `${paramName}, ${indexName}` : paramName;
          processedChildCodes.push(`${arrayName}.map((${params}) => (${innerCode}))`);
          i = j + 1;
          continue;
        }
      }

      // Parse JSX ternary conditionals: {cond ? ( ... ) : ( ... )}
      // Also when glued after another expr: {editText(...)}{cond ? (
      // The false branch is often a bare identifier in the SAME text node as `)}`:
      //   ) : (\n  heading\n)}
      // A naive "starts with )}" check never sees the closer → broken createElement args.
      const peeledTernary = child.type === 'text' ? peelTrailingControlHeader(cleanVal, 'ternary') : null;
      if (peeledTernary) {
        if (peeledTernary.before) {
          const beforeCode = generateReactCreateElement(
            { type: 'text', value: peeledTernary.before },
            blockSettings,
          );
          if (beforeCode) processedChildCodes.push(beforeCode);
        }
        const jsCond = peeledTernary.cond;
        
        let j = i + 1;
        let trueChildren = [];
        let falseChildren = [];
        let foundColon = false;
        let foundEnd = false;
        
        while (j < node.children.length) {
          const nextChild = node.children[j];
          const rawText = nextChild.type === 'text' ? nextChild.value : '';
          let nextClean = nextChild.type === 'text'
            ? rawText.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim()
            : '';
          
          // `) : (` with flexible whitespace
          if (!foundColon && nextChild.type === 'text') {
            const colonMatch = rawText.match(/\)\s*:\s*\(/);
            if (colonMatch) {
              const colonIdx = colonMatch.index;
              const colonLen = colonMatch[0].length;
              const afterText = rawText.substring(colonIdx + colonLen);
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = rawText.substring(0, colonIdx + colonLen);
              foundColon = true;
              j++;
              continue;
            }
          }
          
          if (foundColon && nextChild.type === 'text') {
            // Closer may be at the start OR after false-branch text in this node
            const closingIdx = rawText.indexOf(')}');
            if (closingIdx !== -1) {
              const before = rawText.substring(0, closingIdx);
              const afterText = rawText.substring(closingIdx + 2);
              if (before.trim()) {
                // Bare identifier false branch: `) : (\n  heading\n)}`
                // Emit as a JS expression so it binds to locals/attributes, not the
                // string literal "heading".
                const trimmed = before.trim();
                const asExpr =
                  trimmed.startsWith('{') && trimmed.endsWith('}')
                    ? trimmed
                    : `{${trimmed}}`;
                falseChildren.push({ type: 'text', value: asExpr });
              }
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = rawText.substring(closingIdx, closingIdx + 2);
              foundEnd = true;
              break;
            }
          }
          
          if (!foundColon) {
            trueChildren.push(nextChild);
          } else {
            falseChildren.push(nextChild);
          }
          j++;
        }
        
        if (foundColon && foundEnd) {
          let phpCond = jsCond;
          const attrKeys = Object.keys((blockSettings && blockSettings.attributes) || {});
          phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:)/g, (m, word) => {
            if (attrKeys.includes(word)) {
              return `attributes.${word}`;
            }
            return m;
          });
          
          const trueCodes = trueChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
          const trueCode = trueCodes.length > 1 
            ? `createElement(wp.element.Fragment, null, ${trueCodes.join(', ')})`
            : trueCodes[0] || 'null';
            
          const falseCodes = falseChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
          const falseCode = falseCodes.length > 1 
            ? `createElement(wp.element.Fragment, null, ${falseCodes.join(', ')})`
            : falseCodes[0] || 'null';
            
          processedChildCodes.push(`${phpCond} ? (${trueCode}) : (${falseCode})`);
          i = j + 1;
          continue;
        }
      }
      
      const childCode = generateReactCreateElement(child, blockSettings);
      if (childCode) {
        processedChildCodes.push(childCode);
      }
      i++;
    }
    const childrenStr = processedChildCodes.join(', ');

    const isPascalCase = /^[A-Z]/.test(node.name);
    if (isPascalCase && blockSettings && blockSettings.importMap && blockSettings.importMap[node.name] && blockSettings.themeRoot) {
      const packageName = blockSettings.importMap[node.name];
      const rawClassName = node.attributes.className || '';
      const classNameStr = rawClassName.startsWith('{') && rawClassName.endsWith('}') 
        ? rawClassName.slice(1, -1).trim()
        : rawClassName;
      const resolved = resolveIconToCreateElement(node.name, packageName, blockSettings.themeRoot, classNameStr);
      if (resolved) return resolved;
    }

    // Host elements (div, span, …) must be string tags. PascalCase names are
    // React components — prefer the in-scope identifier (e.g. map param `Icon`,
    // or an injected lucide stub) so createElement(Icon, …) works.
    const isHost =
      !isPascalCase ||
      node.name.includes('-') ||
      node.name === 'Fragment';
    const typeExpr = isHost ? JSON.stringify(node.name) : node.name;
    return `createElement(${typeExpr}, ${propsStr}${childrenStr ? `, ${childrenStr}` : ''})`;
  }
  return 'null';
}

/**
 * Peel a trailing JSX control-flow header from a text node that may also hold
 * prior complete expressions, e.g.:
 *   {editText(a, 'a', 'c', 'h2')}{setAttributes ? (
 *
 * @param {string} cleanVal
 * @param {'ternary'|'and'} kind
 * @returns {{ before: string, cond: string } | null}
 */
function peelTrailingControlHeader(cleanVal, kind) {
  if (!cleanVal || typeof cleanVal !== 'string') return null;
  let m;
  if (kind === 'ternary') {
    // Prefer end-anchored ternary header; before may be empty or prior `{…}` exprs
    m = cleanVal.match(/^(?<before>[\s\S]*?)\{(?<cond>[^{}?:]+)\s*\?\s*\(\s*$/);
  } else if (kind === 'and') {
    m = cleanVal.match(/^(?<before>[\s\S]*?)\{(?<cond>[^{}]+)\s*&&\s*\(\s*$/);
  }
  if (!m || !m.groups) return null;
  const cond = (m.groups.cond || '').trim();
  if (!cond) return null;
  // Avoid false positives: before must be empty or end with a complete `}`
  const beforeTrimmed = (m.groups.before || '').trim();
  if (beforeTrimmed && !beforeTrimmed.endsWith('}')) {
    return null;
  }
  return { before: beforeTrimmed, cond };
}

/**
 * Convert JSX still present in the editor IIFE preamble (helpers defined before
 * `return`, e.g. `const cell = (… ) => (<div>…</div>)`) into createElement calls.
 *
 * Handles:
 * - arrow paren bodies: `=> (<div/>)`
 * - expression bodies with ternaries: `=> cond ? <A/> : <B/>`
 * - residual JSX tags anywhere in the preamble after the arrow pass
 *
 * @param {string} preamble
 * @param {object} blockSettings
 * @returns {string}
 */
export function transpileJsxInPreamble(preamble, blockSettings) {
  if (!preamble || typeof preamble !== 'string') return preamble;
  if (!/<[A-Za-z/$]/.test(preamble) && !/<>/.test(preamble)) return preamble;

  let result = '';
  let i = 0;
  while (i < preamble.length) {
    const arrow = preamble.indexOf('=>', i);
    if (arrow === -1) {
      result += preamble.slice(i);
      break;
    }
    result += preamble.slice(i, arrow + 2);
    let j = arrow + 2;
    while (j < preamble.length && /\s/.test(preamble[j])) j++;

    if (preamble[j] !== '(') {
      // Expression body (ternary, bare JSX, etc.) — leave for residual pass
      i = arrow + 2;
      continue;
    }

    const close = findMatchingParen(preamble, j);
    if (close === -1) {
      i = arrow + 2;
      continue;
    }

    const inner = preamble.slice(j + 1, close).trim();
    if (inner.startsWith('<') || inner.startsWith('<>')) {
      try {
        const ast = parseJsxToAst(inner);
        const ce = generateReactCreateElement(ast, blockSettings);
        if (ce && ce !== 'null') {
          result += ` (${ce})`;
          i = close + 1;
          continue;
        }
      } catch {
        // fall through — keep original JSX (will still error, but no worse)
      }
    }

    // Paren group may still contain nested JSX in ternaries: (cond ? <A/> : <B/>)
    const group = preamble.slice(j, close + 1);
    if (/<[A-Za-z/$]/.test(group) || /<>/.test(group)) {
      result += replaceJsxTagsWithCreateElement(group, blockSettings);
    } else {
      result += group;
    }
    i = close + 1;
  }

  // Residual JSX outside paren-arrow forms (expression bodies, multi-line ternaries)
  if (/<[A-Za-z/$]/.test(result) || /<>/.test(result)) {
    result = replaceJsxTagsWithCreateElement(result, blockSettings);
  }
  return result;
}

/**
 * Replace top-level JSX elements in a JS snippet with createElement(…) calls.
 * Skips string/template contents and TypeScript-like generics (`Foo<Bar>`).
 */
function replaceJsxTagsWithCreateElement(code, blockSettings) {
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  while (i < code.length) {
    const c = code[i];

    if (inSingle) {
      out += c;
      if (c === '\\') {
        out += code[i + 1] || '';
        i += 2;
        continue;
      }
      if (c === "'") inSingle = false;
      i++;
      continue;
    }
    if (inDouble) {
      out += c;
      if (c === '\\') {
        out += code[i + 1] || '';
        i += 2;
        continue;
      }
      if (c === '"') inDouble = false;
      i++;
      continue;
    }
    if (inBacktick) {
      out += c;
      if (c === '\\') {
        out += code[i + 1] || '';
        i += 2;
        continue;
      }
      if (c === '`') inBacktick = false;
      i++;
      continue;
    }

    if (c === "'") {
      inSingle = true;
      out += c;
      i++;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      out += c;
      i++;
      continue;
    }
    if (c === '`') {
      inBacktick = true;
      out += c;
      i++;
      continue;
    }

    // Potential JSX open
    if (c === '<' && i + 1 < code.length) {
      const next = code[i + 1];
      if (/[A-Za-z$]/.test(next) || next === '>') {
        // Skip TypeScript generics: Foo<Bar> — but NOT statement JSX like
        // `return <Icon />` / `throw <Err />` where the prev word is a keyword.
        let k = i - 1;
        while (k >= 0 && /\s/.test(code[k])) k--;
        if (k >= 0 && /[A-Za-z0-9_$]/.test(code[k])) {
          let start = k;
          while (start >= 0 && /[A-Za-z0-9_$]/.test(code[start])) start--;
          const prevWord = code.slice(start + 1, k + 1);
          const jsxAfterKeywords = new Set([
            'return',
            'throw',
            'yield',
            'case',
            'else',
            'default',
            'typeof',
            'delete',
            'void',
            'await',
            'new',
            'void',
          ]);
          if (!jsxAfterKeywords.has(prevWord)) {
            out += c;
            i++;
            continue;
          }
        }

        const jsx = extractBalancedJsx(code, i);
        if (jsx) {
          try {
            const ast = parseJsxToAst(jsx);
            const ce = generateReactCreateElement(ast, blockSettings);
            if (ce && ce !== 'null') {
              out += ce;
              i += jsx.length;
              continue;
            }
          } catch {
            // keep raw
          }
        }
      }
    }

    out += c;
    i++;
  }
  return out;
}

/**
 * From an opening `<` at startIdx, extract a full JSX element/fragment string.
 */
function extractBalancedJsx(code, startIdx) {
  if (code[startIdx] !== '<') return null;

  // Fragment <>…</>
  if (code.startsWith('<>', startIdx)) {
    const close = code.indexOf('</>', startIdx + 2);
    if (close === -1) return null;
    return code.slice(startIdx, close + 3);
  }

  const tagEnd = findHtmlTagEnd(code, startIdx);
  if (tagEnd === -1) return null;
  const openTag = code.slice(startIdx, tagEnd + 1);
  if (openTag.endsWith('/>')) {
    return openTag;
  }

  // Extract tag name
  const nameMatch = openTag.match(/^<\/?\s*([A-Za-z][\w.-]*)/);
  if (!nameMatch) return null;
  const tagName = nameMatch[1];
  const closeTag = `</${tagName}>`;

  let depth = 1;
  let i = tagEnd + 1;
  while (i < code.length && depth > 0) {
    // Skip strings inside JSX text? Rare. Skip {…} expressions carefully.
    if (code[i] === '{') {
      const closeBrace = findMatchingBrace(code, i);
      if (closeBrace === -1) return null;
      i = closeBrace + 1;
      continue;
    }
    if (code[i] === '<') {
      if (code.startsWith(closeTag, i)) {
        depth--;
        if (depth === 0) {
          return code.slice(startIdx, i + closeTag.length);
        }
        i += closeTag.length;
        continue;
      }
      if (code.startsWith(`<${tagName}`, i) || code.match(new RegExp(`^<${tagName}[\\s/>]`, 'i'))) {
        // nested same tag
        const nestedEnd = findHtmlTagEnd(code, i);
        if (nestedEnd === -1) return null;
        const nested = code.slice(i, nestedEnd + 1);
        if (!nested.endsWith('/>')) depth++;
        i = nestedEnd + 1;
        continue;
      }
      // Other nested element
      if (/^<[A-Za-z$]/.test(code.slice(i))) {
        const nested = extractBalancedJsx(code, i);
        if (!nested) {
          i++;
          continue;
        }
        i += nested.length;
        continue;
      }
    }
    i++;
  }
  return null;
}

function findMatchingBrace(code, openIdx) {
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
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParen(code, openIdx) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = openIdx; i < code.length; i++) {
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
      continue;
    }
    if (c === "'") inSingle = true;
    else if (c === '"') inDouble = true;
    else if (c === '`') inBacktick = true;
    else if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
