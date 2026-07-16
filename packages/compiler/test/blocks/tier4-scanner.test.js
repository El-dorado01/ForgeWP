/**
 * Tier 4 — scanner.js call-expression parsing (Phase 3). Baselines the five
 * call shapes resolveComponentEditableSchema dispatches on, captured against
 * the current engine BEFORE the AST/static-eval migration so behavior is
 * locked, then re-verified after.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  parseDefineBlock,
  parseDefineEditable,
  extractFileConstBindings,
  parseMergeEditableCall,
  parsePickEditableExpression,
} from '../../lib/blocks/scanner.js';

describe('parseDefineBlock', () => {
  it('parses a full settings object, neutering edit/save functions', () => {
    const code = `
import { defineBlock } from "@forgewp/react";
export default defineBlock({
  name: "trust-strip",
  title: "Trust Strip",
  category: "theme",
  icon: "admin-users",
  keywords: ["stats", "trust"],
  attributes: {
    stat1Value: { type: "string", default: "500+", control: "text", label: "Stat 1" },
    count: { type: "number", default: -2.5 },
    enabled: { type: "boolean", default: true },
  },
  edit: (props: any) => {
    return <TrustStrip {...props.attributes} setAttributes={props.setAttributes} />;
  },
});`;
    const out = parseDefineBlock(code, 'trust-strip');
    expect(out.name).toBe('trust-strip');
    expect(out.title).toBe('Trust Strip');
    expect(out.keywords).toEqual(['stats', 'trust']);
    expect(out.attributes.stat1Value).toEqual({ type: 'string', default: '500+', control: 'text', label: 'Stat 1' });
    expect(out.attributes.count.default).toBe(-2.5);
    expect(out.attributes.enabled.default).toBe(true);
    expect(out.edit).toBeNull();
  });

  it('parses innerBlocks + shell parent-shell settings', () => {
    const code = `
export default defineBlock({
  name: 'about-split-section',
  title: "About Split Section",
  attributes: {},
  innerBlocks: {
    allowedBlocks: ['about-mission', 'about-values'],
    template: [['about-mission'], ['about-values']],
    templateLock: false,
    orientation: "horizontal",
  },
  shell: { className: "max-w-7xl", gridClassName: "grid gap-12" },
  edit: () => null,
});`;
    const out = parseDefineBlock(code, 'about-split-section');
    expect(out.innerBlocks.allowedBlocks).toEqual(['about-mission', 'about-values']);
    expect(out.innerBlocks.template).toEqual([['about-mission'], ['about-values']]);
    expect(out.shell).toEqual({ className: 'max-w-7xl', gridClassName: 'grid gap-12' });
    expect(out.edit).toBeNull();
  });
});

describe('parseDefineEditable', () => {
  it('resolves field helpers and same-file const bindings', () => {
    const code = `
const ICON_ALLOWLIST = ['award', 'shield', 'globe'];
export const editable = defineEditable({
  heading: text({ label: 'Heading', default: 'Hi' }),
  body: richText({ default: '<p>x</p>' }),
  logo: image(),
  badge: icon({ options: ICON_ALLOWLIST }),
  rows: repeater({ mode: 'dynamic', fields: { title: text() } }),
});`;
    const out = parseDefineEditable(code);
    expect(out.heading).toEqual({ type: 'text', label: 'Heading', default: 'Hi' });
    expect(out.body).toEqual({ type: 'richText', default: '<p>x</p>' });
    expect(out.logo).toEqual({ type: 'image' });
    expect(out.badge).toEqual({ type: 'icon', provider: 'lucide', options: ['award', 'shield', 'globe'] });
    expect(out.rows.fields.title).toEqual({ type: 'text' });
  });
});

describe('extractFileConstBindings', () => {
  it('extracts pure data literals and skips functions/JSX', () => {
    const code = `
export const SECTION_PADDING_Y = { none: '', sm: 'py-4' };
const LIMIT = 3;
const NAME = "hello";
const FLAG = true;
const helper = (x) => x * 2;
const Comp = () => <div/>;
`;
    const out = extractFileConstBindings(code);
    expect(out.SECTION_PADDING_Y).toEqual({ none: '', sm: 'py-4' });
    expect(out.LIMIT).toBe(3);
    expect(out.NAME).toBe('hello');
    expect(out.FLAG).toBe(true);
    expect(out.helper).toBeUndefined();
    expect(out.Comp).toBeUndefined();
  });
});

describe('parseMergeEditableCall', () => {
  it('merges defineEditable and object-literal arguments', () => {
    const code = `
export const editable = mergeEditable(
  defineEditable({ heading: text({ default: 'H' }) }),
  { extra: { type: 'text', default: 'E' } },
);`;
    const out = parseMergeEditableCall(code, '/fake/file.tsx', '/fake');
    expect(out.heading).toEqual({ type: 'text', default: 'H' });
    expect(out.extra).toEqual({ type: 'text', default: 'E' });
  });
});

describe('parsePickEditableExpression', () => {
  it('resolves an imported schema and picks mapped keys (object map + array map)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-tier4-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'front-page.ts'),
        `export const editable = defineEditable({
  hero_title: text({ default: 'T' }),
  hero_subtitle: text({ default: 'S' }),
});
export default editable;`,
      );
      const consumer = `import { editable as frontPageEditable } from './front-page';\n`;
      const consumerPath = path.join(tmp, 'TrustStrip.tsx');

      const objOut = parsePickEditableExpression(
        `pickEditable(frontPageEditable, { title: 'hero_title' })`,
        consumer, consumerPath, tmp,
      );
      expect(objOut).toBeTruthy();
      expect(objOut.title).toEqual({ type: 'text', default: 'T' });

      const arrOut = parsePickEditableExpression(
        `pickEditable(frontPageEditable, ['hero_subtitle'])`,
        consumer, consumerPath, tmp,
      );
      expect(arrOut).toBeTruthy();
      expect(arrOut.hero_subtitle).toEqual({ type: 'text', default: 'S' });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
