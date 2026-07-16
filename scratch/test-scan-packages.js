import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const themeRoot = 'c:\\Users\\hp\\Desktop\\ForgeWP\\hotelchecker24';
const srcDir = path.join(themeRoot, 'src');

const pkgJsonPath = path.join(themeRoot, 'package.json');
const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

const packagesToWarm = new Set();

function scanDir(dir) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry)) {
      try {
        const content = readFileSync(fullPath, 'utf8');
        const importRx = /import\s+(?:type\s+)?(?:\{([^}]+)\}|([A-Za-z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRx.exec(content)) !== null) {
          const namedImports = match[1];
          const defaultImport = match[2];
          const fromPkg = match[3];
          
          if (fromPkg.startsWith('.') || fromPkg.startsWith('@/') || fromPkg.startsWith('react') || fromPkg.startsWith('next')) {
            continue;
          }
          
          let hasPascalCase = false;
          if (namedImports) {
            for (const name of namedImports.split(',')) {
              const n = name.replace(/\s+as\s+\S+/, '').trim();
              if (n && /^[A-Z]/.test(n)) {
                hasPascalCase = true;
                break;
              }
            }
          } else if (defaultImport && /^[A-Z]/.test(defaultImport)) {
            hasPascalCase = true;
          }
          
          if (hasPascalCase && deps[fromPkg]) {
            packagesToWarm.add(fromPkg);
          }
        }
      } catch (_) {}
    }
  }
}

console.time('Scan Time');
scanDir(srcDir);
console.timeEnd('Scan Time');

console.log('Discovered Packages to Warm:', Array.from(packagesToWarm));
