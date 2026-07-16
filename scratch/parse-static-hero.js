const fs = require('fs');
const path = require('path');

const SKIP_NESTED_COMPONENTS = new Set(['WpEditable', 'WpLink', 'Button', 'Fragment']);

// Paste resolve imported component JSX
function resolveImportedComponentJsx(compName, sourceCode, sourceFilePath, themeRoot) {
  const compFile = compName + '.tsx';
  const fullPath = path.join('c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/components', compFile);
  if (fs.existsSync(fullPath)) {
    const compContent = fs.readFileSync(fullPath, 'utf8');
    const returnStart = compContent.indexOf('return (');
    const returnEnd = compContent.lastIndexOf(');');
    if (returnStart !== -1 && returnEnd !== -1) {
      return compContent.substring(returnStart + 8, returnEnd).trim();
    }
  }
  return null;
}

function findHtmlTagEnd(code, startPos) {
  let depth = 0;
  let braceDepth = 0;
  let inQuote = false;
  let quoteChar = '';
  let insidePhp = false;
  let pos = startPos;
  while (pos < code.length) {
    const c = code[pos];
    
    if (insidePhp) {
      if (code.substring(pos, pos + 2) === '?>') {
        insidePhp = false;
        pos += 2;
        continue;
      }
    } else if (code.substring(pos, pos + 5) === '<?php') {
      insidePhp = true;
      pos += 5;
      continue;
    } else if (inQuote) {
      if (c === quoteChar) {
        inQuote = false;
      }
    } else if (c === '"' || c === "'" || c === '`') {
      inQuote = true;
      quoteChar = c;
    } else if (c === '{') {
      braceDepth++;
    } else if (c === '}') {
      if (braceDepth > 0) braceDepth--;
    } else if (braceDepth === 0) {
      if (c === '<') {
        depth++;
      } else if (c === '>') {
        depth--;
        if (depth === 0) {
          return pos;
        }
      }
    }
    pos++;
  }
  return -1;
}

function expandNestedComponentTags(jsx, sourceCode, sourceFilePath, themeRoot) {
  let output = jsx;
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    let index = 0;
    while (true) {
      const match = output.substring(index).match(/<([A-Z][A-Za-z0-9]*)\b/);
      if (!match) break;
      
      const compName = match[1];
      const matchIndex = index + match.index;
      
      if (SKIP_NESTED_COMPONENTS.has(compName)) {
        index = matchIndex + compName.length + 1;
        continue;
      }
      
      const tagEnd = findHtmlTagEnd(output, matchIndex);
      if (tagEnd === -1) {
        index = matchIndex + compName.length + 1;
        continue;
      }
      
      const fullTagStr = output.substring(matchIndex, tagEnd + 1);
      const isSelfClosing = fullTagStr.endsWith('/>');
      
      let replacementEndIndex = tagEnd + 1;
      
      if (!isSelfClosing) {
        const closeTag = `</${compName}>`;
        const closeIndex = output.indexOf(closeTag, tagEnd + 1);
        if (closeIndex !== -1) {
          replacementEndIndex = closeIndex + closeTag.length;
        }
      }
      
      const compJsx = resolveImportedComponentJsx(
        compName,
        sourceCode,
        sourceFilePath,
        themeRoot,
      );
      
      if (compJsx) {
        changed = true;
        output = output.substring(0, matchIndex) + compJsx + output.substring(replacementEndIndex);
        break; // break inner loop, do next pass
      } else {
        index = matchIndex + compName.length + 1;
      }
    }
    if (!changed) break;
  }
  return output;
}

function parseAttributes(attrStr) {
  const attrs = {};
  let i = 0;
  while (i < attrStr.length) {
    while (i < attrStr.length && /\s/.test(attrStr[i])) {
      i++;
    }
    if (i >= attrStr.length) break;
    
    const keyMatch = attrStr.substring(i).match(/^([a-zA-Z0-9_-]+)/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const key = keyMatch[1];
    i += key.length;
    
    while (i < attrStr.length && /\s/.test(attrStr[i])) {
      i++;
    }
    if (i < attrStr.length && attrStr[i] === '=') {
      i++; 
      while (i < attrStr.length && /\s/.test(attrStr[i])) {
        i++;
      }
      if (i >= attrStr.length) {
        attrs[key] = true;
        break;
      }
      
      const char = attrStr[i];
      if (char === '"' || char === "'") {
        const quote = char;
        let val = '';
        i++; 
        while (i < attrStr.length && attrStr[i] !== quote) {
          if (attrStr[i] === '\\') {
            val += attrStr[i + 1] || '';
            i += 2;
          } else {
            val += attrStr[i];
            i++;
          }
        }
        if (i < attrStr.length) i++; 
        attrs[key] = val;
      } else if (char === '{') {
        let val = '';
        let braceCount = 0;
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let inBacktick = false;
        
        while (i < attrStr.length) {
          const c = attrStr[i];
          val += c;
          
          if (c === '"' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
          } else if (c === "'" && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
          } else if (c === '`' && !inDoubleQuote && !inSingleQuote) {
            inBacktick = !inBacktick;
          }
          
          if (!inDoubleQuote && !inSingleQuote && !inBacktick) {
            if (c === '{') {
              braceCount++;
            } else if (c === '}') {
              braceCount--;
              if (braceCount === 0) {
                i++; 
                break;
              }
            }
          }
          i++;
        }
        attrs[key] = val.trim();
      } else {
        let val = '';
        while (i < attrStr.length && !/\s/.test(attrStr[i]) && attrStr[i] !== '>') {
          val += attrStr[i];
          i++;
        }
        attrs[key] = val;
      }
    } else {
      attrs[key] = true;
    }
  }
  return attrs;
}

function parseJsxToAst(jsx) {
  const tokens = [];
  let index = 0;
  
  while (index < jsx.length) {
    const char = jsx[index];
    
    if (char === '<') {
      let tagEnd = findHtmlTagEnd(jsx, index);
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
      let text = nextTag === -1 ? jsx.length : nextTag;
      
      let val = nextTag === -1 ? jsx.substring(index) : jsx.substring(index, nextTag);
      if (val.trim()) {
        tokens.push({
          type: 'text',
          value: val
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

// Generate React Create Element implementation
function generateReactCreateElement(node, blockSettings) {
  if (!node) return 'null';

  if (node.type === 'root') {
    if (node.children.length === 1) {
      return generateReactCreateElement(node.children[0], blockSettings);
    }
    return `[${node.children.map(child => generateReactCreateElement(child, blockSettings)).join(', ')}]`;
  }
  
  if (node.type === 'text') {
    const val = node.value.trim();
    if (val.startsWith('{') && val.endsWith('}')) {
      return val.slice(1, -1).trim();
    }
    if (val.includes('{') && val.includes('}')) {
      const templateLiteral = val.replace(/\{([^{}]+)\}/g, (match, expr) => {
        return `\${${expr.trim()}}`;
      });
      return `\`${templateLiteral}\``;
    }
    return JSON.stringify(val);
  }
  
  if (node.type === 'element') {
    const lucideSvgs = {
      ArrowRight: {
        viewBox: '0 0 24 24',
        paths: 'createElement("path", { d: "M5 12h14" }), createElement("path", { d: "m12 5 7 7-7 7" })'
      },
      Search: {
        viewBox: '0 0 24 24',
        paths: 'createElement("circle", { cx: "11", cy: "11", r: "8" }), createElement("path", { d: "m21 21-4.3-4.3" })'
      },
      ChevronDown: {
        viewBox: '0 0 24 24',
        paths: 'createElement("path", { d: "m6 9 6 6 6-6" })'
      },
      MapPin: {
        viewBox: '0 0 24 24',
        paths: 'createElement("path", { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" }), createElement("circle", { cx: "12", cy: "10", r: "3" })'
      },
      Navigation: {
        viewBox: '0 0 24 24',
        paths: 'createElement("polygon", { points: "3 11 22 2 13 21 11 13 3 11" })'
      }
    };
    if (lucideSvgs[node.name]) {
      const svg = lucideSvgs[node.name];
      const className = node.attributes.className ? JSON.stringify(node.attributes.className) : '""';
      return `createElement("svg", { 
        xmlns: "http://www.w3.org/2000/svg", 
        viewBox: "${svg.viewBox}", 
        fill: "none", 
        stroke: "currentColor", 
        strokeWidth: "2", 
        strokeLinecap: "round", 
        strokeLinejoin: "round", 
        className: ${className} 
      }, ${svg.paths})`;
    }

    if (node.name === 'WpEditable') {
      const tag = String(node.attributes.tagName || 'div').replace(/['"]/g, '').trim();
      let valStr = String(node.attributes.value || '').trim();
      if (valStr.startsWith('{') && valStr.endsWith('}')) {
        valStr = valStr.slice(1, -1).trim();
      }
      
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
      
      const isSingleLine = 
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'].includes(tag) ||
        (blockSettings && blockSettings.attributes && blockSettings.attributes[varName] && blockSettings.attributes[varName].control === 'text') ||
        node.attributes.disableLineBreaks !== undefined;

      const singleLineProps = isSingleLine 
        ? ',\n        disableLineBreaks: true,\n        allowedFormats: []'
        : '';
      
      return `createElement(wp.blockEditor.RichText, {
        tagName: ${JSON.stringify(tag)},
        value: attributes.${varName} || '',
        onChange: function(val) { setAttributes({ ${varName}: val }); },
        className: ${className}${singleLineProps}
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
      
    const processedChildCodes = [];
    let i = 0;
    while (i < node.children.length) {
      const child = node.children[i];
      
      // Skip empty text nodes, JSX comments, and block comments
      if (child.type === 'text') {
        const trimmed = child.value.trim();
        if (!trimmed || (trimmed.startsWith('{/*') && trimmed.endsWith('*/}')) || (trimmed.startsWith('/*') && trimmed.endsWith('*/'))) {
          i++;
          continue;
        }
      }
      
      // Parse logical AND conditionals: {cond && ( ... )}
      if (child.type === 'text') {
        const cleanVal = child.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim();
        if (cleanVal.match(/^\{([^{}]+)\s*&&\s*\($/)) {
          const condMatch = cleanVal.match(/^\{([^{}]+)\s*&&\s*\($/);
          const jsCond = condMatch[1].trim();
          
          let j = i + 1;
          let condChildren = [];
          let foundEnd = false;
          while (j < node.children.length) {
            const nextChild = node.children[j];
            let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
            if (nextChild.type === 'text' && nextClean.startsWith(')}')) {
              const closingIndex = nextChild.value.indexOf(')}');
              const afterText = nextChild.value.substring(closingIndex + 2);
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = nextChild.value.substring(0, closingIndex + 2);
              foundEnd = true;
              break;
            }
            condChildren.push(nextChild);
            j++;
          }
          
          if (foundEnd) {
            let phpCond = jsCond;
            const attrKeys = Object.keys((blockSettings && blockSettings.attributes) || {});
            phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:)/g, (m, word) => {
              if (attrKeys.includes(word)) {
                return `attributes.${word}`;
              }
              return m;
            });
            // Also handle non-spaced words matching the regex key replacement:
            phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:)/g, (m, word) => {
              if (attrKeys.includes(word)) {
                return `attributes.${word}`;
              }
              return m;
            });
            
            const innerCodes = condChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
            const innerCode = innerCodes.length > 1 
              ? `createElement(wp.element.Fragment, null, ${innerCodes.join(', ')})`
              : innerCodes[0] || 'null';
              
            processedChildCodes.push(`${phpCond} && (${innerCode})`);
            i = j + 1;
            continue;
          }
        }
      }

      // Parse split-and-map loop: {(tags || '').split(',').map(...).filter(...).map((tag) => ( ... ))}
      const splitMapRegex = /^\{\s*\((?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\|\|\s*(['"])\2\)\s*\.split\(\s*(['"])([^'"]+)\3\s*\)(?:\.map\(\s*[a-zA-Z0-9_-]+\s*=>\s*[a-zA-Z0-9_-]+\.trim\(\)\s*\))?(?:\.filter\(\s*[a-zA-Z0-9_-]+\s*\))?\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*\)\s*=>\s*\(\s*$/;
      if (child.type === 'text') {
        const cleanVal = child.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim();
        if (cleanVal.match(splitMapRegex)) {
          const loopMatch = cleanVal.match(splitMapRegex);
          const arrayVar = loopMatch[1];
          const separator = loopMatch[4];
          const varName = loopMatch[5];
          
          let j = i + 1;
          let loopChildren = [];
          let foundEnd = false;
          while (j < node.children.length) {
            const nextChild = node.children[j];
            let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
            if (nextChild.type === 'text' && nextClean.includes(')}')) {
              const closingIndex = nextChild.value.indexOf(')}');
              const afterText = nextChild.value.substring(closingIndex + 2);
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = nextChild.value.substring(0, closingIndex + 2);
              foundEnd = true;
              break;
            }
            loopChildren.push(nextChild);
            j++;
          }
          
          if (foundEnd) {
            const innerCodes = loopChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
            const innerCode = innerCodes.length > 1 
              ? `createElement(wp.element.Fragment, null, ${innerCodes.join(', ')})`
              : innerCodes[0] || 'null';
              
            processedChildCodes.push(`(attributes.${arrayVar} || '').split('${separator}').map(tag => tag.trim()).filter(Boolean).map((${varName}) => (${innerCode}))`);
            i = j + 1;
            continue;
          }
        }
      }

      // Parse JSX ternary conditionals: {cond ? ( ... ) : ( ... )}
      if (child.type === 'text') {
        const cleanVal = child.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim();
        if (cleanVal.match(/^\{([^{}?:]+)\s*\?\s*\($/)) {
          const ternaryMatch = cleanVal.match(/^\{([^{}?:]+)\s*\?\s*\($/);
          const jsCond = ternaryMatch[1].trim();
          
          let j = i + 1;
          let trueChildren = [];
          let falseChildren = [];
          let foundColon = false;
          let foundEnd = false;
          
          while (j < node.children.length) {
            const nextChild = node.children[j];
            let nextClean = nextChild.type === 'text' ? nextChild.value.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() : '';
            
            if (!foundColon && nextChild.type === 'text' && nextClean.startsWith(') : (')) {
              const colonIdx = nextChild.value.indexOf(') : (');
              const afterText = nextChild.value.substring(colonIdx + 5);
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = nextChild.value.substring(0, colonIdx + 5);
              foundColon = true;
              j++;
              continue;
            }
            
            if (foundColon && nextChild.type === 'text' && nextClean.startsWith(')}')) {
              const closingIdx = nextChild.value.indexOf(')}');
              const afterText = nextChild.value.substring(closingIdx + 2);
              if (afterText.trim()) {
                node.children.splice(j + 1, 0, {
                  type: 'text',
                  value: afterText
                });
              }
              nextChild.value = nextChild.value.substring(0, closingIdx + 2);
              foundEnd = true;
              break;
            }
            
            if (!foundColon) {
              trueChildren.push(nextChild);
            } else {
              falseChildren.push(nextChild);
            }
            j++;
          }
          
          if (foundColon && foundEnd) {
            let phpCond = jsCond;
            const attrKeys = Object.keys((blockSettings && blockSettings.attributes) || {});
            phpCond = phpCond.replace(/(?<![.\\w])([a-zA-Z0-9_-]+)(?![\\w])(?!\\s*:)/g, (m, word) => {
              if (attrKeys.includes(word)) {
                return `attributes.${word}`;
              }
              return m;
            });
            
            const trueCodes = trueChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
            const trueCode = trueCodes.length > 1 
              ? `createElement(wp.element.Fragment, null, ${trueCodes.join(', ')})`
              : trueCodes[0] || 'null';
              
            const falseCodes = falseChildren.map(c => generateReactCreateElement(c, blockSettings)).filter(Boolean);
            const falseCode = falseCodes.length > 1 
              ? `createElement(wp.element.Fragment, null, ${falseCodes.join(', ')})`
              : falseCodes[0] || 'null';
              
            processedChildCodes.push(`${phpCond} ? (${trueCode}) : (${falseCode})`);
            i = j + 1;
            continue;
          }
        }
      }
      
      const childCode = generateReactCreateElement(child, blockSettings);
      if (childCode) {
        processedChildCodes.push(childCode);
      }
      i++;
    }
    const childrenStr = processedChildCodes.join(', ');
    
    return `createElement(${JSON.stringify(node.name)}, ${propsStr}${childrenStr ? `, ${childrenStr}` : ''})`;
  }
  return 'null';
}

const blockSettings = {
  attributes: {
    title: { type: "string", default: "" },
    titleColored: { type: "string", default: "" },
    subtitle: { type: "string", default: "" },
    searchPlaceholder: { type: "string", default: "" },
    trendingTags: { type: "string", default: "" }
  }
};

// 1. Load block wrapper file content
const blockWrapper = fs.readFileSync('c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/blocks/generated/StaticHeroSectionBlock.tsx', 'utf8');

// Extract the return JSX inside StaticHeroSectionBlock edit function
const editStart = blockWrapper.indexOf('edit: (props: any) => {');
const editBody = blockWrapper.substring(editStart);
const returnStart = editBody.indexOf('return ');
const returnEnd = editBody.indexOf(';\n  }');

let editJsx = editBody.substring(returnStart + 7, returnEnd).trim();

// Expand components
editJsx = expandNestedComponentTags(editJsx, blockWrapper, 'c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/blocks/generated/StaticHeroSectionBlock.tsx', 'c:/Users/hp/Desktop/ForgeWP/hotelchecker24');

// Replace attributes
const propKeys = ['title', 'titleColored', 'subtitle', 'searchPlaceholder', 'trendingTags'];
for (const key of propKeys) {
  const rx = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
  editJsx = editJsx.replace(rx, `{attributes.${key}}`);
}
editJsx = editJsx.replace(/=\{([\s\S]*?)\}/g, (match, expr) => {
  let replacedExpr = expr;
  for (const key of propKeys) {
    const rx = new RegExp(`(?<![.\\w])${key}(?![\\w])(?!\\s*:)`, 'g');
    replacedExpr = replacedExpr.replace(rx, `attributes.${key}`);
  }
  return `={${replacedExpr}}`;
});

const ast = parseJsxToAst(editJsx);

const output = generateReactCreateElement(ast, blockSettings);
console.log("FINAL OUTPUT CONTAINING TRENDING DIV:");
const trendingIdx = output.indexOf('Trending:');
console.log(output.substring(trendingIdx - 100, trendingIdx + 300));

console.log("\nFINAL OUTPUT CONTAINING SUCHEN BUTTON:");
const suchenIdx = output.indexOf('Suchen');
console.log(output.substring(suchenIdx - 250, suchenIdx + 450));
