import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing ${path.basename(filePath)} in scaffold.\n` +
        'The CLI template may be out of date — run pnpm sync:template in the ForgeWP repo.',
    );
  }

  let content = readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  writeFileSync(filePath, content, 'utf8');
}

export function applyProjectConfig(targetDir, config) {
  const { packageName, themeName, slug, description, textDomain, version } =
    config;

  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = readJson(pkgPath);
  pkg.name = packageName;
  pkg.private = true;
  pkg.version = version;

  // If we are inside the ForgeWP monorepo, use workspace:* for the compiler and react dependencies
  // to ensure pnpm links them locally instead of trying to fetch from the registry.
  const isWorkspace = existsSync(path.join(targetDir, '..', 'pnpm-workspace.yaml'));
  if (isWorkspace) {
    if (pkg.devDependencies?.['@forgewp/compiler']) {
      pkg.devDependencies['@forgewp/compiler'] = 'workspace:*';
    }
    if (pkg.dependencies?.['@forgewp/react']) {
      pkg.dependencies['@forgewp/react'] = 'workspace:*';
    }
  }

  writeJson(pkgPath, pkg);

  const wpConfigPath = path.join(targetDir, 'wp.config.ts');
  if (existsSync(wpConfigPath)) {
    let content = readFileSync(wpConfigPath, 'utf8');

    // Dynamically replace the metadata fields to preserve all other layout and color settings
    content = content.replace(/name:\s*'[^']*'/, `name: ${JSON.stringify(themeName)}`);
    content = content.replace(/slug:\s*'[^']*'/, `slug: ${JSON.stringify(slug)}`);
    content = content.replace(/version:\s*'[^']*'/, `version: ${JSON.stringify(version)}`);
    content = content.replace(/description:\s*'[^']*'/, `description: ${JSON.stringify(description)}`);
    content = content.replace(/textDomain:\s*'[^']*'/, `textDomain: ${JSON.stringify(textDomain)}`);
    content = content.replace(/style:\s*'[^']*'/, `style: ${JSON.stringify(config.style || 'forgewp')}`);

    // Ensure frameworkAdapter is set
    if (!content.includes('frameworkAdapter:')) {
      if (content.includes('defineConfig(')) {
        content = content.replace(
          /(defineConfig\(\{)/,
          `$1\n  frameworkAdapter: ${JSON.stringify(config.adapter || 'react')},`
        );
      } else {
        content = content.replace(
          /(const config:\s*ForgeWPThemeConfig\s*=\s*\{)/,
          `$1\n  frameworkAdapter: ${JSON.stringify(config.adapter || 'react')},`
        );
      }
    } else {
      content = content.replace(
        /frameworkAdapter:\s*'[^']*'/,
        `frameworkAdapter: ${JSON.stringify(config.adapter || 'react')}`
      );
    }

    writeFileSync(wpConfigPath, content, 'utf8');
  }

  replaceInFile(path.join(targetDir, 'index.html'), [
    ['ForgeWP Starter', themeName],
    ['ForgeWP HTML Starter', themeName],
  ]);

  const tsConfigPath = path.join(targetDir, 'tsconfig.json');
  if (existsSync(tsConfigPath)) {
    const tsconfig = readJson(tsConfigPath);
    if (tsconfig.compilerOptions?.paths) {
      if (isWorkspace) {
        tsconfig.compilerOptions.paths['@forgewp/react'] = ['../../react/src/index.ts'];
        tsconfig.compilerOptions.paths['@forgewp/compiler'] = ['../../compiler/lib/index.d.ts'];
        tsconfig.compilerOptions.paths['@forgewp/compiler/*'] = ['../../compiler/*'];
      } else {
        delete tsconfig.compilerOptions.paths['@forgewp/react'];
        delete tsconfig.compilerOptions.paths['@forgewp/compiler'];
        delete tsconfig.compilerOptions.paths['@forgewp/compiler/*'];
      }
      writeJson(tsConfigPath, tsconfig);
    }
  }
}
