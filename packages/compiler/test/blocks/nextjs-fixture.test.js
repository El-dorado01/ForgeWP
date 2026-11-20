import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';
import { loadMockData } from '../../lib/functions/seed-mock-data.js';

const fixture = fileURLToPath(new URL('../../../../projects/nextjs-adapter-fixture/', import.meta.url));
let scratch, block, metadata, php;
beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-fixture-'));
  const theme = path.join(scratch, 'theme');
  const out = path.join(scratch, 'out');
  fs.cpSync(path.join(fixture, 'src/blocks'), path.join(theme, 'src/blocks'), { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  [block] = compileBlocks(theme, out, { strict: true });
  const output = path.join(out, 'blocks/next-intro');
  metadata = JSON.parse(fs.readFileSync(path.join(output, 'block.json'), 'utf8'));
  php = fs.readFileSync(path.join(output, 'render.php'), 'utf8');
});
afterAll(() => {
  if (scratch && path.dirname(scratch) === os.tmpdir() && path.basename(scratch).startsWith('forgewp-next-fixture-')) {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

describe('Next App Router fixture: shared compiler contracts (not WordPress acceptance)', () => {
  it('reads the same local CMS shape with the existing fixture loader', () => {
    const data = loadMockData(fixture);
    expect(data.page.map(page => page.slug)).toEqual(['home', 'about']);
  });
  it('retains block identity and the declared attribute schema with use client', () => {
    expect(metadata.name).toBe('forgewp/next-intro');
    expect(metadata.attributes.heading).toEqual({ type: 'string', default: 'An editable introduction' });
    expect(metadata.render).toBe('file:./render.php');
  });
  it('generates a functioning RichText edit callback', () => {
    expect(block.customEditJsx).toContain('wp.blockEditor.RichText');
    const patches = [];
    const createElement = (type, props, ...children) => ({ type, props, children });
    const render = new Function('createElement', 'wp', 'attributes', 'setAttributes', `return ${block.customEditJsx};`);
    const tree = render(createElement, { blockEditor: { RichText: 'RichText' } }, { heading: 'Saved heading' }, patch => patches.push(patch));
    const richText = tree.children.find(child => child.type === 'RichText');
    expect(richText.props.value).toBe('Saved heading');
    richText.props.onChange('Second edit');
    expect(patches).toEqual([{ heading: 'Second edit' }]);
  });
  it('reads saved attributes in PHP instead of baking the preview heading', () => {
    expect(php).toContain("esc_html( $attributes['heading'] ?? '' )");
    expect(php).not.toContain('An editable introduction');
    expect(php).not.toContain('contentEditable');
  });
});
