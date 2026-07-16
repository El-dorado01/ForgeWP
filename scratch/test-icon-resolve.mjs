import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const themeRoot = 'c:/Users/hp/Desktop/ForgeWP/hotelchecker24';
const projectRequire = createRequire(path.join(themeRoot, 'package.json'));

const pkgJsonPath = projectRequire.resolve('lucide-react/package.json');
const pkgDir = path.dirname(pkgJsonPath);
const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
const esmRelEntry = pkgJson.module || pkgJson.exports?.['.']?.import || pkgJson.main;
const pkgEntry = path.resolve(pkgDir, esmRelEntry);
console.log('ESM entry:', pkgEntry);

const reactEntry = projectRequire.resolve('react');
const rdEntry = projectRequire.resolve('react-dom/server');

const lines = [
  `import { pathToFileURL } from 'url';`,
  `const React = (await import(pathToFileURL(${JSON.stringify(reactEntry)}).href)).default;`,
  `const rdMod = await import(pathToFileURL(${JSON.stringify(rdEntry)}).href);`,
  `const renderToStaticMarkup = rdMod.renderToStaticMarkup || rdMod.default?.renderToStaticMarkup;`,
  `const pkg = await import(pathToFileURL(${JSON.stringify(pkgEntry)}).href);`,
  `const Icon = pkg['ArrowRight'];`,
  `process.stderr.write('Icon type: ' + typeof Icon + '\\n');`,
  `process.stderr.write('Icon keys: ' + (typeof Icon === 'object' ? JSON.stringify(Object.keys(Icon).slice(0,5)) : 'N/A') + '\\n');`,
  `process.stderr.write('pkg keys: ' + JSON.stringify(Object.keys(pkg).filter(k => k.startsWith('Arrow'))) + '\\n');`,
  `process.stderr.write('renderToStaticMarkup type: ' + typeof renderToStaticMarkup + '\\n');`,
  `const FinalIcon = (typeof Icon === 'function') ? Icon : (Icon && (Icon.$$typeof || Icon.render) ? Icon : (Icon && Icon.default ? Icon.default : null));`,
  `if (!FinalIcon) { process.stderr.write('No icon function found\\n'); process.stdout.write(''); process.exit(0); }`,
  `const html = renderToStaticMarkup(React.createElement(FinalIcon, { className: 'w-4 h-4 text-white' }));`,
  `process.stdout.write(html);`,
];

const tmpFile = path.join(tmpdir(), `_forgewp_icon_test.mjs`);
writeFileSync(tmpFile, lines.join('\n'), 'utf8');

const svgHtml = execSync(`node ${JSON.stringify(tmpFile)}`, {
  encoding: 'utf8',
  timeout: 10000,
}).trim();

unlinkSync(tmpFile);
console.log('Result SVG:', svgHtml.substring(0, 500));
