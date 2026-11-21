import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runStaticLintChecks } from '../../lib/hydration/static-lint.js';

let tmp;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

const link = `export default function X() {\n  return <a href="/">Home</a>;\n}\n`;

describe('static lint scope', () => {
  it('skips the dev-only src/app/routes router but still lints real templates', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-lint-'));
    fs.mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src', 'app', 'routes.tsx'), link);
    fs.writeFileSync(path.join(tmp, 'src', 'app', 'about.tsx'), link);

    const files = runStaticLintChecks(tmp)
      .filter((v) => /Hardcoded relative URL/.test(v.message))
      .map((v) => v.file);

    expect(files).toContain('src/app/about.tsx');
    expect(files).not.toContain('src/app/routes.tsx');
  });
});
