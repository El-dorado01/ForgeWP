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
  "useWpMeta", "useWpLanguage", "useWpMenu",
  "useReducedMotion", "useId", "useMemo", "useCallback",
  "useTransition", "useDeferredValue", "useDebugValue",
  "useInsertionEffect"
];

/**
 * Universal catalog of popular animation, 3D, canvas, and viewport motion libraries.
 * Any component importing from these packages or using their client directives
 * is automatically recognized by Smart Discovery as requiring client execution.
 */
export const CLIENT_ANIMATION_PACKAGES = [
  "framer-motion",
  "motion",
  "motion/react",
  "@gsap/react",
  "gsap",
  "gsap/ScrollTrigger",
  "gsap/ScrollSmoother",
  "gsap/Flip",
  "gsap/SplitText",
  "@react-spring/web",
  "@react-spring/core",
  "react-spring",
  "lenis",
  "@studio-freight/lenis",
  "lenis/react",
  "lottie-react",
  "@lottiefiles/dotlottie-react",
  "@rive-app/react-canvas",
  "rive-react",
  "@react-three/fiber",
  "@react-three/drei",
  "three",
  "@splinetool/react-spline",
  "@splinetool/runtime",
  "@formkit/auto-animate",
  "swiper",
  "swiper/react",
  "embla-carousel-react",
  "keen-slider/react",
  "aos",
  "locomotive-scroll",
  "animejs",
  "kute.js"
];

export const CLIENT_ANIMATION_DIRECTIVES_REGEX =
  /^(whileInView|whileHover|whileTap|whileDrag|whileFocus|animate|exit|layoutId|drag|dragConstraints|scrollTrigger|data-aos|data-scroll|stagger|variants)/;

export const CLIENT_ANIMATION_TAGS = new Set([
  "AnimatePresence",
  "LazyMotion",
  "Canvas",
  "Spline",
  "Lottie",
  "DotLottieReact",
  "Rive",
  "Swiper",
  "SwiperSlide",
  "ReactLenis",
  "Lenis",
]);

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

  const localHookInteractivity = new Map();

  function checkInteractivity(rootNode, resolvingLocalHooks, stopPredicate) {
    let interactive = false;

    function checkNode(node) {
      if (interactive) return;
      if (stopPredicate && node !== rootNode && stopPredicate(node)) return;

      // 1. Check for Hooks: CallExpression where the expression is an Identifier
      // starting with "use" (`useState(...)`) OR a `React.useX(...)` property
      // access (`React.useState(...)`, `React.useEffect(...)`)
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
              // safe, fall through to scan children
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

      // 2. Check for inline event handlers & client animation directives (whileInView, whileHover, etc.)
      if (node.kind === ts.SyntaxKind.JsxAttribute) {
        const name = node.name;
        if (name.kind === ts.SyntaxKind.Identifier) {
          const attrName = name.text;
          if (/^on[A-Z]/.test(attrName) && !isAttributeOfWpEditable(node, ts)) {
            interactive = true;
            return;
          }
          if (CLIENT_ANIMATION_DIRECTIVES_REGEX.test(attrName)) {
            interactive = true;
            return;
          }
        }
      }

      // 3. Check for standalone animation/canvas component tags (<AnimatePresence>, <Canvas>, <motion.div>, etc.)
      if (
        node.kind === ts.SyntaxKind.JsxOpeningElement ||
        node.kind === ts.SyntaxKind.JsxSelfClosingElement
      ) {
        const tagNameNode = node.tagName;
        if (tagNameNode.kind === ts.SyntaxKind.PropertyAccessExpression) {
          const expr = tagNameNode.expression;
          if (expr && expr.kind === ts.SyntaxKind.Identifier && (expr.text === "motion" || expr.text === "m" || expr.text === "animated")) {
            interactive = true;
            return;
          }
        }
        if (tagNameNode.kind === ts.SyntaxKind.Identifier) {
          if (CLIENT_ANIMATION_TAGS.has(tagNameNode.text)) {
            interactive = true;
            return;
          }
        }
      }

      // 5. Check for browser globals: Identifier referencing window/document/etc.
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
 * True for exported bindings that look like React components (PascalCase).
 * Re-exported hooks (`useReducedMotion`) and data constants (`fadeUp`) are
 * not island candidates.
 */
function isComponentExportName(name) {
  return typeof name === "string" && name !== "default" && /^[A-Z]/.test(name);
}

/**
 * React context providers are conventionally named `*Provider`. They use
 * hooks, so a file-level interactivity scan would treat them as islands.
 * Wrapping a provider hydrates its entire subtree as one client root and
 * destroys every nested island inside it. Providers are not UI islands.
 */
export function isContextProviderExportName(name) {
  return typeof name === "string" && /Provider$/.test(name);
}

/**
 * Detects if a component node is a pure layout/children wrapper (e.g. `<Reveal>`, `<Stagger>`, `<Float>`).
 * A pure children wrapper receives `{ children }` and renders `{ children }` inside a layout/motion tag
 * without any local state, effects, or event handlers.
 * Wrapping them as individual micro-islands inserts extra <div> wrappers inside CSS grids and flexbox,
 * breaking parent-child layouts. They are preserved as SSR layout containers while their parent
 * UI components hydrate as clean islands.
 */
export function isPureChildrenWrapper(node, tsModule) {
  if (!node || !tsModule) return false;
  const ts = tsModule;

  let params = null;
  let body = null;

  if (node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.FunctionExpression || node.kind === ts.SyntaxKind.ArrowFunction) {
    params = node.parameters;
    body = node.body;
  } else if (node.kind === ts.SyntaxKind.VariableDeclaration && node.initializer) {
    const init = node.initializer;
    if (init.kind === ts.SyntaxKind.FunctionExpression || init.kind === ts.SyntaxKind.ArrowFunction) {
      params = init.parameters;
      body = init.body;
    }
  }

  if (!params || params.length === 0 || !body) return false;

  // Check if first parameter is destructured with `children`
  const firstParam = params[0];
  let hasChildren = false;
  if (firstParam.name && firstParam.name.kind === ts.SyntaxKind.ObjectBindingPattern) {
    hasChildren = firstParam.name.elements.some((el) => {
      const name = el.propertyName ? el.propertyName.text : (el.name && el.name.text);
      return name === "children";
    });
  } else if (firstParam.name && firstParam.name.kind === ts.SyntaxKind.Identifier && firstParam.name.text === "props") {
    let usesPropsChildren = false;
    function checkProps(n) {
      if (usesPropsChildren) return;
      if (n.kind === ts.SyntaxKind.PropertyAccessExpression && n.expression && n.expression.text === "props" && n.name && n.name.text === "children") {
        usesPropsChildren = true;
        return;
      }
      ts.forEachChild(n, checkProps);
    }
    checkProps(body);
    hasChildren = usesPropsChildren;
  }

  if (!hasChildren) return false;

  // If the component has active state, effects, or custom event handlers (like onClick, onMouseMove),
  // it is an active interactive component (e.g. Magnetic, TiltCard), NOT a pure layout/motion wrapper.
  let hasActiveBehavior = false;
  function checkActive(n) {
    if (hasActiveBehavior) return;

    // Check for interactive hooks (useState, useEffect, useReducer, useRef, etc.)
    if (n.kind === ts.SyntaxKind.CallExpression) {
      const expr = n.expression;
      let hookName = null;
      if (expr.kind === ts.SyntaxKind.Identifier) {
        hookName = expr.text;
      } else if (expr.kind === ts.SyntaxKind.PropertyAccessExpression) {
        hookName = expr.name ? expr.name.text : null;
      }
      if (hookName && hookName.startsWith("use") && !SERVER_SAFE_HOOKS.includes(hookName) && hookName !== "useReducedMotion") {
        hasActiveBehavior = true;
        return;
      }
    }

    // Check for interactive event listeners (onClick, onMouseMove, onMouseEnter, etc.)
    if (n.kind === ts.SyntaxKind.JsxAttribute && n.name && n.name.kind === ts.SyntaxKind.Identifier) {
      if (/^on[A-Z]/.test(n.name.text) && !isAttributeOfWpEditable(n, ts)) {
        hasActiveBehavior = true;
        return;
      }
    }

    // Check for browser globals
    if (n.kind === ts.SyntaxKind.Identifier && ["window", "document", "localStorage", "sessionStorage", "navigator"].includes(n.text)) {
      let parent = n.parent;
      let isImportOrProp = false;
      while (parent) {
        if (
          parent.kind === ts.SyntaxKind.ImportDeclaration ||
          parent.kind === ts.SyntaxKind.ImportSpecifier ||
          parent.kind === ts.SyntaxKind.PropertyDeclaration ||
          parent.kind === ts.SyntaxKind.PropertySignature ||
          (parent.kind === ts.SyntaxKind.PropertyAccessExpression && parent.name === n)
        ) {
          isImportOrProp = true;
          break;
        }
        parent = parent.parent;
      }
      if (!isImportOrProp) {
        hasActiveBehavior = true;
        return;
      }
    }

    ts.forEachChild(n, checkActive);
  }

  checkActive(body);

  return !hasActiveBehavior;
}

function hasExportModifier(node, tsModule) {
  return !!(node.modifiers && node.modifiers.some((m) => m.kind === tsModule.SyntaxKind.ExportKeyword));
}

function hasDefaultModifier(node, tsModule) {
  return !!(node.modifiers && node.modifiers.some((m) => m.kind === tsModule.SyntaxKind.DefaultKeyword));
}

/**
 * Collects locally-declared exported bindings and the AST node whose body
 * should be scanned for interactivity. Covers:
 *   export function Foo() {}
 *   export const Foo = () => {}
 *   export const Foo = React.forwardRef(...)
 *   const Foo = () => {}; export { Foo }
 *   export default function Foo() {}
 *   export default Foo
 *
 * Re-exports from another module (`export { Foo } from './bar'`) are skipped —
 * those are not this file's implementation.
 *
 * @returns {Array<{ name: string, node: object }>}
 */
export function collectExportedComponentNodes(sourceFile, tsModule) {
  const ts = tsModule;
  const locals = new Map();

  function collectLocals(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      locals.set(node.name.text, node);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      locals.set(node.name.text, node);
    }
    ts.forEachChild(node, collectLocals);
  }
  collectLocals(sourceFile);

  const results = [];
  function add(name, node) {
    if (!name || !node) return;
    results.push({ name, node });
  }

  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && hasExportModifier(stmt, ts)) {
      add(stmt.name.text, stmt);
      if (hasDefaultModifier(stmt, ts)) add("default", stmt);
    } else if (ts.isFunctionDeclaration(stmt) && hasDefaultModifier(stmt, ts)) {
      add(stmt.name ? stmt.name.text : "default", stmt);
      add("default", stmt);
    } else if (ts.isVariableStatement(stmt) && hasExportModifier(stmt, ts)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) add(decl.name.text, decl);
      }
    } else if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      if (ts.isIdentifier(stmt.expression) && locals.has(stmt.expression.text)) {
        add(stmt.expression.text, locals.get(stmt.expression.text));
        add("default", locals.get(stmt.expression.text));
      } else {
        add("default", stmt.expression);
      }
    } else if (
      ts.isExportDeclaration(stmt) &&
      !stmt.moduleSpecifier &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const el of stmt.exportClause.elements) {
        const exportedName = el.name.text;
        const localName = el.propertyName ? el.propertyName.text : exportedName;
        if (locals.has(localName)) add(exportedName, locals.get(localName));
      }
    }
  }

  return results;
}

function findExportNode(sourceFile, exportName, tsModule) {
  const exports = collectExportedComponentNodes(sourceFile, tsModule);
  const named = exports.find((e) => e.name === exportName);
  if (named) return named.node;
  if (exportName !== "default") {
    const fallback = exports.find((e) => e.name === "default");
    if (fallback) return fallback.node;
  }
  return null;
}

/**
 * Per-export interactivity. A module that exports both a static helper
 * (server-safe hooks only) and a genuine island (state / effects / handlers)
 * must not mark every import from that file as a client island — wrapping a
 * static helper that takes JSX children remounts with `children` stripped
 * and wipes the server HTML.
 *
 * @param {string} filePath
 * @param {string} exportName - JSX tag / named export
 * @returns {boolean}
 */
export function isExportInteractive(filePath, exportName) {
  if (!exportName || !existsSync(filePath)) return false;
  try {
    const content = readComponentSource(filePath);

    if (!ts) {
      return isComponentInteractive(filePath);
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    if (isContextProviderExportName(exportName)) return false;

    const target = findExportNode(sourceFile, exportName, ts);
    if (!target) return false;

    if (isPureChildrenWrapper(target, ts)) return false;

    const { isNodeInteractive } = createInteractivityChecker(sourceFile, ts);
    return isNodeInteractive(target);
  } catch (err) {
    console.error(`[AST Interactivity Scan] Error parsing export ${exportName} in ${filePath}:`, err);
    return false;
  }
}

/**
 * PascalCase exported components in `filePath` whose own implementation is
 * interactive. Used by Smart Discovery so a mixed helper file only
 * contributes the exports that actually need a client bundle.
 *
 * @param {string} filePath
 * @returns {string[]}
 */
export function getInteractiveExportNames(filePath) {
  if (!existsSync(filePath)) return [];
  try {
    const content = readComponentSource(filePath);
    if (!ts) {
      return isComponentInteractive(filePath)
        ? [path.basename(filePath).replace(/\.(tsx|ts|jsx|js)$/, "")]
        : [];
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const { isNodeInteractive } = createInteractivityChecker(sourceFile, ts);
    const names = [];
    const seen = new Set();
    for (const entry of collectExportedComponentNodes(sourceFile, ts)) {
      if (!isComponentExportName(entry.name) || seen.has(entry.name)) continue;
      if (isContextProviderExportName(entry.name)) continue;
      if (isPureChildrenWrapper(entry.node, ts)) continue;
      if (isNodeInteractive(entry.node)) {
        seen.add(entry.name);
        names.push(entry.name);
      }
    }
    return names;
  } catch (err) {
    console.error(`[AST Interactivity Scan] Error listing interactive exports for ${filePath}:`, err);
    return [];
  }
}

/**
 * Statically analyzes a component file using the TypeScript AST parser
 * to check for client-side interactivity triggers (hooks, inline event handlers, browser globals).
 *
 * File-level: true if ANY top-level code in the file is interactive. Prefer
 * `isExportInteractive` / `getInteractiveExportNames` when deciding whether a
 * specific JSX tag should become a hydration island.
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
      const hasMotion =
        CLIENT_ANIMATION_PACKAGES.some((pkg) => content.includes(`"${pkg}"`) || content.includes(`'${pkg}'`)) ||
        /whileInView|whileHover|whileTap|whileDrag|whileFocus|layoutId|data-aos|data-scroll|\bmotion\.|\banimated\./.test(content);
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
