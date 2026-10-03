import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { addComponent } from '../../lib/add-component.js';

describe('addComponent', () => {
  let projectRoot;
  let cwdSpy;
  let logSpy;

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(os.tmpdir(), 'forgewp-add-component-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectRoot);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(execSync).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('preserves an existing local component unless overwrite is explicit', async () => {
    const uiDir = path.join(projectRoot, 'src', 'components', 'ui');
    const targetFile = path.join(uiDir, 'navbar.tsx');
    const userSource =
      'export const Navbar = () => <nav>My customized navbar</nav>;';
    mkdirSync(uiDir, { recursive: true });
    writeFileSync(targetFile, userSource, 'utf8');

    await expect(addComponent('navbar', { style: 'shadcn' })).rejects.toThrow(
      /already exists.*--overwrite/,
    );

    expect(readFileSync(targetFile, 'utf8')).toBe(userSource);
    expect(existsSync(path.join(projectRoot, 'components.json'))).toBe(false);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('replaces an existing local component when overwrite is explicit', async () => {
    const uiDir = path.join(projectRoot, 'src', 'components', 'ui');
    const targetFile = path.join(uiDir, 'navbar.tsx');
    mkdirSync(uiDir, { recursive: true });
    writeFileSync(targetFile, 'export const Navbar = () => null;', 'utf8');

    await addComponent('navbar', { style: 'shadcn', overwrite: true });

    expect(execSync).toHaveBeenCalledOnce();
    expect(readFileSync(targetFile, 'utf8')).not.toBe(
      'export const Navbar = () => null;',
    );
    expect(existsSync(path.join(projectRoot, 'components.json'))).toBe(true);
  });
});
