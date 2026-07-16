import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * originalAbsolutePath -> rewritten source text override, populated by
 * island-split.js's splitInteractiveIslands() when it auto-splits a mixed
 * static/interactive component into a static shell + extracted islands.
 * Defined here (not in island-split.js, which imports FROM this file) to
 * avoid a circular import, and so every existing reader of a component's
 * source — isComponentInteractive, and anything else that calls
 * readComponentSource — transparently sees the split shell instead of the
 * dev's original, still-fully-interactive file content, with zero changes
 * needed at each individual call site.
 */
const contentOverrides = new Map();

// Callers normalize paths inconsistently (Vite's transform hook forward-
// slash-normalizes ids; node:path.join uses the native separator, backslash
// on Windows) — key the override cache by a canonical forward-slash form so
// a lookup from ANY caller reliably hits an override set by any OTHER caller.
function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

export function setContentOverride(filePath, content) {
  contentOverrides.set(normalizePath(filePath), content);
}

export function clearContentOverrides() {
  contentOverrides.clear();
}

/**
 * True only when THIS path has an actual registered override — never infer
 * one from "a fresh disk read differs from caller-supplied content." A
 * caller (e.g. Vite's transform hook) may already hold content that's been
 * preprocessed by an earlier plugin in the chain; diffing that against a raw
 * readFileSync would misfire on files that were never split at all (any
 * legitimate upstream transformation looks identical to "there must be an
 * override" under a naive diff) and silently revert their code back to the
 * unprocessed original, later failing Rollup's plain-JS import analysis.
 */
export function hasContentOverride(filePath) {
  return contentOverrides.has(normalizePath(filePath));
}

export function readComponentSource(filePath) {
  const key = normalizePath(filePath);
  if (contentOverrides.has(key)) return contentOverrides.get(key);
  return readFileSync(filePath, "utf8");
}

/**
 * Regex-fallback-only WpEditable stripper (used when the `ts` module isn't
 * available at all — the AST path uses isAttributeOfWpEditable instead,
 * which doesn't have this problem). A naive `<WpEditable\b[^>]*\/>`-style
 * regex breaks the instant a WpEditable's onChange contains a TypeScript
 * generic cast like `as Partial<Props>` — that `>` ends the `[^>]*` match
 * early, so the tag (and its onChange) never actually gets stripped. This
 * tracks brace depth so a `>` inside a `{...}` expression doesn't count.
 */
function stripWpEditableBlocksNaive(content) {
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
      result += content.slice(pos, idx + "<WpEditable".length);
      pos = idx + "<WpEditable".length;
      continue;
    }
    result += content.slice(pos, idx);

    let braceDepth = 0;
    let inQuote = null;
    let tagEnd = -1;
    for (let i = idx; i < content.length; i++) {
      const c = content[i];
      if (inQuote) {
        if (c === inQuote) inQuote = null;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        inQuote = c;
      } else if (c === "{") {
        braceDepth++;
      } else if (c === "}") {
        if (braceDepth > 0) braceDepth--;
      } else if (c === ">" && braceDepth === 0) {
        tagEnd = i;
        break;
      }
    }
    if (tagEnd === -1) {
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

const require = createRequire(import.meta.url);
export let ts = null;
try {
  ts = require("typescript");
} catch (e) {
  let currentDir = process.cwd();
  while (true) {
    const tsPath = path.join(currentDir, "node_modules", "typescript");
    if (existsSync(tsPath)) {
      try {
        const rootRequire = createRequire(path.join(currentDir, "package.json"));
        ts = rootRequire("typescript");
        break;
      } catch (e2) {}
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

/**
 * True when `attrNode` (a JsxAttribute, e.g. `onChange={...}`) belongs to a
 * `<WpEditable ...>` / `<WpEditable ... />` tag specifically.
 */
export function isAttributeOfWpEditable(attrNode, tsModule) {
  let n = attrNode.parent;
  while (
    n &&
    n.kind !== tsModule.SyntaxKind.JsxOpeningElement &&
    n.kind !== tsModule.SyntaxKind.JsxSelfClosingElement
  ) {
    n = n.parent;
  }
  if (!n) return false;
  const tagName = n.tagName;
  return (
    tagName &&
    tagName.kind === tsModule.SyntaxKind.Identifier &&
    tagName.text === "WpEditable"
  );
}

// Ignore server-safe static queries and translation hooks.
// NOTE: useWpQuery is deliberately NOT included here. Unlike the hooks below (which
// read from context/globals available synchronously at SSR time), useWpQuery's
// production implementation always returns `{ posts: [], loading: true }` during the
// compile-time SSR pass (see wordpress.tsx's `_forgeWpCompileTime` branch) — it
// fundamentally requires client-side hydration to ever resolve real data. Treating it
// as "server-safe" leaves any component that uses only useWpQuery (no other
// hooks/handlers) permanently stuck on its SSR-baked loading skeleton on the live
// site, since it never gets a <Hydrate> boundary to mount and re-fetch client-side.
export const SERVER_SAFE_HOOKS = [
  "useWpTitle", "useWpExcerpt", "useWpContent",
  "useWpFeaturedImage", "useWpAuthor", "useWpModifiedDate",
  "useWpCustomField", "useWpI18n", "useWpThemeUri",
  "useWpPageLink", "useWpOption", "useWpThemeMod",
  "useWpMeta", "useWpLanguage", "useWpMenu"
];

/**
 * Builds a reusable, per-node interactivity checker for a parsed source file:
 * resolves local `use*` wrapper functions once (Pass 1), then returns a
 * `isNodeInteractive(node)` function that can be called on the whole source
 * file OR on any individual subtree (e.g. a single JSX element) — the same
 * rule set either way. Factored out of isComponentInteractive so
 * hydration/island-split.js can apply the identical rules per-JSX-subtree
 * instead of only whole-component.
 *
 * @param {object} sourceFile - a ts.SourceFile already parsed from the component's text.
 * @param {object} tsModule - the `typescript` module (pass the same `ts` this file resolved).
 * @returns {{ isNodeInteractive: (node: object) => boolean, localHookInteractivity: Map<string, boolean> }}
 */
export function createInteractivityChecker(sourceFile, tsModule) {
  const ts = tsModule;

  // Local wrapper functions named use* (e.g. `function useDual(prop, key) {
  // return prop ?? useWpMeta(key, ...); }`) are common — devs reasonably follow
  // React's hook-naming convention for anything that calls a hook internally.
  // A naive "starts with use" check would treat every CALL SITE of such a
  // wrapper as proof of interactivity, even when the wrapper only ever touches
  // server-safe hooks. Resolve each local use* declaration's own body first so
  // calls to a genuinely safe local wrapper don't force a hydration bundle.
  const localHookInteractivity = new Map();

  function checkInteractivity(rootNode, resolvingLocalHooks, stopPredicate) {
    let interactive = false;

    function checkNode(node) {
      if (interactive) return;
      if (stopPredicate && node !== rootNode && stopPredicate(node)) return;

      // 1. Check for Hooks: CallExpression where the expression is an Identifier
      // starting with "use" (`useState(...)`) OR a `React.useX(...)` property
      // access (`React.useState(...)`, `React.useEffect(...)`) — real
      // components in this codebase commonly namespace hooks off `React.`
      // rather than importing them individually.
      if (node.kind === ts.SyntaxKind.CallExpression) {
        const expression = node.expression;
        let hookName = null;
        if (expression.kind === ts.SyntaxKind.Identifier) {
          hookName = expression.text;
        } else if (
          expression.kind === ts.SyntaxKind.PropertyAccessExpression &&
          expression.expression.kind === ts.SyntaxKind.Identifier &&
          expression.expression.text === "React"
        ) {
          hookName = expression.name.text;
        }
        if (hookName !== null) {
          if (hookName.startsWith("use")) {
            if (SERVER_SAFE_HOOKS.includes(hookName)) {
              // safe, fall through to scan children (args may still reference
              // something interactive, however unlikely)
            } else if (!resolvingLocalHooks && localHookInteractivity.has(hookName)) {
              if (localHookInteractivity.get(hookName)) {
                interactive = true;
                return;
              }
            } else {
              interactive = true;
              return;
            }
          }
        }
      }

      // 2. Check for inline event handlers: JsxAttribute where the name is starting with "on[A-Z]"
      // Exception: <WpEditable onChange={...}> is provably inert on the frontend —
      // WpEditable's own isEditable check (`!window.forgeWpHydration`) is false
      // there, so the handler never attaches. Every block using WpEditable's
      // inline-edit fields was otherwise unconditionally flagged as interactive
      // and given a hydration bundle purely because of that dead-on-arrival
      // handler, which then re-rendered (and silently clobbered) any
      // server-computed props — e.g. the paddingY/paddingX attribute classes —
      // the moment hydration ran, even though nothing about the block is
      // actually interactive on the visitor page.
      if (node.kind === ts.SyntaxKind.JsxAttribute) {
        const name = node.name;
        if (name.kind === ts.SyntaxKind.Identifier) {
          const attrName = name.text;
          if (/^on[A-Z]/.test(attrName) && !isAttributeOfWpEditable(node, ts)) {
            interactive = true;
            return;
          }
        }
      }

      // 3. Check for browser globals: Identifier referencing window/document/etc.
      if (node.kind === ts.SyntaxKind.Identifier) {
        const name = node.text;
        if (["window", "document", "localStorage", "sessionStorage", "navigator"].includes(name)) {
          // Verify it's not a property name or within an import declaration
          let parent = node.parent;
          let isImportOrProperty = false;
          while (parent) {
            if (
              parent.kind === ts.SyntaxKind.ImportDeclaration ||
              parent.kind === ts.SyntaxKind.ImportSpecifier ||
              parent.kind === ts.SyntaxKind.PropertyDeclaration ||
              parent.kind === ts.SyntaxKind.PropertySignature ||
              parent.kind === ts.SyntaxKind.PropertyAccessExpression && parent.name === node
            ) {
              isImportOrProperty = true;
              break;
            }
            parent = parent.parent;
          }
          if (!isImportOrProperty) {
            interactive = true;
            return;
          }
        }
      }

      ts.forEachChild(node, checkNode);
    }

    checkNode(rootNode);
    return interactive;
  }

  // Pass 1: resolve every top-level local use* function/const declaration's own
  // interactivity (resolvingLocalHooks=true — a local hook calling ANOTHER local
  // hook is conservatively treated as interactive rather than recursed into
  // further, to keep this a bounded, one-level resolution).
  function collectLocalHookDecls(node) {
    let name = null;
    let body = null;
    if (
      node.kind === ts.SyntaxKind.FunctionDeclaration &&
      node.name &&
      /^use[A-Z]/.test(node.name.text) &&
      node.body
    ) {
      name = node.name.text;
      body = node.body;
    } else if (
      node.kind === ts.SyntaxKind.VariableDeclaration &&
      node.name.kind === ts.SyntaxKind.Identifier &&
      /^use[A-Z]/.test(node.name.text) &&
      node.initializer &&
      (node.initializer.kind === ts.SyntaxKind.ArrowFunction ||
        node.initializer.kind === ts.SyntaxKind.FunctionExpression) &&
      node.initializer.body
    ) {
      name = node.name.text;
      body = node.initializer.body;
    }
    if (name && body && !localHookInteractivity.has(name)) {
      localHookInteractivity.set(name, checkInteractivity(body, true));
    }
    ts.forEachChild(node, collectLocalHookDecls);
  }
  collectLocalHookDecls(sourceFile);

  return {
    isNodeInteractive: (node) => checkInteractivity(node, false),
    // Generic escape hatch for callers that need to treat certain descendants
    // as opaque (e.g. island-split.js's "does THIS JSX element have its own
    // direct interactivity, separate from a nested child element's" check —
    // stopPredicate lets it skip descending into nested JsxElement/
    // JsxSelfClosingElement/JsxFragment nodes while still applying the exact
    // same hook/handler/global rules to everything else).
    isNodeInteractiveWithBoundary: (node, stopPredicate) => checkInteractivity(node, false, stopPredicate),
    localHookInteractivity,
  };
}

/**
 * Statically analyzes a component file using the TypeScript AST parser
 * to check for client-side interactivity triggers (hooks, inline event handlers, browser globals).
 *
 * @param {string} filePath - Absolute path to the component file.
 * @returns {boolean} True if the component is interactive (island).
 */
export function isComponentInteractive(filePath) {
  if (!existsSync(filePath)) return false;
  try {
    const content = readComponentSource(filePath);

    if (!ts) {
      // Regex fallback. Strip <WpEditable ...>...</WpEditable> and self-closing
      // <WpEditable ... /> tags before the inline-handler check — same reasoning
      // as the AST path's isAttributeOfWpEditable: WpEditable's onChange is
      // inert on the frontend and shouldn't by itself force a hydration bundle.
      const contentForHandlerCheck = stripWpEditableBlocksNaive(content);
      const hasState = content.includes("useState") || content.includes("useEffect") || content.includes("useRef") || content.includes("useContext");
      const hasMotion = content.includes("framer-motion") || content.includes("gsap") || content.includes("animate") || content.includes("motion.");
      const hasInlineHandlers = /on[A-Z][a-zA-Z]*\s*=\s*/.test(contentForHandlerCheck);
      const hasBrowserGlobals = /\b(window|document|localStorage|sessionStorage|navigator)\b/.test(content);
      // See the serverSafeHooks note below — useWpQuery always needs client hydration.
      const hasWpQuery = content.includes("useWpQuery");
      return hasState || hasMotion || hasInlineHandlers || hasBrowserGlobals || hasWpQuery;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const { isNodeInteractive } = createInteractivityChecker(sourceFile, ts);
    return isNodeInteractive(sourceFile);
  } catch (err) {
    console.error(`[AST Interactivity Scan] Error parsing AST for ${filePath}:`, err);
    return false;
  }
}
