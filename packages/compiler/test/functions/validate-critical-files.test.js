import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateCriticalFiles } from '../../lib/validate.js';

describe('validateCriticalFiles (.ts vs .json dual-resolution)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-validate-test-'));
    // Setup minimal user-editable files so validate doesn't throw on them
    fs.writeFileSync(path.join(tmpDir, 'wp.config.ts'), 'export default {}');
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"dependencies": {"@forgewp/woocommerce": "workspace:*"}}');
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.tsx'), 'console.log("main")');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'layout.tsx'), 'export default () => null');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'routes.tsx'), 'export default () => null');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('restores default cms/products.json when neither .ts nor .json exists', () => {
    validateCriticalFiles(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'cms', 'products.json'))).toBe(true);
  });

  it('does NOT restore cms/products.json when cms/products.ts already exists', () => {
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'cms', 'products.ts'), 'export const products = [];');

    validateCriticalFiles(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'cms', 'products.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'cms', 'products.json'))).toBe(false);
  });

  it('does NOT create src/.forgewp directory (Zero-Clutter virtual architecture)', () => {
    validateCriticalFiles(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'src', '.forgewp'))).toBe(false);
  });
});

