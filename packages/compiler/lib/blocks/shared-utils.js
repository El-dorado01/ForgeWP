import { readFileSync, existsSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

export const _svgHtmlCache = new Map();

export async function warmupIconCache(themeRoot) {
  try {
    const pkgJsonPath = path.join(themeRoot, 'package.json');
    if (!existsSync(pkgJsonPath)) return;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

    const srcDir = path.join(themeRoot, 'src');
    const discoveredPackages = new Set();

    // Recursively scan src directory to find external package imports with PascalCase elements
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
                discoveredPackages.add(fromPkg);
              }
            }
          } catch (_) {}
        }
      }
    }
    scanDir(srcDir);

    const iconPackages = Array.from(discoveredPackages);

    if (iconPackages.length === 0) return;

    const projectRequire = createRequire(pkgJsonPath);

    // Pre-import React and React DOM Server
    const reactEntry = projectRequire.resolve('react');
    const rdEntry = projectRequire.resolve('react-dom/server');
    const React = (await import(pathToFileURL(reactEntry).href)).default || (await import(pathToFileURL(reactEntry).href));
    const rdMod = await import(pathToFileURL(rdEntry).href);
    const renderToStaticMarkup = rdMod.renderToStaticMarkup || rdMod.default?.renderToStaticMarkup;

    globalThis._forgewp_icon_packages = globalThis._forgewp_icon_packages || {};
    globalThis._forgewp_icon_packages['react'] = React;
    globalThis._forgewp_icon_packages['react-dom/server'] = { renderToStaticMarkup };

    for (const pkgName of iconPackages) {
      try {
        const pkgJsonPath = projectRequire.resolve(`${pkgName}/package.json`);
        const pkgDir = path.dirname(pkgJsonPath);
        const resolvedPkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        const esmRelEntry = resolvedPkgJson.module || resolvedPkgJson.exports?.['.']?.import || resolvedPkgJson.main;
        const pkgEntry = path.resolve(pkgDir, esmRelEntry);

        const pkg = await import(pathToFileURL(pkgEntry).href);
        globalThis._forgewp_icon_packages[pkgName] = pkg;
      } catch (e) {
        // Quietly fail for non-esm/non-icon libraries to avoid console noise
      }
    }
  } catch (e) {
    console.warn('[ForgeWP Compiler] Failed to warmup icon cache:', e.message);
  }
}



export function resolvePackageEsmEntry(packageName, themeRoot) {
  const pr = createRequire(path.join(themeRoot, 'package.json'));
  const pkgJsonPath = pr.resolve(`${packageName}/package.json`);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const entry = pkgJson.module || pkgJson.exports?.['.']?.import || pkgJson.main;
  return pr.resolve(`${packageName}/${entry}`);
}

/**
 * Dynamically resolves an icon component to an SVG string by spawning a tiny
 * ESM child process that uses pathToFileURL + dynamic import + renderToStaticMarkup.
 */
export function resolveIconToSvgHtml(componentName, packageName, themeRoot, classNameStr) {
  const cacheKey = `${packageName}::${componentName}::${classNameStr}`;
  if (_svgHtmlCache.has(cacheKey)) return _svgHtmlCache.get(cacheKey);

  // 1. Try to render from in-process cache if warmed up
  if (globalThis._forgewp_icon_packages && globalThis._forgewp_icon_packages[packageName]) {
    const pkg = globalThis._forgewp_icon_packages[packageName];
    const React = globalThis._forgewp_icon_packages['react'];
    const rd = globalThis._forgewp_icon_packages['react-dom/server'];

    if (pkg && React && rd) {
      const Icon = pkg[componentName];
      if (Icon) {
        const FinalIcon = (typeof Icon === 'function') ? Icon : (Icon && (Icon.$$typeof || Icon.render) ? Icon : (Icon && Icon.default ? Icon.default : null));
        if (FinalIcon) {
          try {
            const html = rd.renderToStaticMarkup(React.createElement(FinalIcon, { className: classNameStr || '' }));
            if (html && html.startsWith('<svg')) {
              _svgHtmlCache.set(cacheKey, html);
              return html;
            }
          } catch (e) {
            console.warn(`[ForgeWP Compiler] Cache render failed for ${componentName}:`, e.message);
          }
        }
      }
    }
  }


  try {
    const projectRequire = createRequire(path.join(themeRoot, 'package.json'));

    // Resolve absolute ESM entry for the icon package
    const pkgJsonPath = projectRequire.resolve(`${packageName}/package.json`);
    const pkgDir = path.dirname(pkgJsonPath);
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    const esmRelEntry = pkgJson.module || pkgJson.exports?.['.']?.import || pkgJson.main;
    const pkgEntry = path.resolve(pkgDir, esmRelEntry);

    // React and react-dom/server can use their default resolution
    const reactEntry = projectRequire.resolve('react');
    const rdEntry = projectRequire.resolve('react-dom/server');

    const lines = [
      `import { pathToFileURL } from 'url';`,
      `const React = (await import(pathToFileURL(${JSON.stringify(reactEntry)}).href)).default;`,
      `const rdMod = await import(pathToFileURL(${JSON.stringify(rdEntry)}).href);`,
      `const renderToStaticMarkup = rdMod.renderToStaticMarkup || rdMod.default?.renderToStaticMarkup;`,
      `const pkg = await import(pathToFileURL(${JSON.stringify(pkgEntry)}).href);`,
      `const Icon = pkg[${JSON.stringify(componentName)}];`,
      `const FinalIcon = (typeof Icon === 'function') ? Icon : (Icon && (Icon.$$typeof || Icon.render) ? Icon : (Icon && Icon.default ? Icon.default : null));`,
      `if (!FinalIcon) { process.stdout.write(''); process.exit(0); }`,
      `const html = renderToStaticMarkup(React.createElement(FinalIcon, { className: ${JSON.stringify(classNameStr || '')} }));`,
      `process.stdout.write(html);`,
    ];

    const tmpFile = path.join(tmpdir(), `_forgewp_icon_${Date.now()}.mjs`);
    writeFileSync(tmpFile, lines.join('\n'), 'utf8');

    let svgHtml = '';
    try {
      svgHtml = execSync(`node ${JSON.stringify(tmpFile)}`, {
        encoding: 'utf8',
        timeout: 10000,
      }).trim();
    } finally {
      try { rmSync(tmpFile); } catch (_) {}
    }

    if (!svgHtml || !svgHtml.startsWith('<svg')) {
      _svgHtmlCache.set(cacheKey, null);
      return null;
    }

    _svgHtmlCache.set(cacheKey, svgHtml);
    return svgHtml;
  } catch (_) {
    _svgHtmlCache.set(cacheKey, null);
    return null;
  }
}

export function findHtmlTagEnd(code, startPos) {
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
