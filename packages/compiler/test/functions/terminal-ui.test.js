import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createUi, detectColorLevel, formatDuration } from '../../lib/terminal-ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8').replace(/\r\n/g, '\n');
const tty = { isTTY: true };

describe('terminal-ui', () => {
  it('ships an identical copy in create-forgewp', () => {
    expect(read('../../../create-forgewp/lib/terminal-ui.js')).toBe(read('../../lib/terminal-ui.js'));
  });

  it('respects NO_COLOR, FORCE_COLOR and non-TTY output', () => {
    expect(detectColorLevel(tty, { NO_COLOR: '1', COLORTERM: 'truecolor' })).toBe(0);
    expect(detectColorLevel(tty, { FORCE_COLOR: '0' })).toBe(0);
    expect(detectColorLevel({ isTTY: false }, {})).toBe(0);
    expect(detectColorLevel({ isTTY: false }, { FORCE_COLOR: '3' })).toBe(3);
    expect(detectColorLevel(tty, { COLORTERM: 'truecolor' })).toBe(3);
  });

  it('renders the exact brand orange in truecolor and plain text without colour', () => {
    const color = createUi({ stream: tty, env: { FORCE_COLOR: '3' } });
    expect(color.c.orange('x')).toBe('\x1b[38;2;249;115;22mx\x1b[39m');

    const plain = createUi({ stream: { isTTY: false }, env: {} });
    const out = [plain.banner({ version: '1.0.0', tagline: 'T' }), plain.done('Done', '1s'), plain.header('export')].join('\n');
    expect(out).not.toMatch(/\x1b\[/);
    expect(out).toContain('ForgeWP v1.0.0 - T');
  });

  it('formats durations for humans', () => {
    expect(formatDuration(420)).toBe('420ms');
    expect(formatDuration(3240)).toBe('3.2s');
    expect(formatDuration(64_000)).toBe('1m 04s');
  });
});
