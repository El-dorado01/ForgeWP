import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { discoverReactTemplates, resolvePageTemplateIntent, pageTemplateDiagnostic, writePageTemplateCache } from '../../lib/template-discovery.js';

const compilerRoot = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
let root;
function write(file, source) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-template-discovery-')); });
afterEach(() => {
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('forgewp-template-discovery-')) throw new Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
describe('React template discovery', () => {
  it('identifies direct helper imports from root and Page templates without treating types or comments as imports', () => {
    write('src/app/single-project.tsx', `import Helper from './pages/Helper.js'; export default Helper;`);
    write('src/app/pages/Other.tsx', `import Helper from './Helper'; export default Helper;`);
    write('src/app/pages/Helper.tsx', 'export default function Helper(){ return null; }');
    write('src/app/pages/TypesOnly.tsx', `import type { Helper } from './Helper'; // import H from './Helper'
export const nothing = 1;`);
    write('src/app/pages/placeholder.tsx', '');
    write('src/app/components/Reusable.tsx', '');
    const found = discoverReactTemplates(root);
    expect(found.roots).toEqual(['single-project.tsx']);
    expect(found.pages).toEqual(['Helper.tsx', 'Other.tsx', 'TypesOnly.tsx']);
    expect(found.importers.get('Helper.tsx')).toEqual(['src/app/single-project.tsx', 'src/app/pages/Other.tsx']);
  });
  it('warns without guessing that a reused Page must be a helper', () => {
    const intent = resolvePageTemplateIntent('AboutUs.tsx');
    expect(intent.wordpressFile).toBe('page-about-us.php');
    const warning = pageTemplateDiagnostic('src/app/pages/AboutUs.tsx', intent, {}, ['src/app/single-project.tsx']);
    expect(warning).toContain('If this is a helper');
    expect(warning).toContain('pageConfig.exportTemplate: false');
    expect(pageTemplateDiagnostic('AboutUs.tsx', intent, { exportTemplate: true }, ['x.tsx'])).not.toContain('Warning');
  });
  it('opts helpers out of standalone output without changing their module', () => {
    const intent = resolvePageTemplateIntent('ProjectContent.tsx', { exportTemplate: false });
    expect(intent).toEqual({ kind: 'component' });
    writePageTemplateCache(root, intent, 'html', 'head');
    expect(fs.readdirSync(root)).toEqual([]);
  });
  it.each([
    ['SingleProject.tsx', {}, 'single-project.php'],
    ['ProjectDetails.tsx', { postType: 'project' }, 'single-project.php'],
    ['AboutUs.tsx', {}, 'page-about-us.php'],
  ])('writes only the intended cache pair for %s', (file, config, expected) => {
    const intent = resolvePageTemplateIntent(file, config);
    expect(intent.wordpressFile).toBe(expected);
    writePageTemplateCache(root, intent, 'body', 'head');
    expect(fs.readdirSync(root).sort()).toEqual([`${intent.cacheStem}-head.html`, `${intent.cacheStem}.html`].sort());
  });
  it.each([{ exportTemplate: 'false' }, { postType: '../outside' }, { postType: 'Invalid Type' }])('rejects invalid template intent: %j', (config) => {
    expect(() => resolvePageTemplateIntent('Details.tsx', config)).toThrow();
  });
  it('renders a root single with an opted-out helper, emits diagnostics, and clears removed template caches on rerun', () => {
    fs.symlinkSync(path.join(compilerRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');
    write('package.json', '{"type":"module"}');
    write('tsconfig.json', '{"compilerOptions":{"jsx":"react","module":"ESNext","moduleResolution":"Bundler"}}');
    write('src/app/page.tsx', 'export default function Page(){return <main>Home</main>}');
    write('src/app/layout.tsx', 'export default function Layout({children}){return <>{children}</>}');
    write('src/app/single-project.tsx', `import Helper from './pages/Helper'; export default function Single(){return <Helper/>}`);
    write('src/app/pages/Helper.tsx', `export const pageConfig={exportTemplate:false}; export default function Helper(){return <p>Shared detail</p>}`);
    write('src/app/pages/AboutUs.tsx', 'export default function About(){return <p>About us</p>}');
    write('src/app/pages/SingleStory.tsx', 'export default function Story(){return <p>Story</p>}');
    const viteRequire = createRequire(fs.realpathSync(require.resolve('vite/package.json')));
    const tsx = viteRequire.resolve('tsx/cli');
    const run = () => spawnSync(process.execPath, [tsx, '--tsconfig', path.join(root, 'tsconfig.json'), path.join(compilerRoot, 'lib/render-theme.mts'), root], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    const cache = path.join(root, '.forgewp');
    expect(fs.readFileSync(path.join(cache, 'single-project.html'), 'utf8')).toContain('Shared detail');
    expect(fs.existsSync(path.join(cache, 'template-helper.html'))).toBe(false);
    expect(fs.existsSync(path.join(cache, 'single-story.html'))).toBe(true);
    expect(fs.existsSync(path.join(cache, 'template-single-story.html'))).toBe(false);
    expect(first.stderr).toContain('src/app/pages/AboutUs.tsx -> page-about-us.php');
    expect(first.stderr).toContain('standalone export disabled');
    fs.unlinkSync(path.join(root, 'src/app/pages/AboutUs.tsx'));
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(fs.existsSync(path.join(cache, 'template-about-us.html'))).toBe(false);
    expect(fs.existsSync(path.join(cache, 'template-about-us-head.html'))).toBe(false);
  }, 70000);
});
