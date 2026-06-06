import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const themePath = 'C:\\Users\\hp\\Local Sites\\hotelchecker24\\app\\public\\wp-content\\themes\\hotelchecker24';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      if (file.endsWith('.html') || file.endsWith('.php')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

if (fs.existsSync(themePath)) {
  const files = walkDir(themePath);
  console.log(`Found ${files.length} template files to check.`);
  let errors = 0;
  for (const file of files) {
    try {
      execSync(`php -l "${file}"`, { stdio: 'pipe' });
    } catch (e) {
      console.error(`❌ Syntax error in: ${file}`);
      console.error(e.stderr?.toString() || e.message);
      errors++;
    }
  }
  if (errors === 0) {
    console.log('✔ All files are syntactically valid PHP!');
  } else {
    console.log(`❌ Found ${errors} files with syntax errors.`);
  }
} else {
  console.log('Theme directory not found');
}
