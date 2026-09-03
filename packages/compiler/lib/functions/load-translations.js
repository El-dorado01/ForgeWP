import fs from 'node:fs';
import path from 'node:path';
import { parseSource, traverse } from '../blocks/ast-parser.js';

/**
 * Converts a Babel AST literal/object/array node to a JS value.
 * Unwraps defineTranslations({...}) (and other) call wrappers.
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

function isLocaleMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function translationsSourcePath(themeRoot) {
  const tsPath = path.join(themeRoot, 'cms', 'translations.ts');
  const jsonPath = path.join(themeRoot, 'cms', 'translations.json');
  if (fs.existsSync(tsPath)) return tsPath;
  if (fs.existsSync(jsonPath)) return jsonPath;
  return null;
}

/**
 * Loads i18n dictionaries from cms/translations.ts (preferred) or cms/translations.json.
 *
 * @param {string} themeRoot
 * @returns {Record<string, Record<string, string>>}
 */
export function loadTranslationsData(themeRoot) {
  const tsPath = path.join(themeRoot, 'cms', 'translations.ts');
  const jsonPath = path.join(themeRoot, 'cms', 'translations.json');

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
              if (d.id?.name === 'translations' && d.init) {
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

      if (isLocaleMap(extracted)) return extracted;
      if (extracted && isLocaleMap(extracted.translations)) return extracted.translations;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP i18n] Could not load ${tsPath}: ${e.message}`);
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (isLocaleMap(raw)) return raw;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP i18n] Could not parse ${jsonPath}: ${e.message}`);
    }
  }

  return {};
}

/**
 * Writes translations back to cms/translations.ts when that file exists,
 * otherwise to cms/translations.json. Creates translations.ts when neither exists.
 *
 * @param {string} themeRoot
 * @param {Record<string, Record<string, string>>} translations
 * @returns {string} absolute path written
 */
export function writeTranslationsData(themeRoot, translations) {
  const cmsDir = path.join(themeRoot, 'cms');
  if (!fs.existsSync(cmsDir)) {
    fs.mkdirSync(cmsDir, { recursive: true });
  }

  const tsPath = path.join(cmsDir, 'translations.ts');
  const jsonPath = path.join(cmsDir, 'translations.json');
  const body = JSON.stringify(translations, null, 2);

  if (fs.existsSync(tsPath) || !fs.existsSync(jsonPath)) {
    const content =
      `import { defineTranslations } from '@forgewp/react';\n\n` +
      `export const translations = defineTranslations(${body});\n\n` +
      `export default translations;\n`;
    fs.writeFileSync(tsPath, content, 'utf8');
    return tsPath;
  }

  fs.writeFileSync(jsonPath, body, 'utf8');
  return jsonPath;
}
