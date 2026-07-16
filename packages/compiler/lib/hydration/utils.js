import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { ts } from "./is-interactive.js";

/**
 * Resolves imported component path using aliases or relative paths.
 */
export function resolveImportPath(dir, importPath, themeRoot) {
  let absolutePath;
  if (importPath.startsWith("@/")) {
    absolutePath = path.resolve(themeRoot, "src", importPath.substring(2));
  } else {
    absolutePath = path.resolve(dir, importPath);
  }
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    return absolutePath;
  }
  for (const ext of extensions) {
    const p = absolutePath + ext;
    if (existsSync(p)) return p;
    
    const indexP = path.join(absolutePath, "index" + ext);
    if (existsSync(indexP)) return indexP;
  }
  return null;
}

/**
 * Statically checks recursively if a component file uses auth hooks.
 */
export function doesComponentUseAuthHooks(filePath, visited = new Set()) {
  if (!existsSync(filePath) || visited.has(filePath)) return false;
  visited.add(filePath);

  try {
    const content = readFileSync(filePath, "utf8");
    const hasHookMention = content.includes("useWpUser") || content.includes("useWpAuth") || content.includes("useWpCapability");
    if (hasHookMention) {
      if (!ts) {
        return true;
      }
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
      let usesAuth = false;
      function checkNode(node) {
        if (usesAuth) return;
        if (node.kind === ts.SyntaxKind.CallExpression) {
          const expression = node.expression;
          if (expression.kind === ts.SyntaxKind.Identifier) {
            const name = expression.text;
            if (["useWpUser", "useWpAuth", "useWpCapability"].includes(name)) {
              usesAuth = true;
              return;
            }
          }
        }
        ts.forEachChild(node, checkNode);
      }
      ts.forEachChild(sourceFile, checkNode);
      if (usesAuth) return true;
    }

    // Check imports recursively
    const themeRoot = filePath.includes("/src/")
      ? filePath.substring(0, filePath.indexOf("/src/"))
      : process.cwd();

    if (!ts) {
      const importRegex = /import\s+([A-Za-z0-9_$,\s{}]+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[2];
        if (importPath.startsWith(".") || importPath.startsWith("@/")) {
          const resolvedPath = resolveImportPath(path.dirname(filePath), importPath, themeRoot);
          if (resolvedPath && doesComponentUseAuthHooks(resolvedPath, visited)) {
            return true;
          }
        }
      }
      return false;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    let recursiveAuth = false;
    function checkImports(node) {
      if (recursiveAuth) return;
      if (node.kind === ts.SyntaxKind.ImportDeclaration) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
          const importPath = moduleSpecifier.text;
          if (importPath.startsWith(".") || importPath.startsWith("@/")) {
            const resolvedPath = resolveImportPath(path.dirname(filePath), importPath, themeRoot);
            if (resolvedPath && doesComponentUseAuthHooks(resolvedPath, visited)) {
              recursiveAuth = true;
              return;
            }
          }
        }
      }
      ts.forEachChild(node, checkImports);
    }
    ts.forEachChild(sourceFile, checkImports);
    return recursiveAuth;
  } catch (err) {
    return false;
  }
}
