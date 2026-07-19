/**
 * Regression coverage for loadConfig()'s cms/forms/** auto-discovery
 * (mirrors cms/editables/**'s scanForEditableSchemas convention).
 *
 * These tests run against the real hotelchecker24 project (read-only —
 * loadConfig() never writes anything) rather than a synthetic temp fixture,
 * because reproducing the bug this guards against requires a genuinely
 * jiti-transpiled wp.config.ts with real @forgewp/react/config and
 * @forgewp/compiler/define-config imports resolvable via node_modules —
 * exactly what hotelchecker24 already is.
 *
 * The bug: jiti's interopDefault (this version, at least) returns a
 * CJS-style wrapper `{ __esModule, default: <real object> }` whose property
 * reads forward to `.default` via static analysis of wp.config.ts's source
 * text, not a live proxy — so a property added to `.default` at RUNTIME
 * (like the forms-merge below) was invisible through the wrapper forever
 * afterward, even though Object.getOwnPropertyDescriptor showed it was
 * genuinely stored. loadConfig() now unwraps to `.default` up front so every
 * mutation it performs (there are many, not just forms) is an ordinary,
 * unsurprising object mutation.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../lib/load-config.js';
import { scanForFormSchemas } from '../../lib/hydration/form-schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const hc24Root = path.join(repoRoot, 'hotelchecker24');

const hc24Available = fs.existsSync(path.join(hc24Root, 'wp.config.ts'));

describe.skipIf(!hc24Available)('loadConfig — cms/forms/** discovery (real hotelchecker24 project)', () => {
  it('merges a form discovered under cms/forms/ into config.forms, surviving the jiti interop-wrapper unwrap', async () => {
    const config = await loadConfig(hc24Root);
    expect(config.forms).toBeTruthy();
    expect(config.forms.contact).toBeTruthy();
    expect(config.forms.contact.mailTo).toBe('admin');
    expect(config.forms.contact.fields).toHaveProperty('name');
    expect(config.forms.contact.fields).toHaveProperty('email');
  });

  it('still resolves every other top-level config field correctly (the unwrap must not regress ordinary reads)', async () => {
    const config = await loadConfig(hc24Root);
    expect(config.slug).toBe('hotelchecker24');
    expect(config.name).toBe('Hotelchecker24');
    expect(config.options).toBeTruthy();
    expect(Object.keys(config.options).length).toBeGreaterThan(0);
    expect(config.frameworkAdapter).toBe('react');
  });
});

describe('scanForFormSchemas', () => {
  it('returns an empty object when cms/forms/ does not exist', () => {
    const result = scanForFormSchemas(path.join(repoRoot, 'packages', 'compiler'));
    expect(result).toEqual({});
  });

  it("derives the form key from the filename, matching cms/editables/'s convention", () => {
    if (!hc24Available) return;
    const result = scanForFormSchemas(hc24Root);
    expect(Object.keys(result)).toContain('contact');
  });

  it('is unaffected by an apostrophe inside a // line comment (regression: naive quote-tracking used to mis-detect a string start there and corrupt paren-balancing)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-form-scan-'));
    const formsDir = path.join(tmpDir, 'cms', 'forms');
    fs.mkdirSync(formsDir, { recursive: true });
    fs.writeFileSync(
      path.join(formsDir, 'test-form.ts'),
      `import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: 'admin',
  subject: 'Test',
  fields: {
    // it's a comment with an apostrophe, and here's another one
    name: { type: 'text', label: 'Name', required: true },
  },
});
`,
      'utf8',
    );
    const result = scanForFormSchemas(tmpDir);
    expect(result['test-form']).toBeTruthy();
    expect(result['test-form'].fields.name.label).toBe('Name');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
