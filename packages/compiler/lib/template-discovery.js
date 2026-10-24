import fs from 'node:fs';
import path from 'node:path';
import { parseSource } from './blocks/ast-parser.js';

export function discoverReactTemplates(themeRoot) {
  const app = path.join(themeRoot, 'src/app');
  const pagesDir = path.join(app, 'pages');
  const files = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.tsx') && fs.statSync(path.join(dir, name)).isFile()).sort() : [];
  const roots = files(app).filter((name) => /^(?:single|archive|taxonomy)(?:-.+)?\.tsx$|^404\.tsx$/.test(name));
  const pages = files(pagesDir).filter((name) => !/^placeholder\.tsx$/i.test(name));
  const importers = new Map(pages.map((name) => [name, []]));
  for (const file of [...roots.map((name) => path.join(app, name)), ...pages.map((name) => path.join(pagesDir, name))]) {
    let ast;
    try { ast = parseSource(fs.readFileSync(file, 'utf8')); } catch { continue; }
    for (const node of ast.program.body) {
      if (node.type !== 'ImportDeclaration' || node.importKind === 'type' || !node.source.value.startsWith('.')) continue;
      if (node.specifiers.length && node.specifiers.every((specifier) => specifier.importKind === 'type')) continue;
      const imported = path.resolve(path.dirname(file), node.source.value).replace(/\.(?:js|jsx|ts|tsx)$/, '');
      for (const name of pages) {
        if (imported === path.join(pagesDir, name).replace(/\.tsx$/, '') && path.join(pagesDir, name) !== file) {
          importers.get(name).push(path.relative(themeRoot, file).replaceAll('\\', '/'));
        }
      }
    }
  }
  return { roots, pages, importers };
}

export function resolvePageTemplateIntent(pageFile, config = {}) {
  if (config.exportTemplate !== undefined && typeof config.exportTemplate !== 'boolean') {
    throw new Error('pageConfig.exportTemplate must be a boolean');
  }
  if (config.exportTemplate === false) return { kind: 'component' };
  const slug = pageFile.replace(/\.tsx$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const single = slug === 'product' || slug.startsWith('single-') || Boolean(config.postType);
  const singleSlug = config.postType || (slug.startsWith('single-') ? slug.slice(7) : slug);
  if (single && (typeof singleSlug !== 'string' || !/^[a-z0-9_-]{1,20}$/.test(singleSlug))) {
    throw new Error('Single template post type must be a WordPress post-type key (1–20 lowercase letters, numbers, underscores or hyphens)');
  }
  return {
    kind: single ? 'single' : 'page', slug, singleSlug,
    cacheStem: single ? `single-${singleSlug}` : `template-${slug}`,
    wordpressFile: single ? `single-${singleSlug}.php` : `page-${slug}.php`,
  };
}

export function pageTemplateDiagnostic(source, intent, config, importers = []) {
  if (intent.kind === 'component') return `[ForgeWP Templates] ${source}: standalone export disabled; imports remain usable.`;
  const mapping = `[ForgeWP Templates] ${source} -> ${intent.wordpressFile} (${intent.kind === 'page' ? 'Page template; assign it to a WordPress Page to choose its URL' : 'CPT single template; URL follows WordPress permalinks'}).`;
  if (intent.kind !== 'page' || config.exportTemplate === true || !importers.length) return mapping;
  return `${mapping}\n[ForgeWP Templates Warning] Also imported by ${importers.join(', ')}. If this is a helper, move it to src/app/components/ or set pageConfig.exportTemplate: false. Set it to true to confirm an intentional Page template.`;
}

export function writePageTemplateCache(outDir, intent, html, head) {
  if (intent.kind === 'component') return;
  fs.writeFileSync(path.join(outDir, `${intent.cacheStem}.html`), html, 'utf8');
  fs.writeFileSync(path.join(outDir, `${intent.cacheStem}-head.html`), head, 'utf8');
}
