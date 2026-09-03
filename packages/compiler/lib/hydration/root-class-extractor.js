import { readFileSync, existsSync } from "node:fs";
import { ts } from "./is-interactive.js";

/**
 * Matches only the Tailwind utility families that affect box geometry/
 * positioning within a parent (the auto-island wrapper's actual job, per
 * this file's own module doc). Deliberately excludes anything decorative
 * (bg-*, border*, rounded-*, shadow-*, padding, text-*, font-*, etc.) —
 * the wrapper sits OUTSIDE the component's own root element, so copying a
 * decorative class means both wrapper and root render it, doubling up
 * backgrounds/borders/shadows/padding into a visible "box inside a box".
 * Only a class needed to keep the wrapper from collapsing to an unstyled
 * shrink-to-fit box belongs here.
 */
const LAYOUT_CLASS_PATTERN = new RegExp(
  '^(?:' +
    '[whm]in-w-|[whm]ax-w-|[whm]in-h-|[whm]ax-h-|w-|h-|size-|' +
    'block$|inline(?:-|$)|flex(?:-|$)|grid(?:-|$)|hidden$|table(?:-|$)|contents$|flow-root$|' +
    'static$|relative$|absolute$|fixed$|sticky$|inset-|top-|right-|bottom-|left-|z-|' +
    'col-|row-|gap-|items-|justify-|self-|place-|order-|basis-|shrink|grow|' +
    'overflow-|aspect-' +
  ')',
);

function filterToLayoutClasses(classString) {
  const kept = classString
    .split(/\s+/)
    .filter(Boolean)
    .filter((cls) => {
      // Responsive/state variants (sm:flex, hover:flex) — check the utility
      // after the last ':' so a variant prefix doesn't block a real match.
      const bare = cls.includes(':') ? cls.slice(cls.lastIndexOf(':') + 1) : cls;
      return LAYOUT_CLASS_PATTERN.test(bare);
    });
  return kept.length > 0 ? kept.join(' ') : null;
}

/**
 * Statically extracts the literal `className` of a component's outermost returned
 * JSX element, so auto-generated <Hydrate> wrapper divs (Smart Discovery) can inherit
 * layout-critical classes (w-full, flex, grid, sticky, ...) instead of defaulting to a
 * bare `display:block` box with no width/layout awareness of its own.
 *
 * Without this, wrapping an interactive component whose root element carries sizing
 * classes silently breaks percentage-width layouts: the wrapper becomes an unstyled
 * shrink-to-fit box sitting between the real parent and the component, and `w-full`
 * on the component's root can no longer resolve against the intended container.
 *
 * Resolution is intentionally conservative — only proven-static values (string literals,
 * no-substitution template literals) are hoisted. Anything dynamic (template
 * expressions, cn()/clsx() calls, identifiers, conditionals) is reported as unresolved
 * so callers can fall back to a lint warning instead of guessing at runtime behavior.
 *
 * @param {string} filePath - Absolute path to the component file.
 * @returns {{ resolvable: boolean, className: string | null, reason?: string }}
 */
export function getComponentRootClassName(filePath) {
  if (!ts || !filePath || !existsSync(filePath)) {
    return { resolvable: false, className: null, reason: "no-parser" };
  }

  try {
    const content = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const candidates = [];

    function registerCandidate(node, name) {
      if (name && /^[A-Z]/.test(name)) {
        candidates.push({ name, node });
      }
    }

    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        registerCandidate(node, node.name.text);
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            decl.name &&
            ts.isIdentifier(decl.name) &&
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            registerCandidate(decl.initializer, decl.name.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    if (candidates.length === 0) {
      return { resolvable: true, className: null };
    }

    // ForgeWP's convention is one component per file — prefer the last top-level
    // candidate (typically the default-exported component; helper/inner functions
    // declared earlier in the file are unlikely to be the mount point).
    const target = candidates[candidates.length - 1];
    const rootExpr = findReturnedJsxExpression(target.node);
    if (!rootExpr) {
      return { resolvable: true, className: null };
    }

    return extractClassNameFromJsxRoot(rootExpr);
  } catch {
    return { resolvable: false, className: null, reason: "parse-error" };
  }
}

function unwrapParens(node) {
  while (node && ts.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return node;
}

function findReturnedJsxExpression(fnNode) {
  const body = fnNode.body;
  if (!body) return null;

  // Arrow function with an implicit expression body: const Foo = () => (<div />)
  if (!ts.isBlock(body)) {
    return unwrapParens(body);
  }

  // Block body: use the first top-level `return` statement. Early-return guards
  // (loading states, null checks, etc.) mean this isn't always the "real" root,
  // which is fine — it's a best-effort hint, not a correctness guarantee.
  for (const stmt of body.statements) {
    if (ts.isReturnStatement(stmt) && stmt.expression) {
      return unwrapParens(stmt.expression);
    }
  }
  return null;
}

function extractStaticStringsFromExpression(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [node.text];
  }
  if (ts.isTemplateExpression(node)) {
    const parts = [node.head.text];
    for (const span of node.templateSpans) {
      parts.push(span.literal.text);
    }
    return parts;
  }
  if (ts.isCallExpression(node)) {
    const parts = [];
    for (const arg of node.arguments) {
      parts.push(...extractStaticStringsFromExpression(arg));
    }
    return parts;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return [
      ...extractStaticStringsFromExpression(node.left),
      ...extractStaticStringsFromExpression(node.right),
    ];
  }
  return [];
}

function extractClassNameFromJsxRoot(expr) {
  if (!expr) return { resolvable: true, className: null };

  let targetElement = expr;

  // Handle Fragments (<> ... </>) by inspecting the first child element
  if (ts.isJsxFragment(expr)) {
    const firstChild = expr.children.find(
      (c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)
    );
    if (firstChild) {
      targetElement = firstChild;
    }
  }

  if (!ts.isJsxElement(targetElement) && !ts.isJsxSelfClosingElement(targetElement)) {
    return { resolvable: true, className: null };
  }

  const opening = ts.isJsxElement(targetElement) ? targetElement.openingElement : targetElement;
  const classAttr = opening.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name && p.name.text === "className"
  );

  if (!classAttr) {
    return { resolvable: true, className: null };
  }
  if (!classAttr.initializer) {
    return { resolvable: false, className: null, reason: "dynamic-classname" };
  }

  const init = classAttr.initializer;
  if (ts.isStringLiteral(init)) {
    return { resolvable: true, className: filterToLayoutClasses(init.text) };
  }
  if (ts.isJsxExpression(init) && init.expression) {
    const staticStrings = extractStaticStringsFromExpression(init.expression);
    if (staticStrings.length > 0) {
      const combined = staticStrings.join(" ");
      const layoutClasses = filterToLayoutClasses(combined);
      if (layoutClasses) {
        return { resolvable: true, className: layoutClasses };
      }
    }
  }

  return { resolvable: false, className: null, reason: "dynamic-classname" };
}
