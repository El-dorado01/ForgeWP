import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';

async function test() {
  const themeRoot = 'c:\\Users\\hp\\Desktop\\ForgeWP\\hotelchecker24';
  const projectRequire = createRequire(path.join(themeRoot, 'package.json'));

  // 1. Asynchronously pre-import the modules
  const pkgJsonPath = projectRequire.resolve('lucide-react/package.json');
  const pkgDir = path.dirname(pkgJsonPath);
  const pkgJson = await import(pathToFileURL(pkgJsonPath).href, { with: { type: 'json' } }).then(m => m.default || m);
  const esmRelEntry = pkgJson.module || pkgJson.exports?.['.']?.import || pkgJson.main;
  const pkgEntry = path.resolve(pkgDir, esmRelEntry);

  console.time('Async Pre-import');
  const pkg = await import(pathToFileURL(pkgEntry).href);
  const React = await import(pathToFileURL(projectRequire.resolve('react')).href).then(m => m.default || m);
  const rdMod = await import(pathToFileURL(projectRequire.resolve('react-dom/server')).href);
  const renderToStaticMarkup = rdMod.renderToStaticMarkup || rdMod.default?.renderToStaticMarkup;
  console.timeEnd('Async Pre-import');

  // Cache them
  globalThis._forgewp_icon_packages = {
    'lucide-react': pkg,
    'react': React,
    'react-dom/server': { renderToStaticMarkup }
  };

  // 2. Synchronous rendering step (mimicking resolveIconToCreateElement)
  console.time('Sync Render from Cache');
  const cachedPkg = globalThis._forgewp_icon_packages['lucide-react'];
  const cachedReact = globalThis._forgewp_icon_packages['react'];
  const cachedRd = globalThis._forgewp_icon_packages['react-dom/server'];

  const Icon = cachedPkg['Search'];
  const html = cachedRd.renderToStaticMarkup(cachedReact.createElement(Icon, { className: 'w-4 h-4' }));
  console.timeEnd('Sync Render from Cache');

  console.log('HTML:', html);
}

test();
