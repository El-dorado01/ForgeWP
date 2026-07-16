import { readFileSync } from 'node:fs';
import path from 'node:path';

function findHtmlTagEnd(code, startIndex) {
  let inString = false;
  let stringChar = null;
  let index = startIndex + 1;
  while (index < code.length) {
    const char = code[index];
    if (inString) {
      if (char === stringChar && code[index - 1] !== '\\') {
        inString = false;
      }
      index++;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      index++;
      continue;
    }
    if (char === '>') {
      return index;
    }
    index++;
  }
  return -1;
}

function extractJsxByTagBalancing(code) {
  const startMatch = code.match(/<[a-zA-Z<>]/); // match < or <>
  if (!startMatch) return null;
  const startIndex = startMatch.index;
  
  let index = startIndex;
  let tagStack = [];
  
  while (index < code.length) {
    const c = code[index];
    if (c === '<') {
      if (code.substring(index, index + 5) === '<?php') {
        const phpEnd = code.indexOf('?>', index);
        if (phpEnd !== -1) {
          index = phpEnd + 2;
          continue;
        }
      }
      if (code.substring(index, index + 4) === '<!--') {
        const commentEnd = code.indexOf('-->', index);
        if (commentEnd !== -1) {
          index = commentEnd + 3;
          continue;
        }
      }
      if (code[index + 1] === '/') {
        const tagEnd = findHtmlTagEnd(code, index);
        if (tagEnd === -1) break;
        const tagName = code.substring(index + 2, tagEnd).trim().split(/[\s/>]/)[0];
        if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
          tagStack.pop();
          if (tagStack.length === 0) {
            return code.substring(startIndex, tagEnd + 1);
          }
        }
        index = tagEnd + 1;
        continue;
      }
      const tagEnd = findHtmlTagEnd(code, index);
      if (tagEnd === -1) break;
      const tagContent = code.substring(index + 1, tagEnd).trim();
      const isSelfClosing = tagContent.endsWith('/') || ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tagContent.split(/[\s/>]/)[0].toLowerCase());
      if (!isSelfClosing) {
        const tagName = tagContent.split(/[\s/>]/)[0];
        tagStack.push(tagName);
      } else {
        if (tagStack.length === 0) {
          return code.substring(startIndex, tagEnd + 1);
        }
      }
      index = tagEnd + 1;
      continue;
    }
    index++;
  }
  return null;
}

function extractJsx(code, propertyName) {
  let subCode = code;
  if (propertyName) {
    let propIndex = code.indexOf(`${propertyName}:`);
    if (propIndex === -1) {
      propIndex = code.indexOf(`function ${propertyName}`);
      if (propIndex === -1) {
        propIndex = code.indexOf(`const ${propertyName}`);
      }
    }
    if (propIndex === -1) {
      if (code.includes('return (')) {
        propIndex = 0;
      } else {
        return null;
      }
    }
    subCode = code.substring(propIndex);
  }

  const openBrace = subCode.indexOf('{');
  if (openBrace !== -1) {
    let depth = 1;
    let pos = openBrace + 1;
    while (pos < subCode.length) {
      const char = subCode[pos];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          break; // end of function block
        }
      } else if (depth === 1) {
        if (subCode.substring(pos, pos + 8) === 'return (') {
          const jsx = extractJsxByTagBalancing(subCode.substring(pos));
          if (jsx) return jsx.trim();
        } else if (subCode.substring(pos, pos + 7) === 'return ') {
          const rest = subCode.substring(pos + 7).trim();
          if (rest.startsWith('<')) {
            const jsx = extractJsxByTagBalancing(subCode.substring(pos));
            if (jsx) return jsx.trim();
          }
        }
      }
      pos++;
    }
  }

  const returnIndex = subCode.indexOf('return (');
  if (returnIndex !== -1) {
    const jsx = extractJsxByTagBalancing(subCode.substring(returnIndex));
    if (jsx) return jsx.trim();
  }

  return null;
}

const file = 'hotelchecker24/src/components/FeaturedHotelsGrid.tsx';
const content = readFileSync(file, 'utf8');
const searchIndex = content.indexOf('function FeaturedHotelsGrid');
const sub = content.substring(searchIndex);

console.log('--- EXTRACTED JSX ---');
const jsx = extractJsx(sub, 'FeaturedHotelsGrid');
console.log(jsx);
