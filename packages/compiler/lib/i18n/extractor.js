import fs from 'node:fs';
import path from 'node:path';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.forgewp' && file !== 'dist') {
        walkDir(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

/**
 * Scans directories recursively for instances of __('string') or __("string").
 * @param {string} dirPath 
 * @returns {string[]} Sorted unique translation keys
 */
export function extractKeysFromDirectory(dirPath) {
  const keys = new Set();
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = walkDir(dirPath);
  
  // Regexes matching __('text') or __("text") handling escaped quotes natively
  const singleQuoteRegex = /__\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g;
  const doubleQuoteRegex = /__\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Single quote matches
    let match;
    singleQuoteRegex.lastIndex = 0;
    while ((match = singleQuoteRegex.exec(content)) !== null) {
      const val = match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      if (val) keys.add(val);
    }

    // Double quote matches
    doubleQuoteRegex.lastIndex = 0;
    while ((match = doubleQuoteRegex.exec(content)) !== null) {
      const val = match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      if (val) keys.add(val);
    }
  }

  return Array.from(keys).sort();
}
