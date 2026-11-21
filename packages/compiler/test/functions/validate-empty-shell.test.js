import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateExport } from '../../lib/validate-export.js';

const stubAdapter = { scanForHydrationIslands: () => [] };
let tmp;

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

function makeExport({ content, header = '<header>Site</header>', footer = '' }) {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-empty-shell-'));
  const outDir = path.join(tmp, 'out');
  const staticDir = path.join(outDir, 'forgewp-static');
  fs.mkdirSync(staticDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'assets', 'forgewp-editor.js'), '');
  fs.writeFileSync(path.join(staticDir, 'content.html'), content);
  fs.writeFileSync(path.join(staticDir, 'header.html'), header);
  fs.writeFileSync(path.join(staticDir, 'footer.html'), footer);
  return { themeRoot: tmp, outDir };
}

const footerWarnings = (summary) => summary.warnings.filter((w) => w.endsWith('footer.html'));

describe('validateExport empty header/footer', () => {
  it('accepts an empty footer when the layout has no <footer> element', async () => {
    const { themeRoot, outDir } = makeExport({ content: '<main><h1>Home</h1></main>' });
    const summary = await validateExport({ themeRoot, outDir, assets: {}, config: {}, adapter: stubAdapter });
    expect(footerWarnings(summary)).toEqual([]);
  });

  it('still warns when a <footer> remains in page content (likely not extracted)', async () => {
    const { themeRoot, outDir } = makeExport({
      content: '<main><h1>Home</h1></main><footer>Site footer</footer>',
    });
    const summary = await validateExport({ themeRoot, outDir, assets: {}, config: {}, adapter: stubAdapter });
    expect(footerWarnings(summary)).toHaveLength(1);
  });

  it('still treats empty content.html as missing', async () => {
    const { themeRoot, outDir } = makeExport({ content: '   ' });
    const summary = await validateExport({ themeRoot, outDir, assets: {}, config: {}, adapter: stubAdapter });
    expect(summary.missing.some((m) => m.endsWith('content.html'))).toBe(true);
  });
});
