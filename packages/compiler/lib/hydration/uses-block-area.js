import { parse } from '@babel/parser';

export function usesBlockArea(source) {
  let ast;
  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    return false;
  }

  const blockAreaNames = new Set();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration') continue;

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.imported.type === 'Identifier' &&
        specifier.imported.name === 'BlockArea'
      ) {
        blockAreaNames.add(specifier.local.name);
      }
    }
  }
  if (blockAreaNames.size === 0) return false;

  const visited = new WeakSet();
  const visit = (node) => {
    if (!node || typeof node !== 'object' || visited.has(node)) return false;
    visited.add(node);

    if (
      node.type === 'JSXOpeningElement' &&
      node.name.type === 'JSXIdentifier' &&
      blockAreaNames.has(node.name.name)
    ) {
      return true;
    }

    return Object.values(node).some((value) =>
      Array.isArray(value) ? value.some(visit) : visit(value),
    );
  };

  return visit(ast.program);
}
