import { readFileSync } from "node:fs";
import path from "node:path";
import { ts, isComponentInteractive } from "./is-interactive.js";
import { resolveImportPath, doesComponentUseAuthHooks } from "./utils.js";
import { getComponentRootClassName } from "./root-class-extractor.js";

/**
 * Transforms theme page/component source code to automatically inject page protect hooks
 * and wrap interactive components in <Hydrate> / <WpAuthProvider> islands.
 */
export function transformThemeFile(code, id, themeRoot) {
  const normalizedPath = id.replace(/\\/g, '/');
  
  // 1. Process pageConfig hook injection if applicable
  let transformedCode = code;
  let hasPageConfigTransform = false;

  if (normalizedPath.includes('/src/app/pages/') && code.includes('export const pageConfig')) {
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
    function findJsxElements(node) {
      if (node.kind === ts.SyntaxKind.JsxOpeningElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
        const tagNameNode = node.tagName;
        if (tagNameNode.kind === ts.SyntaxKind.Identifier) {
          const tagName = tagNameNode.text;
          
          // Ignore standard HTML tags and built-in framework wrappers
          const firstChar = tagName.charAt(0);
          const isComponent = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
          const isBuiltin = ["Hydrate", "WpHead", "WpAuthGate", "WpCapabilityGate", "WpAuthProvider", "Link", "Switch", "Route"].includes(tagName);

          if (isComponent && !isBuiltin && imports[tagName]) {
            const importPath = imports[tagName];
            if (importPath.startsWith('.') || importPath.startsWith('@/')) {
              const resolvedPath = resolveImportPath(path.dirname(id), importPath, themeRoot);
              const interactive = resolvedPath ? isComponentInteractive(resolvedPath) : false;
              if (resolvedPath && interactive) {
                // Prevent double wrapping: check if this component is already nested inside a <Hydrate> block
                let parent = node.parent;
                let isAlreadyWrapped = false;
                while (parent) {
                  if (parent.kind === ts.SyntaxKind.JsxElement) {
                    const opening = parent.openingElement;
                    if (opening && opening.tagName.kind === ts.SyntaxKind.Identifier && opening.tagName.text === "Hydrate") {
                      isAlreadyWrapped = true;
                      break;
                    }
                  }
                  parent = parent.parent;
                }

                if (!isAlreadyWrapped) {
                  // This is an interactive component! We need to wrap it.
                  // Determine where the element ends (either self-closing or matching closing tag)
                  let elementNode = node;
                  if (node.kind === ts.SyntaxKind.JsxOpeningElement) {
                    elementNode = node.parent; // JSXElement containing opening, children, and closing
                  }
                  
                  const start = elementNode.getStart(sourceFile);
                  const end = elementNode.getEnd();
                  
                  const rawElementText = transformedCode.substring(start, end);
                  const kebabName = tagName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

                  const needsAuth = doesComponentUseAuthHooks(resolvedPath);
                  // Resolve the component's own root className so the generated <Hydrate>
                  // wrapper inherits its layout classes instead of defaulting to a bare
                  // display:block box that can silently break width/flex sizing.
                  const rootInfo = getComponentRootClassName(resolvedPath);
                  replacements.push({
                    start,
                    end,
                    tagName,
                    kebabName,
                    needsAuth,
                    rawText: rawElementText,
                    rootClassName: rootInfo.resolvable ? rootInfo.className : null,
                  });
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
      let wrapped = `<Hydrate id="${rep.kebabName}"${classAttr}>`;
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
