import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ts, isContextProviderExportName } from "./is-interactive.js";
import { resolveImportPath } from "./utils.js";

function toKebabName(exportName) {
  return exportName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Walks `src/app/layout.tsx` (and `src/app/layout.ts`) for theme-local
 * `*Provider` components that wrap `{children}`. Returned in nest order
 * (outermost first) so the hydrator can rebuild the same provider tree
 * around every island. Not an island list — providers must not become
 * `data-forgewp-hydrate` wrappers.
 *
 * @param {string} themeRoot
 * @returns {Array<{ exportName: string, kebab: string, file: string }>}
 */
export function scanAppProviders(themeRoot) {
  if (!ts || !themeRoot) return [];

  const candidates = [
    path.join(themeRoot, "src", "app", "layout.tsx"),
    path.join(themeRoot, "src", "app", "layout.ts"),
    path.join(themeRoot, "src", "app", "layout.jsx"),
    path.join(themeRoot, "src", "app", "layout.js"),
  ];
  const layoutPath = candidates.find((p) => existsSync(p));
  if (!layoutPath) return [];

  let sourceText;
  try {
    sourceText = readFileSync(layoutPath, "utf8");
  } catch {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    layoutPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const imports = {};
  function collectImports(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause) {
        if (clause.name) imports[clause.name.text] = spec;
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          clause.namedBindings.elements.forEach((el) => {
            imports[el.name.text] = spec;
          });
        }
      }
    }
    ts.forEachChild(node, collectImports);
  }
  collectImports(sourceFile);

  const found = [];
  const seen = new Set();

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName;
      if (ts.isIdentifier(tag) && isContextProviderExportName(tag.text)) {
        const spec = imports[tag.text];
        if (spec && (spec.startsWith(".") || spec.startsWith("@/"))) {
          const resolved = resolveImportPath(path.dirname(layoutPath), spec, themeRoot);
          if (resolved && !seen.has(tag.text)) {
            seen.add(tag.text);
            found.push({
              exportName: tag.text,
              kebab: toKebabName(tag.text),
              file: resolved,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return found;
}

/**
 * True when `filePath` imports a module that is one of the layout providers
 * (or a hook/component from the same file). Used so only islands that
 * actually consume cart/wishlist/auth context get wrapped — wrapping a
 * quote carousel with a motion-heavy wishlist provider remounts it from
 * `initial={{ opacity: 0 }}` and hides text that SSR already painted.
 */
export function fileImportsProvider(filePath, providers, visited = new Set()) {
  if (!filePath || !providers || providers.length === 0 || !existsSync(filePath) || visited.has(filePath)) {
    return false;
  }
  visited.add(filePath);
  const providerFiles = new Set(providers.map((p) => p.file.replace(/\\/g, "/")));
  let sourceText;
  try {
    sourceText = readFileSync(filePath, "utf8");
  } catch {
    return false;
  }
  if (!ts) {
    return providers.some((p) => sourceText.includes(p.exportName) || sourceText.includes(p.kebab));
  }
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const themeRootGuess = filePath.includes(`${path.sep}src${path.sep}`)
    ? filePath.slice(0, filePath.indexOf(`${path.sep}src${path.sep}`))
    : path.dirname(filePath);

  let found = false;
  const importedPaths = [];
  function visit(node) {
    if (found) return;
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (spec.startsWith(".") || spec.startsWith("@/")) {
        const resolved = resolveImportPath(path.dirname(filePath), spec, themeRootGuess);
        if (resolved) {
          if (providerFiles.has(resolved.replace(/\\/g, "/"))) {
            found = true;
            return;
          }
          importedPaths.push(resolved);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (found) return true;

  for (const imp of importedPaths) {
    if (fileImportsProvider(imp, providers, visited)) {
      return true;
    }
  }
  return false;
}
