import fs from 'node:fs';
import path from 'node:path';
import { parseSource, traverse } from '../blocks/ast-parser.js';

/**
 * Converts a Babel AST literal/object/array node to a JS value.
 * Unwraps defineWpMenus({...}) (and other) call wrappers.
 */
function astToValue(node) {
  if (!node) return null;
  switch (node.type) {
    case 'StringLiteral':
      return node.value;
    case 'NumericLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'ArrayExpression':
      return node.elements.map((el) => astToValue(el));
    case 'ObjectExpression': {
      const obj = {};
      for (const prop of node.properties) {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value;
          obj[key] = astToValue(prop.value);
        }
      }
      return obj;
    }
    case 'UnaryExpression': {
      if (node.operator === '-' && node.argument?.type === 'NumericLiteral') {
        return -node.argument.value;
      }
      return null;
    }
    case 'CallExpression': {
      // Handles defineWpMenus({...}) wrapper
      if (node.arguments && node.arguments[0]) {
        return astToValue(node.arguments[0]);
      }
      return null;
    }
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
      return astToValue(node.expression);
    default:
      return null;
  }
}

function isMenuMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Loads navigation menus from cms/menus.ts (preferred) or cms/menus.json.
 * Matches the dual-resolution used for products/mock-data.
 *
 * @param {string} themeRoot
 * @returns {Record<string, Array<any>>}
 */
export function loadMenusData(themeRoot) {
  const tsPath = path.join(themeRoot, 'cms', 'menus.ts');
  const jsonPath = path.join(themeRoot, 'cms', 'menus.json');

  if (fs.existsSync(tsPath)) {
    try {
      const code = fs.readFileSync(tsPath, 'utf8');
      const ast = parseSource(code);
      let extracted = null;

      traverse(ast, {
        ExportNamedDeclaration(astPath) {
          const decl = astPath.node.declaration;
          if (decl && decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name === 'menus' && d.init) {
                extracted = astToValue(d.init);
              }
            }
          }
        },
        ExportDefaultDeclaration(astPath) {
          if (!extracted && astPath.node.declaration) {
            extracted = astToValue(astPath.node.declaration);
          }
        },
      });

      if (isMenuMap(extracted)) return extracted;
      if (extracted && isMenuMap(extracted.menus)) return extracted.menus;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Menus] Could not load ${tsPath}: ${e.message}`);
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (isMenuMap(raw)) return raw;
      if (raw && isMenuMap(raw.menus)) return raw.menus;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Menus] Could not parse ${jsonPath}: ${e.message}`);
    }
  }

  return {};
}
