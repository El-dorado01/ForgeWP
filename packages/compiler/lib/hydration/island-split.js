import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { ts, createInteractivityChecker, setContentOverride, clearContentOverrides } from "./is-interactive.js";

// Well-known JS/browser globals that need no import and are never a prop or
// local declaration — referencing one of these must not force a bail-out.
const KNOWN_GLOBALS = new Set([
  "console", "window", "document", "navigator", "localStorage", "sessionStorage",
  "Math", "JSON", "Array", "Object", "String", "Number", "Boolean", "Date",
  "RegExp", "Map", "Set", "Promise", "Symbol", "Error", "TypeError", "RangeError",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "fetch",
  "undefined", "NaN", "Infinity", "globalThis",
  "URLSearchParams", "URL", "FormData", "Headers", "AbortController", "Intl",
]);

/** True for JsxElement/JsxSelfClosingElement/JsxFragment nodes. */
function isJsxNode(node) {
  return (
    node &&
    (node.kind === ts.SyntaxKind.JsxElement ||
      node.kind === ts.SyntaxKind.JsxSelfClosingElement ||
      node.kind === ts.SyntaxKind.JsxFragment)
  );
}

// Mirrors islands-scanner.js's scan roots — new islands land in a dedicated
// subfolder of src/components so Smart Discovery picks them up with zero
// additional wiring, same as a hand-written child component today.
const SCAN_DIRS = ["src/app", "src/components", "src/blocks"];
export const GENERATED_ISLANDS_DIRNAME = ".forgewp-islands";

function collectCandidateFiles(themeRoot) {
  const files = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === GENERATED_ISLANDS_DIRNAME || entry.name === "generated") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".tsx")) {
        files.push(full);
      }
    }
  }
  for (const dir of SCAN_DIRS) {
    const abs = path.join(themeRoot, dir);
    if (existsSync(abs)) walk(abs);
  }
  return files;
}

function collectBindingNames(nameNode, out = []) {
  if (ts.isIdentifier(nameNode)) {
    out.push(nameNode.text);
  } else if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const el of nameNode.elements) {
      if (ts.isBindingElement(el)) collectBindingNames(el.name, out);
    }
  }
  return out;
}

/** Every var/let/const/parameter/catch-binding name declared anywhere within `node` (including inside further-nested functions) — see collectFreeIdentifiers' nested-function handling for why this is collected upfront rather than scope-by-scope. */
function collectAllBoundNamesDeep(node) {
  const names = new Set();
  function walk(n) {
    if (!n) return;
    if (ts.isVariableDeclaration(n) || ts.isParameter(n)) {
      collectBindingNames(n.name).forEach((x) => names.add(x));
    } else if (ts.isCatchClause(n) && n.variableDeclaration) {
      collectBindingNames(n.variableDeclaration.name).forEach((x) => names.add(x));
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return names;
}

/** Finds the component's own top-level `return (<jsx>)`, never descending into nested callbacks/functions. */
function findReturnJsx(block) {
  let found = null;
  function visit(node) {
    if (found) return;
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      let expr = node.expression;
      while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
      if (isJsxNode(expr)) {
        found = { jsxRoot: expr, returnStatement: node };
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(block, visit);
  return found;
}

/** Locates the single exported component function in a source file (v1: destructured single-param components only). */
function findComponentFunction(sourceFile) {
  let result = null;
  function visit(node) {
    if (result) return;
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      const found = findReturnJsx(node.body);
      if (found) {
        result = { fnNode: node, fnBody: node.body, componentName: node.name.text, ...found };
        return;
      }
    }
    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        if (ts.isBlock(init.body)) {
          const found = findReturnJsx(init.body);
          if (found) {
            result = { fnNode: init, fnBody: init.body, componentName: node.name.text, ...found };
            return;
          }
        } else if (isJsxNode(init.body)) {
          result = { fnNode: init, fnBody: null, componentName: node.name.text, jsxRoot: init.body, returnStatement: null };
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return result;
}

/** v1 supports only a single destructured-object parameter (the shape every real component in this codebase uses). */
function collectComponentParamNames(fnNode) {
  if (!fnNode.parameters || fnNode.parameters.length === 0) return { names: new Set(), supported: true };
  if (fnNode.parameters.length > 1) return { names: new Set(), supported: false };
  const param = fnNode.parameters[0];
  if (ts.isObjectBindingPattern(param.name)) {
    return { names: new Set(collectBindingNames(param.name)), supported: true };
  }
  return { names: new Set(), supported: false };
}

function collectLocalDeclarations(fnBody, returnStatement) {
  const decls = [];
  if (!fnBody || !ts.isBlock(fnBody)) return decls;
  for (const stmt of fnBody.statements) {
    if (stmt === returnStatement) break;
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        decls.push({ names: collectBindingNames(decl.name), node: decl, statement: stmt, initializer: decl.initializer });
      }
    } else {
      // Any other statement shape before return (if-blocks, plain function
      // declarations, etc.) is unmodeled in v1 — signal via a synthetic
      // "unsupported" declaration name so callers can bail conservatively
      // rather than silently ignoring code that might matter.
      decls.push({ names: [], node: stmt, statement: stmt, initializer: null, unsupportedStatement: true });
    }
  }
  return decls;
}

/**
 * Free (unbound) identifier references within `node` — excludes property-access
 * `.name` targets, JSX attribute names, import specifiers, and names bound by
 * nested function parameters within `node` itself (so a `.map(item => ...)`
 * callback's own `item` never leaks out as a false "free variable").
 */
function collectFreeIdentifiers(node, opts = {}) {
  const { stopAtJsxBoundary = false, excludeNodes = null } = opts;
  const free = new Set();
  if (!node) return free;

  function visit(n, bound) {
    if (!n) return;
    if (stopAtJsxBoundary && n !== node && isJsxNode(n)) return;
    if (excludeNodes && n !== node && excludeNodes.has(n)) return;
    if (ts.isIdentifier(n)) {
      const parent = n.parent;
      if (parent) {
        if (ts.isPropertyAccessExpression(parent) && parent.name === n) return;
        if (ts.isJsxAttribute(parent) && parent.name === n) return;
        if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) return;
        if (ts.isPropertyAssignment(parent) && parent.name === n) return;
        if (ts.isBindingElement(parent) && parent.propertyName === n) return;
        // Lowercase JSX tag names (`<div>`, `<span>`) are intrinsic HTML
        // elements, not identifier references — skip them, but NOT uppercase
        // component tag names (`<WpLink>`), which really do reference a
        // binding in scope (a module import, prop, or local) that must still
        // be resolved/copied for the extraction to be valid.
        if (
          (ts.isJsxOpeningElement(parent) || ts.isJsxClosingElement(parent) || ts.isJsxSelfClosingElement(parent)) &&
          parent.tagName === n &&
          n.text[0] === n.text[0].toLowerCase()
        ) {
          return;
        }
      }
      if (!bound.has(n.text)) free.add(n.text);
      return;
    }
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) {
      // Not just parameters — a handler body commonly declares its own
      // locals (`const params = new URLSearchParams();` inside a submit
      // handler). Without collecting those too, a reference to `params`
      // inside that SAME handler would incorrectly look like a free
      // variable needing external resolution, when it's entirely
      // self-contained. Collecting every var/let/const/param name anywhere
      // within this function (including inside further-nested callbacks) is
      // a safe over-approximation for this purpose — it only risks masking
      // a genuinely free variable in the rare case of intentional shadowing.
      const nested = new Set(bound);
      collectAllBoundNamesDeep(n).forEach((x) => nested.add(x));
      ts.forEachChild(n, (c) => visit(c, nested));
      return;
    }
    ts.forEachChild(n, (c) => visit(c, bound));
  }

  visit(node, new Set());
  return free;
}

/** Dependency-closure hook-taint propagation over the component's local declarations. */
function computeHookTaint(localDecls, isNodeInteractive) {
  const taint = new Map();
  const declByName = new Map();
  for (const d of localDecls) {
    for (const n of d.names) declByName.set(n, d);
  }

  function resolve(name, stack) {
    if (taint.has(name)) return taint.get(name);
    if (stack.has(name)) {
      taint.set(name, true);
      return true;
    }
    stack.add(name);
    const decl = declByName.get(name);
    if (!decl || decl.unsupportedStatement) {
      taint.set(name, false);
      return false;
    }
    let result = decl.initializer ? isNodeInteractive(decl.initializer) : false;
    if (!result && decl.initializer) {
      for (const f of collectFreeIdentifiers(decl.initializer)) {
        if (declByName.has(f) && resolve(f, stack)) {
          result = true;
          break;
        }
      }
    }
    taint.set(name, result);
    return result;
  }

  for (const d of localDecls) {
    for (const n of d.names) resolve(n, new Set());
  }
  return { taint, declByName };
}

/** Immediate JSX-element descendants of `node` — nearest JsxElement/JsxSelfClosingElement/JsxFragment nodes, not descending past one once found (so ternary/logical-and branches count as immediate children even through intervening non-JSX expressions). */
function findImmediateJsxChildren(node) {
  const children = [];
  function visit(n) {
    if (n !== node && isJsxNode(n)) {
      children.push(n);
      return;
    }
    ts.forEachChild(n, visit);
  }
  ts.forEachChild(node, visit);
  return children;
}

/**
 * True when `node` has interactivity attributable to ITSELF — its own tag's
 * attributes (e.g. an onSubmit handler) or a hook-tainted identifier
 * referenced directly in its own text/expression children — as opposed to
 * interactivity that only exists because a NESTED JSX child element is
 * interactive. Nested JSX elements are treated as opaque boundaries here
 * (their own interactivity is evaluated separately, as their own candidate).
 *
 * This distinction matters: a `<form onSubmit={...}>` containing an
 * `<input onChange={...}>` is interactive both ways at once — without this
 * check, a naive "does any child need to move" test would extract only the
 * `<input>` and strand the form's own onSubmit handler behind in the
 * now-static shell, producing broken/dead code.
 */
function hasOwnInteractivity(node, isNodeInteractiveWithBoundary, hookTaint) {
  if (isNodeInteractiveWithBoundary(node, (n) => isJsxNode(n))) return true;
  for (const name of collectFreeIdentifiers(node, { stopAtJsxBoundary: true })) {
    if (hookTaint.get(name)) return true;
  }
  return false;
}

/**
 * Finds the maximal (highest, smallest-possible) JSX subtrees whose own
 * content requires interactivity — either directly (per isSubtreeInteractive,
 * which folds hooks/handlers/browser globals together with hook-taint free-
 * variable references) — walking top-down and stopping as soon as a node's
 * OWN content (not just a nested child's) explains its interactivity. Sibling
 * subtrees are kept separate by default (Astro-style small islands) — merging
 * happens later if they turn out to share a hook-tainted dependency.
 */
function findMaximalInteractiveSubtrees(rootJsxNode, isSubtreeInteractive, isNodeInteractiveWithBoundary, hookTaint) {
  const results = [];
  function visit(node) {
    if (!isSubtreeInteractive(node)) return;
    if (hasOwnInteractivity(node, isNodeInteractiveWithBoundary, hookTaint)) {
      results.push(node);
      return;
    }
    const jsxChildren = findImmediateJsxChildren(node);
    const interactiveChildren = jsxChildren.filter((c) => isSubtreeInteractive(c));
    if (interactiveChildren.length === 0) {
      // Shouldn't normally happen (isSubtreeInteractive(node) was true with
      // no own-content cause and no interactive children) — bail
      // conservatively by treating this node as the boundary rather than
      // silently dropping the interactivity signal.
      results.push(node);
      return;
    }
    for (const child of jsxChildren) visit(child);
  }
  visit(rootJsxNode);
  return results;
}

function collectModuleLevelNames(sourceFile, componentFnNode) {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (stmt === componentFnNode || (ts.isVariableStatement(stmt) && stmt.declarationList.declarations.includes(componentFnNode))) continue;
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
      if (stmt.importClause.name) names.add(stmt.importClause.name.text);
      const nb = stmt.importClause.namedBindings;
      if (nb && ts.isNamedImports(nb)) nb.elements.forEach((el) => names.add((el.propertyName ?? el.name).text === el.name.text ? el.name.text : el.name.text));
      if (nb && ts.isNamespaceImport(nb)) names.add(nb.name.text);
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        collectBindingNames(decl.name).forEach((n) => names.add(n));
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      names.add(stmt.name.text);
    } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      names.add(stmt.name.text);
    }
  }
  return names;
}

/**
 * Classifies one extraction candidate's free variables and computes its
 * required relocated-declaration closure. Returns { props, relocatedNames,
 * unresolved } — `unresolved: true` means an identifier couldn't be resolved
 * to a prop, a local declaration, or a module-level name, so the caller must
 * bail conservatively rather than guess.
 */
function classifyExtraction(jsxNodes, propNames, hookTaint, declByName, moduleLevelNames) {
  const props = new Set();
  const relocatedNames = new Set();
  let unresolved = false;

  const toResolve = [];
  for (const node of jsxNodes) for (const n of collectFreeIdentifiers(node)) toResolve.push(n);
  const seen = new Set();

  while (toResolve.length > 0) {
    const name = toResolve.pop();
    if (seen.has(name)) continue;
    seen.add(name);

    if (moduleLevelNames.has(name)) continue; // import/module-level — copied wholesale, not a prop
    if (KNOWN_GLOBALS.has(name)) continue; // well-known JS/browser global — needs no resolution
    if (propNames.has(name)) {
      props.add(name);
      continue;
    }
    if (declByName.has(name)) {
      const decl = declByName.get(name);
      if (decl.unsupportedStatement) {
        unresolved = true;
        continue;
      }
      relocatedNames.add(name);
      if (decl.initializer) {
        for (const f of collectFreeIdentifiers(decl.initializer)) if (!seen.has(f)) toResolve.push(f);
      }
      continue;
    }
    unresolved = true;
  }

  return { props, relocatedNames, unresolved };
}

/**
 * Full pipeline for one component file: detect candidates, classify, merge
 * siblings that share a hook-tainted dependency, and run the safety gates
 * (reverse-dependency, size-heuristic, unresolved-identifier). Returns
 * `{ success: false, reason }` on any bail-out (leave the component exactly
 * as today — hydrates as one unit if isComponentInteractive says so), or
 * `{ success: true, sourceFile, componentInfo, groups }` where each group is
 * `{ nodes, props, relocatedNames }` — one group per island to generate.
 * Pure/no I/O: callers handle writing files.
 */
function computeIslandSplit(filePath, sourceText) {
  if (!ts) return { success: false, reason: "typescript module unavailable" };

  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  } catch (e) {
    return { success: false, reason: `parse error: ${e.message}` };
  }

  const { isNodeInteractive, isNodeInteractiveWithBoundary } = createInteractivityChecker(sourceFile, ts);
  if (!isNodeInteractive(sourceFile)) return { success: false, reason: "component is not interactive" };

  const componentInfo = findComponentFunction(sourceFile);
  if (!componentInfo || !componentInfo.jsxRoot) return { success: false, reason: "no component function with a JSX return found" };
  if (!componentInfo.fnBody) return { success: false, reason: "implicit-return arrow components are not supported in v1" };

  const { supported, names: propNames } = collectComponentParamNames(componentInfo.fnNode);
  if (!supported) return { success: false, reason: "unsupported parameter shape (v1 requires a single destructured props parameter)" };

  const localDecls = collectLocalDeclarations(componentInfo.fnBody, componentInfo.returnStatement);
  const { taint, declByName } = computeHookTaint(localDecls, isNodeInteractive);
  const moduleLevelNames = collectModuleLevelNames(sourceFile, componentInfo.fnNode);

  function isSubtreeInteractive(node) {
    if (isNodeInteractive(node)) return true;
    for (const name of collectFreeIdentifiers(node)) if (taint.get(name)) return true;
    return false;
  }

  const candidates = findMaximalInteractiveSubtrees(componentInfo.jsxRoot, isSubtreeInteractive, isNodeInteractiveWithBoundary, taint);
  if (candidates.length === 0) return { success: false, reason: "no extractable interactive subtree found" };

  let groups = candidates.map((node) => {
    const result = classifyExtraction([node], propNames, taint, declByName, moduleLevelNames);
    return { nodes: [node], props: result.props, relocatedNames: result.relocatedNames, unresolved: result.unresolved };
  });

  if (groups.some((g) => g.unresolved)) {
    return { success: false, reason: "unresolved free variable in at least one candidate subtree" };
  }

  // Merge groups sharing a relocated hook-tainted dependency — extracting
  // both separately would duplicate the hook call (double-fetch/double-render).
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const shares = [...groups[i].relocatedNames].some((n) => groups[j].relocatedNames.has(n));
        if (shares) {
          const combinedNodes = [...groups[i].nodes, ...groups[j].nodes];
          const result = classifyExtraction(combinedNodes, propNames, taint, declByName, moduleLevelNames);
          if (result.unresolved) return { success: false, reason: "merging sibling islands produced an unresolved free variable" };
          groups.splice(j, 1);
          groups.splice(i, 1, { nodes: combinedNodes, props: result.props, relocatedNames: result.relocatedNames, unresolved: false });
          merged = true;
          break outer;
        }
      }
    }
  }

  // No benefit to splitting if an island would swallow the large majority of
  // the component's own JSX.
  const totalJsxLength = componentInfo.jsxRoot.getEnd() - componentInfo.jsxRoot.getStart(sourceFile);
  for (const g of groups) {
    const groupLength = g.nodes.reduce((sum, n) => sum + (n.getEnd() - n.getStart(sourceFile)), 0);
    if (totalJsxLength > 0 && groupLength / totalJsxLength > 0.9) {
      return { success: false, reason: "extraction candidate would contain the large majority of the component; no benefit to splitting" };
    }
  }

  // Reverse-dependency check: nothing OUTSIDE the union of all extraction
  // targets (remaining JSX + surviving local declarations) may reference a
  // relocated declaration — that would be shared state across islands, which
  // v1 does not support (bail to today's manual-split status quo).
  const allRelocatedNames = new Set();
  const allExtractedNodes = new Set();
  for (const g of groups) {
    for (const n of g.relocatedNames) allRelocatedNames.add(n);
    for (const node of g.nodes) allExtractedNodes.add(node);
  }

  const remainingJsxFree = collectFreeIdentifiers(componentInfo.jsxRoot, { excludeNodes: allExtractedNodes });
  for (const name of remainingJsxFree) {
    if (allRelocatedNames.has(name)) {
      return { success: false, reason: `"${name}" is still referenced outside the extracted subtree(s) (shared state) — cannot safely split` };
    }
  }
  for (const decl of localDecls) {
    if (decl.names.some((n) => allRelocatedNames.has(n))) continue; // this decl is itself being relocated
    if (decl.unsupportedStatement) {
      // A bare statement before return (e.g. a standalone `useEffect(...)`
      // call with no assignment) declares no names, so it's invisible to the
      // decl.names check above — but it can still read relocated bindings
      // (e.g. an effect that closes over a ref/setter used only inside the
      // extracted JSX). Left in place, it would reference names that no
      // longer exist in the parent's scope. Must be checked like any other
      // surviving statement, not skipped.
      for (const name of collectFreeIdentifiers(decl.node)) {
        if (allRelocatedNames.has(name)) {
          return { success: false, reason: `"${name}" is still referenced by a surviving statement (e.g. an effect) — cannot safely split` };
        }
      }
      continue;
    }
    if (!decl.initializer) continue;
    for (const name of collectFreeIdentifiers(decl.initializer)) {
      if (allRelocatedNames.has(name)) {
        return { success: false, reason: `"${name}" is still referenced by a surviving local declaration — cannot safely split` };
      }
    }
  }

  // A statement can bind multiple names in one `const {a, b} = x()`. If only
  // SOME of its names are being relocated while others survive, removing the
  // whole statement would silently delete the surviving names' declarations
  // too — bail rather than attempt partial-destructuring codegen (v1 scope).
  const statementsToRemove = new Set();
  for (const name of allRelocatedNames) {
    const decl = declByName.get(name);
    if (decl) statementsToRemove.add(decl.statement);
  }
  for (const stmt of statementsToRemove) {
    const decl = localDecls.find((d) => d.statement === stmt);
    if (!decl) continue;
    if (decl.names.some((n) => !allRelocatedNames.has(n))) {
      return { success: false, reason: "a relocated declaration shares a binding statement with a name that must stay in the parent — cannot safely split" };
    }
  }

  return { success: true, sourceFile, componentInfo, groups, statementsToRemove, localDecls };
}

function deriveIslandName(componentName, index) {
  return `${componentName}Island${index + 1}`;
}

const GENERATED_BANNER = (componentName) =>
  `/**\n * AUTO-GENERATED BY FORGEWP. DO NOT EDIT.\n * Extracted interactive island from ${componentName} by the auto-split\n * hydration compiler pass (packages/compiler/lib/hydration/island-split.js).\n */\n`;

/**
 * Builds the source text for one generated island component. Everything
 * copied from the original file — imports, relocated declaration statements,
 * extracted JSX — is text-sliced verbatim from the original source, never
 * re-printed via an AST printer (Correction 2: an AST-reprinted first tag
 * would break blocks/index.js's regex-based padding-token detection
 * elsewhere in the pipeline).
 */
/**
 * The generated island file lives at `.forgewp-islands/<ComponentName>/`,
 * two directory levels deeper than the original component — so a relative
 * import specifier (`./x`, `../x`) copied verbatim would resolve to the
 * wrong location. Surgically rewrites just the specifier substring (text-
 * slice philosophy, not an AST reprint) by prepending `../../`; bare
 * package specifiers (`react`, `lucide-react`) are untouched.
 */
function rewriteImportForIslandDepth(importDecl, sourceFile, sourceText) {
  const raw = sourceText.slice(importDecl.getStart(sourceFile), importDecl.getEnd());
  const spec = importDecl.moduleSpecifier;
  if (!spec || !ts.isStringLiteral(spec) || !spec.text.startsWith(".")) return raw;
  const specStart = spec.getStart(sourceFile) - importDecl.getStart(sourceFile);
  const specEnd = spec.getEnd() - importDecl.getStart(sourceFile);
  const quote = raw[specStart];
  return raw.slice(0, specStart) + `${quote}../../${spec.text}${quote}` + raw.slice(specEnd);
}

function buildIslandSource(sourceFile, sourceText, group, localDecls, componentInfo, islandName) {
  const declByName = new Map();
  for (const d of localDecls) for (const n of d.names) declByName.set(n, d);

  const stmtSet = new Set();
  for (const name of group.relocatedNames) {
    const decl = declByName.get(name);
    if (decl) stmtSet.add(decl.statement);
  }
  const stmts = [...stmtSet].sort((a, b) => a.getStart(sourceFile) - b.getStart(sourceFile));
  const bodyLines = stmts.map((s) => sourceText.slice(s.getStart(sourceFile), s.getEnd()));

  const jsxParts = group.nodes
    .slice()
    .sort((a, b) => a.getStart(sourceFile) - b.getStart(sourceFile))
    .map((n) => sourceText.slice(n.getStart(sourceFile), n.getEnd()));
  const returnExpr = jsxParts.length === 1 ? jsxParts[0] : `<>\n${jsxParts.join("\n")}\n</>`;

  const propsList = [...group.props];
  const propsInterfaceName = `${islandName}Props`;
  const propsInterface =
    propsList.length > 0
      ? `export interface ${propsInterfaceName} {\n${propsList.map((p) => `  ${p}?: any;`).join("\n")}\n}\n\n`
      : "";
  const propsParam = propsList.length > 0 ? `{ ${propsList.join(", ")} }: ${propsInterfaceName}` : "";

  // Copy every top-level import verbatim rather than selectively trimming —
  // unused imports cost nothing here (this file is compiler-generated, never
  // hand-edited) and avoids a whole extra class of "did I copy the right
  // subset" bugs. Relative specifiers DO need adjusting though: the island
  // lands two directories deeper than the original file (.forgewp-islands/
  // <ComponentName>/), so a relative import copied byte-for-byte would
  // resolve to the wrong place (or fail to resolve at all).
  const importLines = sourceFile.statements
    .filter((s) => ts.isImportDeclaration(s))
    .map((s) => rewriteImportForIslandDepth(s, sourceFile, sourceText))
    .join("\n");

  return (
    `${GENERATED_BANNER(componentInfo.componentName)}${importLines}\n\n${propsInterface}` +
    `export function ${islandName}(${propsParam}) {\n${bodyLines.join("\n")}\n  return (\n    ${returnExpr}\n  );\n}\n\n` +
    `export default ${islandName};\n`
  );
}

/**
 * Text-splices the shell: removes each relocated declaration statement and
 * replaces each extraction target with a plain `<IslandName {...props} />`
 * JSX reference (for a merged group, only the first node's position gets the
 * replacement tag; the rest are simply removed — their content moved into
 * the same island). All edits applied in descending start-offset order so
 * earlier edits never shift the positions of later ones. Everything outside
 * an edited range — crucially the block's own padding-bearing root tag — is
 * untouched byte-for-byte.
 */
function buildShellSource(sourceFile, sourceText, splitResult, islandNames) {
  const { groups, localDecls } = splitResult;
  const declByName = new Map();
  for (const d of localDecls) for (const n of d.names) declByName.set(n, d);

  const edits = [];

  groups.forEach((g, i) => {
    const islandName = islandNames[i];
    const propsAttrs = [...g.props].map((p) => ` ${p}={${p}}`).join("");
    const replacementTag = `<${islandName}${propsAttrs} />`;
    const sortedNodes = g.nodes.slice().sort((a, b) => a.getStart(sourceFile) - b.getStart(sourceFile));
    sortedNodes.forEach((node, idx) => {
      edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: idx === 0 ? replacementTag : "" });
    });

    const stmtSet = new Set();
    for (const name of g.relocatedNames) {
      const decl = declByName.get(name);
      if (decl) stmtSet.add(decl.statement);
    }
    for (const stmt of stmtSet) {
      edits.push({ start: stmt.getStart(sourceFile), end: stmt.getEnd(), text: "" });
    }
  });

  edits.sort((a, b) => b.start - a.start);

  let result = sourceText;
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }

  const importLines = islandNames.map((name) => `import { ${name} } from './${GENERATED_ISLANDS_DIRNAME}/${splitResult.componentInfo.componentName}/${name}';`).join("\n");
  return `${importLines}\n${result}`;
}

/**
 * Full per-themeRoot pass: scans every candidate component file (same roots
 * islands-scanner.js's Smart Discovery already uses), computes an island
 * split for each, and for every success: writes the generated island file(s)
 * to disk (a real file is required — islands-scanner.js's Smart Discovery
 * and Vite's Rollup entry resolution both need one, and compileBlocks reads
 * component source via raw fs, independent of Vite) and registers the
 * shell's rewritten source as a content override for the ORIGINAL file's
 * absolute path — the dev's own file on disk is never modified; consumers
 * (compileBlocks, the Vite transform) look up the override instead of
 * reading the file verbatim.
 *
 * Idempotent-ish: recomputes on every call rather than caching across calls,
 * since these files are small and this only runs at build/export time, not
 * per-request. Errors on any single file are caught and logged, never
 * propagated — one bad file must not abort the whole scan.
 *
 * This runs from four separate integration points in one `forgewp export`
 * (vite.config.ts's config-load-time getHydrationRollupInputs call, the Vite
 * plugin's buildStart, compileBlocks, and export-theme.js's pre-build step —
 * each needs its own fresh scan since they run at genuinely different times
 * relative to Vite's build lifecycle). Without deduping, the same bail-out
 * reasons would print once per integration point per build. bailWarnedOnce
 * tracks "have we already told the user about this exact file+reason,"
 * scoped to the process, so each is printed only once no matter how many of
 * the four call sites trigger it. Full per-file detail is behind
 * FORGEWP_VERBOSE=1; the default is a single summary line so a clean build
 * with (say) 17 non-splittable components doesn't bury the real output.
 *
 * @returns {number} count of components successfully auto-split.
 */
const bailWarnedOnce = new Set();
let tsUnavailableWarned = false;

// Reasons that mean "there was nothing to gain here" rather than "we found
// a real splitting opportunity but had to play it safe" — a component that
// is interactive from top to bottom (e.g. Navbar) or where the only
// candidate island would swallow the whole component isn't a missed
// opportunity, it's just not shaped for this pass. Not worth reporting even
// in verbose mode; only the genuine safety-gate bail-outs are.
const NON_ACTIONABLE_REASONS = [
  "component is not interactive",
  "no extractable interactive subtree found",
  "extraction candidate would contain the large majority of the component; no benefit to splitting",
];

function splitInteractiveIslands(themeRoot) {
  clearContentOverrides();

  if (!ts) {
    if (!tsUnavailableWarned) {
      tsUnavailableWarned = true;
      console.warn("[ForgeWP Auto-Island-Split] typescript module unavailable — skipping auto-split for this project (components will hydrate as-is, same as before this pass existed).");
    }
    return 0;
  }

  const files = collectCandidateFiles(themeRoot);
  let splitCount = 0;
  const newBailouts = [];

  for (const filePath of files) {
    let content;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    let result;
    try {
      result = computeIslandSplit(filePath, content);
    } catch (err) {
      console.warn(`[ForgeWP Auto-Island-Split] Error analyzing ${filePath}:`, err.message);
      continue;
    }

    if (!result.success) {
      if (result.reason && !NON_ACTIONABLE_REASONS.includes(result.reason)) {
        const relPath = path.relative(themeRoot, filePath);
        const key = `${relPath}::${result.reason}`;
        if (!bailWarnedOnce.has(key)) {
          bailWarnedOnce.add(key);
          newBailouts.push({ relPath, reason: result.reason });
        }
      }
      continue;
    }

    try {
      const islandNames = result.groups.map((g, i) => deriveIslandName(result.componentInfo.componentName, i));
      const islandDir = path.join(path.dirname(filePath), GENERATED_ISLANDS_DIRNAME, result.componentInfo.componentName);
      mkdirSync(islandDir, { recursive: true });

      result.groups.forEach((g, i) => {
        const islandCode = buildIslandSource(result.sourceFile, content, g, result.localDecls, result.componentInfo, islandNames[i]);
        const islandPath = path.join(islandDir, `${islandNames[i]}.tsx`);
        const existing = existsSync(islandPath) ? readFileSync(islandPath, "utf8") : null;
        if (existing !== islandCode) {
          writeFileSync(islandPath, islandCode, "utf8");
        }
      });

      const shellCode = buildShellSource(result.sourceFile, content, result, islandNames);
      setContentOverride(filePath, shellCode);
      splitCount++;
    } catch (err) {
      console.warn(`[ForgeWP Auto-Island-Split] Error generating split output for ${filePath}:`, err.message);
    }
  }

  if (newBailouts.length > 0) {
    if (process.env.FORGEWP_VERBOSE) {
      for (const { relPath, reason } of newBailouts) {
        console.warn(
          `[ForgeWP Auto-Island-Split] Could not auto-split ${relPath}: ${reason}. ` +
          `Consider extracting the interactive part into its own component by hand (see HeroSearchBoard.tsx / HeroSpotlight.tsx for the pattern).`,
        );
      }
    } else {
      console.warn(
        `[ForgeWP Auto-Island-Split] ${newBailouts.length} component(s) could not be auto-split (they hydrate as-is, same as before this pass existed) — set FORGEWP_VERBOSE=1 for the per-file reasons.`,
      );
    }
  }

  return splitCount;
}

export {
  computeIslandSplit,
  collectCandidateFiles,
  findComponentFunction,
  collectComponentParamNames,
  collectLocalDeclarations,
  collectFreeIdentifiers,
  computeHookTaint,
  findMaximalInteractiveSubtrees,
  collectModuleLevelNames,
  classifyExtraction,
  deriveIslandName,
  buildIslandSource,
  buildShellSource,
  splitInteractiveIslands,
};
