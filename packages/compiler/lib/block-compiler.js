import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

function parseAttributes(attrStr) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|(?:\{([\s\S]*?)\}))|(?=\s|$))/gi;
  let match;
  while ((match = regex.exec(attrStr)) !== null) {
    const key = match[1];
    const val = match[2] || match[3] || match[4] || true;
    attrs[key] = val;
  }
  return attrs;
}

function parseJsxToAst(jsx) {
  const tokens = [];
  let index = 0;
  
  while (index < jsx.length) {
    const char = jsx[index];
    
    if (char === '<') {
      let tagEnd = jsx.indexOf('>', index);
      if (tagEnd === -1) break;
      
      let tagStr = jsx.substring(index, tagEnd + 1);
      const isClosing = tagStr.startsWith('</');
      const isSelfClosing = tagStr.endsWith('/>');
      
      const tagNameMatch = tagStr.match(/<\/?([a-zA-Z0-9_-]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1] : '';
      
      tokens.push({
        type: 'tag',
        name: tagName,
        raw: tagStr,
        isClosing,
        isSelfClosing
      });
      
      index = tagEnd + 1;
    } else {
      let nextTag = jsx.indexOf('<', index);
      let text = nextTag === -1 ? jsx.substring(index) : jsx.substring(index, nextTag);
      
      if (text.trim()) {
        tokens.push({
          type: 'text',
          value: text
        });
      }
      
      index = nextTag === -1 ? jsx.length : nextTag;
    }
  }
  
  const root = { type: 'root', children: [] };
  const stack = [root];
  
  for (const token of tokens) {
    if (token.type === 'tag') {
      if (token.isClosing) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        const node = {
          type: 'element',
          name: token.name,
          attributes: parseAttributes(token.raw.substring(token.name.length + 1, token.raw.length - (token.isSelfClosing ? 2 : 1))),
          children: []
        };
        
        stack[stack.length - 1].children.push(node);
        
        if (!token.isSelfClosing && token.name !== 'img' && token.name !== 'input' && token.name !== 'br' && token.name !== 'hr') {
          stack.push(node);
        }
      }
    } else {
      stack[stack.length - 1].children.push({
        type: 'text',
        value: token.value
      });
    }
  }
  
  return root;
}

function generateReactCreateElement(node) {
  if (!node) return 'null';

  if (node.type === 'root') {
    if (node.children.length === 1) {
      return generateReactCreateElement(node.children[0]);
    }
    return `[${node.children.map(generateReactCreateElement).join(', ')}]`;
  }
  
  if (node.type === 'text') {
    const val = node.value.trim();
    if (val.startsWith('{') && val.endsWith('}')) {
      return val.slice(1, -1).trim();
    }
    return JSON.stringify(val);
  }
  
  if (node.type === 'element') {
    if (node.name === 'WpEditable') {
      const tag = String(node.attributes.tagName || 'div').replace(/['"]/g, '').trim();
      const valStr = String(node.attributes.value || '').trim();
      
      let varName = 'value';
      const varMatch = valStr.match(/(?:attributes|props)?\.?([a-zA-Z0-9_-]+)$/);
      if (varMatch) {
        varName = varMatch[1];
      }
      
      const className = node.attributes.className 
        ? (node.attributes.className.startsWith('{') 
            ? node.attributes.className.slice(1, -1) 
            : JSON.stringify(node.attributes.className))
        : '""';
      
      return `createElement(wp.blockEditor.RichText, {
        tagName: ${JSON.stringify(tag)},
        value: attributes.${varName} || '',
        onChange: function(val) { setAttributes({ ${varName}: val }); },
        className: ${className}
      })`;
    }
    
    const props = {};
    for (const [key, val] of Object.entries(node.attributes)) {
      const propKey = key === 'className' ? 'className' : key;
      if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
        props[propKey] = val.slice(1, -1).trim();
      } else {
        props[propKey] = JSON.stringify(val);
      }
    }
    
    const propsStr = Object.keys(props).length > 0
      ? `{ ${Object.entries(props).map(([k, v]) => `${k}: ${v}`).join(', ')} }`
      : 'null';
      
    const childrenStr = node.children.map(generateReactCreateElement).filter(Boolean).join(', ');
    
    return `createElement(${JSON.stringify(node.name)}, ${propsStr}${childrenStr ? `, ${childrenStr}` : ''})`;
  }
  return 'null';
}

function parseDefineBlock(code, blockSlug) {
  const startIndex = code.indexOf('defineBlock(');
  if (startIndex === -1) return null;

  let depth = 1;
  let i = startIndex + 'defineBlock('.length;
  let blockContent = '';

  while (i < code.length && depth > 0) {
    const char = code[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (depth > 0) {
      blockContent += char;
    }
    i++;
  }

  let cleanBlockContent = blockContent;

  cleanBlockContent = cleanBlockContent.replace(
    /edit\s*:\s*([\s\S]*?)(?=,\s*(?:save|name|title|category|icon|attributes)\s*:|\s*\}$)/,
    'edit: null'
  );
  cleanBlockContent = cleanBlockContent.replace(
    /save\s*:\s*([\s\S]*?)(?=,\s*(?:edit|name|title|category|icon|attributes)\s*:|\s*\}$)/,
    'save: null'
  );

  try {
    const evalFn = new Function(`return ${cleanBlockContent};`);
    return evalFn();
  } catch (e) {
    console.warn(`[Gutenberg Block Compiler] parseDefineBlock eval failed:`, e.message);
    
    const nameMatch = blockContent.match(/name\s*:\s*["']([^"']+)["']/);
    const titleMatch = blockContent.match(/title\s*:\s*["']([^"']+)["']/);
    const categoryMatch = blockContent.match(/category\s*:\s*["']([^"']+)["']/);
    const iconMatch = blockContent.match(/icon\s*:\s*["']([^"']+)["']/);

    let attributes = {};
    const attrMatch = blockContent.match(/attributes\s*:\s*(\{[\s\S]*?\})(?:\s*,\s*(?:edit|save)|\s*\})/);
    if (attrMatch) {
      try {
        const attrEval = new Function(`return ${attrMatch[1]};`);
        attributes = attrEval();
      } catch {}
    }

    return {
      name: nameMatch ? nameMatch[1] : blockSlug,
      title: titleMatch ? titleMatch[1] : blockSlug,
      category: categoryMatch ? categoryMatch[1] : 'design',
      icon: iconMatch ? iconMatch[1] : 'info',
      attributes
    };
  }
}

function extractJsx(code, propertyName) {
  const propIndex = code.indexOf(`${propertyName}:`);
  if (propIndex === -1) return null;

  const subCode = code.substring(propIndex);
  const returnIndex = subCode.indexOf('return (');
  if (returnIndex !== -1) {
    let depth = 1;
    let j = returnIndex + 'return ('.length;
    let jsxContent = '';
    while (j < subCode.length && depth > 0) {
      const c = subCode[j];
      if (c === '(') depth++;
      else if (c === ')') depth--;

      if (depth > 0) {
        jsxContent += c;
      }
      j++;
    }
    return jsxContent.trim();
  }

  const returnSingleIndex = subCode.indexOf('return ');
  if (returnSingleIndex !== -1) {
    const afterReturn = subCode.substring(returnSingleIndex + 'return '.length).trim();
    if (afterReturn.startsWith('<')) {
      const match = afterReturn.match(/^(<[\s\S]*?>)(?:\s*[,;\}]|\s*$)/);
      if (match) {
        return match[1].trim();
      }
    }
  }

  const arrowIndex = subCode.indexOf('=>');
  if (arrowIndex !== -1 && arrowIndex < 80) {
    const afterArrow = subCode.substring(arrowIndex + 2).trim();
    if (afterArrow.startsWith('(')) {
      let depth = 1;
      let j = 1;
      let jsxContent = '';
      while (j < afterArrow.length && depth > 0) {
        const c = afterArrow[j];
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (depth > 0) jsxContent += c;
        j++;
      }
      return jsxContent.trim();
    } else if (afterArrow.startsWith('<')) {
      const match = afterArrow.match(/^(<[\s\S]*?>)(?:\s*[,;\}]|\s*$)/);
      if (match) {
        return match[1].trim();
      }
    }
  }

  return null;
}

function parenthesizeTernaryExpression(expr) {
  const questionCount = (expr.match(/\?/g) || []).length;
  if (questionCount <= 1) return expr;

  let depth = 0;
  let firstQuestionIdx = -1;
  let firstColonIdx = -1;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === '(' || char === '{' || char === '[') depth++;
    else if (char === ')' || char === '}' || char === ']') depth--;
    else if (depth === 0) {
      if (char === '?' && firstQuestionIdx === -1) {
        firstQuestionIdx = i;
      } else if (char === ':' && firstQuestionIdx !== -1 && firstColonIdx === -1) {
        firstColonIdx = i;
        break;
      }
    }
  }

  if (firstQuestionIdx === -1 || firstColonIdx === -1) {
    return expr;
  }

  const cond = expr.substring(0, firstQuestionIdx).trim();
  const truthy = expr.substring(firstQuestionIdx + 1, firstColonIdx).trim();
  const falsy = expr.substring(firstColonIdx + 1).trim();

  const newTruthy = parenthesizeTernaryExpression(truthy);
  const newFalsy = parenthesizeTernaryExpression(falsy);

  const wrapTruthy = (truthy.includes('?') && !truthy.startsWith('(')) ? `(${newTruthy})` : newTruthy;
  const wrapFalsy = (falsy.includes('?') && !falsy.startsWith('(')) ? `(${newFalsy})` : newFalsy;

  return `${cond} ? ${wrapTruthy} : ${wrapFalsy}`;
}

function translateJsExpressionToPhp(jsExpr) {
  const phpExpr = jsExpr
    .replace(/(?:attributes|props)\.([a-zA-Z0-9_-]+)/g, "$attributes['$1']")
    .replace(/\b([a-zA-Z0-9_-]+)\b/g, (name) => {
      return name;
    });
  return parenthesizeTernaryExpression(phpExpr);
}

/**
 * Scans the `src/blocks/` folder, parses block settings and JSX content,
 * and compiles them into official, dynamic WordPress blocks.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @returns {string[]} Compiled block slugs
 */
export function compileBlocks(themeRoot, outDir) {
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  const blockSlugs = [];

  if (!existsSync(blocksDir)) {
    return blockSlugs;
  }

  const entries = readdirSync(blocksDir);
  for (const entry of entries) {
    const entryPath = path.join(blocksDir, entry);
    let blockFile = '';
    let blockSlug = '';

    if (statSync(entryPath).isDirectory()) {
      const indexPath = path.join(entryPath, 'index.tsx');
      if (existsSync(indexPath)) {
        blockFile = indexPath;
        blockSlug = entry
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
      }
    } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
      blockFile = entryPath;
      blockSlug = entry
        .replace(/\.(tsx|jsx)$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
    }

    if (blockFile) {
      try {
        const code = readFileSync(blockFile, 'utf8');

        const settingsMatch = code.match(
          /export\s+const\s+settings\s*=\s*(\{[\s\S]*?\});/,
        );
        let settings = {
          apiVersion: 3,
          name: `forgewp/${blockSlug}`,
          title: blockSlug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          category: 'design',
          icon: 'admin-generic',
          attributes: {},
          render: 'file:./render.php',
        };

        let parsedSettings = null;
        if (code.includes('defineBlock(')) {
          parsedSettings = parseDefineBlock(code, blockSlug);
        } else if (settingsMatch) {
          try {
            const evalFn = new Function(`return ${settingsMatch[1]};`);
            parsedSettings = evalFn();
          } catch (e) {
            console.warn(
              `[Gutenberg Block Compiler] Error parsing legacy settings for ${blockSlug}:`,
              e.message,
            );
          }
        }

        if (parsedSettings) {
          settings = { ...settings, ...parsedSettings };
          settings.name = settings.name ? (settings.name.includes('/') ? settings.name : `forgewp/${settings.name}`) : `forgewp/${blockSlug}`;
          settings.apiVersion = 3;
          settings.render = 'file:./render.php';
        }

        // Extract JSX from save first, then edit as fallback
        let jsx = '';
        if (code.includes('save:')) {
          jsx = extractJsx(code, 'save');
        }
        if (!jsx && code.includes('edit:')) {
          jsx = extractJsx(code, 'edit');
        }

        if (!jsx) {
          const returnMatch = code.match(/return\s*\(\s*(<[\s\S]*?>)\s*\)/);
          if (returnMatch) {
            jsx = returnMatch[1];
          } else {
            const returnMatchSingle = code.match(/return\s+(<[\s\S]*?>);/);
            if (returnMatchSingle) {
              jsx = returnMatchSingle[1];
            }
          }
        }

        if (!jsx) {
          console.warn(
            `[Gutenberg Block Compiler] Skipping block ${blockSlug}: No returning JSX element found.`,
          );
          continue;
        }

        // Extract custom edit JSX for block-canvas high-fidelity controls using AST parser
        let editJsx = '';
        if (code.includes('edit:')) {
          editJsx = extractJsx(code, 'edit');
        }
        if (editJsx) {
          try {
            const ast = parseJsxToAst(editJsx);
            const customEditJsx = generateReactCreateElement(ast);
            settings.customEditJsx = customEditJsx;
          } catch (e) {
            console.warn(`[Gutenberg Block Compiler] Failed to parse custom edit JSX for ${blockSlug}:`, e.message);
          }
        }

        let phpMarkup = jsx;

        // Transpile <WpEditable> into standard JSX element so subsequent regexes can process it
        phpMarkup = phpMarkup.replace(
          /<WpEditable\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/WpEditable>)/g,
          (match, attrsStr, children) => {
            const getAttr = (name) => {
              const regex = new RegExp(
                `${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*(?:attributes\\.|props\\.)?([a-zA-Z0-9_-]+)\\s*\\})`
              );
              const m = attrsStr.match(regex);
              return m ? m[1] || m[2] || m[3] || '' : '';
            };

            const tag = getAttr('tagName') || 'div';
            const valueVar = getAttr('value');
            
            let cleanAttrs = attrsStr
              .replace(/tagName=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/value=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/onChange=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .trim();
              
            if (cleanAttrs) cleanAttrs = ' ' + cleanAttrs;

            const content = valueVar ? `{attributes.${valueVar}}` : (children || '');

            return `<${tag}${cleanAttrs}>${content}</${tag}>`;
          }
        );

        // className="..." -> class="..."
        phpMarkup = phpMarkup.replace(/className=/g, 'class=');

        // Transpile ES6 template literal conditional classes class={`...`}
        phpMarkup = phpMarkup.replace(/class=\{\`([\s\S]*?)\`\}/g, (match, templateLiteralContent) => {
          const processed = templateLiteralContent.replace(/\$\{\s*([\s\S]*?)\s*\}/g, (m, jsExpr) => {
            const phpExpr = translateJsExpressionToPhp(jsExpr);
            return `<?php echo esc_attr( ${phpExpr} ); ?>`;
          });
          return `class="${processed}"`;
        });

        // src={image} or src={attributes.image}
        phpMarkup = phpMarkup.replace(
          /(src|href|alt|title)=\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/gi,
          (match, attr, varName) => {
            const escFunc =
              attr === 'href' || attr === 'src' ? 'esc_url' : 'esc_attr';
            return `${attr}="<?php echo ${escFunc}( $attributes['${varName}'] ?? '' ); ?>"`;
          },
        );

        // {title} or {props.title}
        phpMarkup = phpMarkup.replace(
          /\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/g,
          (match, varName) => {
            return `<?php echo esc_html( $attributes['${varName}'] ?? '' ); ?>`;
          },
        );

        const renderPhpContent = `<?php
/**
 * Gutenberg dynamic block template — ${settings.title}
 * Autogenerated by ForgeWP Theme Compiler. Do not modify manually.
 */
?>
${phpMarkup}
`;

        const blockOutDir = path.join(outDir, 'blocks', blockSlug);
        mkdirSync(blockOutDir, { recursive: true });

        // Write block.json and render.php
        writeFileSync(
          path.join(blockOutDir, 'block.json'),
          JSON.stringify(settings, null, 2),
          'utf8',
        );
        writeFileSync(
          path.join(blockOutDir, 'render.php'),
          renderPhpContent,
          'utf8',
        );

        blockSlugs.push(settings);
      } catch (e) {
        console.error(
          `[Gutenberg Block Compiler] Failed to compile block ${blockSlug}:`,
          e.message,
        );
      }
    }
  }

  return blockSlugs;
}
