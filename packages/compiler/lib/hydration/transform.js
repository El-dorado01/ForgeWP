import { readFileSync } from "node:fs";
import path from "node:path";
import { ts, isComponentInteractive, isExportInteractive } from "./is-interactive.js";
import { resolveImportPath, doesComponentUseAuthHooks } from "./utils.js";
import { getComponentRootClassName } from "./root-class-extractor.js";
import { scanAppProviders, fileImportsProvider } from "./scan-app-providers.js";

/**
 * True when wrapping this JSX usage as a bare <Hydrate> island would drop
 * children the client cannot JSON-serialize (elements, expressions, text).
 * Those usages stay as layout containers; we recurse to find leaf islands.
 */
function hasNonSerializableChildren(node) {
  if (!node.children || node.children.length === 0) return false;
  return node.children.some((c) => {
    if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxFragment(c)) return true;
    if (ts.isJsxExpression(c) && c.expression) return true;
    if (ts.isJsxText(c) && c.getText().trim().length > 0) return true;
    return false;
  });
}

export const BUILTIN_OR_PRIMITIVE_TAGS = new Set([
  "Hydrate",
  "WpHead",
  "WpAuthGate",
  "WpCapabilityGate",
  "WpAuthProvider",
  "Link",
  "Switch",
  "Route",
]);

/**
 * Transforms theme page/component source code to automatically inject page protect hooks
 * and wrap interactive components in <Hydrate> / <WpAuthProvider> islands.
 */
export function transformThemeFile(code, id, themeRoot) {
  const normalizedPath = id.replace(/\\/g, '/');
  
  // 1. Process pageConfig hook injection if protected: true
  let transformedCode = code;
  let hasPageConfigTransform = false;

  const hasProtectedConfig = /export\s+const\s+pageConfig\s*=\s*(?:definePageConfig\s*\(\s*)?\{[\s\S]*?protected\s*:\s*true/g.test(code);

  if (normalizedPath.includes('/src/app/pages/') && hasProtectedConfig) {
    // Prepend hook import
    transformedCode = `import { useWpPageProtect as _useWpPageProtect } from '@forgewp/auth';\n` + transformedCode;

    // Match functional components
    const funcRegex = /export\s+(default\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([\s\S]*?)\)\s*\{/g;
    if (funcRegex.test(transformedCode)) {
      transformedCode = transformedCode.replace(funcRegex, `export $1function $2($3) {\n  _useWpPageProtect(pageConfig);`);
      hasPageConfigTransform = true;
    } else {
      // Match arrow function component exports
      const arrowRegex = /export\s+(const|let|var)\s+([a-zA-Z0-9_$]+)(\s*:\s*[a-zA-Z0-9_$.<>]+)?\s*=\s*\(([\s\S]*?)\)\s*=>\s*\{/g;
      if (arrowRegex.test(transformedCode)) {
        transformedCode = transformedCode.replace(arrowRegex, `export $1 $2$3 = ($4) => {\n  _useWpPageProtect(pageConfig);`);
        hasPageConfigTransform = true;
      }
    }
  }

  const layoutProviders = themeRoot ? scanAppProviders(themeRoot) : [];

  // 2. Process automatic island detection and provider wrapping
  if (!ts || !normalizedPath.endsWith('.tsx') || normalizedPath.includes('node_modules')) {
    return transformedCode;
  }

  // If the file itself is interactive, it acts as an island root, so DO NOT wrap inner components in <Hydrate>
  if (isComponentInteractive(id)) {
    return transformedCode;
  }

  try {
    const sourceFile = ts.createSourceFile(
      id,
      transformedCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    // Map tag name to import path
    const imports = {};
    function collectImports(node) {
      if (node.kind === ts.SyntaxKind.ImportDeclaration) {
        const specifier = node.moduleSpecifier;
        if (specifier.kind === ts.SyntaxKind.StringLiteral) {
          const importPath = specifier.text;
          const clause = node.importClause;
          if (clause) {
            // default import
            if (clause.name) {
              imports[clause.name.text] = importPath;
            }
            // named imports
            if (clause.namedBindings && clause.namedBindings.kind === ts.SyntaxKind.NamedImports) {
              clause.namedBindings.elements.forEach(el => {
                imports[el.name.text] = importPath;
              });
            }
          }
        }
      }
      ts.forEachChild(node, collectImports);
    }
    collectImports(sourceFile);

    const replacements = [];
    function isWithinExistingReplacement(start, end) {
      return replacements.some(r => start >= r.start && end <= r.end);
    }

    function findJsxElements(node) {
      // 1. Full JSX element with children <Foo>...</Foo>
      if (node.kind === ts.SyntaxKind.JsxElement) {
        const opening = node.openingElement;
        const tagNameNode = opening.tagName;
        if (tagNameNode.kind === ts.SyntaxKind.Identifier) {
          const tagName = tagNameNode.text;
          const firstChar = tagName.charAt(0);
          const isComponent = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
          const isBuiltin = BUILTIN_OR_PRIMITIVE_TAGS.has(tagName) || /Provider$/.test(tagName);

          if (isComponent && !isBuiltin && imports[tagName]) {
            const importPath = imports[tagName];
            if (importPath.startsWith('.') || importPath.startsWith('@/')) {
              const resolvedPath = resolveImportPath(path.dirname(id), importPath, themeRoot);
              const interactive = resolvedPath ? isExportInteractive(resolvedPath, tagName) : false;
              if (resolvedPath && interactive) {
                const start = node.getStart(sourceFile);
                const end = node.getEnd();
                if (!isWithinExistingReplacement(start, end)) {
                  const rawElementText = transformedCode.substring(start, end);
                  const kebabName = tagName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
                  const needsAuth = doesComponentUseAuthHooks(resolvedPath);
                  const rootInfo = getComponentRootClassName(resolvedPath);
                  replacements.push({
                    start,
                    end,
                    tagName,
                    kebabName,
                    needsAuth,
                    rawText: rawElementText,
                    rootClassName: rootInfo.resolvable ? rootInfo.className : null,
                    slotChildren: node.kind === ts.SyntaxKind.JsxElement,
                    needsProviders: fileImportsProvider(resolvedPath, layoutProviders),
                  });
                  return;
                }
              }
            }
          }
        }
      }

      // 2. Self-closing element <Foo />
      if (node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
        const tagNameNode = node.tagName;
        if (tagNameNode.kind === ts.SyntaxKind.Identifier) {
          const tagName = tagNameNode.text;
          const firstChar = tagName.charAt(0);
          const isComponent = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
          const isBuiltin = BUILTIN_OR_PRIMITIVE_TAGS.has(tagName) || /Provider$/.test(tagName);

          if (isComponent && !isBuiltin && imports[tagName]) {
            const importPath = imports[tagName];
            if (importPath.startsWith('.') || importPath.startsWith('@/')) {
              const resolvedPath = resolveImportPath(path.dirname(id), importPath, themeRoot);
              const interactive = resolvedPath ? isExportInteractive(resolvedPath, tagName) : false;
              if (resolvedPath && interactive) {
                const start = node.getStart(sourceFile);
                const end = node.getEnd();
                if (!isWithinExistingReplacement(start, end)) {
                  const rawElementText = transformedCode.substring(start, end);
                  const kebabName = tagName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
                  const needsAuth = doesComponentUseAuthHooks(resolvedPath);
                  const rootInfo = getComponentRootClassName(resolvedPath);
                  replacements.push({
                    start,
                    end,
                    tagName,
                    kebabName,
                    needsAuth,
                    rawText: rawElementText,
                    rootClassName: rootInfo.resolvable ? rootInfo.className : null,
                    slotChildren: node.kind === ts.SyntaxKind.JsxElement,
                    needsProviders: fileImportsProvider(resolvedPath, layoutProviders),
                  });
                  return;
                }
              }
            }
          }
        }
      }

      ts.forEachChild(node, findJsxElements);
    }
    findJsxElements(sourceFile);

    if (replacements.length === 0) {
      return transformedCode;
    }

    // Apply replacements in descending order (end to start of file) to avoid shifting positions
    replacements.sort((a, b) => b.start - a.start);

    let needsHydrateImport = false;
    let needsAuthImport = false;

    for (const rep of replacements) {
      const classAttr = rep.rootClassName
        ? ` className={${JSON.stringify(rep.rootClassName)}}`
        : "";
      const slotAttr = rep.slotChildren ? " slotChildren" : "";
      const providersAttr = rep.needsProviders ? " needsProviders" : "";
      let wrapped = `<Hydrate id="${rep.kebabName}"${classAttr}${slotAttr}${providersAttr}>`;
      needsHydrateImport = true;
      
      if (rep.needsAuth) {
        wrapped += `<WpAuthProvider>${rep.rawText}</WpAuthProvider>`;
        needsAuthImport = true;
      } else {
        wrapped += rep.rawText;
      }
      wrapped += `</Hydrate>`;

      transformedCode = transformedCode.substring(0, rep.start) + wrapped + transformedCode.substring(rep.end);
    }

    // Prepend imports if necessary
    const hasHydrateImport = transformedCode.includes('import { Hydrate') || transformedCode.includes('import Hydrate');
    const hasAuthImport = transformedCode.includes('import { WpAuthProvider') || transformedCode.includes('import WpAuthProvider');

    let prepends = "";
    if (needsHydrateImport && !hasHydrateImport) {
      prepends += `import { Hydrate } from "@forgewp/react";\n`;
    }
    if (needsAuthImport && !hasAuthImport) {
      prepends += `import { WpAuthProvider } from "@forgewp/auth";\n`;
    }

    if (prepends) {
      transformedCode = prepends + transformedCode;
    }

    return transformedCode;
  } catch (err) {
    console.error(`[JSX Wrap Plugin] Error parsing ${id}:`, err);
    return transformedCode;
  }
}
